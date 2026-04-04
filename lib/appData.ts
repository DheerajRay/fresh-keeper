import { DEFAULT_SHOPS } from '../constants';
import type {
  AppSizeName,
  DietaryRestriction,
  InventoryItem,
  MealSuggestion,
  Shop,
  ShoppingItem,
  StoreType,
  ThemeName,
} from '../types';
import { ensureDefaultShops, inferStoreTypeFromName } from './storeRouting';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase';

const STORAGE_KEYS = {
  inventory: 'fridge_inventory',
  history: 'fridge_consumption_history',
  mealPlans: 'freshkeeper_meal_plans',
  suggestionQueue: 'freshkeeper_suggestion_queue',
  dietaryRestrictions: 'freshkeeper_dietary_restrictions',
  shoppingList: 'freshkeeper_shopping_list',
  shops: 'freshkeeper_shops',
  theme: 'freshkeeper_theme',
  appSize: 'freshkeeper_app_size',
} as const;

type RemoteContext = {
  supabase: SupabaseClient;
  householdId: string;
  userId: string;
};

type InventoryRow = {
  id: string;
  household_id: string;
  name: string;
  zone_id: string;
  added_at: string;
  expiry_at: string;
  estimated_days: number;
  note: string | null;
  quantity: number;
  unit: string | null;
  recommended_storage: string | null;
};

type ShopRow = {
  id: string;
  household_id: string;
  name: string;
  color: string | null;
  store_type: StoreType;
  is_default: boolean;
};

type ShoppingItemRow = {
  id: string;
  household_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: ShoppingItem['category'];
  reason: string | null;
  is_checked: boolean;
  shop_id: string | null;
  source: ShoppingItem['source'];
  store_type: StoreType | null;
};

type MealPlanBucketRow = {
  household_id: string;
  bucket_key: string;
  meals: MealSuggestion[];
};

type MealQueueRow = {
  household_id: string;
  meals: MealSuggestion[];
};

type UserPreferencesRow = {
  user_id: string;
  dietary_restrictions: DietaryRestriction[];
  theme: ThemeName;
  app_size: AppSizeName;
};

let cachedRemoteContext: RemoteContext | null = null;

function isThemeName(value: unknown): value is ThemeName {
  return [
    'dark',
    'light',
    'zen',
    'banana',
    'arctic',
    'summer',
    'pitch_black',
    'red',
  ].includes(String(value));
}

function isStoreType(value: unknown): value is StoreType {
  return value === 'grocery' || value === 'mall' || value === 'amazon_specialty';
}

function isAppSizeName(value: unknown): value is AppSizeName {
  return value === 's' || value === 'm' || value === 'l';
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Could not parse local data for ${key}`, error);
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeShop(shop: Partial<Shop> & { name?: string; id?: string }): Shop {
  const inferredType = isStoreType(shop.type) ? shop.type : inferStoreTypeFromName(shop.name || '');
  return {
    id: shop.id || crypto.randomUUID(),
    name: shop.name?.trim() || 'Custom store',
    type: inferredType,
    color:
      shop.color ??
      DEFAULT_SHOPS.find((defaultShop) => defaultShop.id === shop.id)?.color ??
      DEFAULT_SHOPS.find((defaultShop) => defaultShop.type === inferredType)?.color ??
      '#8b7355',
    isDefault: Boolean(shop.isDefault),
  };
}

function normalizeShoppingItem(item: Partial<ShoppingItem> & { id?: string; name?: string }): ShoppingItem {
  return {
    id: item.id || crypto.randomUUID(),
    name: item.name?.trim() || 'Untitled item',
    quantity: Math.max(1, item.quantity || 1),
    unit: item.unit || 'item',
    category: item.category || 'User Added',
    reason: item.reason,
    isChecked: Boolean(item.isChecked),
    shopId: item.shopId,
    source: item.source || 'manual',
    storeType: isStoreType(item.storeType) ? item.storeType : undefined,
  };
}

export function getLocalInventory() {
  return readJson<InventoryItem[]>(STORAGE_KEYS.inventory, []);
}

export function setLocalInventory(items: InventoryItem[]) {
  writeJson(STORAGE_KEYS.inventory, items);
}

export function getLocalConsumptionHistory() {
  return readJson<InventoryItem[]>(STORAGE_KEYS.history, []);
}

export function pushLocalConsumptionHistory(item: InventoryItem) {
  const nextHistory = [item, ...getLocalConsumptionHistory()].slice(0, 50);
  writeJson(STORAGE_KEYS.history, nextHistory);
}

export function getLocalMealPlans() {
  return readJson<Record<string, MealSuggestion[]>>(STORAGE_KEYS.mealPlans, {});
}

export function setLocalMealPlans(plans: Record<string, MealSuggestion[]>) {
  writeJson(STORAGE_KEYS.mealPlans, plans);
}

export function getLocalMealSuggestionQueue() {
  return readJson<MealSuggestion[]>(STORAGE_KEYS.suggestionQueue, []);
}

export function setLocalMealSuggestionQueue(queue: MealSuggestion[]) {
  writeJson(STORAGE_KEYS.suggestionQueue, queue);
}

export function getLocalDietaryRestrictions() {
  return readJson<DietaryRestriction[]>(STORAGE_KEYS.dietaryRestrictions, []);
}

export function setLocalDietaryRestrictions(restrictions: DietaryRestriction[]) {
  writeJson(STORAGE_KEYS.dietaryRestrictions, restrictions);
}

export function getLocalShoppingList() {
  return readJson<Array<Partial<ShoppingItem>>>(STORAGE_KEYS.shoppingList, []).map(normalizeShoppingItem);
}

export function setLocalShoppingList(items: ShoppingItem[]) {
  writeJson(STORAGE_KEYS.shoppingList, items);
}

export function getLocalShops() {
  return ensureDefaultShops(readJson<Array<Partial<Shop>>>(STORAGE_KEYS.shops, DEFAULT_SHOPS).map(normalizeShop));
}

export function setLocalShops(shops: Shop[]) {
  writeJson(STORAGE_KEYS.shops, ensureDefaultShops(shops));
}

export function getLocalTheme(): ThemeName {
  const raw = localStorage.getItem(STORAGE_KEYS.theme);
  return isThemeName(raw) ? raw : 'dark';
}

export function setLocalTheme(theme: ThemeName) {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

export function getLocalAppSize(): AppSizeName {
  const raw = localStorage.getItem(STORAGE_KEYS.appSize);
  return isAppSizeName(raw) ? raw : 'm';
}

export function setLocalAppSize(size: AppSizeName) {
  localStorage.setItem(STORAGE_KEYS.appSize, size);
}

async function getRemoteContext(): Promise<RemoteContext | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    cachedRemoteContext = null;
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;
  if (!userId) {
    cachedRemoteContext = null;
    return null;
  }

  if (cachedRemoteContext?.userId === userId) {
    return cachedRemoteContext;
  }

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error || !data?.household_id) {
    if (error) console.warn('Could not resolve current household', error);
    cachedRemoteContext = null;
    return null;
  }

  cachedRemoteContext = {
    supabase,
    householdId: data.household_id,
    userId,
  };

  return cachedRemoteContext;
}

function mapInventoryRow(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    zoneId: row.zone_id as InventoryItem['zoneId'],
    addedDate: new Date(row.added_at).getTime(),
    expiryDate: new Date(row.expiry_at).getTime(),
    estimatedDays: row.estimated_days,
    note: row.note ?? undefined,
    quantity: row.quantity,
    unit: row.unit ?? undefined,
    recommendedStorage: row.recommended_storage ?? undefined,
  };
}

function toInventoryRow(item: InventoryItem, householdId: string): InventoryRow {
  return {
    id: item.id,
    household_id: householdId,
    name: item.name,
    zone_id: item.zoneId,
    added_at: new Date(item.addedDate).toISOString(),
    expiry_at: new Date(item.expiryDate).toISOString(),
    estimated_days: item.estimatedDays,
    note: item.note ?? null,
    quantity: item.quantity,
    unit: item.unit ?? null,
    recommended_storage: item.recommendedStorage ?? null,
  };
}

function mapShopRow(row: ShopRow): Shop {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? undefined,
    type: row.store_type,
    isDefault: row.is_default,
  };
}

function toShopRow(shop: Shop, householdId: string): ShopRow {
  const normalizedShop = normalizeShop(shop);
  return {
    id: normalizedShop.id,
    household_id: householdId,
    name: normalizedShop.name,
    color: normalizedShop.color ?? '#8b7355',
    store_type: normalizedShop.type,
    is_default: Boolean(normalizedShop.isDefault),
  };
}

function mapShoppingItemRow(row: ShoppingItemRow): ShoppingItem {
  return normalizeShoppingItem({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit ?? undefined,
    category: row.category,
    reason: row.reason ?? undefined,
    isChecked: row.is_checked,
    shopId: row.shop_id ?? undefined,
    source: row.source,
    storeType: row.store_type ?? undefined,
  });
}

function toShoppingItemRow(item: ShoppingItem, householdId: string): ShoppingItemRow {
  return {
    id: item.id,
    household_id: householdId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit ?? null,
    category: item.category,
    reason: item.reason ?? null,
    is_checked: item.isChecked,
    shop_id: item.shopId ?? null,
    source: item.source,
    store_type: item.storeType ?? null,
  };
}

async function hydrateRemoteCollection<T>(loadRemote: (context: RemoteContext) => Promise<T | null>): Promise<T | null> {
  const context = await getRemoteContext();
  if (!context) return null;
  return loadRemote(context);
}

async function upsertUserPreferences(patch: Partial<UserPreferencesRow>) {
  const context = await getRemoteContext();
  if (!context) return;

  const { data } = await context.supabase
    .from('user_preferences')
    .select('dietary_restrictions, theme, app_size')
    .eq('user_id', context.userId)
    .maybeSingle();

  const next: UserPreferencesRow = {
    user_id: context.userId,
    dietary_restrictions: patch.dietary_restrictions ?? (data as UserPreferencesRow | null)?.dietary_restrictions ?? getLocalDietaryRestrictions(),
    theme: patch.theme ?? (data as UserPreferencesRow | null)?.theme ?? getLocalTheme(),
    app_size: patch.app_size ?? (data as UserPreferencesRow | null)?.app_size ?? getLocalAppSize(),
  };

  const { error } = await context.supabase.from('user_preferences').upsert(next, { onConflict: 'user_id' });
  if (error) console.warn('Could not save user preferences', error);
}

export async function hydrateInventory(localItems: InventoryItem[]) {
  const remoteItems = await hydrateRemoteCollection(async ({ supabase, householdId }) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('household_id', householdId)
      .order('added_at', { ascending: false });

    if (error) {
      console.warn('Could not load inventory from Supabase', error);
      return localItems;
    }

    if (!data.length && localItems.length > 0) {
      await replaceRemoteInventory(localItems);
      return localItems;
    }

    return (data as InventoryRow[]).map(mapInventoryRow);
  });

  return remoteItems ?? localItems;
}

export async function replaceRemoteInventory(items: InventoryItem[]) {
  const context = await getRemoteContext();
  if (!context) return;

  const { error: deleteError } = await context.supabase.from('inventory_items').delete().eq('household_id', context.householdId);
  if (deleteError) {
    console.warn('Could not clear remote inventory', deleteError);
    return;
  }

  if (items.length === 0) return;

  const { error } = await context.supabase.from('inventory_items').insert(items.map((item) => toInventoryRow(item, context.householdId)));
  if (error) console.warn('Could not save remote inventory', error);
}

export async function appendRemoteConsumptionEvent(item: InventoryItem) {
  const context = await getRemoteContext();
  if (!context) return;

  const { error } = await context.supabase.from('consumption_events').insert({
    household_id: context.householdId,
    item_id: item.id,
    name: item.name,
    zone_id: item.zoneId,
    added_at: new Date(item.addedDate).toISOString(),
    expiry_at: new Date(item.expiryDate).toISOString(),
    estimated_days: item.estimatedDays,
    note: item.note ?? null,
    quantity: item.quantity,
    unit: item.unit ?? null,
    recommended_storage: item.recommendedStorage ?? null,
  });

  if (error) console.warn('Could not append remote consumption event', error);
}

export async function hydrateMealPlans(localPlans: Record<string, MealSuggestion[]>) {
  const remotePlans = await hydrateRemoteCollection(async ({ supabase, householdId }) => {
    const { data, error } = await supabase
      .from('meal_plan_buckets')
      .select('bucket_key, meals')
      .eq('household_id', householdId);

    if (error) {
      console.warn('Could not load meal plans from Supabase', error);
      return localPlans;
    }

    if (!data.length && Object.keys(localPlans).length > 0) {
      await replaceRemoteMealPlans(localPlans);
      return localPlans;
    }

    return (data as MealPlanBucketRow[]).reduce<Record<string, MealSuggestion[]>>((accumulator, row) => {
      accumulator[row.bucket_key] = row.meals || [];
      return accumulator;
    }, {});
  });

  return remotePlans ?? localPlans;
}

export async function replaceRemoteMealPlans(plans: Record<string, MealSuggestion[]>) {
  const context = await getRemoteContext();
  if (!context) return;

  const { error: deleteError } = await context.supabase.from('meal_plan_buckets').delete().eq('household_id', context.householdId);
  if (deleteError) {
    console.warn('Could not clear remote meal plans', deleteError);
    return;
  }

  const rows = Object.entries(plans).map(([bucketKey, meals]) => ({
    household_id: context.householdId,
    bucket_key: bucketKey,
    meals,
  }));

  if (rows.length === 0) return;

  const { error } = await context.supabase.from('meal_plan_buckets').insert(rows);
  if (error) console.warn('Could not save remote meal plans', error);
}

export async function hydrateMealSuggestionQueue(localQueue: MealSuggestion[]) {
  const remoteQueue = await hydrateRemoteCollection(async ({ supabase, householdId }) => {
    const { data, error } = await supabase
      .from('meal_suggestion_queues')
      .select('meals')
      .eq('household_id', householdId)
      .maybeSingle();

    if (error) {
      console.warn('Could not load meal suggestion queue from Supabase', error);
      return localQueue;
    }

    if (!data && localQueue.length > 0) {
      await replaceRemoteMealSuggestionQueue(localQueue);
      return localQueue;
    }

    return ((data as MealQueueRow | null)?.meals ?? []) as MealSuggestion[];
  });

  return remoteQueue ?? localQueue;
}

export async function replaceRemoteMealSuggestionQueue(queue: MealSuggestion[]) {
  const context = await getRemoteContext();
  if (!context) return;

  const { error } = await context.supabase.from('meal_suggestion_queues').upsert(
    {
      household_id: context.householdId,
      meals: queue,
    },
    { onConflict: 'household_id' },
  );

  if (error) console.warn('Could not save remote meal suggestion queue', error);
}

export async function hydrateDietaryRestrictions(localRestrictions: DietaryRestriction[]) {
  const remoteRestrictions = await hydrateRemoteCollection(async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('dietary_restrictions')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not load dietary restrictions from Supabase', error);
      return localRestrictions;
    }

    if (!data && localRestrictions.length > 0) {
      await replaceRemoteDietaryRestrictions(localRestrictions);
      return localRestrictions;
    }

    return ((data as UserPreferencesRow | null)?.dietary_restrictions ?? []) as DietaryRestriction[];
  });

  return remoteRestrictions ?? localRestrictions;
}

export async function replaceRemoteDietaryRestrictions(restrictions: DietaryRestriction[]) {
  await upsertUserPreferences({ dietary_restrictions: restrictions });
}

export async function hydrateTheme(localTheme: ThemeName) {
  const remoteTheme = await hydrateRemoteCollection(async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('theme')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not load theme from Supabase', error);
      return localTheme;
    }

    if (!data && localTheme) {
      await replaceRemoteTheme(localTheme);
      return localTheme;
    }

    return (data as Pick<UserPreferencesRow, 'theme'> | null)?.theme ?? localTheme;
  });

  return remoteTheme ?? localTheme;
}

export async function hydrateAppSize(localAppSize: AppSizeName) {
  const remoteAppSize = await hydrateRemoteCollection(async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('app_size')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not load app size from Supabase', error);
      return localAppSize;
    }

    if (!data && localAppSize) {
      await replaceRemoteAppSize(localAppSize);
      return localAppSize;
    }

    return (data as Pick<UserPreferencesRow, 'app_size'> | null)?.app_size ?? localAppSize;
  });

  return remoteAppSize ?? localAppSize;
}

export async function replaceRemoteTheme(theme: ThemeName) {
  await upsertUserPreferences({ theme });
}

export async function replaceRemoteAppSize(app_size: AppSizeName) {
  await upsertUserPreferences({ app_size });
}

export async function hydrateShoppingList(localItems: ShoppingItem[]) {
  const remoteItems = await hydrateRemoteCollection(async ({ supabase, householdId }) => {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Could not load shopping list from Supabase', error);
      return localItems;
    }

    if (!data.length && localItems.length > 0) {
      await replaceRemoteShoppingList(localItems);
      return localItems;
    }

    return (data as ShoppingItemRow[]).map(mapShoppingItemRow);
  });

  return remoteItems ?? localItems;
}

export async function replaceRemoteShoppingList(items: ShoppingItem[]) {
  const context = await getRemoteContext();
  if (!context) return;

  const { error: deleteError } = await context.supabase.from('shopping_items').delete().eq('household_id', context.householdId);
  if (deleteError) {
    console.warn('Could not clear remote shopping list', deleteError);
    return;
  }

  if (items.length === 0) return;

  const { error } = await context.supabase.from('shopping_items').insert(items.map((item) => toShoppingItemRow(item, context.householdId)));
  if (error) console.warn('Could not save remote shopping list', error);
}

export async function hydrateShops(localShops: Shop[]) {
  const normalizedLocalShops = ensureDefaultShops(localShops);
  const remoteShops = await hydrateRemoteCollection(async ({ supabase, householdId }) => {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Could not load shops from Supabase', error);
      return normalizedLocalShops;
    }

    if (!data.length && normalizedLocalShops.length > 0) {
      await replaceRemoteShops(normalizedLocalShops);
      return normalizedLocalShops;
    }

    return ensureDefaultShops((data as ShopRow[]).map(mapShopRow));
  });

  return ensureDefaultShops(remoteShops ?? normalizedLocalShops);
}

export async function replaceRemoteShops(shops: Shop[]) {
  const context = await getRemoteContext();
  if (!context) return;

  const normalizedShops = ensureDefaultShops(shops);
  const { error: deleteError } = await context.supabase.from('shops').delete().eq('household_id', context.householdId);
  if (deleteError) {
    console.warn('Could not clear remote shops', deleteError);
    return;
  }

  if (normalizedShops.length === 0) return;

  const { error } = await context.supabase.from('shops').insert(normalizedShops.map((shop) => toShopRow(shop, context.householdId)));
  if (error) console.warn('Could not save remote shops', error);
}

