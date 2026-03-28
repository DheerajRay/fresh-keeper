import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  askFridgeAI,
  getMealSuggestions,
  getShelfLifePrediction,
  getShoppingSuggestions,
  identifyItemFromImage,
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

  it('falls back to a default answer when the guide response is empty', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ text: '' }));

    const result = await askFridgeAI('Where should oranges go?');

    expect(result).toContain("I couldn't find specific advice");
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

  it('falls back when cached shelf-life data cannot be parsed or written', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('freshkeeper_ai_cache_v3', '{bad-json');
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        days: 2,
        advice: 'Use quickly.',
        isFood: true,
        recommendedStorage: 'FRIDGE',
      }),
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('disk full');
    });

    const result = await getShelfLifePrediction('Spinach', 'Crisper Drawers');

    expect(result.days).toBe(2);
  });

  it('fills cache defaults when older cached shelf-life entries omit optional fields', async () => {
    localStorage.setItem(
      'freshkeeper_ai_cache_v3',
      JSON.stringify({
        'cheese|door': {
          days: 3,
          advice: 'Use quickly.',
        },
      }),
    );

    const result = await getShelfLifePrediction('Cheese', 'Door');

    expect(result).toEqual({
      days: 3,
      advice: 'Use quickly.',
      isFood: true,
      recommendedStorage: 'FRIDGE',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the hardcoded shelf-life fallback when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(mockJsonResponse({ error: 'down' }, false, 500));

    const result = await getShelfLifePrediction('Mystery item', 'Counter');

    expect(result).toEqual({
      days: 5,
      advice: 'Check for spoilage.',
      isFood: true,
      recommendedStorage: 'FRIDGE',
    });
  });

  it('sends image identification requests through the AI proxy', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ name: 'Basil', isFood: true }));

    const result = await identifyItemFromImage('base64-data');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result).toEqual({ name: 'Basil', isFood: true });
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

  it('falls back to the first shop when the suggested shop name does not match', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('33333333-3333-3333-3333-333333333333');
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        items: [
          {
            name: 'Bread',
            quantity: 1,
            category: 'Restock',
            shopName: 'Unknown store',
          },
        ],
      }),
    );

    const result = await getShoppingSuggestions([], [], [
      { id: 'shop-1', name: 'Grocery Store', color: 'blue' },
      { id: 'shop-2', name: 'Farmer\'s Market', color: 'green' },
    ]);

    expect(result[0].shopId).toBe('shop-1');
  });

  it('returns an empty suggestion list when shopping suggestions fail', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(mockJsonResponse({ error: 'down' }, false, 500));

    const result = await getShoppingSuggestions([], [], []);

    expect(result).toEqual([]);
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

  it('returns an empty meal suggestion list when the AI request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(mockJsonResponse({ error: 'down' }, false, 500));

    const result = await getMealSuggestions([], '2026-03-29');

    expect(result).toEqual([]);
  });

  it('returns the matched shop id for predicted stores', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ shopName: 'Farmer\'s Market' }));

    const result = await predictShopForItem('Tomatoes', [
      { id: 'shop-1', name: 'Grocery Store', color: 'blue' },
      { id: 'shop-2', name: 'Farmer\'s Market', color: 'green' },
    ]);

    expect(result).toBe('shop-2');
  });

  it('returns null when the predicted shop name does not match any available store', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ shopName: 'Unknown Shop' }));

    const result = await predictShopForItem('Tomatoes', [
      { id: 'shop-1', name: 'Grocery Store', color: 'blue' },
    ]);

    expect(result).toBeNull();
  });

  it('returns null when no shops are available or prediction fails', async () => {
    expect(await predictShopForItem('Tomatoes', [])).toBeNull();

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValue(mockJsonResponse({ error: 'down' }, false, 500));

    const result = await predictShopForItem('Tomatoes', [
      { id: 'shop-1', name: 'Grocery Store', color: 'blue' },
    ]);

    expect(result).toBeNull();
  });

  it('returns empty collections when the AI payload omits suggestion arrays', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ items: undefined }))
      .mockResolvedValueOnce(mockJsonResponse({ meals: undefined }));

    expect(await getShoppingSuggestions([], [], [])).toEqual([]);
    expect(await getMealSuggestions([], '2026-03-29')).toEqual([]);
  });

  it('preserves an existing meal id when one is returned by the API', async () => {
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        meals: [
          {
            id: 'meal-existing',
            title: 'Soup',
            type: 'Dinner',
            description: 'Warm soup',
            isRecipe: true,
            expiringItemsUsed: [],
            ingredients: [],
            instructions: [],
          },
        ],
      }),
    );

    const result = await getMealSuggestions([], '2026-03-29');

    expect(result[0].id).toBe('meal-existing');
  });

  it('surfaces raw non-JSON server failures through the guide fallback path', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('server exploded'),
    });

    const result = await askFridgeAI('Where does this go?');

    expect(result).toContain("Sorry, I'm having trouble");
  });

  it('handles empty non-json error bodies through the guide fallback path', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue(''),
    });

    const result = await askFridgeAI('Where does this go?');

    expect(result).toContain("Sorry, I'm having trouble");
  });

  it('throws the generic AI error when a proxy request fails without a response body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue(''),
    });

    await expect(identifyItemFromImage('base64-data')).rejects.toThrow('AI request failed.');
  });
});
