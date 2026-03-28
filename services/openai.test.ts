import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  askFridgeAI,
  getMealSuggestions,
  getShelfLifePrediction,
  getShoppingSuggestions,
  predictShopForItem,
} from './openai';
import { Shop } from '../types';

const fetchMock = vi.fn();

function mockJsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

describe('services/openai', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  it('returns the AI storage answer for guide queries', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ text: 'Store bananas on the counter.' }));

    const result = await askFridgeAI('Where should bananas go?');

    expect(result).toBe('Store bananas on the counter.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back gracefully when the guide AI request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(mockJsonResponse({ error: 'broken' }, false, 500));

    const result = await askFridgeAI('Where should basil go?');

    expect(result).toContain("Sorry, I'm having trouble");
  });

  it('caches shelf-life predictions in localStorage', async () => {
    const payload = {
      days: 7,
      advice: 'Keep refrigerated.',
      isFood: true,
      recommendedStorage: 'FRIDGE',
    };

    fetchMock.mockResolvedValue(mockJsonResponse(payload));

    const first = await getShelfLifePrediction('Milk', 'Lower Shelves');
    const second = await getShelfLifePrediction('Milk', 'Lower Shelves');

    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('freshkeeper_ai_cache_v3')).toContain('"milk|lower shelves"');
  });

  it('maps shopping suggestions to shopping items with the matched shop id', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        items: [
          {
            name: 'Milk',
            quantity: 1,
            unit: 'carton',
            category: 'AI Suggestion',
            reason: 'Running low',
            shopName: 'Grocery Store',
          },
        ],
      }),
    );

    const shops: Shop[] = [
      { id: 'shop-1', name: 'Grocery Store', color: 'blue' },
      { id: 'shop-2', name: 'Farmer\'s Market', color: 'green' },
    ];

    const result = await getShoppingSuggestions([], [], shops);

    expect(result).toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Milk',
        quantity: 1,
        unit: 'carton',
        category: 'AI Suggestion',
        reason: 'Running low',
        shopId: 'shop-1',
        isChecked: false,
      },
    ]);
  });

  it('maps meal suggestions and fills missing ids', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('22222222-2222-2222-2222-222222222222');
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        meals: [
          {
            title: 'Spinach Omelet',
            type: 'Breakfast',
            description: 'Fast breakfast',
            isRecipe: true,
            expiringItemsUsed: ['spinach'],
            prepTime: '10 min',
            difficulty: 'Easy',
            flavorProfile: 'Savory',
            chefTip: 'Cook low and slow.',
            ingredients: [{ name: 'Spinach', amount: '1 cup', inInventory: true }],
            instructions: ['Beat eggs.', 'Cook spinach.'],
          },
        ],
      }),
    );

    const result = await getMealSuggestions([], '2026-03-29', 'quick breakfast', ['Vegetarian']);

    expect(result).toEqual([
      expect.objectContaining({
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Spinach Omelet',
        type: 'Breakfast',
      }),
    ]);
  });

  it('returns the matched shop id for predicted stores', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ shopName: 'Farmer\'s Market' }));

    const result = await predictShopForItem('Tomatoes', [
      { id: 'shop-1', name: 'Grocery Store', color: 'blue' },
      { id: 'shop-2', name: 'Farmer\'s Market', color: 'green' },
    ]);

    expect(result).toBe('shop-2');
  });
});
