import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ShoppingListManager from './ShoppingListManager';
import { getShoppingSuggestions, predictShopForItem } from '../services/openai';
import { ZoneId } from '../types';

vi.mock('../services/openai', () => ({
  getShoppingSuggestions: vi.fn(),
  predictShopForItem: vi.fn(),
}));

describe('ShoppingListManager', () => {
  it('shows AI shopping suggestions and lets the user add one to the list', async () => {
    const user = userEvent.setup();
    vi.mocked(getShoppingSuggestions).mockResolvedValue([
      {
        id: 'suggestion-1',
        name: 'Yogurt',
        quantity: 2,
        unit: 'pack',
        category: 'AI Suggestion',
        reason: 'Frequently consumed',
        isChecked: false,
        shopId: 'shop_default_1',
      },
    ]);
    vi.mocked(predictShopForItem).mockResolvedValue('shop_default_1');

    localStorage.setItem(
      'fridge_inventory',
      JSON.stringify([
        {
          id: 'inv-1',
          name: 'Milk',
          zoneId: ZoneId.LOWER_SHELVES,
          addedDate: 1,
          expiryDate: Date.now() + 86400000,
          estimatedDays: 2,
          quantity: 1,
          unit: 'carton',
        },
      ]),
    );
    localStorage.setItem('fridge_consumption_history', JSON.stringify([{ name: 'Yogurt', quantity: 1, unit: 'pack' }]));

    render(<ShoppingListManager />);

    await user.click(screen.getByRole('button', { name: /Generate Ideas/i }));

    expect(await screen.findByText('Yogurt')).toBeInTheDocument();
    expect(screen.getByText(/Frequently consumed/i)).toBeInTheDocument();

    const suggestionCard = screen.getByText('Yogurt').closest('.group');
    expect(suggestionCard).toBeTruthy();

    if (!suggestionCard) {
      throw new Error('Expected shopping suggestion card to render.');
    }

    await user.click(within(suggestionCard as HTMLElement).getByRole('button'));

    await waitFor(() => {
      const savedList = JSON.parse(localStorage.getItem('freshkeeper_shopping_list') || '[]');
      expect(savedList).toHaveLength(1);
      expect(savedList[0].name).toBe('Yogurt');
    });
  });
});
