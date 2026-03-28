import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, Refrigerator } from 'lucide-react';
import { InventoryItem, ZoneId } from '../types';
import { FRIDGE_ZONES } from '../constants';
import { SegmentedControl, cx } from './ui';

interface FridgeVisualProps {
  onZoneSelect?: (zone: ZoneId) => void;
  selectedZone?: ZoneId | null;
  items?: InventoryItem[];
  onItemClick?: (item: InventoryItem) => void;
}

const COLD_ZONES = [ZoneId.FREEZER, ZoneId.UPPER_SHELVES, ZoneId.LOWER_SHELVES, ZoneId.CRISPER_DRAWER, ZoneId.DOOR];
const DRY_ZONES = [ZoneId.PANTRY, ZoneId.KITCHEN_SHELVES, ZoneId.COUNTER];

export const getFreshnessLabel = (expiryDate: number) => {
  const hoursLeft = (expiryDate - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft < 0) return 'Expired';
  if (hoursLeft < 48) return 'Soon';
  return 'Fresh';
};

const FridgeVisual: React.FC<FridgeVisualProps> = ({
  onZoneSelect,
  selectedZone,
  items = [],
  onItemClick,
}) => {
  const [activeView, setActiveView] = useState<'cold' | 'dry'>('cold');
  const [tooltip, setTooltip] = useState<{ item: InventoryItem; rect: DOMRect } | null>(null);

  useEffect(() => {
    if (!selectedZone) return;
    setActiveView(COLD_ZONES.includes(selectedZone) ? 'cold' : 'dry');
  }, [selectedZone]);

  const zoneGroups = activeView === 'cold' ? COLD_ZONES : DRY_ZONES;

  return (
    <div className="space-y-4">
      <SegmentedControl<'cold' | 'dry'>
        value={activeView}
        onChange={(value) => setActiveView(value)}
        options={[
          { value: 'cold', label: 'Cold storage' },
          { value: 'dry', label: 'Dry storage' },
        ]}
      />

      <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-3">
        <div className={cx('grid gap-3', activeView === 'cold' ? 'grid-cols-1' : 'grid-cols-1')}>
          {zoneGroups.map((zoneId) => {
            const zoneItems = items.filter((item) => item.zoneId === zoneId);
            const isSelected = selectedZone === zoneId;
            const isGuideMode = Boolean(onZoneSelect);
            return (
              <div
                key={zoneId}
                onClick={() => onZoneSelect?.(zoneId)}
                className={cx(
                  'rounded-3xl border bg-white p-4 text-left transition',
                  isSelected ? 'border-neutral-950 shadow-sm' : 'border-neutral-200',
                  isGuideMode ? 'cursor-pointer hover:border-neutral-400' : 'cursor-default',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {COLD_ZONES.includes(zoneId) ? (
                        <Refrigerator size={16} className="text-neutral-500" />
                      ) : (
                        <Home size={16} className="text-neutral-500" />
                      )}
                      <p className="text-sm font-semibold text-neutral-950">{FRIDGE_ZONES[zoneId].name}</p>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{FRIDGE_ZONES[zoneId].temperature}</p>
                  </div>
                  <span className="text-xs text-neutral-500">{zoneItems.length} items</span>
                </div>

                <div className="mt-4 flex min-h-[48px] flex-wrap gap-2">
                  {zoneItems.length === 0 ? (
                    <span className="text-xs text-neutral-400">No items here.</span>
                  ) : (
                    zoneItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onItemClick?.(item);
                        }}
                        onMouseEnter={(event) => {
                          if (onItemClick) return;
                          setTooltip({ item, rect: event.currentTarget.getBoundingClientRect() });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        className={cx(
                          'rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition',
                          onItemClick ? 'hover:border-neutral-950 hover:text-neutral-950' : 'cursor-default',
                        )}
                      >
                        {item.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {tooltip
        ? createPortal(
            <div
              className="fixed z-[150] w-56 -translate-x-1/2 -translate-y-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white shadow-2xl"
              style={{
                left: tooltip.rect.left + tooltip.rect.width / 2,
                top: tooltip.rect.top - 8,
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-2">
                <span className="font-semibold">{tooltip.item.name}</span>
                <span className="text-neutral-400">
                  {tooltip.item.quantity} {tooltip.item.unit || 'item'}
                </span>
              </div>
              <p className="mt-2 text-neutral-300">{getFreshnessLabel(tooltip.item.expiryDate)}</p>
              {tooltip.item.note ? <p className="mt-2 leading-5 text-neutral-400">{tooltip.item.note}</p> : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default FridgeVisual;
