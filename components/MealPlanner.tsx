import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DEFAULT_SHOPS, DIETARY_OPTIONS } from '../constants';
import { DietaryRestriction, InventoryItem, MealSuggestion, Shop, ShoppingItem } from '../types';
import { getMealSuggestions, predictShopForItem } from '../services/openai';
import {
  ConfirmationDialog,
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

type PlannerMode = 'plan' | 'discover';

const MealPlanner: React.FC = () => {
  const [mode, setMode] = useState<PlannerMode>('plan');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [plans, setPlans] = useState<Record<string, MealSuggestion[]>>({});
  const [suggestionQueue, setSuggestionQueue] = useState<MealSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealSuggestion | null>(null);
  const [mealToPlan, setMealToPlan] = useState<MealSuggestion | null>(null);
  const [mealToReschedule, setMealToReschedule] = useState<{ meal: MealSuggestion; currentDate: string } | null>(null);
  const [craving, setCraving] = useState('');
  const [selectedRestrictions, setSelectedRestrictions] = useState<DietaryRestriction[]>([]);

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
    const savedPlans = localStorage.getItem('freshkeeper_meal_plans');
    const savedQueue = localStorage.getItem('freshkeeper_suggestion_queue');
    const savedRestrictions = localStorage.getItem('freshkeeper_dietary_restrictions');
    if (savedPlans) setPlans(JSON.parse(savedPlans));
    if (savedQueue) setSuggestionQueue(JSON.parse(savedQueue));
    if (savedRestrictions) setSelectedRestrictions(JSON.parse(savedRestrictions));
  }, []);

  useEffect(() => {
    localStorage.setItem('freshkeeper_meal_plans', JSON.stringify(plans));
    checkNeedsIngredientsUpgrades();
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('freshkeeper_suggestion_queue', JSON.stringify(suggestionQueue));
  }, [suggestionQueue]);

  useEffect(() => {
    localStorage.setItem('freshkeeper_dietary_restrictions', JSON.stringify(selectedRestrictions));
  }, [selectedRestrictions]);

  const inventory = getInventory();

  const checkNeedsIngredientsUpgrades = () => {
    const queuedMeals = plans.tentative || [];
    if (queuedMeals.length === 0) return;

    const currentInventory = getInventory();
    let changed = false;
    const remaining = [...queuedMeals];
    const nextPlans = { ...plans };

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const meal = remaining[index];
      const missing = getMissingIngredients(meal, currentInventory);
      if (missing.length === 0) {
        nextPlans[selectedDate] = [...(nextPlans[selectedDate] || []), meal];
        remaining.splice(index, 1);
        changed = true;
      }
    }

    if (changed) {
      setPlans({ ...nextPlans, tentative: remaining });
    }
  };

  const handleFetchIdeas = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setIsLoading(true);
    const suggestions = await getMealSuggestions(inventory, selectedDate, craving, selectedRestrictions);
    const enriched = suggestions.map((meal) => ({
      ...meal,
      ingredients: meal.ingredients?.map((ingredient) => ({
        ...ingredient,
        inInventory: inventory.some(
          (item) => item.name.toLowerCase().trim() === ingredient.name.toLowerCase().trim(),
        ),
      })),
    }));
    setSuggestionQueue((current) => {
      const newMeals = enriched.filter((meal) => !current.some((existing) => existing.title === meal.title));
      return [...newMeals, ...current].slice(0, 15);
    });
    setMode('discover');
    setIsLoading(false);
    setCraving('');
  };

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

  const executePlan = async (meal: MealSuggestion, date: string | 'tentative') => {
    setIsClassifying(true);
    const currentInventory = getInventory();
    const savedShops = localStorage.getItem('freshkeeper_shops');
    const shops: Shop[] = savedShops ? JSON.parse(savedShops) : DEFAULT_SHOPS;
    const missingIngredients = getMissingIngredients(meal, currentInventory);
    const finalDate = missingIngredients.length > 0 ? 'tentative' : date;

    if (missingIngredients.length > 0) {
      const savedList = localStorage.getItem('freshkeeper_shopping_list');
      const shoppingList: ShoppingItem[] = savedList ? JSON.parse(savedList) : [];
      const newItems: ShoppingItem[] = await Promise.all(
        missingIngredients.map(async (ingredient) => {
          const predictedShopId = await predictShopForItem(ingredient.name, shops);
          return {
            id: crypto.randomUUID(),
            name: ingredient.name,
            quantity: 1,
            unit: 'item',
            category: 'AI Suggestion',
            reason: `Needed for ${meal.title}`,
            isChecked: false,
            shopId: predictedShopId || shops[0]?.id,
          };
        }),
      );
      localStorage.setItem('freshkeeper_shopping_list', JSON.stringify([...shoppingList, ...newItems]));
    }

    setPlans((current) => {
      const dayPlan = current[finalDate] || [];
      if (dayPlan.some((entry) => entry.title === meal.title)) return current;
      return { ...current, [finalDate]: [...dayPlan, meal] };
    });
    setSuggestionQueue((current) => current.filter((entry) => entry.id !== meal.id));
    setMealToPlan(null);
    setIsClassifying(false);

    if (finalDate === 'tentative' && missingIngredients.length > 0) {
      alert('Added to Needs Ingredients. Missing items were sent to your shopping list.');
    } else if (finalDate === 'tentative') {
      alert('Added to Needs Ingredients.');
    } else {
      alert(`${meal.title} added to your meal plan.`);
    }
  };

  const rescheduleMeal = (meal: MealSuggestion, oldDate: string, newDate: string | 'tentative') => {
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

  const removeFromQueue = (mealId: string) => {
    setSuggestionQueue((current) => current.filter((meal) => meal.id !== mealId));
  };

  const selectedPlanMeals = enrichMeals(selectedDate === 'tentative' ? plans.tentative || [] : plans[selectedDate] || [], inventory);
  const queuedMeals = enrichMeals(plans.tentative || [], inventory);
  const plannedCount = Object.values(plans)
    .flat()
    .filter(Boolean).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Meals"
        title="Meal Plan"
        description="Separate planning from discovery. Build ideas in one place, then assign them to a day or route them into a visible needs-ingredients queue."
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
          { label: 'Idea queue', value: suggestionQueue.length, note: 'Reusable suggestions' },
          { label: 'Needs ingredients', value: queuedMeals.length },
          { label: 'Current mode', value: mode === 'plan' ? 'Plan' : 'Discover' },
        ]}
      />

      <Panel className="p-5 md:p-6">
        <SectionHeader
          title={mode === 'plan' ? 'Weekly plan' : 'Discover meals'}
          description={
            mode === 'plan'
              ? 'Choose a day, review assigned meals, and move meals into or out of the needs-ingredients queue.'
              : 'Generate suggestions from what you have, your dietary filters, and one simple craving prompt.'
          }
        />

        {mode === 'plan' ? (
          <div className="mt-6 space-y-6">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {dates.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={cx(
                    'min-w-[86px] rounded-3xl border px-4 py-3 text-left transition',
                    selectedDate === date
                      ? 'border-neutral-950 bg-neutral-950 text-white'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700',
                  )}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em]">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{new Date(date).getDate()}</p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedDate('tentative')}
                className={cx(
                  'min-w-[120px] rounded-3xl border px-4 py-3 text-left transition',
                  selectedDate === 'tentative'
                    ? 'border-neutral-950 bg-neutral-950 text-white'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-700',
                )}
              >
                <p className="text-[11px] uppercase tracking-[0.18em]">Queue</p>
                <p className="mt-1 text-base font-semibold">Needs Ingredients</p>
              </button>
            </div>

            {selectedDate === 'tentative' ? (
              <Panel className="border-neutral-300 bg-neutral-50 p-4">
                <p className="text-sm leading-6 text-neutral-700">
                  Meals land here when ingredients are missing or you choose to schedule them later. Once your
                  inventory covers the missing items, they can move into the calendar.
                </p>
              </Panel>
            ) : null}

            {selectedPlanMeals.length === 0 ? (
              <EmptyState
                title={selectedDate === 'tentative' ? 'No meals waiting on ingredients' : 'No meals on this day'}
                description={
                  selectedDate === 'tentative'
                    ? 'Generate ideas and save one for later when ingredients are missing or timing is not settled.'
                    : 'Use Discover to generate meal ideas, then assign them to this day.'
                }
                action={
                  <PrimaryButton type="button" onClick={() => setMode('discover')}>
                    Explore ideas
                  </PrimaryButton>
                }
              />
            ) : (
              <div className="space-y-3">
                {selectedPlanMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="rounded-3xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition hover:border-neutral-400"
                  >
                    <div className="flex items-start justify-between gap-4">
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
                      <div className="flex items-center gap-2">
                        <SecondaryButton type="button" onClick={() => setSelectedMeal(meal)} className="px-3 py-2">
                          View
                        </SecondaryButton>
                        <SecondaryButton
                          type="button"
                          onClick={() => setMealToReschedule({ meal, currentDate: selectedDate })}
                          className="px-3 py-2"
                        >
                          Move
                        </SecondaryButton>
                        <SecondaryButton
                          type="button"
                          onClick={() => removeFromPlan(selectedDate, meal.id)}
                          className="px-3 py-2"
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
        ) : (
          <div className="mt-6 space-y-6">
            <Panel className="bg-neutral-50 p-4 md:p-5">
              <form onSubmit={handleFetchIdeas} className="space-y-5">
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
                              ? 'border-neutral-950 bg-neutral-950 text-white'
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
                    className="min-h-[110px] w-full rounded-3xl border border-neutral-200 bg-white px-4 py-4 text-sm outline-none transition focus:border-neutral-950"
                  />
                </label>

                <PrimaryButton type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isLoading ? 'Generating ideas' : 'Generate meal ideas'}
                </PrimaryButton>
              </form>
            </Panel>

            <div className="space-y-3">
              <SectionHeader
                title="Suggestion queue"
                description="Generated ideas stay here until you schedule or remove them."
                action={
                  suggestionQueue.length > 0 ? (
                    <SecondaryButton type="button" onClick={() => setSuggestionQueue([])}>
                      Clear queue
                    </SecondaryButton>
                  ) : null
                }
              />

              {suggestionQueue.length === 0 ? (
                <EmptyState
                  title="No ideas yet"
                  description="Generate meal ideas to build a reusable suggestion queue."
                />
              ) : (
                <div className="space-y-3">
                  {suggestionQueue.map((meal) => {
                    const missing = getMissingIngredients(meal, inventory);
                    return (
                      <div
                        key={meal.id}
                        className="rounded-3xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition hover:border-neutral-400"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-neutral-950">{meal.title}</h3>
                              <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                                {meal.type}
                              </span>
                              <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500">
                                {missing.length === 0 ? 'Ready to cook' : `${missing.length} to buy`}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-600">{meal.description}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                              <span>{meal.prepTime || '20 min'}</span>
                              <span>{meal.difficulty || 'Medium'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <SecondaryButton type="button" onClick={() => setSelectedMeal(meal)} className="px-3 py-2">
                              View
                            </SecondaryButton>
                            <PrimaryButton type="button" onClick={() => setMealToPlan(meal)} className="px-3 py-2">
                              <Plus size={16} />
                              Save
                            </PrimaryButton>
                            <SecondaryButton
                              type="button"
                              onClick={() => removeFromQueue(meal.id)}
                              className="px-3 py-2"
                              aria-label={`Remove ${meal.title} from queue`}
                            >
                              <Trash2 size={16} />
                            </SecondaryButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>

      <SurfaceSheet
        open={Boolean(selectedMeal)}
        onClose={() => setSelectedMeal(null)}
        title={selectedMeal?.title || 'Meal details'}
        description={selectedMeal ? `${selectedMeal.type} · ${selectedMeal.prepTime || '20 min'}` : ''}
        footer={
          selectedMeal && suggestionQueue.some((meal) => meal.id === selectedMeal.id) ? (
            <PrimaryButton type="button" onClick={() => setMealToPlan(selectedMeal)}>
              Save to plan
            </PrimaryButton>
          ) : null
        }
      >
        {selectedMeal ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
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
                        {inInventory ? 'In inventory' : isStaple ? 'Staple' : 'Need to buy'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <SectionHeader title="Method" />
              <div className="space-y-3">
                {selectedMeal.instructions?.map((step, index) => (
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
          </div>
        ) : null}
      </SurfaceSheet>

      <ConfirmationDialog
        open={Boolean(mealToPlan || mealToReschedule)}
        onClose={() => {
          setMealToPlan(null);
          setMealToReschedule(null);
        }}
        title={mealToPlan ? 'Save meal' : 'Move meal'}
        description={
          mealToPlan ? (
            <p>
              Choose a day for <strong className="text-neutral-950">{mealToPlan?.title}</strong>, or place it in
              <strong className="text-neutral-950"> Needs Ingredients</strong>.
            </p>
          ) : (
            <p>
              Move <strong className="text-neutral-950">{mealToReschedule?.meal.title}</strong> to a different day or
              send it to <strong className="text-neutral-950">Needs Ingredients</strong>.
            </p>
          )
        }
        actions={
          <div className="grid gap-2 sm:grid-cols-2">
            {dates.map((date) => (
              <SecondaryButton
                key={date}
                type="button"
                onClick={() =>
                  mealToPlan
                    ? executePlan(mealToPlan, date)
                    : rescheduleMeal(mealToReschedule!.meal, mealToReschedule!.currentDate, date)
                }
              >
                <CalendarDays size={16} />
                {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </SecondaryButton>
            ))}
            <PrimaryButton
              type="button"
              onClick={() =>
                mealToPlan
                  ? executePlan(mealToPlan, 'tentative')
                  : rescheduleMeal(mealToReschedule!.meal, mealToReschedule!.currentDate, 'tentative')
              }
              disabled={isClassifying}
            >
              {isClassifying ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
              Needs Ingredients
            </PrimaryButton>
          </div>
        }
      />
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

export function enrichMeals(meals: MealSuggestion[], inventory: InventoryItem[]) {
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

export default MealPlanner;
