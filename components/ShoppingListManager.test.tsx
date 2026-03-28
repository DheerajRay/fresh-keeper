import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ShoppingListManager, { getShopTheme } from './ShoppingListManager';
import { getShoppingSuggestions, predictShopForItem } from '../services/openai';
import { ZoneId } from '../types';

vi.mock('../services/openai', () => ({
  getShoppingSuggestions: vi.fn(),
  predictShopForItem: vi.fn(),
}));

describe('ShoppingListManager', () => {
  it('covers shopping helper behavior', () => {
    expect(getShopTheme('green')).toContain('400');
    expect(getShopTheme('unknown')).toContain('400');
  });

  it('shows AI suggestions and lets the user accept one into the shopping list', async () => {
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

    await user.click(screen.getByRole('button', { name: /generate suggestions/i }));

    expect(await screen.findByText('Yogurt')).toBeInTheDocument();
    expect(screen.getByText(/Frequently consumed/i)).toBeInTheDocument();

    const yogurtCard = screen.getByText('Yogurt').closest('.rounded-3xl');
    if (!yogurtCard) {
      throw new Error('Expected Yogurt suggestion card to render.');
    }

    await user.click(within(yogurtCard as HTMLElement).getByRole('button', { name: /accept yogurt/i }));

    await waitFor(() => {
      const savedList = JSON.parse(localStorage.getItem('freshkeeper_shopping_list') || '[]');
      expect(savedList.some((item: { name: string }) => item.name === 'Yogurt')).toBe(true);
    });
  });

  it('supports manual add, edit, check, clear, and store management flows', async () => {
    const user = userEvent.setup();
    vi.mocked(predictShopForItem).mockResolvedValue('shop_default_1');

    render(<ShoppingListManager />);

    await user.type(screen.getByPlaceholderText(/Milk, apples/i), 'Bread');
    await user.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(await screen.findByText('Bread')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Edit Bread/i }));

    const nameInput = screen.getByDisplayValue('Bread');
    const quantityInput = screen.getAllByRole('spinbutton').at(-1)!;
    const editSelects = screen.getAllByRole('combobox');
    const unitSelect = editSelects.at(-2)!;
    const storeSelect = editSelects.at(-1)!;
    await user.clear(nameInput);
    await user.type(nameInput, 'Whole Grain Bread');
    fireEvent.change(quantityInput, { target: { value: '3' } });
    fireEvent.change(unitSelect, { target: { value: 'box' } });
    fireEvent.change(storeSelect, { target: { value: 'shop_default_2' } });
    await user.click(screen.getByRole('button', { name: /Save changes/i }));
    expect(await screen.findByText('Whole Grain Bread')).toBeInTheDocument();
    const savedList = JSON.parse(localStorage.getItem('freshkeeper_shopping_list') || '[]');
    expect(savedList[0]).toEqual(
      expect.objectContaining({
        name: 'Whole Grain Bread',
        quantity: 3,
        unit: 'box',
        shopId: 'shop_default_2',
      }),
    );

    await user.click(screen.getByRole('button', { name: /Mark Whole Grain Bread as checked/i }));
    expect(screen.getByRole('button', { name: /Clear checked/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Clear checked/i }));
    expect(screen.queryByText('Whole Grain Bread')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Stores/i }));
    await user.type(screen.getByPlaceholderText(/Store name/i), 'Weekend Market');
    await user.click(screen.getByRole('button', { name: /Add store/i }));
    expect(await screen.findByRole('button', { name: /Delete Weekend Market/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Delete Weekend Market/i }));
    expect(screen.queryByText('Weekend Market')).not.toBeInTheDocument();
  }, 10000);

  it('supports bulk suggestion intake, dismissals, filters, direct removal, and graceful prediction failures', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(getShoppingSuggestions).mockResolvedValue([
      {
        id: 'suggestion-1',
        name: 'Lettuce',
        quantity: 1,
        unit: 'head',
        category: 'AI Suggestion',
        reason: '',
        isChecked: false,
        shopId: 'shop_default_1',
      },
      {
        id: 'suggestion-2',
        name: 'Apples',
        quantity: 4,
        unit: 'item',
        category: 'AI Suggestion',
        reason: 'Family staple',
        isChecked: false,
        shopId: 'shop_default_2',
      },
    ]);
    vi.mocked(predictShopForItem).mockRejectedValue(new Error('offline'));

    localStorage.setItem(
      'fridge_inventory',
      JSON.stringify([
        {
          id: 'inv-1',
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

    render(<ShoppingListManager />);

    await user.click(screen.getByRole('button', { name: /generate suggestions/i }));
    expect(await screen.findByText('Lettuce')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Dismiss Apples/i }));
    expect(screen.queryByText('Apples')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add all/i }));
    expect(await screen.findByText('Lettuce')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Milk, apples/i), 'Soap');
    await user.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(await screen.findByText('Soap')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Grocery Store/i }));
    expect(screen.getByText('Lettuce')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /All items/i }));

    await user.click(screen.getByRole('button', { name: /Remove Soap/i }));
    expect(screen.queryByText('Soap')).not.toBeInTheDocument();
  });
});
