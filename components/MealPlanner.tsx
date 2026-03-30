import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Loader2, RefreshCw, ShoppingCart, Trash2 } from 'lucide-react';
import { DEFAULT_SHOPS, DIETARY_OPTIONS } from '../constants';
import {
  AssignedMeal,
  DietaryRestriction,
  DiscoveredMeal,
  InventoryItem,
  MealSuggestion,
  PlanIdea,
  Shop,
  ShoppingItem,
} from '../types';
import { getDiscoverMealIdeas, getPlanMealIdeas } from '../services/openai';
import {
  getLocalDietaryRestrictions,
  getLocalMealPlans,
  getLocalMealSuggestionQueue,
  getLocalShoppingList,
  getLocalShops,
  hydrateDietaryRestrictions,
  hydrateMealPlans,
  hydrateMealSuggestionQueue,
  replaceRemoteDietaryRestrictions,
  replaceRemoteMealPlans,
  replaceRemoteMealSuggestionQueue,
  replaceRemoteShoppingList,
  setLocalDietaryRestrictions,
  setLocalMealPlans,
  setLocalMealSuggestionQueue,
  setLocalShoppingList,
} from '../lib/appData';
import { classifyShoppingItemStoreType, ensureDefaultShops, getDefaultShopForType } from '../lib/storeRouting';
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

const COOKING_STAPLES = [
  'water',
  'tap water',
  'salt',
  'pepper',
  'black pepper',
  'ice',
  'cooking spray',
  'oil',
  'olive oil',
  'vegetable oil',
  'butter',
];

const PLAN_BANK_KEY = '__plan_bank__';

type PlannerMode = 'plan' | 'discover';
type GeneratorMode = 'plan' | 'discover' | null;

const MealPlanner: React.FC = () => {
  const [mode, setMode] = useState<PlannerMode>('plan');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [plans, setPlans] = useState<Record<string, MealSuggestion[]>>(() => getLocalMealPlans());
  const [discoverQueue, setDiscoverQueue] = useState<DiscoveredMeal[]>(() => getLocalMealSuggestionQueue() as DiscoveredMeal[]);
  const [activeGenerator, setActiveGenerator] = useState<GeneratorMode>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealSuggestion | null>(null);
  const [planIdeaToSchedule, setPlanIdeaToSchedule] = useState<PlanIdea | null>(null);
  const [mealToReschedule, setMealToReschedule] = useState<{ meal: AssignedMeal; currentDate: string } | null>(null);
  const [craving, setCraving] = useState('');
  const [selectedRestrictions, setSelectedRestrictions] = useState<DietaryRestriction[]>(() => getLocalDietaryRestrictions());
  const [remoteHydrated, setRemoteHydrated] = useState(false);
  const autoPlanGeneratedRef = useRef(false);

  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index);
        return date.toISOString().split('T')[0];
      }),
    [],
  );

  useEffect(() => {
    let active = true;

    Promise.all([
      hydrateMealPlans(getLocalMealPlans()),
      hydrateMealSuggestionQueue(getLocalMealSuggestionQueue()),
      hydrateDietaryRestrictions(getLocalDietaryRestrictions()),
    ]).then(([remotePlans, remoteQueue, remoteRestrictions]) => {
      if (!active) return;
      setPlans(remotePlans);
      setDiscoverQueue((remoteQueue as DiscoveredMeal[]) || []);
      setSelectedRestrictions(remoteRestrictions);
      setRemoteHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setLocalMealPlans(plans);
    if (remoteHydrated) {
      void replaceRemoteMealPlans(plans);
    }
  }, [plans, remoteHydrated]);

  useEffect(() => {
    setLocalMealSuggestionQueue(discoverQueue);
    if (remoteHydrated) {
      void replaceRemoteMealSuggestionQueue(discoverQueue);
    }
  }, [discoverQueue, remoteHydrated]);

  useEffect(() => {
    setLocalDietaryRestrictions(selectedRestrictions);
    if (remoteHydrated) {
      void replaceRemoteDietaryRestrictions(selectedRestrictions);
    }
  }, [remoteHydrated, selectedRestrictions]);

  const inventory = getInventory();
  const historySummary = useMemo(() => buildMealHistorySummary(plans), [plans]);
  const planBank = useMemo(() => enrichMeals((plans[PLAN_BANK_KEY] || []) as PlanIdea[], inventory) as PlanIdea[], [inventory, plans]);
  const assignedMeals = useMemo(
    () => enrichMeals((plans[selectedDate] || []) as AssignedMeal[], inventory) as AssignedMeal[],
    [inventory, plans, selectedDate],
  );
  const plannedCount = useMemo(
    () =>
      Object.entries(plans)
        .filter(([bucketKey]) => bucketKey !== PLAN_BANK_KEY)
        .flatMap(([, meals]) => meals)
        .filter(Boolean).length,
    [plans],
  );

  useEffect(() => {
    if (!remoteHydrated || autoPlanGeneratedRef.current || inventory.length === 0 || planBank.length > 0) return;
    autoPlanGeneratedRef.current = true;
    void generatePlanBank();
  }, [inventory.length, planBank.length, remoteHydrated]);

  const toggleRestriction = (restriction: DietaryRestriction) => {
    if (restriction === 'None') {
      setSelectedRestrictions([]);
      return;
    }
    setSelectedRestrictions((current) =>
      current.includes(restriction)
        ? current.filter((entry) => entry !== restriction)
        : [...current, restriction],
    );
  };

  const generatePlanBank = async () => {
    setActiveGenerator('plan');
    const ideas = await getPlanMealIdeas(inventory, selectedDate, selectedRestrictions, historySummary);
    setPlans((current) => ({ ...current, [PLAN_BANK_KEY]: uniqueMeals(ideas) }));
    setActiveGenerator(null);
  };

  const handleFetchDiscoverIdeas = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setActiveGenerator('discover');
    const meals = await getDiscoverMealIdeas(inventory, craving, selectedRestrictions, historySummary);
    setDiscoverQueue((current) => uniqueMeals([...meals, ...current]) as DiscoveredMeal[]);
    setMode('discover');
    setActiveGenerator(null);
    setCraving('');
  };

  const schedulePlanIdea = (meal: PlanIdea, date: string) => {
    const assigned = toAssignedMeal(meal, 'plan_bank');
    setPlans((current) => {
      const existing = current[date] || [];
      if (existing.some((entry) => entry.id === assigned.id || entry.title === assigned.title)) return current;
      return { ...current, [date]: [...existing, assigned] };
    });
    setPlanIdeaToSchedule(null);
    alert(`${meal.title} added to your meal plan.`);
  };

  const rescheduleMeal = (meal: AssignedMeal, oldDate: string, newDate: string) => {
    setPlans((current) => {
      if (oldDate === newDate) return current;
      const oldList = (current[oldDate] || []).filter((entry) => entry.id !== meal.id);
      const newList = (current[newDate] || []).some((entry) => entry.id === meal.id)
        ? current[newDate] || []
        : [...(current[newDate] || []), meal];
      return { ...current, [oldDate]: oldList, [newDate]: newList };
    });
    setMealToReschedule(null);
  };

  const removeFromPlan = (date: string, mealId: string) => {
    setPlans((current) => ({ ...current, [date]: (current[date] || []).filter((meal) => meal.id !== mealId) }));
  };

  const removeFromDiscover = (mealId: string) => {
    setDiscoverQueue((current) => current.filter((meal) => meal.id !== mealId));
  };

  const addDiscoverIngredientsToShopping = async (meal: DiscoveredMeal) => {
    const missingIngredients = getMissingIngredients(meal, inventory);
    if (missingIngredients.length === 0) {
      alert('Everything for this meal is already in your inventory.');
      return;
    }

    const shops: Shop[] = ensureDefaultShops(getLocalShops().length > 0 ? getLocalShops() : DEFAULT_SHOPS);
    const shoppingList: ShoppingItem[] = getLocalShoppingList();
    const existingNames = new Set(shoppingList.map((item) => item.name.toLowerCase().trim()));
    const newItems = missingIngredients
      .filter((ingredient) => !existingNames.has(ingredient.name.toLowerCase().trim()))
      .map<ShoppingItem>((ingredient) => {
        const storeType = classifyShoppingItemStoreType(ingredient.name);
        const defaultShop = getDefaultShopForType(shops, storeType);
        return {
          id: crypto.randomUUID(),
          name: ingredient.name,
          quantity: 1,
          unit: 'item',
          category: 'AI Suggestion',
          reason: `Missing for ${meal.title}`,
          isChecked: false,
          shopId: defaultShop.id,
          source: 'discover_recipe',
          storeType,
        };
      });

    if (newItems.length === 0) {
      alert('Missing ingredients are already in your shopping list.');
      return;
    }

    const nextShoppingList = [...shoppingList, ...newItems];
    setLocalShoppingList(nextShoppingList);
    await replaceRemoteShoppingList(nextShoppingList);
    alert(`Added ${newItems.length} ingredients to shopping.`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Meals"
        title="Meal Plan"
        description="Plan from inventory or discover new meals."
        action={
          <SegmentedControl<PlannerMode>
            value={mode}
            onChange={(value) => setMode(value)}
            options={[
              { value: 'plan', label: 'Plan' },
              { value: 'discover', label: 'Discover' },
            ]}
          />
        }
      />

      <StatStrip
        items={[
          { label: 'Planned meals', value: plannedCount },
          { label: 'Plan bank', value: planBank.length, note: 'Inventory-backed ideas' },
          { label: 'Discover bank', value: discoverQueue.length, note: 'Broader meal ideas' },
        ]}
      />

      {mode === 'plan' ? (
        <div className="space-y-5">
          <Panel className="p-4 md:p-5">
            <SectionHeader
              title="Schedule meals"
              
              action={
                <PrimaryButton type="button" onClick={() => void generatePlanBank()} disabled={activeGenerator === 'plan'}>
                  {activeGenerator === 'plan' ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={16} />}
                  {activeGenerator === 'plan' ? 'Refreshing' : 'Refresh plan bank'}
                </PrimaryButton>
              }
            />

            <div className="mt-5 space-y-5">
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
                {dates.map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={cx(
                      'min-w-[64px] rounded-3xl border px-3 py-2 text-left transition sm:min-w-[72px]',
                      selectedDate === date
                        ? 'border-neutral-950 bg-transparent text-neutral-950'
                        : 'border-neutral-200 bg-white text-neutral-700',
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em]">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{new Date(date).getDate()}</p>
                  </button>
                ))}
              </div>

              {assignedMeals.length === 0 ? (
                <EmptyState
                  title="Nothing scheduled for this day"
                  description="Assign a plan-bank meal to this date."
                />
              ) : (
                <div className="space-y-3">
                  {assignedMeals.map((meal) => (
                    <div key={meal.id} className="border border-neutral-200 bg-white px-4 py-4 transition hover:border-neutral-400">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-neutral-950">{meal.title}</h3>
                            <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                              {meal.type}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-600">{meal.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                            <span>{meal.prepTime || '20 min'}</span>
                            <span>{meal.difficulty || 'Medium'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <SecondaryButton type="button" onClick={() => setSelectedMeal(meal)} className="w-full px-3 py-2 sm:w-auto">
                            View
                          </SecondaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={() => setMealToReschedule({ meal, currentDate: selectedDate })}
                            className="w-full px-3 py-2 sm:w-auto"
                          >
                            Move
                          </SecondaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={() => removeFromPlan(selectedDate, meal.id)}
                            className="w-full px-3 py-2 sm:w-auto"
                            aria-label={`Remove ${meal.title}`}
                          >
                            <Trash2 size={16} />
                          </SecondaryButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel className="p-4 md:p-5">
            <SectionHeader
              title="Plan bank"
              
            />

            <div className="mt-6 space-y-3">
              {planBank.length === 0 ? (
                <EmptyState
                  title="No inventory-backed ideas yet"
                  description="Refresh the bank when inventory changes."
                  action={
                    <PrimaryButton type="button" onClick={() => void generatePlanBank()} disabled={activeGenerator === 'plan'}>
                      {activeGenerator === 'plan' ? 'Refreshing' : 'Build plan bank'}
                    </PrimaryButton>
                  }
                />
              ) : (
                planBank.map((meal) => (
                  <div key={meal.id} className="border border-neutral-200 bg-white px-4 py-4 transition hover:border-neutral-400">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-neutral-950">{meal.title}</h3>
                          <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                            {meal.type}
                          </span>
                          <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                            {meal.inventoryMatchScore}% inventory fit
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600">{meal.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                          <span>{meal.prepTime || '20 min'}</span>
                          <span>{meal.difficulty || 'Medium'}</span>
                          <span>{meal.expiringItemsUsed.length} expiring items used</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <SecondaryButton type="button" onClick={() => setSelectedMeal(meal)} className="w-full px-3 py-2 sm:w-auto">
                          View
                        </SecondaryButton>
                        <PrimaryButton type="button" onClick={() => setPlanIdeaToSchedule(meal)} className="w-full px-3 py-2 sm:w-auto">
                          <CalendarDays size={16} />
                          Schedule
                        </PrimaryButton>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      ) : (
        <div className="space-y-5">
          <Panel className="p-4 md:p-5">
            <SectionHeader
              title="Discover meals"
              
            />

            <div className="mt-6 border border-neutral-200 bg-white p-4 md:p-5">
              <form onSubmit={handleFetchDiscoverIdeas} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Dietary preferences
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map((option) => {
                      const isSelected =
                        option.value === 'None'
                          ? selectedRestrictions.length === 0
                          : selectedRestrictions.includes(option.value as DietaryRestriction);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleRestriction(option.value as DietaryRestriction)}
                          className={cx(
                            'rounded-full border px-3 py-2 text-sm transition',
                            isSelected
                              ? 'border-neutral-950 bg-transparent text-neutral-950'
                              : 'border-neutral-200 bg-white text-neutral-700',
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    What do you feel like?
                  </span>
                  <textarea
                    value={craving}
                    onChange={(event) => setCraving(event.target.value)}
                    placeholder="Healthy Japanese dinner, high-protein snacks, something comforting..."
                    className="min-h-[104px] w-full rounded-3xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm outline-none transition focus:border-neutral-950"
                  />
                </label>

                <PrimaryButton type="submit" disabled={activeGenerator === 'discover'} className="w-full sm:w-auto">
                  {activeGenerator === 'discover' ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={16} />}
                  {activeGenerator === 'discover' ? 'Generating ideas' : 'Generate meal ideas'}
                </PrimaryButton>
              </form>
            </div>
          </Panel>

          <Panel className="p-4 md:p-5">
            <SectionHeader
              title="Discover bank"
              
              action={
                discoverQueue.length > 0 ? (
                  <SecondaryButton type="button" onClick={() => setDiscoverQueue([])}>
                    Clear bank
                  </SecondaryButton>
                ) : null
              }
            />

            <div className="mt-6 space-y-3">
              {discoverQueue.length === 0 ? (
                <EmptyState
                  title="No discovered meals yet"
                  description="Generate meals to build the discover bank."
                />
              ) : (
                discoverQueue.map((meal) => {
                  const missing = getMissingIngredients(meal, inventory);
                  return (
                    <div key={meal.id} className="border border-neutral-200 bg-white px-4 py-4 transition hover:border-neutral-400">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-neutral-950">{meal.title}</h3>
                            <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                              {meal.type}
                            </span>
                            <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                              {missing.length === 0 ? 'Already in inventory' : `${missing.length} missing ingredients`}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-600">{meal.description}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                            <span>{meal.prepTime || '20 min'}</span>
                            <span>{meal.difficulty || 'Medium'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <SecondaryButton type="button" onClick={() => setSelectedMeal(meal)} className="w-full px-3 py-2 sm:w-auto">
                            View
                          </SecondaryButton>
                          <PrimaryButton type="button" onClick={() => void addDiscoverIngredientsToShopping(meal)} className="w-full px-3 py-2 sm:w-auto">
                            <ShoppingCart size={16} />
                            Add missing
                          </PrimaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={() => removeFromDiscover(meal.id)}
                            className="w-full px-3 py-2 sm:w-auto"
                            aria-label={`Remove ${meal.title} from discover bank`}
                          >
                            <Trash2 size={16} />
                          </SecondaryButton>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>
        </div>
      )}

      <SurfaceSheet
        open={Boolean(selectedMeal)}
        onClose={() => setSelectedMeal(null)}
        title={selectedMeal?.title || 'Meal details'}
        description={selectedMeal ? `${selectedMeal.type} · ${selectedMeal.prepTime || '20 min'}` : ''}
      >
        {selectedMeal ? (
          <div className="space-y-6">
            <div className="border border-neutral-200 bg-white p-4">
              <p className="text-sm leading-6 text-neutral-700">{selectedMeal.description}</p>
              {selectedMeal.chefTip ? (
                <p className="mt-3 text-sm leading-6 text-neutral-600">Chef tip: {selectedMeal.chefTip}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <SectionHeader title="Ingredients" />
              <div className="space-y-2">
                {selectedMeal.ingredients?.map((ingredient) => {
                  const inInventory = inventory.some(
                    (item) => item.name.toLowerCase().trim() === ingredient.name.toLowerCase().trim(),
                  );
                  const isStaple = COOKING_STAPLES.includes(ingredient.name.toLowerCase().trim());
                  return (
                    <div
                      key={`${selectedMeal.id}-${ingredient.name}`}
                      className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-950">{ingredient.name}</p>
                        <p className="text-xs text-neutral-500">{ingredient.amount}</p>
                      </div>
                      <span className="text-xs text-neutral-500">
                        {inInventory ? 'In inventory' : isStaple ? 'Staple' : 'Missing'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedMeal.instructions && selectedMeal.instructions.length > 0 ? (
              <div className="space-y-3">
                <SectionHeader title="Method" />
                <div className="space-y-3">
                  {selectedMeal.instructions.map((step, index) => (
                    <div
                      key={`${selectedMeal.id}-step-${index + 1}`}
                      className="rounded-2xl border border-neutral-200 bg-white px-4 py-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                        Step {index + 1}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </SurfaceSheet>

      <SurfaceSheet
        open={Boolean(planIdeaToSchedule || mealToReschedule)}
        onClose={() => {
          setPlanIdeaToSchedule(null);
          setMealToReschedule(null);
        }}
        title={planIdeaToSchedule ? 'Schedule meal' : 'Move meal'}
        description={
          planIdeaToSchedule
            ? `Place ${planIdeaToSchedule.title} on a day.`
            : mealToReschedule
              ? `Move ${mealToReschedule.meal.title} to another day.`
              : undefined
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {dates.map((date) => (
            <SecondaryButton
              key={date}
              type="button"
              onClick={() =>
                planIdeaToSchedule
                  ? schedulePlanIdea(planIdeaToSchedule, date)
                  : rescheduleMeal(mealToReschedule!.meal, mealToReschedule!.currentDate, date)
              }
            >
              <CalendarDays size={16} />
              {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </SecondaryButton>
          ))}
        </div>
      </SurfaceSheet>
    </div>
  );
};

export function getInventory() {
  return JSON.parse(localStorage.getItem('fridge_inventory') || '[]') as InventoryItem[];
}

export function getMissingIngredients(meal: MealSuggestion, inventory: InventoryItem[]) {
  return (
    meal.ingredients?.filter((ingredient) => {
      const name = ingredient.name.toLowerCase().trim();
      const hasItem = inventory.some((item) => item.name.toLowerCase().trim() === name);
      return !hasItem && !COOKING_STAPLES.includes(name);
    }) || []
  );
}

export function enrichMeals<T extends MealSuggestion>(meals: T[], inventory: InventoryItem[]) {
  return meals.map((meal) => ({
    ...meal,
    ingredients: meal.ingredients?.map((ingredient) => ({
      ...ingredient,
      inInventory: inventory.some(
        (item) => item.name.toLowerCase().trim() === ingredient.name.toLowerCase().trim(),
      ),
    })),
  }));
}

function uniqueMeals<T extends MealSuggestion>(meals: T[]) {
  const seen = new Set<string>();
  return meals.filter((meal) => {
    const key = `${meal.title.toLowerCase().trim()}|${meal.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toAssignedMeal(meal: PlanIdea, source: AssignedMeal['source']): AssignedMeal {
  return {
    id: meal.id,
    title: meal.title,
    type: meal.type,
    description: meal.description,
    isRecipe: meal.isRecipe,
    expiringItemsUsed: meal.expiringItemsUsed,
    prepTime: meal.prepTime,
    difficulty: meal.difficulty,
    ingredients: meal.ingredients,
    instructions: meal.instructions,
    chefTip: meal.chefTip,
    flavorProfile: meal.flavorProfile,
    source,
  };
}

function buildMealHistorySummary(plans: Record<string, MealSuggestion[]>) {
  const scheduledMeals = Object.entries(plans)
    .filter(([bucketKey]) => bucketKey !== PLAN_BANK_KEY)
    .flatMap(([, meals]) => meals || []);

  if (scheduledMeals.length === 0) {
    return 'No prior scheduled meal history.';
  }

  const titles = scheduledMeals.slice(-8).map((meal) => meal.title).join(', ');
  const mealTypes = Array.from(new Set(scheduledMeals.map((meal) => meal.type))).join(', ');
  return `Recent scheduled meals: ${titles}. Common meal types: ${mealTypes}.`;
}

export default MealPlanner;

