import { DEFAULT_SHOPS } from '../constants';
import type { Shop, StoreType } from '../types';

const SPECIALTY_STORE_KEYWORDS = [
  'amazon',
  'specialty',
  'speciality',
  'import',
  'asian',
  'indian',
  'japanese',
  'korean',
  'organic',
  'online',
];

const MALL_STORE_KEYWORDS = [
  'mall',
  'target',
  'walmart',
  'costco',
  'bulk',
  'supercenter',
  'warehouse',
  'club',
];

const SPECIALTY_ITEM_KEYWORDS = [
  'matcha',
  'miso',
  'gochujang',
  'nori',
  'kombu',
  'tahini',
  'rice paper',
  'protein powder',
  'supplement',
  'imported',
  'truffle',
];

const MALL_ITEM_KEYWORDS = [
  'sparkling water',
  'paper towel',
  'detergent',
  'bulk',
  'soda',
  'cat litter',
  'dog food',
  'cleaner',
  'trash bags',
];

export function inferStoreTypeFromName(name: string): StoreType {
  const normalized = name.trim().toLowerCase();
  if (SPECIALTY_STORE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'amazon_specialty';
  if (MALL_STORE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'mall';
  return 'grocery';
}

export function classifyShoppingItemStoreType(itemName: string): StoreType {
  const normalized = itemName.trim().toLowerCase();
  if (SPECIALTY_ITEM_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'amazon_specialty';
  if (MALL_ITEM_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'mall';
  return 'grocery';
}

export function ensureDefaultShops(shops: Shop[]): Shop[] {
  const normalized = shops.map((shop) => ({
    ...shop,
    type: shop.type ?? inferStoreTypeFromName(shop.name),
    color:
      shop.color ??
      DEFAULT_SHOPS.find((defaultShop) => defaultShop.id === shop.id)?.color ??
      DEFAULT_SHOPS.find((defaultShop) => defaultShop.type === (shop.type ?? inferStoreTypeFromName(shop.name)))?.color ??
      '#8b7355',
  }));

  return DEFAULT_SHOPS.map((defaultShop) => normalized.find((shop) => shop.id === defaultShop.id) ?? defaultShop).concat(
    normalized.filter((shop) => !DEFAULT_SHOPS.some((defaultShop) => defaultShop.id === shop.id)),
  );
}

export function getDefaultShopForType(shops: Shop[], storeType: StoreType): Shop {
  return (
    shops.find((shop) => shop.type === storeType && shop.isDefault) ??
    shops.find((shop) => shop.type === storeType) ??
    ensureDefaultShops(shops).find((shop) => shop.type === storeType) ??
    DEFAULT_SHOPS[0]
  );
}
