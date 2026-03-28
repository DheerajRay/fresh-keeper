import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MealPlanner from './MealPlanner';
import { getMealSuggestions, predictShopForItem } from '../services/openai';
import { ZoneId } from '../types';

vi.mock('../services/openai', () => ({
  getMealSuggestions: vi.fn(),
  predictShopForItem: vi.fn(),
}));

describe('MealPlanner', () => {
  it('generates AI meal ideas and adds missing ingredients to the shopping list when planned', async () => {
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

    render(<MealPlanner />);

    await user.click(screen.getByRole('button', { name: /^New Discovery$/i }));
    await user.click(screen.getByRole('button', { name: /Generate Meal Ideas/i }));

    expect(await screen.findByText('Spinach Egg Bowl')).toBeInTheDocument();

    const suggestionCard = screen.getByText('Spinach Egg Bowl').closest('.group');
    expect(suggestionCard).toBeTruthy();

    if (!suggestionCard) {
      throw new Error('Expected meal suggestion card to render.');
    }

    await user.click(within(suggestionCard as HTMLElement).getByRole('button', { name: /Plan/i }));
    await user.click(screen.getByRole('button', { name: /Not Sure Yet/i }));

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
});
