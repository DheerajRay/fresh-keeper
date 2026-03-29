import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ShoppingListManager from './ShoppingListManager';
import { getShoppingSuggestions } from '../services/openai';
import { ZoneId } from '../types';

vi.mock('../services/openai', () => ({
  getShoppingSuggestions: vi.fn(),
}));

describe('ShoppingListManager', () => {
  it('routes manual items into default store types and supports editing', async () => {
    const user = userEvent.setup();
    render(<ShoppingListManager />);

    await user.click(screen.getByRole('button', { name: /Add item/i }));
    await user.type(screen.getByPlaceholderText(/Milk, apples/i), 'Matcha powder');
    await user.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(await screen.findByText('Matcha powder')).toBeInTheDocument();
    expect(screen.getAllByText(/Amazon \/ Specialty/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Edit Matcha powder/i }));

    const nameInput = screen.getByDisplayValue('Matcha powder');
    const quantityInput = screen.getAllByRole('spinbutton').at(-1)!;
    const editSelects = screen.getAllByRole('combobox');
    const unitSelect = editSelects.at(-2)!;
    const storeSelect = editSelects.at(-1)!;
    await user.clear(nameInput);
    await user.type(nameInput, 'Bulk Rice');
    fireEvent.change(quantityInput, { target: { value: '3' } });
    fireEvent.change(unitSelect, { target: { value: 'box' } });
    fireEvent.change(storeSelect, { target: { value: 'shop_default_mall' } });
    await user.click(screen.getByRole('button', { name: /Save changes/i }));

    expect(await screen.findByText('Bulk Rice')).toBeInTheDocument();
    const savedList = JSON.parse(localStorage.getItem('freshkeeper_shopping_list') || '[]');
    expect(savedList[0]).toEqual(
      expect.objectContaining({
        name: 'Bulk Rice',
        quantity: 3,
        unit: 'box',
        shopId: 'shop_default_mall',
        storeType: 'mall',
      }),
    );
  });

  it('shows grouped suggestions and lets the user accept or dismiss them', async () => {
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
        shopId: 'shop_default_grocery',
        source: 'restock',
        storeType: 'grocery',
      },
      {
        id: 'suggestion-2',
        name: 'Miso paste',
        quantity: 1,
        unit: 'jar',
        category: 'AI Suggestion',
        reason: 'Discover-driven specialty restock',
        isChecked: false,
        shopId: 'shop_default_amazon_specialty',
        source: 'discover_recipe',
        storeType: 'amazon_specialty',
      },
    ]);

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
    expect(screen.getByText('Miso paste')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Dismiss Miso paste/i }));
    expect(screen.queryByText('Miso paste')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Accept Yogurt/i }));

    await waitFor(() => {
      const savedList = JSON.parse(localStorage.getItem('freshkeeper_shopping_list') || '[]');
      expect(savedList.some((item: { name: string }) => item.name === 'Yogurt')).toBe(true);
    });
  });

  it('supports custom stores with auto-suggested types and keeps default store groups visible', async () => {
    const user = userEvent.setup();
    render(<ShoppingListManager />);

    await user.click(screen.getByRole('button', { name: /Stores/i }));
    expect(screen.getByText(/^Grocery · Default$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Mall · Default$/i)).toBeInTheDocument();
    expect(screen.getByText(/Amazon \/ Specialty · Default/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/Store name/i), 'Asian Specialty');
    expect(screen.getByText(/Auto-suggested route:/i)).toHaveTextContent('Amazon / Specialty');
    await user.click(screen.getByRole('button', { name: /Add store/i }));

    expect((await screen.findAllByText('Asian Specialty')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Delete Asian Specialty/i }));
    await waitFor(() => {
      expect(screen.queryByText('Asian Specialty')).not.toBeInTheDocument();
    });
  });

  it('supports bulk suggestion intake, checking items, and clearing checked entries', async () => {
    const user = userEvent.setup();
    vi.mocked(getShoppingSuggestions).mockResolvedValue([
      {
        id: 'suggestion-1',
        name: 'Lettuce',
        quantity: 1,
        unit: 'head',
        category: 'AI Suggestion',
        reason: '',
        isChecked: false,
        shopId: 'shop_default_grocery',
        source: 'restock',
        storeType: 'grocery',
      },
      {
        id: 'suggestion-2',
        name: 'Sparkling water',
        quantity: 4,
        unit: 'can',
        category: 'AI Suggestion',
        reason: 'Household staple',
        isChecked: false,
        shopId: 'shop_default_mall',
        source: 'restock',
        storeType: 'mall',
      },
    ]);

    render(<ShoppingListManager />);

    await user.click(screen.getByRole('button', { name: /generate suggestions/i }));
    expect(await screen.findByText('Lettuce')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add all/i }));

    expect(await screen.findByText('Sparkling water')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Mark Lettuce as checked/i }));
    await user.click(screen.getByRole('button', { name: /Clear checked/i }));

    expect(screen.queryByText('Lettuce')).not.toBeInTheDocument();
    expect(screen.getByText('Sparkling water')).toBeInTheDocument();
  });
});
