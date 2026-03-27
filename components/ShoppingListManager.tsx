import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingItem, InventoryItem, Shop } from '../types';
import { UNIT_OPTIONS, DEFAULT_SHOPS, SHOP_COLORS } from '../constants';
import { getShoppingSuggestions, predictShopForItem } from '../services/openai';
import { Sparkles, Loader2, Plus, Trash2, Check, ShoppingBag, RotateCcw, Minus, Store, Settings, X, Pencil, Save, Wand2 } from 'lucide-react';

const ShoppingListManager: React.FC = () => {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [suggestions, setSuggestions] = useState<ShoppingItem[]>([]);
  const [shops, setShops] = useState<Shop[]>(DEFAULT_SHOPS);
  const [isLoading, setIsLoading] = useState(false);
  
  // Tab/Filter State
  const [activeShopId, setActiveShopId] = useState<string | null>(null);

  // Modal States
  const [isManageShopsOpen, setIsManageShopsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  // New Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('item');
  const [newItemShopId, setNewItemShopId] = useState('');

  // Shop Management Form State
  const [newShopName, setNewShopName] = useState('');
  const [newShopColor, setNewShopColor] = useState('blue');

  // Load Data
  useEffect(() => {
    const savedList = localStorage.getItem('freshkeeper_shopping_list');
    if (savedList) setShoppingList(JSON.parse(savedList));

    const savedShops = localStorage.getItem('freshkeeper_shops');
    if (savedShops) setShops(JSON.parse(savedShops));
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem('freshkeeper_shopping_list', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem('freshkeeper_shops', JSON.stringify(shops));
  }, [shops]);

  // Sync shop dropdown with active tab
  useEffect(() => {
    if (activeShopId) setNewItemShopId(activeShopId);
  }, [activeShopId]);

  // Generate Suggestions
  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    
    const inventory: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_inventory') || '[]');
    const history: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_consumption_history') || '[]');
    
    // 1. Heuristic: Expiring Soon
    const now = Date.now();
    const expiringItems = inventory.filter(i => {
       const daysLeft = (i.expiryDate - now) / (1000 * 60 * 60 * 24);
       return daysLeft <= 2 && daysLeft > -5; 
    });

    const heuristicSuggestions: ShoppingItem[] = expiringItems.map(i => ({
      id: crypto.randomUUID(),
      name: i.name,
      quantity: 1,
      unit: i.unit,
      category: 'Expiring Soon',
      reason: 'Replacing item expiring soon',
      isChecked: false,
      shopId: shops[0]?.id // Default to first shop
    }));

    // 2. AI Suggestions
    const aiSuggestions = await getShoppingSuggestions(inventory, history, shops);
    
    const combined = [...heuristicSuggestions, ...aiSuggestions].filter(sug => 
       !shoppingList.some(existing => existing.name.toLowerCase() === sug.name.toLowerCase())
    );

    setSuggestions(combined);
    setIsLoading(false);
  };

  const addSuggestionToList = (item: ShoppingItem) => {
    setShoppingList(prev => [...prev, { ...item, category: 'User Added' }]);
    setSuggestions(prev => prev.filter(s => s.id !== item.id));
  };

  const addManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    const tempId = crypto.randomUUID();
    const initialShopId = newItemShopId || undefined;

    const newItem: ShoppingItem = {
      id: tempId,
      name: newItemName,
      quantity: newItemQuantity,
      unit: newItemUnit,
      category: 'User Added',
      isChecked: false,
      shopId: initialShopId
    };

    // Optimistic Add
    setShoppingList(prev => [...prev, newItem]);
    
    const nameToPredict = newItemName; // Capture for async closure

    // Reset Form
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnit('item');
    // keep shop selection for consecutive adds if user manually picked one, 
    // but if it was blank/generic, keep it blank for next add
    if (!activeShopId) setNewItemShopId(''); 

    // Smart Shop Assignment (Async)
    // Only if user didn't select a shop and we have shops configured
    if (!initialShopId && shops.length > 0) {
      try {
        const predictedShopId = await predictShopForItem(nameToPredict, shops);
        if (predictedShopId) {
           setShoppingList(prev => prev.map(item => 
             item.id === tempId ? { ...item, shopId: predictedShopId } : item
           ));
        }
      } catch (err) {
        console.warn("Auto-shop classification failed", err);
      }
    }
  };

  const toggleCheck = (id: string) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    ));
  };

  const removeShoppingItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const clearChecked = () => {
    setShoppingList(prev => prev.filter(item => !item.isChecked));
  };

  // --- Shop Management ---
  const addShop = () => {
    if (!newShopName.trim()) return;
    const newShop: Shop = {
      id: crypto.randomUUID(),
      name: newShopName,
      color: newShopColor
    };
    setShops(prev => [...prev, newShop]);
    setNewShopName('');
  };

  const deleteShop = (id: string) => {
    setShops(prev => prev.filter(s => s.id !== id));
    // Reset items belonging to this shop to generic
    setShoppingList(prev => prev.map(item => item.shopId === id ? { ...item, shopId: undefined } : item));
    if (activeShopId === id) setActiveShopId(null);
  };

  const getShopDetails = (id?: string) => {
    if (!id) return null;
    return shops.find(s => s.id === id);
  };

  const getShopColorStyles = (colorName: string) => {
    const theme = SHOP_COLORS.find(c => c.value === colorName) || SHOP_COLORS[0];
    return theme;
  };

  // --- Edit Item ---
  const saveEditedItem = () => {
    if (!editingItem || !editingItem.name.trim()) return;
    
    setShoppingList(prev => prev.map(item => 
      item.id === editingItem.id ? editingItem : item
    ));
    setEditingItem(null);
  };

  // Filter List based on Tab
  const displayedItems = activeShopId 
    ? shoppingList.filter(i => i.shopId === activeShopId) 
    : shoppingList;

  return (
    <div className="grid lg:grid-cols-12 gap-8 animate-fade-in items-start">
      
      {/* LEFT COLUMN: SUGGESTIONS (Spans 4 columns) */}
      <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100">
           <h2 className="text-xl font-bold text-indigo-900 mb-2 flex items-center gap-2">
             <Sparkles className="text-indigo-500" size={20} />
             Smart Suggestions
           </h2>
           <p className="text-sm text-indigo-700 mb-6">
             Based on recent removals and inventory analysis.
           </p>

           {suggestions.length === 0 ? (
             <div className="text-center py-8">
               <button 
                 onClick={handleGenerateSuggestions}
                 disabled={isLoading}
                 className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md disabled:bg-indigo-300 flex items-center justify-center gap-2 mx-auto"
               >
                 {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                 {isLoading ? 'Thinking...' : 'Generate Ideas'}
               </button>
             </div>
           ) : (
             <div className="space-y-3">
                {suggestions.map(item => {
                  const shop = getShopDetails(item.shopId);
                  const theme = shop ? getShopColorStyles(shop.color) : null;
                  return (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100 flex items-start gap-3 group hover:border-indigo-300 transition-colors">
                       <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                             <h4 className="font-bold text-slate-800">{item.name}</h4>
                             {theme && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${theme.bg} ${theme.text} ${theme.border}`}>
                                  {shop?.name}
                                </span>
                             )}
                          </div>
                          {item.reason && <p className="text-xs text-slate-500 mt-1 italic">"{item.reason}"</p>}
                          <div className="text-xs text-slate-400 mt-1 font-medium">
                              {item.quantity} {item.unit}
                          </div>
                       </div>
                       <button 
                         onClick={() => addSuggestionToList(item)}
                         className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                       >
                         <Plus size={20} />
                       </button>
                    </div>
                  );
                })}
                
                <button 
                  onClick={handleGenerateSuggestions} 
                  className="w-full py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors mt-4 flex items-center justify-center gap-2"
                >
                   <RotateCcw size={14} /> Refresh Suggestions
                </button>
             </div>
           )}
        </div>
      </div>

      {/* RIGHT COLUMN: MY LIST (Spans 8 columns) */}
      <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[600px]">
           
           {/* Header & Tabs */}
           <div className="bg-slate-50 border-b border-slate-200">
              <div className="p-6 pb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="text-slate-700" size={20} />
                    My Shopping List
                  </h2>
                  <button 
                    onClick={() => setIsManageShopsOpen(true)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                    title="Manage Shops"
                  >
                    <Settings size={20} />
                  </button>
              </div>

              {/* Shop Tabs */}
              <div className="flex items-center gap-2 px-6 overflow-x-auto pb-0 custom-scrollbar">
                  <button
                    onClick={() => setActiveShopId(null)}
                    className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap
                      ${!activeShopId 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                  >
                    All Items
                  </button>
                  {shops.map(shop => {
                     const theme = getShopColorStyles(shop.color);
                     const isActive = activeShopId === shop.id;
                     return (
                      <button
                        key={shop.id}
                        onClick={() => setActiveShopId(shop.id)}
                        className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2
                          ${isActive 
                            ? `border-${theme.value}-500 text-${theme.value}-700` 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                      >
                        {isActive && <div className={`w-2 h-2 rounded-full ${theme.bg.replace('bg-', 'bg-').replace('100', '500')}`}></div>}
                        {shop.name}
                      </button>
                     );
                  })}
              </div>
           </div>

           <div className="p-6 flex-1 flex flex-col">
              {/* Manual Add Form */}
              <form onSubmit={addManualItem} className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Add item (e.g. Milk)"
                      className="flex-[2] px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1 relative">
                        <select 
                            value={newItemShopId}
                            onChange={(e) => setNewItemShopId(e.target.value)}
                            className="w-full h-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
                        >
                            <option value="">Any Shop (Auto-Detect)</option>
                            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                           {newItemShopId === '' && shops.length > 0 ? <Wand2 size={14} className="text-blue-400" /> : null}
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <input 
                          type="number" 
                          min="1" 
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 text-center font-semibold text-slate-700 focus:outline-none appearance-none p-0 text-sm bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                    </div>

                    <div className="flex-1">
                        <select
                          value={newItemUnit}
                          onChange={(e) => setNewItemUnit(e.target.value)}
                          className="w-full h-full px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {UNIT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                    </div>

                    <button 
                      type="submit"
                      disabled={!newItemName.trim()}
                      className="px-6 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-300 transition-colors flex items-center justify-center font-bold"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
              </form>

              {/* The List */}
              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
                {displayedItems.length === 0 && (
                  <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                      <ShoppingBag size={48} className="mb-4 text-slate-200" />
                      <p>No items in this list.</p>
                  </div>
                )}
                
                {displayedItems.map(item => {
                   const shop = getShopDetails(item.shopId);
                   const theme = shop ? getShopColorStyles(shop.color) : null;

                   return (
                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all group animate-fade-in ${item.isChecked ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                        <button 
                          onClick={() => toggleCheck(item.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${item.isChecked ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-green-400'}`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-medium text-slate-800 truncate ${item.isChecked ? 'line-through text-slate-400' : ''}`}>
                                  {item.name}
                                </span>
                                {theme && !activeShopId && (
                                   <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${theme.bg} ${theme.text} ${theme.border} flex items-center gap-1`}>
                                      {shop?.name}
                                   </span>
                                )}
                            </div>
                            {!item.isChecked && (
                              <div className="text-xs text-slate-500 font-medium">
                                {item.quantity} {item.unit}
                              </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingItem(item)}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Item"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => removeShoppingItem(item.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove Item"
                            >
                              <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                   );
                })}
              </div>

              {/* Footer Actions */}
              {displayedItems.some(i => i.isChecked) && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                    <button 
                      onClick={clearChecked}
                      className="w-full py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Clear Checked Items
                    </button>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* --- MODAL: MANAGE SHOPS --- */}
      {isManageShopsOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <Store size={20} className="text-blue-500" />
                    Manage Stores
                  </h3>
                  <button 
                    onClick={() => setIsManageShopsOpen(false)}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
              </div>
              
              <div className="p-6">
                 {/* Existing Shops List */}
                 <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
                    {shops.map(shop => {
                      const theme = getShopColorStyles(shop.color);
                      return (
                        <div key={shop.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                           <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full ${theme.bg.replace('bg-', 'bg-').replace('100', '500')}`}></div>
                              <span className="font-medium text-slate-700">{shop.name}</span>
                           </div>
                           <button 
                              onClick={() => deleteShop(shop.id)}
                              className="text-slate-300 hover:text-red-500 p-1"
                              disabled={shops.length <= 1} // Prevent deleting last shop if needed, or just let them
                            >
                              <Trash2 size={16} />
                           </button>
                        </div>
                      );
                    })}
                 </div>

                 {/* Add New Shop */}
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Add New Store</h4>
                    <div className="space-y-3">
                       <input 
                         type="text" 
                         value={newShopName}
                         onChange={(e) => setNewShopName(e.target.value)}
                         placeholder="Store Name (e.g. Whole Foods)"
                         className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                       />
                       
                       <div className="flex gap-2 flex-wrap">
                          {SHOP_COLORS.map(c => (
                             <button
                               key={c.value}
                               onClick={() => setNewShopColor(c.value)}
                               className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${c.bg.replace('bg-', 'bg-').replace('100', '500')} ${newShopColor === c.value ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                             >
                               {newShopColor === c.value && <Check size={14} className="text-white" />}
                             </button>
                          ))}
                       </div>

                       <button 
                         onClick={addShop}
                         disabled={!newShopName.trim()}
                         className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:bg-slate-300 transition-colors"
                       >
                         Add Store
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: EDIT ITEM --- */}
      {editingItem && createPortal(
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-800">Edit Item</h3>
                  <button 
                    onClick={() => setEditingItem(null)}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
              </div>

              <div className="p-6 space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Item Name</label>
                    <input 
                      type="text" 
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                 </div>

                 <div className="flex gap-3">
                    <div className="flex-1">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Quantity</label>
                       <input 
                          type="number" 
                          min="1"
                          value={editingItem.quantity}
                          onChange={(e) => setEditingItem({...editingItem, quantity: parseInt(e.target.value) || 1})}
                          className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Unit</label>
                        <select 
                          value={editingItem.unit}
                          onChange={(e) => setEditingItem({...editingItem, unit: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                           {UNIT_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                           ))}
                        </select>
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Store</label>
                    <div className="grid grid-cols-2 gap-2">
                       <button
                         onClick={() => setEditingItem({...editingItem, shopId: undefined})}
                         className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${!editingItem.shopId ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                       >
                         Any / Generic
                       </button>
                       {shops.map(shop => {
                          const theme = getShopColorStyles(shop.color);
                          const isActive = editingItem.shopId === shop.id;
                          return (
                            <button
                              key={shop.id}
                              onClick={() => setEditingItem({...editingItem, shopId: shop.id})}
                              className={`px-3 py-2 text-sm rounded-lg border transition-all text-left truncate flex items-center gap-2
                                ${isActive 
                                  ? `bg-${theme.value}-500 text-white border-${theme.value}-600` 
                                  : 'bg-white border-slate-200 hover:border-slate-300'}`}
                            >
                               <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : theme.bg.replace('bg-', 'bg-').replace('100', '500')}`}></div>
                               {shop.name}
                            </button>
                          );
                       })}
                    </div>
                 </div>

                 <button 
                   onClick={saveEditedItem}
                   disabled={!editingItem.name.trim()}
                   className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors mt-2 flex items-center justify-center gap-2"
                 >
                   <Save size={18} /> Save Changes
                 </button>
              </div>
           </div>
         </div>,
         document.body
      )}
    </div>
  );
};

export default ShoppingListManager;
