import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MealPlanner, { enrichMeals, getInventory, getMissingIngredients } from './MealPlanner';
import { getMealSuggestions, predictShopForItem } from '../services/openai';
import { ZoneId } from '../types';

vi.mock('../services/openai', () => ({
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

  it('generates meal ideas and routes missing ingredients to shopping when saved', async () => {
    const user = userEvent.setup();
    vi.mocked(getMealSuggestions).mockResolvedValue([
      {
        id: 'meal-1',
        title: 'Spinach Egg Bowl',
        type: 'Lunch',
        description: 'Quick lunch idea',
        isRecipe: true,
        expiringItemsUsed: ['spinach'],
        prepTime: '15 min',
        difficulty: 'Easy',
        flavorProfile: 'Savory',
        chefTip: 'Season at the end.',
        ingredients: [
          { name: 'Eggs', amount: '2', inInventory: true },
          { name: 'Milk', amount: '1 cup', inInventory: false },
        ],
        instructions: ['Whisk eggs.', 'Cook and serve.'],
      },
    ]);
    vi.mocked(predictShopForItem).mockResolvedValue('shop_default_1');

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
      ]),
    );

    const { unmount } = render(<MealPlanner />);

    await user.click(screen.getByRole('button', { name: /^Discover$/i }));
    await user.click(screen.getByRole('button', { name: /generate meal ideas/i }));

    expect(await screen.findByText('Spinach Egg Bowl')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Save$/i }));
    await user.click(screen.getAllByRole('button', { name: /needs ingredients/i }).at(-1)!);

    await waitFor(() => {
      const shoppingList = JSON.parse(localStorage.getItem('freshkeeper_shopping_list') || '[]');
      expect(shoppingList).toHaveLength(1);
      expect(shoppingList[0].name).toBe('Milk');
    });

    const savedPlans = JSON.parse(localStorage.getItem('freshkeeper_meal_plans') || '{}');
    expect(savedPlans.tentative).toHaveLength(1);
    expect(savedPlans.tentative[0].title).toBe('Spinach Egg Bowl');
    expect(window.alert).toHaveBeenCalled();
  });

  it('renders the default plan state, opens recipe details, and reschedules meals', async () => {
    const user = userEvent.setup();

    localStorage.setItem(
      'freshkeeper_meal_plans',
      JSON.stringify({
        [new Date().toISOString().split('T')[0]]: [
          {
            id: 'meal-2',
            title: 'Tomato Pasta',
            type: 'Dinner',
            description: 'Simple dinner',
            isRecipe: true,
            expiringItemsUsed: [],
            prepTime: '20 min',
            difficulty: 'Easy',
            ingredients: [{ name: 'Tomatoes', amount: '2', inInventory: true }],
            instructions: ['Cook pasta.', 'Add tomatoes.'],
          },
        ],
      }),
    );

    const { unmount } = render(<MealPlanner />);

    expect(screen.getByText(/Weekly plan/i)).toBeInTheDocument();
    expect(screen.getByText('Tomato Pasta')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^View$/i }));
    expect(await screen.findByText(/Cook pasta/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/close panel/i));

    await user.click(screen.getByRole('button', { name: /^Move$/i }));
    const scheduleButtons = screen.getAllByRole('button', { name: /, /i });
    await user.click(scheduleButtons[0]);

    await user.click(screen.getByRole('button', { name: /Remove Tomato Pasta/i }));
    expect(screen.queryByText('Tomato Pasta')).not.toBeInTheDocument();

    expect(localStorage.getItem('freshkeeper_meal_plans')).not.toContain('Tomato Pasta');
  });

  it('supports discovery queue cleanup and dietary filter selection', async () => {
    const user = userEvent.setup();
    vi.mocked(getMealSuggestions).mockResolvedValue([
      {
        id: 'meal-3',
        title: 'Fruit Bowl',
        type: 'Breakfast',
        description: 'Fresh and easy',
        isRecipe: true,
        expiringItemsUsed: ['berries'],
        ingredients: [{ name: 'Berries', amount: '1 cup', inInventory: true }],
        instructions: ['Serve cold.'],
      },
    ]);

    render(<MealPlanner />);

    await user.click(screen.getByRole('button', { name: /^Discover$/i }));
    await user.click(screen.getByRole('button', { name: /^Vegan$/i }));
    await user.click(screen.getByRole('button', { name: /^Vegan$/i }));
    await user.click(screen.getByRole('button', { name: /generate meal ideas/i }));

    expect(await screen.findByText('Fruit Bowl')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Remove Fruit Bowl from queue/i }));
    expect(screen.getByText(/No ideas yet/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /generate meal ideas/i }));
    expect(await screen.findByText('Fruit Bowl')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Clear queue/i }));
    expect(screen.getByText(/No ideas yet/i)).toBeInTheDocument();
  });

  it('moves ready meals out of needs ingredients and supports direct planning flows', async () => {
    const user = userEvent.setup();
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(
      'fridge_inventory',
      JSON.stringify([
        {
          id: 'inv-1',
          name: 'Tomatoes',
          zoneId: ZoneId.LOWER_SHELVES,
          addedDate: 1,
          expiryDate: Date.now() + 86400000,
          estimatedDays: 2,
          quantity: 2,
          unit: 'item',
        },
      ]),
    );
    localStorage.setItem(
      'freshkeeper_meal_plans',
      JSON.stringify({
        tentative: [
          {
            id: 'meal-ready',
            title: 'Tomato Soup',
            type: 'Dinner',
            description: 'Soup night',
            isRecipe: true,
            expiringItemsUsed: [],
            ingredients: [{ name: 'Tomatoes', amount: '2', inInventory: false }],
            instructions: ['Blend'],
          },
        ],
      }),
    );
    vi.mocked(getMealSuggestions).mockResolvedValue([
      {
        id: 'meal-direct',
        title: 'Egg Toast',
        type: 'Breakfast',
        description: 'Fast breakfast',
        isRecipe: true,
        expiringItemsUsed: [],
        chefTip: 'Use good bread.',
        ingredients: [
          { name: 'Eggs', amount: '2', inInventory: true },
          { name: 'Olive oil', amount: '1 tbsp', inInventory: false },
        ],
        instructions: ['Toast bread.', 'Cook eggs.'],
      },
    ]);

    render(<MealPlanner />);

    expect(await screen.findByText('Tomato Soup')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Queue Needs Ingredients/i }));
    expect(screen.getByText(/No meals waiting on ingredients/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Fri \d+/i }));

    await user.click(screen.getByRole('button', { name: /^Discover$/i }));
    await user.click(screen.getByRole('button', { name: /^Vegan$/i }));
    await user.click(screen.getByRole('button', { name: /^None$/i }));
    await user.type(screen.getByPlaceholderText(/Healthy Japanese dinner/i), 'quick breakfast');
    await user.click(screen.getByRole('button', { name: /Generate meal ideas/i }));

    expect(await screen.findByText('Egg Toast')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /^View$/i }).at(-1)!);
    expect(screen.getByText(/Staple/i)).toBeInTheDocument();
    expect(screen.getByText(/Chef tip/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save to plan/i }));
    await user.click(screen.getAllByRole('button', { name: /, /i })[0]);

    await user.click(screen.getByRole('button', { name: /^Plan$/i }));

    const savedPlans = JSON.parse(localStorage.getItem('freshkeeper_meal_plans') || '{}');
    expect(savedPlans[today]?.some((meal: { title: string }) => meal.title === 'Tomato Soup')).toBe(true);
    expect(
      Object.values(savedPlans)
        .flat()
        .some((meal: any) => meal?.title === 'Egg Toast'),
    ).toBe(true);
    expect(window.alert).toHaveBeenCalled();
  });

  it('supports closing the move dialog and sending an existing meal to needs ingredients', async () => {
    const user = userEvent.setup();
    const today = new Date().toISOString().split('T')[0];

    localStorage.setItem(
      'freshkeeper_meal_plans',
      JSON.stringify({
        [today]: [
          {
            id: 'meal-keep',
            title: 'Veg Bowl',
            type: 'Lunch',
            description: 'Keep it simple',
            isRecipe: true,
            expiringItemsUsed: [],
            ingredients: [{ name: 'Rice', amount: '1 bowl', inInventory: true }],
            instructions: ['Serve.'],
          },
        ],
      }),
    );

    render(<MealPlanner />);

    await user.click(screen.getByRole('button', { name: /^Move$/i }));
    const overlays = document.querySelectorAll('.fixed.inset-0');
    await user.click(overlays[0] as HTMLElement);
    expect(screen.queryByText(/Choose a day for/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Move$/i }));
    await user.click(screen.getAllByRole('button', { name: /needs ingredients/i }).at(-1)!);

    const savedPlans = JSON.parse(localStorage.getItem('freshkeeper_meal_plans') || '{}');
    expect(savedPlans[today] || []).toHaveLength(0);
    expect(savedPlans.tentative?.some((meal: { title: string }) => meal.title === 'Veg Bowl')).toBe(true);
  });

  it('covers direct-save alerts, tentative-save alerts, empty-state discovery, and duplicate reschedule protection', async () => {
    const user = userEvent.setup();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    vi.mocked(getMealSuggestions).mockResolvedValue([
      {
        id: 'meal-ready-1',
        title: 'Oat Bowl',
        type: 'Breakfast',
        description: 'Simple bowl',
        isRecipe: true,
        expiringItemsUsed: [],
        ingredients: [{ name: 'Oats', amount: '1 cup', inInventory: true }],
        instructions: ['Serve.'],
      },
      {
        id: 'meal-ready-2',
        title: 'Yogurt Bowl',
        type: 'Breakfast',
        description: 'Cold bowl',
        isRecipe: true,
        expiringItemsUsed: [],
        ingredients: [{ name: 'Yogurt', amount: '1 cup', inInventory: true }],
        instructions: ['Serve cold.'],
      },
    ]);

    localStorage.setItem(
      'fridge_inventory',
      JSON.stringify([
        { id: 'inv-oats', name: 'Oats' },
        { id: 'inv-yogurt', name: 'Yogurt' },
      ]),
    );

    render(<MealPlanner />);

    expect(screen.getByText(/No meals on this day/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Explore ideas/i }));
    expect(screen.getByRole('button', { name: /^Discover$/i })).toHaveClass('border-neutral-950');

    await user.click(screen.getByRole('button', { name: /Generate meal ideas/i }));
    expect(await screen.findByText('Oat Bowl')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /^Save$/i })[0]);
    await user.click(screen.getAllByRole('button', { name: /, /i })[0]);
    expect(window.alert).toHaveBeenCalledWith('Oat Bowl added to your meal plan.');

    await user.click(screen.getAllByRole('button', { name: /^Save$/i })[0]);
    await user.click(screen.getAllByRole('button', { name: /needs ingredients/i }).at(-1)!);
    expect(window.alert).toHaveBeenCalledWith('Added to Needs Ingredients.');

    localStorage.setItem(
      'freshkeeper_meal_plans',
      JSON.stringify({
        [today]: [
          {
            id: 'dup-meal',
            title: 'Duplicate Soup',
            type: 'Dinner',
            description: 'Soup',
            isRecipe: true,
            expiringItemsUsed: [],
            ingredients: [],
            instructions: ['Heat.'],
          },
        ],
        [tomorrow]: [
          {
            id: 'dup-meal',
            title: 'Duplicate Soup',
            type: 'Dinner',
            description: 'Soup',
            isRecipe: true,
            expiringItemsUsed: [],
            ingredients: [],
            instructions: ['Heat.'],
          },
        ],
      }),
    );

    render(<MealPlanner />);
    await user.click(screen.getByRole('button', { name: /^Move$/i }));
    await user.click(
      screen.getByRole('button', {
        name: new Date(tomorrow).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      }),
    );

    const movedPlans = JSON.parse(localStorage.getItem('freshkeeper_meal_plans') || '{}');
    expect(movedPlans[today] || []).toHaveLength(0);
    expect(movedPlans[tomorrow]).toHaveLength(1);
  });
});
