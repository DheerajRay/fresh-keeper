import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Loader2, Pencil, Plus, ShoppingCart, Sparkles, Trash2 } from 'lucide-react';
import { DEFAULT_SHOPS, STORE_TYPE_LABELS, STORE_TYPE_OPTIONS, UNIT_OPTIONS } from '../constants';
import { InventoryItem, Shop, ShoppingItem, StoreType } from '../types';
import { getShoppingSuggestions } from '../services/openai';
import {
  getLocalConsumptionHistory,
  getLocalInventory,
  getLocalShoppingList,
  getLocalShops,
  hydrateShoppingList,
  hydrateShops,
  replaceRemoteShoppingList,
  replaceRemoteShops,
  setLocalShoppingList,
  setLocalShops,
} from '../lib/appData';
import { classifyShoppingItemStoreType, ensureDefaultShops, getDefaultShopForType, inferStoreTypeFromName } from '../lib/storeRouting';
import {
  ConfirmationDialog,
  EmptyState,
  FloatingActionButton,
  MobileStatsButton,
  PageHeader,
  Panel,
  PrimaryButton,
  SelectMenu,
  SecondaryButton,
  SectionHeader,
  SegmentedControl,
  StatStrip,
  SurfaceSheet,
  cx,
} from './ui';

type MissingIngredientDraft = {
  name: string;
  amount: string;
  inInventory: boolean;
};

const ShoppingListManager: React.FC = () => {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() => getLocalShoppingList());
  const [suggestions, setSuggestions] = useState<ShoppingItem[]>([]);
  const [shops, setShops] = useState<Shop[]>(() => ensureDefaultShops(getLocalShops()));
  const [isLoading, setIsLoading] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showStoreSheet, setShowStoreSheet] = useState(false);
  const [showSuggestionHelp, setShowSuggestionHelp] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [reviewMealTitle, setReviewMealTitle] = useState('');
  const [reviewIngredients, setReviewIngredients] = useState<MissingIngredientDraft[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('item');
  const [newItemShopId, setNewItemShopId] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newShopType, setNewShopType] = useState<StoreType>('grocery');
  const [hasTouchedShopType, setHasTouchedShopType] = useState(false);
  const [remoteHydrated, setRemoteHydrated] = useState(false);
  const [openStoreType, setOpenStoreType] = useState<StoreType | null>('grocery');

  useEffect(() => {
    let active = true;

    Promise.all([hydrateShoppingList(getLocalShoppingList()), hydrateShops(getLocalShops())]).then(
      ([remoteShoppingList, remoteShops]) => {
        if (!active) return;
        setShoppingList(remoteShoppingList);
        setShops(ensureDefaultShops(remoteShops.length > 0 ? remoteShops : DEFAULT_SHOPS));
        setRemoteHydrated(true);
      },
    );

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setLocalShoppingList(shoppingList);
    if (remoteHydrated) {
      void replaceRemoteShoppingList(shoppingList);
    }
  }, [remoteHydrated, shoppingList]);

  useEffect(() => {
    const normalizedShops = ensureDefaultShops(shops);
    setLocalShops(normalizedShops);
    if (remoteHydrated) {
      void replaceRemoteShops(normalizedShops);
    }
  }, [remoteHydrated, shops]);

  useEffect(() => {
    if (hasTouchedShopType) return;
    setNewShopType(inferStoreTypeFromName(newShopName));
  }, [hasTouchedShopType, newShopName]);

  const checkedCount = shoppingList.filter((item) => item.isChecked).length;
  const statItems = [
    { label: 'List items', value: shoppingList.length },
    { label: 'Suggestions', value: suggestions.length },
    { label: 'Checked off', value: checkedCount },
  ];

  const groupedShoppingList = useMemo(
    () =>
      STORE_TYPE_OPTIONS.map((typeOption) => ({
        type: typeOption.value,
        stores: ensureDefaultShops(shops)
          .filter((shop) => shop.type === typeOption.value)
          .map((shop) => ({
            shop,
            items: shoppingList.filter((item) => (item.shopId || getDefaultShopForType(shops, item.storeType || 'grocery').id) === shop.id),
          }))
          .filter((group) => group.items.length > 0),
      })),
    [shoppingList, shops],
  );

  useEffect(() => {
    if (groupedShoppingList.some((group) => group.type === openStoreType && group.stores.length > 0)) return;
    const firstWithItems = groupedShoppingList.find((group) => group.stores.length > 0);
    setOpenStoreType(firstWithItems?.type || null);
  }, [groupedShoppingList, openStoreType]);

  const handleGenerateSuggestions = async () => {
    const inventory: InventoryItem[] = getLocalInventory();
    const history: InventoryItem[] = getLocalConsumptionHistory();

    if (inventory.length === 0 && history.length === 0) {
      setShowSuggestionHelp(true);
      return;
    }

    setIsLoading(true);
    const now = Date.now();
    const expiringItems = inventory.filter((item) => {
      const daysLeft = (item.expiryDate - now) / (1000 * 60 * 60 * 24);
      return daysLeft <= 2 && daysLeft > -5;
    });

    const heuristicSuggestions: ShoppingItem[] = expiringItems.map((item) => {
      const storeType = classifyShoppingItemStoreType(item.name);
      const defaultShop = getDefaultShopForType(shops, storeType);
      return {
        id: crypto.randomUUID(),
        name: item.name,
        quantity: 1,
        unit: item.unit,
        category: 'Expiring Soon',
        reason: 'Replace an item expiring soon',
        isChecked: false,
        shopId: defaultShop.id,
        source: 'restock',
        storeType,
      };
    });

    const aiSuggestions = await getShoppingSuggestions(inventory, history, shops);
    const combined = [...heuristicSuggestions, ...aiSuggestions].filter(
      (suggestion) => !shoppingList.some((existing) => existing.name.toLowerCase() === suggestion.name.toLowerCase()),
    );

    setSuggestions(combined);
    setIsLoading(false);
  };

  const addSuggestionToList = (item: ShoppingItem) => {
    setShoppingList((current) => [...current, item]);
    setSuggestions((current) => current.filter((entry) => entry.id !== item.id));
  };

  const addAllSuggestions = () => {
    setShoppingList((current) => [...current, ...suggestions]);
    setSuggestions([]);
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions((current) => current.filter((item) => item.id !== id));
  };

  const addManualItem = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newItemName.trim()) return;

    const storeType = newItemShopId
      ? shops.find((shop) => shop.id === newItemShopId)?.type || 'grocery'
      : classifyShoppingItemStoreType(newItemName);
    const routedShop = newItemShopId ? shops.find((shop) => shop.id === newItemShopId) : getDefaultShopForType(shops, storeType);

    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      quantity: newItemQuantity,
      unit: newItemUnit,
      category: 'User Added',
      isChecked: false,
      shopId: routedShop?.id,
      source: 'manual',
      storeType,
    };

    setShoppingList((current) => [...current, newItem]);
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnit('item');
    setNewItemShopId('');
    setShowAddSheet(false);
  };

  const toggleCheck = (id: string) => {
    setShoppingList((current) =>
      current.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item)),
    );
  };

  const removeShoppingItem = (id: string) => {
    setShoppingList((current) => current.filter((item) => item.id !== id));
  };

  const clearChecked = () => {
    setShoppingList((current) => current.filter((item) => !item.isChecked));
  };

  const addShop = () => {
    if (!newShopName.trim()) return;
    setShops((current) => [
      ...ensureDefaultShops(current),
      {
        id: crypto.randomUUID(),
        name: newShopName.trim(),
        type: newShopType,
        isDefault: false,
      },
    ]);
    setNewShopName('');
    setNewShopType('grocery');
    setHasTouchedShopType(false);
  };

  const deleteShop = (id: string) => {
    const targetShop = shops.find((shop) => shop.id === id);
    if (!targetShop || targetShop.isDefault) return;

    const fallbackShop = getDefaultShopForType(shops, targetShop.type);
    setShops((current) => current.filter((shop) => shop.id !== id));
    setShoppingList((current) =>
      current.map((item) => (item.shopId === id ? { ...item, shopId: fallbackShop.id, storeType: fallbackShop.type } : item)),
    );
  };

  const saveEditedItem = () => {
    if (!editingItem || !editingItem.name.trim()) return;
    const nextStore = shops.find((shop) => shop.id === editingItem.shopId) || getDefaultShopForType(shops, editingItem.storeType || 'grocery');
    setShoppingList((current) =>
      current.map((item) =>
        item.id === editingItem.id
          ? {
              ...editingItem,
              shopId: nextStore.id,
              storeType: nextStore.type,
            }
          : item,
      ),
    );
    setEditingItem(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Shopping"
        title="Shopping List"
        description="Route ingredients by store."
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={handleGenerateSuggestions} disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? 'Thinking' : 'Generate suggestions'}
            </SecondaryButton>
            <SecondaryButton type="button" onClick={() => setShowStoreSheet(true)}>
              Stores
            </SecondaryButton>
            <MobileStatsButton title="Shopping summary" items={statItems} />
          </div>
        }
      />

      <StatStrip items={statItems} className="hidden md:grid" />

      <FloatingActionButton label="Add item" onClick={() => setShowAddSheet(true)}>
        <Plus size={22} />
      </FloatingActionButton>

      <div className="space-y-5">
        <Panel className="p-4 md:p-5">
          <SectionHeader
            title="Store routing"
            
            action={
              checkedCount > 0 ? (
                <SecondaryButton type="button" onClick={clearChecked}>
                  Clear checked
                </SecondaryButton>
              ) : null
            }
          />

          <div className="mt-6 space-y-5">
            {groupedShoppingList.every((group) => group.stores.length === 0) ? (
              <EmptyState
                title="No items in this list"
                description="Add items or generate suggestions."
              />
            ) : (
              groupedShoppingList.map((group) => (
                <div key={group.type} className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setOpenStoreType((current) => (current === group.type ? null : group.type))}
                    className="flex w-full items-center justify-between border-b border-neutral-200 pb-2 text-left"
                  >
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      {STORE_TYPE_LABELS[group.type]}
                    </span>
                    <span className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-neutral-400">
                      <span>
                        {group.stores.reduce((count, storeGroup) => count + storeGroup.items.length, 0)} items
                      </span>
                      <ChevronDown size={14} className={cx('transition', openStoreType === group.type && 'rotate-180')} />
                    </span>
                  </button>

                  {openStoreType === group.type ? (
                    group.stores.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                        No items routed here.
                      </div>
                    ) : (
                      group.stores.map(({ shop, items }) => (
                        <div key={shop.id} className="space-y-3">
                          <div className="flex items-center justify-between text-sm text-neutral-500">
                            <span className="font-semibold text-neutral-950">{shop.name}</span>
                            <span>{items.length} items</span>
                          </div>
                          <div className="space-y-3">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className={cx(
                                  'border px-4 py-4 transition',
                                  item.isChecked
                                    ? 'border-neutral-200 bg-neutral-100 text-neutral-500'
                                    : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400',
                                )}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleCheck(item.id)}
                                      className={cx(
                                        'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border transition',
                                        item.isChecked
                                          ? 'border-neutral-950 bg-transparent text-neutral-950'
                                          : 'border-neutral-300 bg-white text-transparent',
                                      )}
                                      aria-label={`Mark ${item.name} as ${item.isChecked ? 'unchecked' : 'checked'}`}
                                    >
                                      <Check size={14} />
                                    </button>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className={cx('text-sm font-semibold', item.isChecked && 'line-through')}>{item.name}</p>
                                        <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                                          {item.quantity} {item.unit}
                                        </span>
                                        <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                                          {item.source === 'discover_recipe' ? 'Discover' : item.source === 'restock' ? 'Restock' : 'Manual'}
                                        </span>
                                      </div>
                                      {item.reason ? <p className="mt-2 text-sm text-neutral-500">{item.reason}</p> : null}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <SecondaryButton type="button" onClick={() => setEditingItem(item)} className="px-3 py-2">
                                      <span className="sr-only">Edit {item.name}</span>
                                      <Pencil size={16} />
                                    </SecondaryButton>
                                    <SecondaryButton
                                      type="button"
                                      onClick={() => removeShoppingItem(item.id)}
                                      className="px-3 py-2"
                                      aria-label={`Remove ${item.name}`}
                                    >
                                      <Trash2 size={16} />
                                    </SecondaryButton>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-4 md:p-5">
          <SectionHeader
            title="Suggestion intake"
            
            action={
              suggestions.length > 1 ? (
                <PrimaryButton type="button" onClick={addAllSuggestions}>
                  Add all
                </PrimaryButton>
              ) : null
            }
          />

          <div className="mt-6 space-y-3">
            {suggestions.length === 0 ? (
              <EmptyState
                title="No suggestions waiting"
                description="Generate suggestions when you need them."
              />
            ) : (
              suggestions.map((item) => (
                <div key={item.id} className="border border-neutral-200 bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-950">{item.name}</p>
                        <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                          {item.quantity} {item.unit}
                        </span>
                        <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                          {STORE_TYPE_LABELS[item.storeType || 'grocery']}
                        </span>
                      </div>
                      {item.reason ? <p className="mt-2 text-sm text-neutral-500">{item.reason}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <PrimaryButton
                        type="button"
                        onClick={() => addSuggestionToList(item)}
                        className="px-3 py-2"
                        aria-label={`Accept ${item.name}`}
                      >
                        <Plus size={16} />
                        Accept
                      </PrimaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => dismissSuggestion(item.id)}
                        className="px-3 py-2"
                        aria-label={`Dismiss ${item.name}`}
                      >
                        Dismiss
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <SurfaceSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        title="Add shopping item"
        
        footer={
          <PrimaryButton type="submit" form="shopping-add-form" disabled={!newItemName.trim()}>
            <Plus size={18} />
            Add
          </PrimaryButton>
        }
      >
        <form id="shopping-add-form" onSubmit={addManualItem} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Item name</span>
            <input
              type="text"
              value={newItemName}
              onChange={(event) => setNewItemName(event.target.value)}
              placeholder="Milk, apples, yogurt"
              className="min-h-[52px] w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-950"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Quantity</span>
              <input
                type="number"
                min="1"
                value={newItemQuantity}
                onChange={(event) => setNewItemQuantity(Math.max(1, parseInt(event.target.value, 10) || 1))}
                className="min-h-[52px] w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-950"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Unit</span>
              <SelectMenu
                ariaLabel="Unit"
                value={newItemUnit}
                onChange={(value) => setNewItemUnit(value)}
                options={UNIT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Store</span>
            <SelectMenu
              ariaLabel="Store"
              value={newItemShopId}
              onChange={(value) => setNewItemShopId(value)}
              placeholder="Auto-route by store type"
              options={shops.map((shop) => ({ value: shop.id, label: shop.name }))}
            />
          </label>
        </form>
      </SurfaceSheet>

      <SurfaceSheet
        open={showStoreSheet}
        onClose={() => setShowStoreSheet(false)}
        title="Store management"
        description="Keep default store types in place, then add custom stores that map into one of those routes."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            {shops.map((shop) => (
              <div key={shop.id} className="flex items-center justify-between rounded-3xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{shop.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{STORE_TYPE_LABELS[shop.type]}{shop.isDefault ? ' · Default' : ''}</p>
                </div>
                <SecondaryButton
                  type="button"
                  onClick={() => deleteShop(shop.id)}
                  disabled={shop.isDefault}
                  aria-label={`Delete ${shop.name}`}
                >
                  <Trash2 size={16} />
                </SecondaryButton>
              </div>
            ))}
          </div>

          <Panel className="bg-neutral-50 p-4">
            <div className="space-y-4">
              <input
                type="text"
                value={newShopName}
                onChange={(event) => setNewShopName(event.target.value)}
                placeholder="Store name"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
              />

              <SegmentedControl
                value={newShopType}
                onChange={(value) => {
                  setHasTouchedShopType(true);
                  setNewShopType(value as StoreType);
                }}
                options={STORE_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                className="w-full overflow-x-auto"
              />

              <p className="text-sm text-neutral-500">
                Auto-suggested route: <span className="text-neutral-950">{STORE_TYPE_LABELS[newShopType]}</span>
              </p>

              <PrimaryButton type="button" onClick={addShop} disabled={!newShopName.trim()}>
                Add store
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      </SurfaceSheet>

      <SurfaceSheet
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Edit shopping item"
        description="Update quantity, unit, and store routing without leaving the list."
        footer={
          <PrimaryButton type="button" onClick={saveEditedItem} disabled={!editingItem?.name.trim()}>
            Save changes
          </PrimaryButton>
        }
      >
        {editingItem ? (
          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Item name</span>
              <input
                type="text"
                value={editingItem.name}
                onChange={(event) => setEditingItem({ ...editingItem, name: event.target.value })}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Quantity</span>
                <input
                  type="number"
                  min="1"
                  value={editingItem.quantity}
                  onChange={(event) =>
                    setEditingItem({ ...editingItem, quantity: Math.max(1, parseInt(event.target.value, 10) || 1) })
                  }
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Unit</span>
                <SelectMenu
                  ariaLabel="Unit"
                  value={editingItem.unit}
                  onChange={(value) => setEditingItem({ ...editingItem, unit: value })}
                  options={UNIT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Store</span>
              <SelectMenu
                ariaLabel="Store"
                value={editingItem.shopId || ''}
                onChange={(value) => {
                  const nextShop = shops.find((shop) => shop.id === value);
                  setEditingItem({
                    ...editingItem,
                    shopId: value || undefined,
                    storeType: nextShop?.type || editingItem.storeType,
                  });
                }}
                options={shops.map((shop) => ({ value: shop.id, label: shop.name }))}
              />
            </label>
          </div>
        ) : null}
      </SurfaceSheet>

      <ConfirmationDialog
        open={showSuggestionHelp}
        onClose={() => setShowSuggestionHelp(false)}
        title="Suggestions need some usage first"
        description="Shopping suggestions are built from your current inventory or your recent item history. Add a few fridge items or use the shopping list for a bit, then try again."
        actions={
          <PrimaryButton type="button" onClick={() => setShowSuggestionHelp(false)}>
            Got it
          </PrimaryButton>
        }
      />
    </div>
  );
};

export default ShoppingListManager;

