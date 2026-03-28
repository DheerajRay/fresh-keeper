import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronRight,
  Loader2,
  Minus,
  MoveRight,
  Plus,
  Refrigerator,
  ScanSearch,
  Trash2,
} from 'lucide-react';
import FridgeVisual from './FridgeVisual';
import { FRIDGE_ZONES, UNIT_OPTIONS } from '../constants';
import { InventoryItem, ZoneId } from '../types';
import { getShelfLifePrediction, identifyItemFromImage } from '../services/openai';
import {
  ConfirmationDialog,
  EmptyState,
  PageHeader,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  StatStrip,
  SurfaceSheet,
  cx,
} from './ui';

const COLD_ZONES = [ZoneId.UPPER_SHELVES, ZoneId.LOWER_SHELVES, ZoneId.CRISPER_DRAWER, ZoneId.DOOR, ZoneId.FREEZER];
const DRY_ZONES = [ZoneId.PANTRY, ZoneId.KITCHEN_SHELVES, ZoneId.COUNTER];
const ORDERED_ZONES = [
  ZoneId.UPPER_SHELVES,
  ZoneId.LOWER_SHELVES,
  ZoneId.CRISPER_DRAWER,
  ZoneId.DOOR,
  ZoneId.FREEZER,
  ZoneId.PANTRY,
  ZoneId.KITCHEN_SHELVES,
  ZoneId.COUNTER,
];

type WarningState = {
  isOpen: boolean;
  name: string;
  isFood: boolean;
  recommendedStorage: string;
  reasoning: string;
  warningType: 'NOT_FOOD' | 'SUBOPTIMAL_ZONE' | 'EXPIRED';
  onConfirm?: () => void;
};

type ScanResult = {
  name: string;
  quantity?: number;
  unit?: string;
  zoneId?: ZoneId;
  isFood?: boolean;
  recommendedStorage?: string;
  reasoning?: string;
};

const InventoryManager: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('item');
  const [selectedZone, setSelectedZone] = useState<ZoneId>(ZoneId.LOWER_SHELVES);
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [warningData, setWarningData] = useState<WarningState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fridge_inventory');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('fridge_inventory', JSON.stringify(items));
  }, [items]);

  const groupedItems = useMemo(
    () =>
      ORDERED_ZONES.map((zoneId) => ({
        zoneId,
        items: items.filter((item) => item.zoneId === zoneId).sort((a, b) => a.expiryDate - b.expiryDate),
      })).filter((group) => group.items.length > 0),
    [items],
  );

  const expiringSoon = items.filter((item) => getStatus(item.expiryDate) !== 'Fresh').length;
  const zonesUsed = new Set(items.map((item) => item.zoneId)).size;

  const addToHistory = (item: InventoryItem) => {
    const historyKey = 'fridge_consumption_history';
    const savedHistory = localStorage.getItem(historyKey);
    let history: InventoryItem[] = savedHistory ? JSON.parse(savedHistory) : [];
    history = [item, ...history].slice(0, 50);
    localStorage.setItem(historyKey, JSON.stringify(history));
  };

  const checkStorageOptimality = (zone: ZoneId, recommended: string | undefined) => {
    if (!recommended) return { isOptimal: true, type: 'UNKNOWN' };
    const recommendedUpper = recommended.toUpperCase();
    const targetCold =
      recommendedUpper.includes('FRIDGE') ||
      recommendedUpper.includes('FREEZER') ||
      recommendedUpper.includes('CRISPER');
    const targetDry =
      recommendedUpper.includes('PANTRY') ||
      recommendedUpper.includes('COUNTER') ||
      recommendedUpper.includes('SHELF');
    const currentCold = COLD_ZONES.includes(zone);
    const currentDry = DRY_ZONES.includes(zone);

    if (targetCold && currentDry) {
      return { isOptimal: false, type: 'NEEDS_COLD', message: 'This item keeps better in cold storage.' };
    }
    if (targetDry && currentCold) {
      return { isOptimal: false, type: 'NEEDS_DRY', message: 'This item keeps better in dry storage.' };
    }
    return { isOptimal: true, type: 'OK' };
  };

  const commitItem = (prediction: {
    days: number;
    advice: string;
    recommendedStorage: string;
  }) => {
    const now = Date.now();
    const normalizedName = newItemName.trim().toLowerCase();
    setItems((previous) => {
      const existingIndex = previous.findIndex(
        (item) => item.name.trim().toLowerCase() === normalizedName && item.zoneId === selectedZone,
      );

      if (existingIndex >= 0) {
        const updated = [...previous];
        const existing = updated[existingIndex];
        updated[existingIndex] = { ...existing, quantity: (existing.quantity || 1) + newItemQuantity };
        return updated;
      }

      const newItem: InventoryItem = {
        id: crypto.randomUUID(),
        name: newItemName.trim(),
        zoneId: selectedZone,
        addedDate: now,
        expiryDate: now + prediction.days * 24 * 60 * 60 * 1000,
        estimatedDays: prediction.days,
        note: prediction.advice,
        quantity: newItemQuantity,
        unit: newItemUnit,
        recommendedStorage: prediction.recommendedStorage,
      };
      return [newItem, ...previous];
    });

    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnit('item');
    setSelectedZone(ZoneId.LOWER_SHELVES);
    setShowAddSheet(false);
    setIsAdding(false);
    setWarningData(null);
  };

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newItemName.trim()) return;

    setIsAdding(true);
    const zoneName = FRIDGE_ZONES[selectedZone].name;
    const prediction = await getShelfLifePrediction(newItemName, zoneName);

    if (!prediction.isFood) {
      setIsAdding(false);
      setWarningData({
        isOpen: true,
        name: newItemName,
        isFood: false,
        recommendedStorage: prediction.recommendedStorage || 'OTHER',
        reasoning: prediction.advice || 'This does not look like food or a kitchen supply.',
        warningType: 'NOT_FOOD',
      });
      return;
    }

    if (prediction.days <= 0) {
      setIsAdding(false);
      setWarningData({
        isOpen: true,
        name: newItemName,
        isFood: true,
        recommendedStorage: prediction.recommendedStorage,
        reasoning: prediction.advice || 'This item appears to be spoiled or past its safe date.',
        warningType: 'EXPIRED',
        onConfirm: () => commitItem(prediction),
      });
      return;
    }

    const optimality = checkStorageOptimality(selectedZone, prediction.recommendedStorage);
    if (!optimality.isOptimal) {
      setIsAdding(false);
      setWarningData({
        isOpen: true,
        name: newItemName,
        isFood: true,
        recommendedStorage: prediction.recommendedStorage,
        reasoning: optimality.message,
        warningType: 'SUBOPTIMAL_ZONE',
        onConfirm: () => commitItem(prediction),
      });
      return;
    }

    commitItem(prediction);
  };

  const readImageAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const result = event.target?.result as string | undefined;
        if (!result) {
          reject(new Error('Image could not be read.'));
          return;
        }
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = (error) => reject(error);
    });

  const populateForm = (result: ScanResult) => {
    setNewItemName(result.name || '');
    setNewItemQuantity(result.quantity || 1);
    const foundUnit = UNIT_OPTIONS.find((unit) => unit.value === result.unit || unit.value === result.unit?.toLowerCase());
    setNewItemUnit(foundUnit ? foundUnit.value : 'item');
    if (result.zoneId && FRIDGE_ZONES[result.zoneId]) {
      setSelectedZone(result.zoneId);
    }
    setShowAddSheet(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const base64Image = await readImageAsBase64(file);
      const result = (await identifyItemFromImage(base64Image)) as ScanResult;

      if (!result.isFood) {
        setWarningData({
          isOpen: true,
          name: result.name || 'Unknown item',
          isFood: false,
          recommendedStorage: result.recommendedStorage || 'OTHER',
          reasoning: result.reasoning || 'This does not appear to be food.',
          warningType: 'NOT_FOOD',
        });
        return;
      }

      populateForm(result);
    } catch (error) {
      console.error('Scan failed', error);
      alert('Could not identify the item. Please try again.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeItem = (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (item) addToHistory(item);
    setItems((previous) => previous.filter((entry) => entry.id !== id));
    if (activeItem?.id === id) setActiveItem(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) };
        if (activeItem?.id === id) setActiveItem(next);
        return next;
      }),
    );
  };

  const moveItem = (id: string, zoneId: ZoneId) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, zoneId };
        if (activeItem?.id === id) setActiveItem(next);
        return next;
      }),
    );
  };

  const recommendedZone = getRecommendedZone(warningData?.recommendedStorage);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventory"
        title="My Fridge"
        description="Track what is in storage, add items through one guided flow, and open details only when an item needs action."
        action={
          <div className="flex flex-wrap gap-2">
            <PrimaryButton type="button" onClick={() => setShowAddSheet(true)}>
              <Plus size={18} />
              Add to Fridge
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setShowMapSheet(true)}>
              <Refrigerator size={18} />
              Zones
            </SecondaryButton>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageUpload}
        disabled={isScanning}
      />

      <StatStrip
        items={[
          { label: 'Tracked items', value: items.length },
          { label: 'Need attention', value: expiringSoon, note: 'Expired or due within 48 hours' },
          { label: 'Zones in use', value: zonesUsed || 0 },
          { label: 'Primary mode', value: 'List', note: 'Map moved to secondary view' },
        ]}
      />

      <Panel className="p-5 md:p-6">
        <SectionHeader
          title="Inventory list"
          description="The list is the working surface. Use the map only when you need to inspect location layout."
          action={
            <div className="flex flex-wrap gap-2">
              <SecondaryButton type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning}>
                {isScanning ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                {isScanning ? 'Scanning' : 'Scan item'}
              </SecondaryButton>
            </div>
          }
        />

        <div className="mt-6 space-y-6">
          {groupedItems.length === 0 ? (
            <EmptyState
              title="No items tracked yet"
              description="Add your first item to start shelf-life guidance, zone checks, and shopping history."
              action={
                <PrimaryButton type="button" onClick={() => setShowAddSheet(true)}>
                  Add first item
                </PrimaryButton>
              }
            />
          ) : (
            groupedItems.map((group) => (
              <div key={group.zoneId} className="space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    {FRIDGE_ZONES[group.zoneId].name}
                  </h2>
                  <span className="text-xs text-neutral-500">{group.items.length} items</span>
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition hover:border-neutral-400"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-neutral-950">{item.name}</h3>
                            <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                              {formatQuantity(item.quantity, item.unit)}
                            </span>
                            <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                              {getStatus(item.expiryDate)}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-500">{formatDaysLeft(item.expiryDate)}</p>
                          {item.note ? <p className="max-w-2xl text-sm leading-6 text-neutral-600">{item.note}</p> : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveItem(item)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-400"
                        >
                          Details
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      <SurfaceSheet
        open={showAddSheet}
        onClose={() => {
          setShowAddSheet(false);
          setIsAdding(false);
        }}
        title="Add to Fridge"
        description="Start with a name or scan, confirm quantity, then choose where the item belongs."
        footer={
          <div className="flex flex-col gap-3">
            <PrimaryButton type="submit" form="inventory-add-form" disabled={isAdding || !newItemName.trim()}>
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {isAdding ? 'Checking freshness' : 'Save item'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning}>
              {isScanning ? <Loader2 size={18} className="animate-spin" /> : <ScanSearch size={18} />}
              {isScanning ? 'Scanning' : 'Use camera scan'}
            </SecondaryButton>
          </div>
        }
      >
        <form id="inventory-add-form" onSubmit={handleAddItem} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Item name</span>
            <input
              type="text"
              value={newItemName}
              onChange={(event) => setNewItemName(event.target.value)}
              placeholder="Eggs, basil, milk, bananas"
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Quantity</span>
              <div className="flex items-center rounded-2xl border border-neutral-200 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setNewItemQuantity((current) => Math.max(1, current - 1))}
                  className="px-3 py-3 text-neutral-500"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={newItemQuantity}
                  onChange={(event) => setNewItemQuantity(Math.max(1, parseInt(event.target.value, 10) || 1))}
                  className="w-full bg-transparent text-center text-sm font-medium outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNewItemQuantity((current) => current + 1)}
                  className="px-3 py-3 text-neutral-500"
                >
                  <Plus size={16} />
                </button>
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Unit</span>
              <select
                value={newItemUnit}
                onChange={(event) => setNewItemUnit(event.target.value)}
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

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Storage zone</p>
            <div className="grid gap-2">
              {[['Cold storage', COLD_ZONES], ['Dry storage', DRY_ZONES]].map(([label, zones]) => (
                <div key={label as string} className="space-y-2">
                  <p className="text-sm font-medium text-neutral-700">{label as string}</p>
                  <div className="flex flex-wrap gap-2">
                    {(zones as ZoneId[]).map((zoneId) => (
                      <button
                        key={zoneId}
                        type="button"
                        onClick={() => setSelectedZone(zoneId)}
                        className={cx(
                          'rounded-full border px-3 py-2 text-sm transition',
                          selectedZone === zoneId
                            ? 'border-neutral-950 bg-neutral-950 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400',
                        )}
                      >
                        {FRIDGE_ZONES[zoneId].name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </SurfaceSheet>

      <SurfaceSheet
        open={showMapSheet}
        onClose={() => setShowMapSheet(false)}
        title="Storage map"
        description="Use the visual map to inspect zones or jump into an item detail."
      >
        <FridgeVisual
          items={items}
          selectedZone={selectedZone}
          onZoneSelect={setSelectedZone}
          onItemClick={(item) => {
            setActiveItem(item);
            setShowMapSheet(false);
          }}
        />
      </SurfaceSheet>

      <SurfaceSheet
        open={Boolean(activeItem)}
        onClose={() => setActiveItem(null)}
        title={activeItem?.name || 'Item details'}
        description={activeItem ? `${formatDaysLeft(activeItem.expiryDate)} · ${FRIDGE_ZONES[activeItem.zoneId].name}` : ''}
        footer={
          activeItem ? (
            <div className="flex flex-col gap-3">
              <PrimaryButton type="button" onClick={() => removeItem(activeItem.id)}>
                <Trash2 size={18} />
                Remove from inventory
              </PrimaryButton>
            </div>
          ) : null
        }
      >
        {activeItem ? (
          <div className="space-y-5">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Freshness</p>
              <p className="mt-2 text-base font-semibold text-neutral-950">{getStatus(activeItem.expiryDate)}</p>
              {activeItem.note ? <p className="mt-2 text-sm leading-6 text-neutral-600">{activeItem.note}</p> : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Quantity</p>
              <div className="flex items-center justify-between rounded-3xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <button
                  type="button"
                  onClick={() => updateQuantity(activeItem.id, -1)}
                  className="rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-700"
                  disabled={activeItem.quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-neutral-950">{activeItem.quantity}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{activeItem.unit || 'item'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateQuantity(activeItem.id, 1)}
                  className="rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-700"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Move storage zone</p>
              <div className="grid gap-2">
                {ORDERED_ZONES.map((zoneId) => (
                  <button
                    key={zoneId}
                    type="button"
                    onClick={() => moveItem(activeItem.id, zoneId)}
                    className={cx(
                      'rounded-2xl border px-4 py-3 text-left text-sm transition',
                      activeItem.zoneId === zoneId
                        ? 'border-neutral-950 bg-neutral-950 text-white'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400',
                    )}
                  >
                    {FRIDGE_ZONES[zoneId].name}
                  </button>
                ))}
              </div>
              {!checkStorageOptimality(activeItem.zoneId, activeItem.recommendedStorage).isOptimal ? (
                <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-4 text-sm text-neutral-700">
                  {checkStorageOptimality(activeItem.zoneId, activeItem.recommendedStorage).message}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </SurfaceSheet>

      <ConfirmationDialog
        open={Boolean(warningData?.isOpen)}
        onClose={() => setWarningData(null)}
        title={
          warningData?.warningType === 'NOT_FOOD'
            ? 'This does not look like food'
            : warningData?.warningType === 'EXPIRED'
              ? 'Potential spoilage detected'
              : 'Storage mismatch'
        }
        description={
          <div className="space-y-3">
            <p>
              <strong className="text-neutral-950">{warningData?.name}</strong>{' '}
              {warningData?.warningType === 'NOT_FOOD'
                ? 'should not be added to the kitchen inventory.'
                : warningData?.warningType === 'EXPIRED'
                  ? 'appears to be expired or unsafe.'
                  : 'will keep longer in a different storage area.'}
            </p>
            <p>{warningData?.reasoning}</p>
            {warningData?.recommendedStorage && warningData.warningType !== 'EXPIRED' ? (
              <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                Recommended: {warningData.recommendedStorage}
              </p>
            ) : null}
          </div>
        }
        actions={
          warningData?.warningType === 'SUBOPTIMAL_ZONE' ? (
            <>
              <PrimaryButton
                type="button"
                onClick={() => {
                  if (recommendedZone) setSelectedZone(recommendedZone);
                  setWarningData(null);
                }}
              >
                <MoveRight size={18} />
                Switch to better zone
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => warningData.onConfirm?.()}>
                Add anyway
              </SecondaryButton>
            </>
          ) : warningData?.warningType === 'EXPIRED' ? (
            <>
              <PrimaryButton type="button" onClick={() => setWarningData(null)}>
                Discard
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => warningData.onConfirm?.()}>
                Add anyway
              </SecondaryButton>
            </>
          ) : (
            <PrimaryButton type="button" onClick={() => setWarningData(null)}>
              Close
            </PrimaryButton>
          )
        }
      />
    </div>
  );
};

export function getStatus(expiryDate: number) {
  const hoursLeft = (expiryDate - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft < 0) return 'Expired';
  if (hoursLeft < 48) return 'Soon';
  return 'Fresh';
}

export function formatDaysLeft(expiryDate: number) {
  const daysLeft = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}

export function formatQuantity(quantity: number, unit?: string) {
  const currentUnit = unit || 'item';
  if (currentUnit === 'item') return `${quantity} item${quantity === 1 ? '' : 's'}`;
  if (quantity > 1) {
    if (currentUnit === 'bunch') return `${quantity} bunches`;
    if (currentUnit === 'box') return `${quantity} boxes`;
    if (['carton', 'pack', 'btl', 'can', 'jar', 'bag', 'bowl', 'container', 'plate', 'slice'].includes(currentUnit)) {
      return `${quantity} ${currentUnit}s`;
    }
  }
  return `${quantity} ${currentUnit}`;
}

export function getRecommendedZone(recommendedStorage?: string) {
  if (!recommendedStorage) return ZoneId.LOWER_SHELVES;
  const recommended = recommendedStorage.toUpperCase();
  if (recommended.includes('PANTRY')) return ZoneId.PANTRY;
  if (recommended.includes('COUNTER')) return ZoneId.COUNTER;
  if (recommended.includes('FREEZER')) return ZoneId.FREEZER;
  if (recommended.includes('CRISPER')) return ZoneId.CRISPER_DRAWER;
  return ZoneId.LOWER_SHELVES;
}

export default InventoryManager;
