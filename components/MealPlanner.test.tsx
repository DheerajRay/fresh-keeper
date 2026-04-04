import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MealPlanner, { enrichMeals, getInventory, getMissingIngredients } from './MealPlanner';
import { getDiscoverMealIdeas, getPlanMealIdeas } from '../services/openai';
import { ZoneId } from '../types';

vi.mock('../services/openai', () => ({
  getPlanMealIdeas: vi.fn(),
  getDiscoverMealIdeas: vi.fn(),
  getMealSuggestions: vi.fn(),
  predictShopForItem: vi.fn(),
}));

describe('MealPlanner', () => {
  it('covers meal helper utilities', () => {
    localStorage.setItem('fridge_inventory', JSON.stringify([{ id: 'inv-1', name: 'Eggs' }]));

    expect(getInventory()).toEqual([{ id: 'inv-1', name: 'Eggs' }]);
    expect(
      getMissingIngredients(
        {
          id: 'meal-helper',
          title: 'Toast',
          type: 'Breakfast',
          description: 'Simple toast',
          isRecipe: true,
          expiringItemsUsed: [],
          ingredients: [
            { name: 'Eggs', amount: '2', inInventory: true },
            { name: 'Olive oil', amount: '1 tbsp', inInventory: false },
            { name: 'Bread', amount: '2 slices', inInventory: false },
          ],
          instructions: ['Toast it'],
        },
        [{ id: 'inv-1', name: 'Eggs' } as any],
      ),
    ).toEqual([{ name: 'Bread', amount: '2 slices', inInventory: false }]);

    expect(
      enrichMeals(
        [
          {
            id: 'meal-helper',
            title: 'Toast',
            type: 'Breakfast',
            description: 'Simple toast',
            isRecipe: true,
            expiringItemsUsed: [],
            ingredients: [{ name: 'Eggs', amount: '2', inInventory: false }],
            instructions: ['Toast it'],
          },
        ],
        [{ id: 'inv-1', name: 'Eggs' } as any],
      )[0].ingredients?.[0].inInventory,
    ).toBe(true);
  });

  it('builds an inventory-backed plan bank and schedules an idea to a date', async () => {
    const user = userEvent.setup();
    vi.mocked(getPlanMealIdeas).mockResolvedValue([
      {
        id: 'plan-1',
        title: 'Spinach Egg Bowl',
        type: 'Lunch',
        description: 'Uses your eggs and spinach.',
        isRecipe: true,
        expiringItemsUsed: ['spinach'],
        prepTime: '15 min',
        difficulty: 'Easy',
        flavorProfile: 'Savory',
        chefTip: 'Season at the end.',
        inventoryMatchScore: 100,
        missingIngredientCount: 0,
        ingredients: [
          { name: 'Eggs', amount: '2', inInventory: true },
          { name: 'Spinach', amount: '1 cup', inInventory: true },
        ],
      },
    ]);

    localStorage.setItem(
      'fridge_inventory',
      JSON.stringify([
        {
          id: 'inv-1',
          name: 'Eggs',
          zoneId: ZoneId.LOWER_SHELVES,
          addedDate: 1,
          expiryDate: Date.now() + 86400000,
          estimatedDays: 2,
          quantity: 6,
          unit: 'item',
        },
        {
          id: 'inv-2',
          name: 'Spinach',
          zoneId: ZoneId.CRISPER_DRAWER,
          addedDate: 1,
          expiryDate: Date.now() + 86400000,
          estimatedDays: 2,
          quantity: 1,
          unit: 'bag',
        },
      ]),
    );

    render(<MealPlanner />);

    expect(await screen.findByText('Spinach Egg Bowl')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Schedule/i }));
    await user.click(screen.getByRole('button', { name: /Save schedule/i }));

    await waitFor(() => {
      const savedPlans = JSON.parse(localStorage.getItem('freshkeeper_meal_plans') || '{}');
      const today = new Date().toISOString().split('T')[0];
      expect(savedPlans[today]?.some((meal: { title: string; scheduledFor?: string }) => meal.title === 'Spinach Egg Bowl' && meal.scheduledFor === 'Lunch')).toBe(true);
    });
  });

  it('lets the user add a manual meal directly into the schedule', async () => {
    const user = userEvent.setup();
    render(<MealPlanner />);

    await user.click(screen.getAllByRole('button', { name: /Manual meal/i })[0]);
    await user.type(screen.getByPlaceholderText(/Friday taco night/i), 'Homemade ramen');
    await user.selectOptions(screen.getByLabelText(/Meal slot/i), 'Dinner');
    await user.type(screen.getByPlaceholderText(/Optional note for the meal/i), 'Use the good broth.');
    await user.click(screen.getByRole('button', { name: /Save meal/i }));

    await waitFor(() => {
      const savedPlans = JSON.parse(localStorage.getItem('freshkeeper_meal_plans') || '{}');
      const today = new Date().toISOString().split('T')[0];
      expect(
        savedPlans[today]?.some(
          (meal: { title: string; source?: string; scheduledFor?: string }) =>
            meal.title === 'Homemade ramen' && meal.source === 'manual' && meal.scheduledFor === 'Dinner',
        ),
      ).toBe(true);
    });
  });

  it('keeps discover separate and sends only missing ingredients to shopping', async () => {
    const user = userEvent.setup();
    vi.mocked(getPlanMealIdeas).mockResolvedValue([]);
    vi.mocked(getDiscoverMealIdeas).mockResolvedValue([
      {
        id: 'discover-1',
        title: 'Miso Noodle Bowl',
        type: 'Dinner',
        description: 'Comforting and savory.',
        isRecipe: true,
        expiringItemsUsed: [],
        prepTime: '20 min',
        difficulty: 'Medium',
        flavorProfile: 'Umami',
        chefTip: 'Finish with scallions.',
        ingredients: [
          { name: 'Noodles', amount: '200 g', inInventory: true },
          { name: 'Miso paste', amount: '2 tbsp', inInventory: false },
          { name: 'Scallions', amount: '2', inInventory: false },
        ],
        instructions: ['Boil noodles.', 'Build broth.', 'Serve hot.'],
      },
    ]);

    localStorage.setItem(
      'fridge_inventory',
      JSON.stringify([
        {
          id: 'inv-1',
          name: 'Noodles',
          zoneId: ZoneId.PANTRY,
          addedDate: 1,
          expiryDate: Date.now() + 86400000,
          estimatedDays: 30,
          quantity: 1,
          unit: 'box',
        },
      ]),
    );

    render(<MealPlanner />);

    await user.click(screen.getByRole('button', { name: /^Discover$/i }));
    await user.type(screen.getByPlaceholderText(/Healthy Japanese dinner/i), 'comforting');
    await user.click(screen.getByRole('button', { name: /Generate meal ideas/i }));

    expect(await screen.findByText('Miso Noodle Bowl')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add missing/i }));

    await waitFor(() => {
      const shoppingList = JSON.parse(localStorage.getItem('freshkeeper_shopping_list') || '[]');
      expect(shoppingList).toHaveLength(2);
      expect(shoppingList.map((item: { name: string }) => item.name)).toEqual(
        expect.arrayContaining(['Miso paste', 'Scallions']),
      );
    });
  });

  it('shows assigned meals in plan mode and lets the user move them', async () => {
    const user = userEvent.setup();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    localStorage.setItem(
      'freshkeeper_meal_plans',
      JSON.stringify({
        [today]: [
          {
            id: 'assigned-1',
            title: 'Tomato Pasta',
            type: 'Dinner',
            description: 'Simple dinner',
            isRecipe: true,
            expiringItemsUsed: [],
            ingredients: [{ name: 'Tomatoes', amount: '2', inInventory: true }],
            instructions: ['Cook pasta.', 'Add tomatoes.'],
            source: 'plan_bank',
          },
        ],
      }),
    );

    render(<MealPlanner />);

    expect(screen.getByText('Tomato Pasta')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Move$/i }));
    await user.click(screen.getByRole('button', { name: /^Lunch$/i }));
    const moveDateButtons = screen.getAllByRole('button', {
      name: new Date(tomorrow).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    });
    await user.click(moveDateButtons[moveDateButtons.length - 1]);
    await user.click(screen.getByRole('button', { name: /Save move/i }));

    const savedPlans = JSON.parse(localStorage.getItem('freshkeeper_meal_plans') || '{}');
    expect(savedPlans[today] || []).toHaveLength(0);
    expect(
      savedPlans[tomorrow]?.some(
        (meal: { title: string; scheduledFor?: string }) => meal.title === 'Tomato Pasta' && meal.scheduledFor === 'Lunch',
      ),
    ).toBe(true);
  });
});
