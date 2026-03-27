import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { InventoryItem, MealSuggestion, DailyMealPlan, MealType, ShoppingItem, Shop, DietaryRestriction } from '../types';
import { getMealSuggestions, predictShopForItem } from '../services/openai';
import { DEFAULT_SHOPS, DIETARY_OPTIONS } from '../constants';
import { 
  Calendar, Sparkles, Loader2, Clock, ChevronRight, 
  ChefHat, Sun, Moon, Coffee, Utensils, X,
  AlertCircle, CheckCircle2, ShoppingCart, 
  Refrigerator, Trash2, Plus, Check, MessageSquare,
  Zap, Flame, Heart, Info, Quote, CalendarDays, HelpCircle, ArrowRightLeft,
  Filter
} from 'lucide-react';

const COOKING_STAPLES = [
  'water', 'tap water', 'salt', 'pepper', 'black pepper', 'ice', 
  'cooking spray', 'oil', 'olive oil', 'vegetable oil', 'butter'
];

const DIETARY_LABELS: Record<DietaryRestriction, string> = {
  'None': 'No Restrictions',
  'Vegetarian': 'Vegetarian',
  'Vegan': 'Vegan',
  'Gluten-Free': 'Gluten-Free',
  'Dairy-Free': 'Dairy-Free',
  'Keto': 'Keto',
  'Paleo': 'Paleo',
  'Low-Carb': 'Low-Carb'
};

const MealPlanner: React.FC = () => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [plans, setPlans] = useState<Record<string, MealSuggestion[]>>({});
  const [suggestionQueue, setSuggestionQueue] = useState<MealSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealSuggestion | null>(null);
  const [mealToPlan, setMealToPlan] = useState<MealSuggestion | null>(null);
  const [mealToReschedule, setMealToReschedule] = useState<{meal: MealSuggestion, currentDate: string} | null>(null);
  const [craving, setCraving] = useState('');
  const [selectedRestrictions, setSelectedRestrictions] = useState<DietaryRestriction[]>([]);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    const savedPlans = localStorage.getItem('freshkeeper_meal_plans');
    const savedQueue = localStorage.getItem('freshkeeper_suggestion_queue');
    const savedRestrictions = localStorage.getItem('freshkeeper_dietary_restrictions');
    if (savedPlans) setPlans(JSON.parse(savedPlans));
    if (savedQueue) setSuggestionQueue(JSON.parse(savedQueue));
    if (savedRestrictions) setSelectedRestrictions(JSON.parse(savedRestrictions));
  }, []);

  useEffect(() => {
    localStorage.setItem('freshkeeper_meal_plans', JSON.stringify(plans));
    checkTentativeUpgrades();
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('freshkeeper_suggestion_queue', JSON.stringify(suggestionQueue));
  }, [suggestionQueue]);

  useEffect(() => {
    localStorage.setItem('freshkeeper_dietary_restrictions', JSON.stringify(selectedRestrictions));
  }, [selectedRestrictions]);

  // Logic to "pull in" tentative meals if ingredients are now in inventory
  const checkTentativeUpgrades = () => {
    const tentativeMeals = plans['tentative'] || [];
    if (tentativeMeals.length === 0) return;

    const inventory: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_inventory') || '[]');
    let updated = false;
    const newTentative = [...tentativeMeals];
    const newPlans = { ...plans };

    for (let i = newTentative.length - 1; i >= 0; i--) {
      const meal = newTentative[i];
      const missingIngredients = meal.ingredients?.filter(ing => {
        const name = ing.name.toLowerCase().trim();
        return !inventory.some(item => item.name.toLowerCase().trim() === name) && !COOKING_STAPLES.includes(name);
      }) || [];

      if (missingIngredients.length === 0) {
        // All ingredients found! Move to the current selected date or first available
        const targetDate = selectedDate;
        newPlans[targetDate] = [...(newPlans[targetDate] || []), meal];
        newTentative.splice(i, 1);
        updated = true;
      }
    }

    if (updated) {
      setPlans({ ...newPlans, tentative: newTentative });
    }
  };

  const handleFetchIdeas = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    let inventory: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_inventory') || '[]');
    const suggestions = await getMealSuggestions(inventory, selectedDate, craving, selectedRestrictions);
    const enriched = suggestions.map(s => ({
      ...s,
      ingredients: s.ingredients?.map(ing => ({
        ...ing,
        inInventory: inventory.some(i => i.name.toLowerCase().trim() === ing.name.toLowerCase().trim())
      }))
    }));
    setSuggestionQueue(prev => {
        const newOnes = enriched.filter(s => !prev.some(p => p.title === s.title));
        return [...newOnes, ...prev].slice(0, 15);
    });
    setViewMode('list');
    setIsLoading(false);
    setCraving('');
  };

  const toggleRestriction = (restriction: DietaryRestriction) => {
    if (restriction === 'None') {
      setSelectedRestrictions([]);
      return;
    }
    setSelectedRestrictions(prev => 
      prev.includes(restriction) 
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const executePlan = async (meal: MealSuggestion, date: string | 'tentative') => {
    setIsClassifying(true);
    const inventory: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_inventory') || '[]');
    const savedShops = localStorage.getItem('freshkeeper_shops');
    const shops: Shop[] = savedShops ? JSON.parse(savedShops) : DEFAULT_SHOPS;
    
    const missingIngredients = meal.ingredients?.filter(ing => {
      const name = ing.name.toLowerCase().trim();
      const isInInventory = inventory.some(i => i.name.toLowerCase().trim() === name);
      const isStaple = COOKING_STAPLES.includes(name);
      return !isInInventory && !isStaple;
    }) || [];

    // Force to tentative if ingredients are missing, regardless of user date choice
    const finalDate = (missingIngredients.length > 0) ? 'tentative' : date;

    if (missingIngredients.length > 0) {
        const savedList = localStorage.getItem('freshkeeper_shopping_list');
        const shoppingList: ShoppingItem[] = savedList ? JSON.parse(savedList) : [];
        const newItems: ShoppingItem[] = await Promise.all(missingIngredients.map(async (ing) => {
            const predictedShopId = await predictShopForItem(ing.name, shops);
            return {
                id: crypto.randomUUID(),
                name: ing.name,
                quantity: 1,
                unit: 'item',
                category: 'AI Suggestion',
                reason: `Needed for ${meal.title}`,
                isChecked: false,
                shopId: predictedShopId || shops[0]?.id
            };
        }));
        localStorage.setItem('freshkeeper_shopping_list', JSON.stringify([...shoppingList, ...newItems]));
    }

    setPlans(prev => {
        const dayPlan = prev[finalDate] || [];
        if (dayPlan.some(m => m.title === meal.title)) return prev;
        return { ...prev, [finalDate]: [...dayPlan, meal] };
    });

    setSuggestionQueue(prev => prev.filter(s => s.id !== meal.id));
    setIsClassifying(false);
    setMealToPlan(null);

    if (finalDate === 'tentative' && missingIngredients.length > 0) {
      alert(`Sent to Tentative! We added missing ingredients to your shopping list. Once you buy them, we'll pull this meal into your calendar automatically.`);
    } else if (finalDate === 'tentative') {
      alert(`Sent to Tentative! You can schedule this anytime from the "My Plan" view.`);
    } else {
      alert(`${meal.title} added to your plan for ${new Date(finalDate).toLocaleDateString()}.`);
    }
  };

  const rescheduleMeal = (meal: MealSuggestion, oldDate: string, newDate: string | 'tentative') => {
    setPlans(prev => {
      const oldList = (prev[oldDate] || []).filter(m => m.id !== meal.id);
      const newList = [...(prev[newDate] || []), meal];
      return { ...prev, [oldDate]: oldList, [newDate]: newList };
    });
    setMealToReschedule(null);
  };

  const removeFromPlan = (date: string, mealId: string) => {
    setPlans(prev => ({
        ...prev,
        [date]: prev[date].filter(m => m.id !== mealId)
    }));
  };

  const removeFromQueue = (mealId: string) => {
    setSuggestionQueue(prev => prev.filter(s => s.id !== mealId));
  };

  const currentDayPlan = (plans[selectedDate] || []).map(meal => {
    const inventory: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_inventory') || '[]');
    return {
      ...meal,
      ingredients: meal.ingredients?.map(ing => ({
        ...ing,
        inInventory: inventory.some(i => i.name.toLowerCase().trim() === ing.name.toLowerCase().trim())
      }))
    };
  });

  const tentativeMeals = (plans['tentative'] || []).map(meal => {
    const inventory: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_inventory') || '[]');
    return {
      ...meal,
      ingredients: meal.ingredients?.map(ing => ({
        ...ing,
        inInventory: inventory.some(i => i.name.toLowerCase().trim() === ing.name.toLowerCase().trim())
      }))
    };
  });

  const getMealIcon = (type: string, size = 18) => {
    const t = type.toLowerCase();
    if (t.includes('breakfast')) return <Coffee className="text-amber-500" size={size} />;
    if (t.includes('brunch')) return <Utensils className="text-orange-500" size={size} />;
    if (t.includes('lunch')) return <Sun className="text-yellow-500" size={size} />;
    if (t.includes('snack')) return <HelpCircle className="text-green-500" size={size} />;
    if (t.includes('dinner')) return <Moon className="text-indigo-500" size={size} />;
    return <ChefHat size={size} />;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-xs shadow-inner">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar size={16} /> My Plan
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles size={16} /> Discovery
            {suggestionQueue.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded-full">{suggestionQueue.length}</span>
            )}
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm w-full max-w-2xl">
            <div className="flex items-center gap-2 text-slate-600 mb-3">
                <Filter size={16} className="text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Dietary Preferences</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(opt => {
                    const isSelected = opt.value === 'None' 
                      ? selectedRestrictions.length === 0 
                      : selectedRestrictions.includes(opt.value as DietaryRestriction);
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleRestriction(opt.value as DietaryRestriction)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                isSelected 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>

        {viewMode === 'calendar' && (
           <button 
           onClick={() => setViewMode('list')}
           className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
         >
           <Sparkles size={18} /> New Discovery
         </button>
        )}
      </div>

      {/* Date Strip */}
      <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
          {dates.map(dateStr => {
            const dateObj = new Date(dateStr);
            const isSelected = selectedDate === dateStr;
            const hasPlan = !!plans[dateStr] && plans[dateStr].length > 0;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center min-w-[70px] p-3 rounded-2xl border transition-all ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' 
                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-slate-700'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">
                  {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-xl font-black">{dateObj.getDate()}</span>
                {hasPlan && !isSelected && (
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1"></div>
                )}
              </button>
            );
          })}
          <button
                onClick={() => setSelectedDate('tentative')}
                className={`flex flex-col items-center min-w-[70px] p-3 rounded-2xl border transition-all ${
                  selectedDate === 'tentative' 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105' 
                    : 'bg-indigo-50 border-indigo-100 text-indigo-400 hover:border-indigo-300'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Later</span>
                <HelpCircle size={20} className="my-0.5" />
                {tentativeMeals.length > 0 && ! (selectedDate === 'tentative') && (
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1"></div>
                )}
          </button>
        </div>

      {/* View Logic */}
      {viewMode === 'calendar' ? (
          <div className="space-y-8">
              <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">
                    {selectedDate === 'tentative' 
                      ? 'Tentative & Wishlist' 
                      : `Plan for ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
                  </h3>
              </div>

              {selectedDate === 'tentative' && tentativeMeals.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-sm">
                  <Info className="shrink-0" size={18} />
                  <p>Meals are placed here if ingredients are missing or no date was set. Once ingredients are added to your inventory, these meals move to your active calendar automatically!</p>
                </div>
              )}

              {(selectedDate === 'tentative' ? tentativeMeals : currentDayPlan).length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
                      <ChefHat size={48} className="text-slate-200" />
                      <div className="max-w-xs">
                          <h3 className="text-lg font-bold text-slate-800">No meals planned yet</h3>
                          <p className="text-slate-500 text-sm mt-1">Check the Discovery tab to find recipes based on what's in your fridge!</p>
                      </div>
                      <button onClick={() => setViewMode('list')} className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all">
                        Explore Ideas
                      </button>
                  </div>
              ) : (
                  <div className="grid gap-4">
                      {(selectedDate === 'tentative' ? tentativeMeals : currentDayPlan).map(meal => (
                          <div key={meal.id} className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-blue-200 flex items-start justify-between gap-4">
                                <div className="flex-1 cursor-pointer" onClick={() => setSelectedMeal(meal)}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            {getMealIcon(meal.type)}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{meal.type}</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{meal.title}</h4>
                                    <p className="text-sm text-slate-500 mt-1">{meal.description}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button 
                                        onClick={() => removeFromPlan(selectedDate, meal.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove from plan"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setMealToReschedule({ meal, currentDate: selectedDate })}
                                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Reschedule / Move"
                                    >
                                        <CalendarDays size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setSelectedMeal(meal)}
                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      ) : (
          <div className="space-y-6">
              {/* Discovery Prompt Box */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                          <Sparkles size={24} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-slate-800">What do you feel like?</h3>
                          <p className="text-sm text-slate-500">The AI will build a plan around your cravings and dietary needs.</p>
                      </div>
                  </div>

                  <form onSubmit={handleFetchIdeas} className="space-y-4">
                      <div className="relative">
                          <MessageSquare className="absolute left-4 top-4 text-slate-400" size={20} />
                          <textarea 
                              value={craving}
                              onChange={(e) => setCraving(e.target.value)}
                              placeholder="e.g. 'Healthy Japanese dinner', 'High protein snacks', 'Comforting Italian lunch'..."
                              className="w-full min-h-[100px] pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 resize-none"
                          />
                      </div>
                      <button type="submit" disabled={isLoading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-3 disabled:bg-slate-300">
                          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                          {isLoading ? "Consulting with Chef Gemini..." : "Generate Meal Ideas"}
                      </button>
                  </form>
              </div>

              {/* Suggestions Bank */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <Utensils className="text-blue-500" size={20} />
                          Suggestions Bank
                      </h3>
                      {suggestionQueue.length > 0 && (
                          <button onClick={() => setSuggestionQueue([])} className="text-xs font-bold text-red-500 hover:underline">Clear All</button>
                      )}
                  </div>

                  {suggestionQueue.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                          <p className="text-slate-400">No ideas in the bank. Type a craving above!</p>
                      </div>
                  ) : (
                      <div className="grid gap-4">
                          {suggestionQueue.map(meal => {
                              const inventory: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_inventory') || '[]');
                              const missingCount = meal.ingredients?.filter(ing => {
                                  const name = ing.name.toLowerCase().trim();
                                  return !inventory.some(i => i.name.toLowerCase().trim() === name) && !COOKING_STAPLES.includes(name);
                              }).length || 0;

                              return (
                                <div key={meal.id} className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 flex items-start justify-between gap-4">
                                    <div className="flex-1 cursor-pointer" onClick={() => setSelectedMeal(meal)}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {getMealIcon(meal.type)}
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{meal.type}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-base">{meal.title}</h4>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {missingCount > 0 ? (
                                                <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100 flex items-center gap-1">
                                                    <ShoppingCart size={10} /> {missingCount} to buy
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-bold px-2 py-0.5 bg-green-50 text-green-600 rounded-md border border-green-100 flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Ready to cook
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => removeFromQueue(meal.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                            <Trash2 size={20} />
                                        </button>
                                        <button 
                                            onClick={() => setMealToPlan(meal)}
                                            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2 font-bold text-sm"
                                        >
                                            <Plus size={18} /> Plan
                                        </button>
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Date Picker Modal for Planning */}
      {(mealToPlan || mealToReschedule) && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-800">
                  {mealToPlan ? 'Schedule Meal' : 'Reschedule Meal'}
                </h3>
                <button onClick={() => { setMealToPlan(null); setMealToReschedule(null); }} className="p-2 hover:bg-white rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">Pick a day for <strong>{(mealToPlan || mealToReschedule?.meal)?.title}</strong>:</p>
                <div className="grid grid-cols-2 gap-2">
                  {dates.map(d => (
                    <button 
                      key={d}
                      onClick={() => mealToPlan ? executePlan(mealToPlan, d) : rescheduleMeal(mealToReschedule!.meal, mealToReschedule!.currentDate, d)}
                      className="p-3 text-sm font-bold border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
                    >
                      {new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </button>
                  ))}
                  <button 
                    onClick={() => mealToPlan ? executePlan(mealToPlan, 'tentative') : rescheduleMeal(mealToReschedule!.meal, mealToReschedule!.currentDate, 'tentative')}
                    className="p-3 text-sm font-bold bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all text-indigo-700 flex items-center gap-2"
                  >
                    <HelpCircle size={16} /> Not Sure Yet
                  </button>
                </div>
              </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- ENHANCED RECIPE MODAL --- */}
      {selectedMeal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[95vh] flex flex-col relative">
              <button onClick={() => setSelectedMeal(null)} className="absolute top-4 right-4 z-50 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg text-slate-500 hover:text-red-500 transition-all active:scale-95">
                <X size={24} />
              </button>

              <div className="relative bg-gradient-to-br from-indigo-600 to-blue-700 p-8 pt-12 text-white">
                  <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-3">
                         <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedMeal.type}</span>
                         <span className="px-3 py-1 bg-green-500/20 backdrop-blur-md border border-green-400/30 rounded-full text-[10px] font-bold flex items-center gap-1"><Zap size={10} /> {selectedMeal.flavorProfile || 'Flavorful'}</span>
                      </div>
                      <h3 className="text-3xl md:text-4xl font-black tracking-tight">{selectedMeal.title}</h3>
                      <p className="text-blue-100 text-sm md:text-base max-w-lg leading-relaxed">{selectedMeal.description}</p>
                      <div className="flex items-center gap-6 pt-4">
                          <div className="flex items-center gap-2"><Clock size={20} className="text-blue-200" /><span className="text-sm font-bold">{selectedMeal.prepTime || '20 min'}</span></div>
                          <div className="flex items-center gap-2"><Flame size={20} className="text-blue-200" /><span className="text-sm font-bold">{selectedMeal.difficulty || 'Medium'}</span></div>
                          <div className="flex items-center gap-2"><Heart size={20} className="text-blue-200" /><span className="text-sm font-bold">{selectedMeal.expiringItemsUsed.length} Saved</span></div>
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
                  {selectedMeal.chefTip && (
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-r-2xl relative overflow-hidden">
                        <Quote className="absolute -top-2 -right-2 text-indigo-100" size={80} />
                        <div className="relative z-10">
                            <h4 className="flex items-center gap-2 text-indigo-900 font-black uppercase tracking-widest text-xs mb-2"><ChefHat size={16} /> Chef's Secret</h4>
                            <p className="text-indigo-800 text-sm italic font-medium leading-relaxed">"{selectedMeal.chefTip}"</p>
                        </div>
                    </div>
                  )}

                  <section>
                    <div className="flex items-center justify-between mb-6"><h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Ingredients Pantry</h4><div className="h-px flex-1 bg-slate-100 ml-4"></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {selectedMeal.ingredients?.map((ing, i) => {
                         const name = ing.name.toLowerCase().trim();
                         const inventory: InventoryItem[] = JSON.parse(localStorage.getItem('fridge_inventory') || '[]');
                         const isInInventory = inventory.some(item => item.name.toLowerCase().trim() === name);
                         const isStaple = COOKING_STAPLES.includes(name);
                         return (
                            <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isInInventory ? 'bg-green-50/30 border-green-100' : isStaple ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${isInInventory ? 'bg-green-500' : isStaple ? 'bg-slate-300' : 'bg-amber-400'}`}></div>
                                    <div className="flex flex-col"><span className={`text-sm font-bold ${isInInventory ? 'text-slate-800' : 'text-slate-600'}`}>{ing.name}</span><span className="text-[10px] font-bold text-slate-400 uppercase">{ing.amount}</span></div>
                                </div>
                                {isInInventory ? <CheckCircle2 size={18} className="text-green-500" /> : isStaple ? <Info size={16} className="text-slate-300" /> : <ShoppingCart size={18} className="text-amber-500" />}
                            </div>
                         );
                       })}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-8"><h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Culinary Process</h4><div className="h-px flex-1 bg-slate-100 ml-4"></div></div>
                    <div className="space-y-8">
                       {selectedMeal.instructions?.map((step, i) => (
                         <div key={i} className="flex gap-6 group">
                            <div className="shrink-0 flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-xl group-hover:scale-110 transition-transform">{i + 1}</div>
                                {i < (selectedMeal.instructions?.length || 0) - 1 && <div className="w-1 flex-1 bg-slate-100 rounded-full"></div>}
                            </div>
                            <div className="pb-4"><p className="text-slate-700 text-sm md:text-base leading-relaxed font-medium">{step}</p></div>
                         </div>
                       ))}
                    </div>
                  </section>
              </div>

              <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setSelectedMeal(null)} className="flex-1 py-4 px-6 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-95">Close Recipe</button>
                  {suggestionQueue.some(s => s.id === selectedMeal.id) && (
                    <button onClick={() => setMealToPlan(selectedMeal)} className="flex-[2] py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                        <Plus size={20} strokeWidth={3} /> Schedule this Meal
                    </button>
                  )}
              </div>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MealPlanner;
