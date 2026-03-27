import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { InventoryItem, ZoneId } from '../types';
import { FRIDGE_ZONES, UNIT_OPTIONS } from '../constants';
import { getShelfLifePrediction, identifyItemFromImage } from '../services/openai';
import FridgeVisual from './FridgeVisual';
import { Trash2, Plus, Clock, Loader2, Sparkles, Minus, List, Grid, Info, X, MapPin, Package, Camera, AlertTriangle, ArrowRight, Snowflake, Home, ThumbsUp, Ban } from 'lucide-react';

const COLD_ZONES = [ZoneId.UPPER_SHELVES, ZoneId.LOWER_SHELVES, ZoneId.CRISPER_DRAWER, ZoneId.DOOR, ZoneId.FREEZER];
const DRY_ZONES = [ZoneId.PANTRY, ZoneId.KITCHEN_SHELVES, ZoneId.COUNTER];

const InventoryManager: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('item');
  const [selectedZone, setSelectedZone] = useState<ZoneId>(ZoneId.LOWER_SHELVES);
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal State for Item Actions
  const [actingItem, setActingItem] = useState<InventoryItem | null>(null);

  // Warning Modal State
  const [warningData, setWarningData] = useState<{
    isOpen: boolean;
    name: string;
    isFood: boolean;
    recommendedStorage: string;
    reasoning: string;
    warningType: 'NOT_FOOD' | 'SUBOPTIMAL_ZONE' | 'EXPIRED';
    onConfirm?: () => void;
  } | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fridge_inventory');
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('fridge_inventory', JSON.stringify(items));
  }, [items]);

  // --- Helpers for Storage Logic ---
  const checkStorageOptimality = (zone: ZoneId, recommended: string | undefined) => {
    if (!recommended) return { isOptimal: true, type: 'UNKNOWN' };

    const recUpper = recommended.toUpperCase();
    
    // Determine target category based on AI recommendation
    const isTargetCold = recUpper.includes('FRIDGE') || recUpper.includes('FREEZER') || recUpper.includes('CRISPER');
    const isTargetDry = recUpper.includes('PANTRY') || recUpper.includes('COUNTER') || recUpper.includes('SHELF');

    // Determine current zone category
    const isCurrentCold = COLD_ZONES.includes(zone);
    const isCurrentDry = DRY_ZONES.includes(zone);

    if (isTargetCold && isCurrentDry) {
      return { isOptimal: false, type: 'NEEDS_COLD', message: 'Better stored in the Fridge or Freezer.' };
    }
    if (isTargetDry && isCurrentCold) {
       return { isOptimal: false, type: 'NEEDS_DRY', message: 'Better stored in the Pantry or Counter.' };
    }

    return { isOptimal: true, type: 'OK' };
  };

  const addToHistory = (item: InventoryItem) => {
    const historyKey = 'fridge_consumption_history';
    const savedHistory = localStorage.getItem(historyKey);
    let history: InventoryItem[] = savedHistory ? JSON.parse(savedHistory) : [];
    
    // Add new item to front
    history.unshift(item);
    
    // Limit history to last 50 items
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    localStorage.setItem(historyKey, JSON.stringify(history));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const base64Image = await resizeImage(file, 800);
      const result = await identifyItemFromImage(base64Image);
      
      if (!result.isFood) {
        setWarningData({
          isOpen: true,
          name: result.name || 'Unknown Item',
          isFood: false,
          recommendedStorage: result.recommendedStorage || 'OTHER',
          reasoning: result.reasoning || "This item does not appear to be food.",
          warningType: 'NOT_FOOD'
        });
        return;
      }

      populateForm(result);

    } catch (error) {
      console.error("Scan failed", error);
      alert("Could not identify item. Please try again.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const populateForm = (result: any) => {
      setNewItemName(result.name);
      setNewItemQuantity(result.quantity || 1);
      
      const foundUnit = UNIT_OPTIONS.find(u => u.value === result.unit || u.value === result.unit?.toLowerCase());
      setNewItemUnit(foundUnit ? foundUnit.value : 'item');

      if (result.zoneId && FRIDGE_ZONES[result.zoneId as ZoneId]) {
        setSelectedZone(result.zoneId as ZoneId);
      }
      
      if (result.name) {
         getShelfLifePrediction(result.name, FRIDGE_ZONES[result.zoneId as ZoneId || ZoneId.LOWER_SHELVES].name);
      }
  };

  const resizeImage = (file: File, maxWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsAdding(true);
    
    // AI Estimation & Validation
    const zoneName = FRIDGE_ZONES[selectedZone].name;
    const prediction = await getShelfLifePrediction(newItemName, zoneName);
    
    // 1. Not Food Check
    if (!prediction.isFood) {
       setIsAdding(false);
       setWarningData({
          isOpen: true,
          name: newItemName,
          isFood: false,
          recommendedStorage: prediction.recommendedStorage || 'OTHER',
          reasoning: "This item does not appear to be food or a kitchen supply.",
          warningType: 'NOT_FOOD'
       });
       return;
    }

    // Internal function to proceed with adding
    const commitItem = () => {
        const now = Date.now();
        const normalizedName = newItemName.trim().toLowerCase();

        setItems(prevItems => {
             // Check if item already exists in this zone
             const existingIndex = prevItems.findIndex(i => 
                 i.name.trim().toLowerCase() === normalizedName && i.zoneId === selectedZone
             );

             if (existingIndex >= 0) {
                 // Update existing item
                 const updatedItems = [...prevItems];
                 const existing = updatedItems[existingIndex];
                 
                 updatedItems[existingIndex] = {
                     ...existing,
                     quantity: (existing.quantity || 1) + newItemQuantity
                 };
                 return updatedItems;
             } else {
                 // Add new item
                 const expiryDate = now + (prediction.days * 24 * 60 * 60 * 1000);
                 const newItem: InventoryItem = {
                    id: crypto.randomUUID(),
                    name: newItemName,
                    zoneId: selectedZone,
                    addedDate: now,
                    expiryDate: expiryDate,
                    estimatedDays: prediction.days,
                    note: prediction.advice,
                    quantity: newItemQuantity,
                    unit: newItemUnit,
                    recommendedStorage: prediction.recommendedStorage
                 };
                 return [newItem, ...prevItems];
             }
        });

        // Reset form
        setNewItemName('');
        setNewItemQuantity(1);
        setNewItemUnit('item');
        setIsAdding(false);
        setWarningData(null);
    };

    // 2. Expired Check
    if (prediction.days <= 0) {
        setIsAdding(false);
        setWarningData({
            isOpen: true,
            name: newItemName,
            isFood: true,
            recommendedStorage: prediction.recommendedStorage,
            reasoning: prediction.advice || "This item is likely spoiled or past its safe consumption date.",
            warningType: 'EXPIRED',
            onConfirm: commitItem
        });
        return;
    }

    // 3. Optimal Storage Check
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
            onConfirm: commitItem
        });
        return;
    }

    commitItem();
  };

  const removeItem = (id: string) => {
    // Save to history before removing
    const itemToRemove = items.find(i => i.id === id);
    if (itemToRemove) {
      addToHistory(itemToRemove);
    }
    
    setItems(prev => prev.filter(item => item.id !== id));
    if (actingItem?.id === id) setActingItem(null);
  };
  
  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, (item.quantity || 1) + delta);
        if (actingItem?.id === id) {
            setActingItem({ ...item, quantity: newQty });
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const moveItem = (itemId: string, newZone: ZoneId) => {
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
             const updated = { ...item, zoneId: newZone };
             if (actingItem?.id === itemId) setActingItem(updated);
             return updated;
        }
        return item;
      }));
  };

  const getStatus = (expiryDate: number) => {
    const now = Date.now();
    const diffHours = (expiryDate - now) / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'expired';
    if (diffHours < 48) return 'expiring'; 
    return 'good';
  };

  const formatQuantity = (qty: number, unit?: string) => {
    const u = unit || 'item';
    if (u === 'item') return `x ${qty}`;
    
    // Improved pluralization
    if (qty > 1) {
      if (u === 'bunch') return `${qty} bunches`;
      if (u === 'box') return `${qty} boxes`;
      if (['carton', 'pack', 'btl', 'can', 'jar', 'bag', 'bowl', 'container', 'plate', 'slice'].includes(u)) {
        return `${qty} ${u}s`;
      }
    }
    return `${qty} ${u}`;
  };

  // Group items by ZoneId
  const ORDERED_ZONES = [
      ZoneId.UPPER_SHELVES, ZoneId.LOWER_SHELVES, ZoneId.CRISPER_DRAWER, ZoneId.DOOR, ZoneId.FREEZER,
      ZoneId.PANTRY, ZoneId.KITCHEN_SHELVES, ZoneId.COUNTER
  ];

  const groupedItems = ORDERED_ZONES.map(zoneId => ({
    zoneId,
    items: items.filter(i => i.zoneId === zoneId).sort((a, b) => a.expiryDate - b.expiryDate)
  })).filter(g => g.items.length > 0);

  const expiringCount = items.filter(i => getStatus(i.expiryDate) !== 'good').length;

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Header Stats & View Toggle */}
      <div className="flex flex-col gap-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-blue-600">
              {items.length}
            </span>
            <span className="text-sm text-slate-500 uppercase tracking-wide font-medium">Unique Items</span>
          </div>
          <div className={`p-4 rounded-2xl shadow-sm border flex flex-col items-center justify-center text-center
            ${expiringCount > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <span className={`text-3xl font-bold ${expiringCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {expiringCount}
            </span>
            <span className={`text-sm uppercase tracking-wide font-medium ${expiringCount > 0 ? 'text-red-400' : 'text-green-600/70'}`}>
              Need Attention
            </span>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-center w-full max-w-xs">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List size={16} /> List View
          </button>
          <button
            onClick={() => setViewMode('visual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'visual' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Grid size={16} /> Visual View
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Plus className="text-blue-500" size={20} />
              Add Item
          </h3>
          
          {/* Scan Button */}
          <div className="relative">
             <input 
               type="file" 
               accept="image/*" 
               capture="environment"
               ref={fileInputRef}
               className="hidden"
               onChange={handleImageUpload}
               disabled={isScanning}
             />
             <button
               onClick={() => fileInputRef.current?.click()}
               disabled={isScanning}
               className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold transition-colors border border-blue-200"
             >
                {isScanning ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Camera size={16} />
                )}
                {isScanning ? 'Scanning...' : 'Scan Item'}
             </button>
          </div>
        </div>

        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-[2]">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Eggs, Rice, Bananas"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            
            {/* Custom Quantity Input with +/- Buttons */}
            <div className="flex-[1] min-w-[110px] flex items-center bg-slate-50 border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                className="p-3 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <Minus size={16} />
              </button>
              <input 
                type="number" 
                min="1" 
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-transparent text-center font-semibold text-slate-700 focus:outline-none appearance-none p-0"
              />
              <button
                type="button"
                onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                className="p-3 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="flex-[1.5]">
              <select
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none"
              >
                {UNIT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Snowflake size={12} /> Cold Storage
            </label>
            <div className="flex gap-2 flex-wrap">
                {COLD_ZONES.map(id => (
                <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedZone(id)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all
                    ${selectedZone === id 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >
                    {FRIDGE_ZONES[id].name.replace('Shelves', '')}
                </button>
                ))}
            </div>

            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mt-3">
                <Home size={12} /> Dry Storage
            </label>
            <div className="flex gap-2 flex-wrap">
                {DRY_ZONES.map(id => (
                <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedZone(id)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all
                    ${selectedZone === id 
                        ? 'bg-orange-600 text-white border-orange-600' 
                        : 'bg-white text-slate-600 border-stone-200 hover:border-orange-300'}`}
                >
                    {FRIDGE_ZONES[id].name}
                </button>
                ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isAdding || !newItemName}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:bg-slate-300 transition-colors flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Checking Shelf Life...
              </>
            ) : (
              <>
                <Sparkles size={18} className="text-yellow-400" />
                Add to Inventory
              </>
            )}
          </button>
        </form>
      </div>

      {/* --- Visual View --- */}
      {viewMode === 'visual' && (
        <div className="relative animate-fade-in flex flex-col items-center gap-6">
          <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4 text-center text-sm text-blue-800 flex items-center justify-center gap-2">
            <Info size={16} />
            <span>Click an item to change quantity, move it, or remove it.</span>
          </div>

          <div className="w-full flex justify-center">
             <FridgeVisual 
                items={items} 
                onItemClick={setActingItem}
             />
          </div>
        </div>
      )}

      {/* --- List View --- */}
      {viewMode === 'list' && (
        <div className="space-y-6 animate-fade-in">
          {items.length === 0 && (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border-dashed border-2 border-slate-200">
              <p>Your inventory is empty.</p>
              <p className="text-sm mt-1">Add items to track their freshness!</p>
            </div>
          )}

          {groupedItems.map((group) => (
            <div key={group.zoneId} className="space-y-3">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider pl-1 border-b border-slate-100 pb-1">
                {FRIDGE_ZONES[group.zoneId].name}
              </h4>
              <div className="grid gap-3">
                {group.items.map(item => {
                  const status = getStatus(item.expiryDate);
                  const daysLeft = Math.ceil((item.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
                  const quantity = item.quantity || 1;

                  return (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4 group">
                      <div className="flex-1 w-full">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md border border-slate-200 whitespace-nowrap">
                                {formatQuantity(quantity, item.unit)}
                              </span>
                              <h5 className="font-semibold text-slate-800 text-lg break-words">{item.name}</h5>
                              {status === 'expired' && <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">Expired</span>}
                              {status === 'expiring' && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">Eat Soon</span>}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1 mt-2">
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <Clock size={12} className="shrink-0" />
                                <span>
                                {daysLeft < 0 ? `${Math.abs(daysLeft)} days ago` : `${daysLeft} days left`}
                                </span>
                            </div>
                          </div>
                          {item.note && (
                            <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md mt-1 leading-relaxed">
                              {item.note}
                            </p>
                          )}
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              status === 'good' ? 'bg-green-500' : 
                              status === 'expiring' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, (daysLeft / item.estimatedDays) * 100))}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
                              disabled={quantity <= 1}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                        </div>
                      
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* ... (Portals unchanged) ... */}
      {actingItem && createPortal(
          // ... existing code ...
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
             {/* ... */}
             <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <h3 className="font-bold text-lg text-slate-800">{actingItem.name}</h3>
               <button 
                 onClick={() => setActingItem(null)}
                 className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-200"
               >
                 <X size={18} />
               </button>
            </div>

            <div className="p-6 space-y-6">
              {/* ... Content ... */}
               {(() => {
                    const daysLeft = Math.ceil((actingItem.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
                    const status = getStatus(actingItem.expiryDate);
                    return (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                             <div className="flex items-center justify-between mb-3">
                                 <div className="flex items-center gap-2">
                                    <Clock size={16} className={daysLeft < 0 ? "text-red-500" : "text-slate-400"} />
                                    <span className={`font-medium text-sm ${daysLeft < 0 ? "text-red-600" : "text-slate-700"}`}>
                                        {daysLeft < 0 ? `${Math.abs(daysLeft)} days expired` : `${daysLeft} days left`}
                                    </span>
                                 </div>
                                 {status === 'expired' && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-red-200">Expired</span>}
                                 {status === 'expiring' && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-yellow-200">Eat Soon</span>}
                                 {status === 'good' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-green-200">Fresh</span>}
                             </div>

                             {actingItem.note && (
                                <div className="text-sm text-blue-800 bg-blue-50/80 p-3 rounded-lg border border-blue-100 leading-relaxed">
                                    {actingItem.note}
                                </div>
                             )}
                             
                             {/* Mini Progress Bar */}
                             <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      status === 'good' ? 'bg-green-500' : 
                                      status === 'expiring' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.max(0, Math.min(100, (daysLeft / actingItem.estimatedDays) * 100))}%` }}
                                  ></div>
                             </div>
                        </div>
                    );
                })()}

                 <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</label>
                 <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 p-2">
                    <button 
                      onClick={() => updateQuantity(actingItem.id, -1)}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 active:scale-95 transition-transform"
                      disabled={actingItem.quantity <= 1}
                    >
                      <Minus size={18} />
                    </button>
                    <div className="flex flex-col items-center">
                         <span className="text-xl font-bold text-slate-700">{actingItem.quantity}</span>
                         <span className="text-[10px] text-slate-400 font-bold uppercase">{actingItem.unit || 'item'}</span>
                    </div>
                    <button 
                      onClick={() => updateQuantity(actingItem.id, 1)}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-blue-600 active:scale-95 transition-transform"
                    >
                      <Plus size={18} />
                    </button>
                 </div>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      value={actingItem.zoneId}
                      onChange={(e) => moveItem(actingItem.id, e.target.value as ZoneId)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                    >
                      {Object.values(FRIDGE_ZONES).map(zone => (
                        <option key={zone.id} value={zone.id}>{zone.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* ... warning logic ... */}
                  {(() => {
                    const opt = checkStorageOptimality(actingItem.zoneId, actingItem.recommendedStorage);
                    if (!opt.isOptimal) {
                      return (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 animate-fade-in">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs font-semibold text-amber-800 mb-1">{opt.message}</p>
                                <p className="text-[10px] text-amber-700 leading-tight">
                                    Keeping items in the optimal zone extends shelf life significantly.
                                </p>
                                <button
                                    onClick={() => {
                                        const target = opt.type === 'NEEDS_COLD' ? ZoneId.LOWER_SHELVES : ZoneId.PANTRY;
                                        moveItem(actingItem.id, target);
                                    }}
                                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded shadow-sm text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                                >
                                    Move to {opt.type === 'NEEDS_COLD' ? 'Fridge' : 'Pantry'} <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
               </div>

                <div className="pt-2">
                 <button 
                   onClick={() => removeItem(actingItem.id)}
                   className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                   aria-label="Remove item"
                 >
                   <Trash2 size={18} />
                   Remove from Inventory
                 </button>
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- Warning Modal --- */}
      {warningData && warningData.isOpen && createPortal(
         // ... existing warning modal code ...
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border-t-8 border-amber-500">
             <div className="p-6 text-center space-y-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    warningData.warningType === 'EXPIRED' ? 'bg-red-100 text-red-600' :
                    warningData.isFood ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                }`}>
                   {warningData.warningType === 'NOT_FOOD' && <AlertTriangle size={32} />}
                   {warningData.warningType === 'SUBOPTIMAL_ZONE' && <Snowflake size={32} />}
                   {warningData.warningType === 'EXPIRED' && <Trash2 size={32} />}
                </div>
                
                <h3 className="text-xl font-bold text-slate-900">
                  {warningData.warningType === 'NOT_FOOD' ? "Non-Kitchen Item" : 
                   warningData.warningType === 'EXPIRED' ? "Spoilage Alert" :
                   "Check Storage Location"}
                </h3>
                
                <p className="text-slate-600 leading-relaxed">
                   <strong className="text-slate-800">{warningData.name}</strong> 
                   {warningData.warningType === 'NOT_FOOD' ? " does not belong in your kitchen inventory." :
                    warningData.warningType === 'EXPIRED' ? " appears to be expired or spoiled." :
                    " lasts longer when stored correctly."}
                </p>

                {warningData.isFood && warningData.recommendedStorage && warningData.warningType !== 'EXPIRED' && (
                    <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg font-medium text-sm inline-block border border-blue-100">
                        Recommended: {warningData.recommendedStorage}
                    </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 italic">
                   "{warningData.reasoning}"
                </div>
             </div>

             <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                {warningData.warningType === 'NOT_FOOD' || warningData.warningType === 'EXPIRED' ? (
                   <>
                       <button 
                          onClick={() => setWarningData(null)}
                          className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                       >
                          {warningData.warningType === 'EXPIRED' ? <><Trash2 size={18}/> Discard Item</> : "Okay, I'll remove it"}
                       </button>
                       {warningData.warningType === 'EXPIRED' && (
                           <button 
                             onClick={warningData.onConfirm}
                             className="w-full py-3 text-slate-400 text-xs hover:text-slate-600 transition-colors"
                           >
                             Add to inventory anyway
                           </button>
                       )}
                   </>
                ) : (
                   <>
                       <button 
                        onClick={() => {
                             // Smart Fix: Auto-select a better zone before closing
                             const rec = warningData.recommendedStorage?.toUpperCase() || '';
                             let betterZone = ZoneId.LOWER_SHELVES;
                             
                             if (rec.includes('PANTRY')) betterZone = ZoneId.PANTRY;
                             else if (rec.includes('COUNTER')) betterZone = ZoneId.COUNTER;
                             else if (rec.includes('FREEZER')) betterZone = ZoneId.FREEZER;
                             else betterZone = ZoneId.LOWER_SHELVES; // Default to fridge for safety
                             
                             setSelectedZone(betterZone);
                             setWarningData(null);
                        }}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                         <ThumbsUp size={16} /> Change Location
                      </button>
                      <button 
                        onClick={warningData.onConfirm}
                        className="w-full py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
                      >
                         Add Anyway
                      </button>
                   </>
                )}
             </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default InventoryManager;
