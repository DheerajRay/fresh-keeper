import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ZoneId, InventoryItem } from '../types';
import { Clock, AlertCircle, CheckCircle2, Snowflake, Home } from 'lucide-react';

interface FridgeVisualProps {
  onZoneSelect?: (zone: ZoneId) => void;
  selectedZone?: ZoneId | null;
  items?: InventoryItem[]; 
  onItemClick?: (item: InventoryItem) => void; 
}

const COLD_ZONES = [ZoneId.FREEZER, ZoneId.UPPER_SHELVES, ZoneId.LOWER_SHELVES, ZoneId.CRISPER_DRAWER, ZoneId.DOOR];
const DRY_ZONES = [ZoneId.PANTRY, ZoneId.KITCHEN_SHELVES, ZoneId.COUNTER];

const FridgeVisual: React.FC<FridgeVisualProps> = ({ 
  onZoneSelect, 
  selectedZone, 
  items = [], 
  onItemClick
}) => {
  const [tooltip, setTooltip] = useState<{ item: InventoryItem; rect: DOMRect } | null>(null);
  const [activeTab, setActiveTab] = useState<'cold' | 'dry'>('cold');

  // Auto-switch tabs if the selected zone changes externally (e.g., from App.tsx default)
  useEffect(() => {
    if (selectedZone) {
      if (COLD_ZONES.includes(selectedZone)) setActiveTab('cold');
      else if (DRY_ZONES.includes(selectedZone)) setActiveTab('dry');
    }
  }, [selectedZone]);

  // --- STYLES ---
  const getStatusStyles = (expiryDate: number) => {
    const now = Date.now();
    const diffHours = (expiryDate - now) / (1000 * 60 * 60);
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    if (diffHours < 0) return {
       border: 'border-l-red-500', 
       bg: 'bg-red-50',
       text: 'text-red-700',
       label: 'Expired',
       icon: AlertCircle,
       daysLeft
    };
    if (diffHours < 48) return {
       border: 'border-l-amber-500', 
       bg: 'bg-amber-50',
       text: 'text-amber-700',
       label: 'Eat Soon',
       icon: Clock,
       daysLeft
    };
    return {
       border: 'border-l-green-500', 
       bg: 'bg-white',
       text: 'text-slate-600',
       label: 'Fresh',
       icon: CheckCircle2,
       daysLeft
    };
  };

  // Helper to render items within a zone
  const renderZoneItems = (zoneId: ZoneId) => {
    const zoneItems = items.filter(i => i.zoneId === zoneId);
    
    return (
      <div className="flex flex-wrap content-start gap-2 p-2 w-full h-full overflow-y-auto z-20 pointer-events-auto custom-scrollbar min-h-[40px]">
        {zoneItems.map(item => {
          const style = getStatusStyles(item.expiryDate);
          const unit = item.unit || 'item';
          const isDiscrete = !['g', 'kg', 'ml', 'L', 'oz', 'lb'].includes(unit);
          const showBadge = isDiscrete && item.quantity > 1;
          
          return (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation(); 
                if (onItemClick) onItemClick(item);
              }}
              onMouseEnter={(e) => {
                 if (!onItemClick) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ item, rect });
                 }
              }}
              onMouseLeave={() => setTooltip(null)}
              className={`
                relative group transition-transform hover:scale-105 hover:z-30
                ${onItemClick ? 'cursor-pointer active:scale-95' : 'cursor-default'}
              `}
            >
              <div className={`
                 flex items-center gap-2 pl-2 pr-3 py-1.5 
                 rounded-md shadow-sm border border-slate-200 border-l-[3px] 
                 ${style.border} ${style.bg}
                 max-w-[120px] select-none
              `}>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-800 truncate leading-tight block w-full">
                    {item.name}
                  </span>
                  <span className={`text-[8px] sm:text-[9px] font-medium uppercase tracking-wider ${style.text}`}>
                    {style.label}
                  </span>
                </div>
              </div>

              {showBadge && (
                 <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow border border-white z-10 pointer-events-none">
                    {item.quantity}
                 </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getZoneStyles = (zone: ZoneId, type: 'cool' | 'warm') => {
    const isSelected = selectedZone === zone;
    const base = "transition-all duration-300 relative overflow-hidden group select-none flex flex-col";
    
    const isGuideMode = !!onZoneSelect;
    
    let activeClass = '';
    let inactiveClass = '';

    if (type === 'cool') {
        activeClass = 'bg-blue-100 border-blue-500 ring-2 ring-blue-300 z-10 scale-[1.02] shadow-md';
        inactiveClass = 'bg-white/80 border-slate-200 hover:border-blue-300 hover:bg-blue-50';
    } else {
        activeClass = 'bg-orange-100 border-orange-500 ring-2 ring-orange-300 z-10 scale-[1.02] shadow-md';
        inactiveClass = 'bg-white/80 border-stone-200 hover:border-orange-300 hover:bg-orange-50';
    }

    const interactionStyles = isGuideMode 
      ? `cursor-pointer border-2 shadow-sm rounded-lg ${isSelected ? activeClass : inactiveClass}`
      : `border-2 border-slate-300/50 bg-white/40 rounded-lg`;

    return `${base} ${interactionStyles}`;
  };

  const ZoneWrapper = ({ zone, className, label, type = 'cool' }: { zone: ZoneId, className: string, label: React.ReactNode, type?: 'cool' | 'warm' }) => (
    <div 
      className={`${getZoneStyles(zone, type)} ${className}`}
      onClick={() => {
         onZoneSelect && onZoneSelect(zone);
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none zone-label z-0">
         <span className={`text-xs md:text-sm font-bold text-center leading-tight zone-label ${type === 'warm' ? 'text-orange-900' : 'text-slate-900'}`}>{label}</span>
      </div>
      {renderZoneItems(zone)}
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      
      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-full mb-6 border border-slate-200 shadow-inner">
        <button
          onClick={() => setActiveTab('cold')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'cold' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Snowflake size={16} /> Cold Storage
        </button>
        <button
          onClick={() => setActiveTab('dry')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'dry' ? 'bg-white shadow-sm text-orange-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Home size={16} /> Dry Storage
        </button>
      </div>

      {/* Main Container */}
      <div className="relative w-full aspect-[3/5] max-h-[80vh] transition-all duration-300">
        
        {/* --- COLD STORAGE VIEW --- */}
        {activeTab === 'cold' && (
          <div className="w-full h-full bg-slate-100 rounded-3xl border-8 border-slate-300 shadow-xl p-4 flex flex-col gap-3 animate-fade-in relative overflow-hidden">
             {/* Visual Hinge/Handle Decoration */}
             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-32 bg-slate-300 rounded-l-md opacity-50"></div>

             <ZoneWrapper zone={ZoneId.FREEZER} className="h-[18%] bg-blue-50/30" label="Freezer" />

             <div className="flex-1 flex flex-col gap-2 min-h-0">
                <ZoneWrapper zone={ZoneId.UPPER_SHELVES} className="h-[28%]" label="Upper Shelves" />
                <ZoneWrapper zone={ZoneId.LOWER_SHELVES} className="h-[28%]" label="Lower Shelves" />
                <div className="flex-1 flex gap-2 min-h-0">
                    <ZoneWrapper zone={ZoneId.CRISPER_DRAWER} className="w-full h-full" label={<>Crisper<br/>Drawers</>} />
                </div>
             </div>

             <ZoneWrapper zone={ZoneId.DOOR} className="h-16 shrink-0 border-dashed !border-slate-300 !bg-slate-50" label="Door / Racks" />
          </div>
        )}

        {/* --- DRY STORAGE VIEW --- */}
        {activeTab === 'dry' && (
          <div className="w-full h-full bg-stone-100 rounded-xl border-8 border-stone-200 shadow-lg p-4 flex flex-col gap-3 animate-fade-in">
             
             <ZoneWrapper zone={ZoneId.PANTRY} className="flex-1" label="Pantry / Cupboard" type="warm" />
            
             <ZoneWrapper zone={ZoneId.KITCHEN_SHELVES} className="h-[25%]" label="Open Shelves / Spice Rack" type="warm" />
            
             <div className="h-[25%] relative group">
                 {/* Counter visual trick: make it look like a surface */}
                  <ZoneWrapper zone={ZoneId.COUNTER} className="h-full bg-stone-200" label="Countertop" type="warm" />
                  <div className="absolute bottom-0 left-0 w-full h-2 bg-stone-300 opacity-50 pointer-events-none"></div>
             </div>
          </div>
        )}

      </div>

      {/* Tooltip */}
      {tooltip && !onItemClick && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none transition-all duration-200"
          style={{
            left: tooltip.rect.left + (tooltip.rect.width / 2),
            top: tooltip.rect.top - 12,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {(() => {
            const style = getStatusStyles(tooltip.item.expiryDate);
            const unit = tooltip.item.unit || 'item';
            return (
              <div className="w-56 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl flex flex-col gap-2 border border-slate-700 relative animate-fade-in">
                  <div className="flex justify-between items-start border-b border-slate-700 pb-2">
                      <span className="font-bold text-sm text-slate-100">{tooltip.item.name}</span>
                      <span className="text-slate-300 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600">
                        {tooltip.item.quantity} {unit}
                      </span>
                  </div>
                  <div className="flex items-center gap-2">
                      <style.icon size={14} className={style.text.replace('text-', 'text-')} />
                      <span className="text-slate-300">{style.daysLeft < 0 ? 'Expired' : 'Expires in:'}</span>
                      <span className={`font-bold ml-auto ${style.text.replace('text-', 'text-light-')}`}>
                        {style.daysLeft < 0 ? `${Math.abs(style.daysLeft)} days ago` : `${style.daysLeft} days`}
                      </span>
                  </div>
                  {tooltip.item.note && (
                    <div className="bg-slate-800/50 p-2 rounded mt-1">
                      <p className="text-[10px] text-slate-400 italic leading-relaxed">
                        "{tooltip.item.note}"
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-900 rotate-45 border-r border-b border-slate-700"></div>
              </div>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
};

export default FridgeVisual;