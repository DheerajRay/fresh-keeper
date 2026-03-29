import { DiscoveredMeal, InventoryItem, PlanIdea, ShoppingItem, Shop } from '../types';
import { getSupabaseBrowserClient } from '../lib/supabase';

const CACHE_KEY = 'freshkeeper_ai_cache_v3';

async function postAi<T>(payload: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: any = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_error) {
    throw new Error(raw || `AI request failed with status ${response.status}.`);
  }

  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'AI request failed.');
  }

  return data as T;
}

export const askFridgeAI = async (query: string): Promise<string> => {
  try {
    const result = await postAi<{ text: string }>({
      action: 'ask_fridge_ai',
      query,
    });

    return result.text || "I couldn't find specific advice for that, but generally, keep it cool and dry!";
  } catch (error) {
    console.error('OpenAI fridge search error:', error);
    return "Sorry, I'm having trouble checking my food safety database right now. Please try again later.";
  }
};

export const getShelfLifePrediction = async (
  itemName: string,
  zoneName: string,
): Promise<{ days: number; advice: string; isFood: boolean; recommendedStorage: string }> => {
  const cacheKey = `${itemName.toLowerCase().trim()}|${zoneName.toLowerCase().trim()}`;

  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cache = JSON.parse(cachedRaw);
      if (cache[cacheKey]) {
        return {
          days: cache[cacheKey].days,
          advice: cache[cacheKey].advice,
          isFood: cache[cacheKey].isFood ?? true,
          recommendedStorage: cache[cacheKey].recommendedStorage ?? 'FRIDGE',
        };
      }
    }
  } catch (error) {
    console.warn('Shelf-life cache read failed:', error);
  }

  try {
    const result = await postAi<{ days: number; advice: string; isFood: boolean; recommendedStorage: string }>({
      action: 'shelf_life',
      itemName,
      zoneName,
    });

    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      const cache = cachedRaw ? JSON.parse(cachedRaw) : {};
      cache[cacheKey] = result;
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Shelf-life cache write failed:', error);
    }

    return result;
  } catch (error) {
    console.error('Shelf-life prediction error:', error);
    return { days: 5, advice: 'Check for spoilage.', isFood: true, recommendedStorage: 'FRIDGE' };
  }
};

export const identifyItemFromImage = async (base64Image: string): Promise<any> => {
  return postAi({
    action: 'identify_image',
    base64Image,
  });
};

export const predictShopForItem = async (itemName: string, availableShops: Shop[]): Promise<string | null> => {
  if (availableShops.length === 0) return null;

  try {
    const result = await postAi<{ shopName: string }>({
      action: 'predict_shop',
      itemName,
      availableShops,
    });

    const matched = availableShops.find((shop) => shop.name.toLowerCase() === result.shopName?.toLowerCase());
    return matched ? matched.id : null;
  } catch (error) {
    console.warn('Shop prediction error:', error);
    return null;
  }
};

export const getShoppingSuggestions = async (
  inventory: InventoryItem[],
  history: InventoryItem[],
  availableShops: Shop[] = [],
): Promise<ShoppingItem[]> => {
  try {
    const result = await postAi<{
      items: Array<{
        name: string;
        quantity: number;
        unit?: string;
        category: ShoppingItem['category'];
        reason?: string;
        shopName?: string;
        source?: ShoppingItem['source'];
        storeType?: ShoppingItem['storeType'];
      }>;
    }>({
      action: 'shopping_suggestions',
      inventory,
      history,
      availableShops,
    });

    return (result.items || []).map((item) => {
      const matchedShop = availableShops.find((shop) => shop.name === item.shopName);
      return {
        id: crypto.randomUUID(),
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        reason: item.reason,
        shopId: matchedShop?.id || availableShops[0]?.id,
        isChecked: false,
        source: item.source || 'restock',
        storeType: item.storeType || matchedShop?.type || availableShops[0]?.type || 'grocery',
      };
    });
  } catch (error) {
    console.error('Shopping suggestions error:', error);
    return [];
  }
};

export const getPlanMealIdeas = async (
  inventory: InventoryItem[],
  forDate: string,
  dietaryRestrictions: string[] = [],
  historySummary = '',
): Promise<PlanIdea[]> => {
  try {
    const result = await postAi<{ ideas: PlanIdea[] }>({
      action: 'plan_inventory_ideas',
      inventory,
      forDate,
      dietaryRestrictions,
      historySummary,
    });

    return (result.ideas || []).map((meal) => ({
      ...meal,
      id: meal.id || crypto.randomUUID(),
      source: 'plan_bank',
    }));
  } catch (error) {
    console.error('Plan bank error:', error);
    return [];
  }
};

export const getDiscoverMealIdeas = async (
  inventory: InventoryItem[],
  preference?: string,
  dietaryRestrictions: string[] = [],
  historySummary = '',
): Promise<DiscoveredMeal[]> => {
  try {
    const result = await postAi<{ meals: DiscoveredMeal[] }>({
      action: 'discover_meal_ideas',
      inventory,
      preference,
      dietaryRestrictions,
      historySummary,
    });

    return (result.meals || []).map((meal) => ({
      ...meal,
      id: meal.id || crypto.randomUUID(),
      source: 'discover',
    }));
  } catch (error) {
    console.error('Meal suggestion error:', error);
    return [];
  }
};

export const getMealSuggestions = async (
  inventory: InventoryItem[],
  _forDate: string,
  preference?: string,
  dietaryRestrictions: string[] = [],
): Promise<DiscoveredMeal[]> => getDiscoverMealIdeas(inventory, preference, dietaryRestrictions);
