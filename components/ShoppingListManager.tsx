import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Pencil, Plus, Settings, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
import { DEFAULT_SHOPS, SHOP_COLORS, UNIT_OPTIONS } from '../constants';
import { InventoryItem, Shop, ShoppingItem } from '../types';
import { getShoppingSuggestions, predictShopForItem } from '../services/openai';
import {
  EmptyState,
  PageHeader,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SegmentedControl,
  StatStrip,
  SurfaceSheet,
  cx,
} from './ui';

const ShoppingListManager: React.FC = () => {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [suggestions, setSuggestions] = useState<ShoppingItem[]>([]);
  const [shops, setShops] = useState<Shop[]>(DEFAULT_SHOPS);
  const [isLoading, setIsLoading] = useState(false);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [showStoreSheet, setShowStoreSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('item');
  const [newItemShopId, setNewItemShopId] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newShopColor, setNewShopColor] = useState('slate');

  useEffect(() => {
    const savedList = localStorage.getItem('freshkeeper_shopping_list');
    if (savedList) setShoppingList(JSON.parse(savedList));
    const savedShops = localStorage.getItem('freshkeeper_shops');
    if (savedShops) setShops(JSON.parse(savedShops));
  }, []);

  useEffect(() => {
    localStorage.setItem('freshkeeper_shopping_list', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem('freshkeeper_shops', JSON.stringify(shops));
  }, [shops]);

  useEffect(() => {
    if (activeShopId) setNewItemShopId(activeShopId);
  }, [activeShopId]);

  const displayedItems = useMemo(
    () => (activeShopId ? shoppingList.filter((item) => item.shopId === activeShopId) : shoppingList),
    [activeShopId, shoppingList],
  );

  const checkedCount = shoppingList.filter((item) => item.isChecked).length;

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    const inventory: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_inventory') || '[]');
    const history: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_consumption_history') || '[]');
    const now = Date.now();
    const expiringItems = inventory.filter((item) => {
      const daysLeft = (item.expiryDate - now) / (1000 * 60 * 60 * 24);
      return daysLeft <= 2 && daysLeft > -5;
    });

    const heuristicSuggestions: ShoppingItem[] = expiringItems.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      quantity: 1,
      unit: item.unit,
      category: 'Expiring Soon',
      reason: 'Replacing item expiring soon',
      isChecked: false,
      shopId: shops[0]?.id,
    }));

    const aiSuggestions = await getShoppingSuggestions(inventory, history, shops);
    const combined = [...heuristicSuggestions, ...aiSuggestions].filter(
      (suggestion) =>
        !shoppingList.some((existing) => existing.name.toLowerCase() === suggestion.name.toLowerCase()),
    );

    setSuggestions(combined);
    setIsLoading(false);
  };

  const addSuggestionToList = (item: ShoppingItem) => {
    setShoppingList((current) => [...current, { ...item, category: 'User Added' }]);
    setSuggestions((current) => current.filter((entry) => entry.id !== item.id));
  };

  const addAllSuggestions = () => {
    setShoppingList((current) => [
      ...current,
      ...suggestions.map((suggestion) => ({ ...suggestion, category: 'User Added' as const })),
    ]);
    setSuggestions([]);
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions((current) => current.filter((item) => item.id !== id));
  };

  const addManualItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newItemName.trim()) return;

    const tempId = crypto.randomUUID();
    const initialShopId = newItemShopId || undefined;
    const newItem: ShoppingItem = {
      id: tempId,
      name: newItemName.trim(),
      quantity: newItemQuantity,
      unit: newItemUnit,
      category: 'User Added',
      isChecked: false,
      shopId: initialShopId,
    };

    setShoppingList((current) => [...current, newItem]);
    const itemName = newItemName;
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnit('item');
    if (!activeShopId) setNewItemShopId('');

    if (!initialShopId && shops.length > 0) {
      try {
        const predictedShopId = await predictShopForItem(itemName, shops);
        if (predictedShopId) {
          setShoppingList((current) =>
            current.map((item) => (item.id === tempId ? { ...item, shopId: predictedShopId } : item)),
          );
        }
      } catch (error) {
        console.warn('Auto-shop classification failed', error);
      }
    }
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
      ...current,
      {
        id: crypto.randomUUID(),
        name: newShopName.trim(),
        color: newShopColor,
      },
    ]);
    setNewShopName('');
  };

  const deleteShop = (id: string) => {
    setShops((current) => current.filter((shop) => shop.id !== id));
    setShoppingList((current) =>
      current.map((item) => (item.shopId === id ? { ...item, shopId: undefined } : item)),
    );
    if (activeShopId === id) setActiveShopId(null);
  };

  const saveEditedItem = () => {
    if (!editingItem || !editingItem.name.trim()) return;
    setShoppingList((current) => current.map((item) => (item.id === editingItem.id ? editingItem : item)));
    setEditingItem(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Shopping"
        title="Shopping List"
        description="Keep the working list primary. Suggestions feed into it, store filters stay lightweight, and store management moves into a secondary panel."
        action={
          <div className="flex flex-wrap gap-2">
            <PrimaryButton type="button" onClick={handleGenerateSuggestions} disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? 'Thinking' : 'Generate suggestions'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setShowStoreSheet(true)}>
              <Settings size={18} />
              Stores
            </SecondaryButton>
          </div>
        }
      />

      <StatStrip
        items={[
          { label: 'List items', value: shoppingList.length },
          { label: 'Suggestions', value: suggestions.length },
          { label: 'Checked off', value: checkedCount },
          { label: 'Stores', value: shops.length },
        ]}
      />

      <div className="space-y-5">
        <Panel className="p-4 md:p-5">
          <SectionHeader
            title="Add an item"
            description="Keep manual entry short. If you do not choose a store, classification runs quietly in the background."
          />

          <form onSubmit={addManualItem} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px_160px_180px_auto]">
            <input
              type="text"
              value={newItemName}
              onChange={(event) => setNewItemName(event.target.value)}
              placeholder="Milk, apples, yogurt"
              className="min-h-[52px] rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-950"
            />
            <input
              type="number"
              min="1"
              value={newItemQuantity}
              onChange={(event) => setNewItemQuantity(Math.max(1, parseInt(event.target.value, 10) || 1))}
              className="min-h-[52px] rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-950"
            />
            <select
              value={newItemUnit}
              onChange={(event) => setNewItemUnit(event.target.value)}
              className="min-h-[52px] rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-950"
            >
              {UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={newItemShopId}
              onChange={(event) => setNewItemShopId(event.target.value)}
              className="min-h-[52px] rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-neutral-950"
            >
              <option value="">Any store</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
            <PrimaryButton type="submit" disabled={!newItemName.trim()} className="min-h-[52px]">
              <Plus size={18} />
              Add
            </PrimaryButton>
          </form>
        </Panel>

        <Panel className="p-4 md:p-5">
          <SectionHeader
            title="Store filter"
            description="Treat stores as a list filter, not a separate layout."
            action={
              checkedCount > 0 ? (
                <SecondaryButton type="button" onClick={clearChecked}>
                  Clear checked
                </SecondaryButton>
              ) : null
            }
          />

          <div className="mt-5 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Store filter
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveShopId(null)}
                className={cx(
                  'rounded-full border px-3 py-2 text-sm transition',
                  activeShopId === null
                    ? 'border-neutral-950 bg-transparent text-neutral-950'
                    : 'border-neutral-200 bg-white text-neutral-700',
                )}
              >
                All items
              </button>
              {shops.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => setActiveShopId(shop.id)}
                  className={cx(
                    'rounded-full border px-3 py-2 text-sm transition',
                    activeShopId === shop.id
                      ? 'border-neutral-950 bg-transparent text-neutral-950'
                      : 'border-neutral-200 bg-white text-neutral-700',
                  )}
                >
                  {shop.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {displayedItems.length === 0 ? (
              <EmptyState
                title="No items in this list"
                description="Add items manually or generate suggestions from your inventory and consumption history."
              />
            ) : (
              displayedItems.map((item) => (
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
                          {item.shopId ? (
                            <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                              {shops.find((shop) => shop.id === item.shopId)?.name}
                            </span>
                          ) : null}
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
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-4 md:p-5">
          <SectionHeader
            title="Suggestion intake"
            description="Suggestions help fill the list. Review, accept, dismiss, or bulk-add them."
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
                description="Generate suggestions when you want the system to scan expiring items and history for restock ideas."
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
                          {item.category}
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
        open={showStoreSheet}
        onClose={() => setShowStoreSheet(false)}
        title="Store management"
        description="Stores are lightweight labels for routing and filtering. Keep them secondary."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            {shops.map((shop) => {
              const theme = getShopTheme(shop.color);
              return (
                <div key={shop.id} className="flex items-center justify-between rounded-3xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className={cx('h-3 w-3 rounded-full', theme)} />
                    <span className="text-sm font-medium text-neutral-900">{shop.name}</span>
                  </div>
                  <SecondaryButton
                    type="button"
                    onClick={() => deleteShop(shop.id)}
                    disabled={shops.length <= 1}
                    aria-label={`Delete ${shop.name}`}
                  >
                    <Trash2 size={16} />
                  </SecondaryButton>
                </div>
              );
            })}
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
                value={newShopColor}
                onChange={setNewShopColor}
                options={SHOP_COLORS.map((color) => ({ value: color.value, label: color.label }))}
                className="w-full overflow-x-auto"
              />

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
        description="Update quantity, unit, and optional store without leaving the list."
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
                <select
                  value={editingItem.unit}
                  onChange={(event) => setEditingItem({ ...editingItem, unit: event.target.value })}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
                >
                  {UNIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Store</span>
              <select
                value={editingItem.shopId || ''}
                onChange={(event) =>
                  setEditingItem({ ...editingItem, shopId: event.target.value || undefined })
                }
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
              >
                <option value="">Any store</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </SurfaceSheet>
    </div>
  );
};

export function getShopTheme(colorValue: string) {
  const color = SHOP_COLORS.find((entry) => entry.value === colorValue) || SHOP_COLORS[0];
  return color.bg.replace('100', '400');
}

export default ShoppingListManager;
