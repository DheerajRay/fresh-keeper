import { StoreType, ZoneId, ZoneData, Shop } from './types';
import { Thermometer, Wind, Droplets, AlertTriangle } from 'lucide-react';

export const UNIT_OPTIONS = [
  { value: 'item', label: 'Item(s)' },
  { value: 'bowl', label: 'Bowl(s)' },
  { value: 'container', label: 'Container(s)' },
  { value: 'plate', label: 'Plate(s)' },
  { value: 'carton', label: 'Carton(s)' },
  { value: 'pack', label: 'Pack(s)' },
  { value: 'btl', label: 'Bottle(s)' },
  { value: 'can', label: 'Can(s)' },
  { value: 'jar', label: 'Jar(s)' },
  { value: 'box', label: 'Box(es)' },
  { value: 'bag', label: 'Bag(s)' },
  { value: 'bunch', label: 'Bunch(es)' },
  { value: 'slice', label: 'Slice(s)' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'lb', label: 'lb' },
  { value: 'oz', label: 'oz' },
  { value: 'L', label: 'L' },
  { value: 'ml', label: 'ml' },
];

export const STORE_TYPE_OPTIONS: Array<{ label: string; value: StoreType; description: string }> = [
  { label: 'Grocery', value: 'grocery', description: 'Nearby or walkable daily shopping.' },
  { label: 'Mall', value: 'mall', description: 'Car, delivery, or a larger store trip.' },
  { label: 'Amazon / Specialty', value: 'amazon_specialty', description: 'Hard-to-find or specialty items.' },
];

export const DEFAULT_SHOPS: Shop[] = [
  { id: 'shop_default_grocery', name: 'Grocery', type: 'grocery', isDefault: true },
  { id: 'shop_default_mall', name: 'Mall', type: 'mall', isDefault: true },
  { id: 'shop_default_amazon_specialty', name: 'Amazon / Specialty', type: 'amazon_specialty', isDefault: true },
];

export const STORE_TYPE_LABELS: Record<StoreType, string> = {
  grocery: 'Grocery',
  mall: 'Mall',
  amazon_specialty: 'Amazon / Specialty',
};

export const STORE_TYPE_DESCRIPTIONS: Record<StoreType, string> = {
  grocery: 'Nearby or walkable daily shopping.',
  mall: 'A larger errand, car trip, or delivery order.',
  amazon_specialty: 'Far-away, specialty, or hard-to-find ingredients.',
};

export const DIETARY_OPTIONS: { value: string, label: string }[] = [
  { value: 'None', label: 'None' },
  { value: 'Vegetarian', label: 'Vegetarian' },
  { value: 'Vegan', label: 'Vegan' },
  { value: 'Gluten-Free', label: 'Gluten-Free' },
  { value: 'Dairy-Free', label: 'Dairy-Free' },
  { value: 'Keto', label: 'Keto' },
  { value: 'Paleo', label: 'Paleo' },
  { value: 'Low-Carb', label: 'Low-Carb' },
];

export const FRIDGE_ZONES: Record<ZoneId, ZoneData> = {
  // --- FRIDGE ZONES ---
  [ZoneId.UPPER_SHELVES]: {
    id: ZoneId.UPPER_SHELVES,
    name: 'Upper Shelves',
    temperature: 'Consistent, Moderate',
    bestFor: ['Leftovers', 'Ready-to-eat foods', 'Drinks', 'Herbs', 'Berries'],
    description: 'The upper shelves have the most consistent temperature. Store foods here that do not need to be cooked.',
    spoilageRisk: 'Medium',
    tips: [
      'Store leftovers in clear, airtight containers.',
      'Keep herbs upright in a glass of water.',
      'Berry life can be extended by washing with vinegar/water mix.'
    ]
  },
  [ZoneId.LOWER_SHELVES]: {
    id: ZoneId.LOWER_SHELVES,
    name: 'Lower Shelves',
    temperature: 'Coldest Part',
    bestFor: ['Raw Meat', 'Poultry', 'Fish', 'Dairy', 'Eggs'],
    description: 'This is usually the coldest part of the fridge. Store raw ingredients here to prevent bacteria growth and cross-contamination.',
    spoilageRisk: 'High',
    tips: [
      'Keep raw meat on a plate or tray to catch drips.',
      'Store eggs in their original carton, not the door.',
      'Check milk expiration dates frequently.'
    ]
  },
  [ZoneId.CRISPER_DRAWER]: {
    id: ZoneId.CRISPER_DRAWER,
    name: 'Crisper Drawers',
    temperature: 'Humidity Controlled',
    bestFor: ['Vegetables (High Humidity)', 'Fruits (Low Humidity)'],
    description: 'Designed to control airflow and humidity to keep produce fresh longer.',
    spoilageRisk: 'Medium',
    tips: [
      'Separate ethylene producers (apples, bananas) from ethylene sensitive items (leafy greens).',
      'Use the humidity slider: Open for fruit, Closed for veggies.',
      'Line drawers with paper towels to absorb excess moisture.'
    ]
  },
  [ZoneId.DOOR]: {
    id: ZoneId.DOOR,
    name: 'Fridge Door',
    temperature: 'Warmest & Fluctuating',
    bestFor: ['Condiments', 'Juice', 'Water', 'Soda', 'Salad Dressings'],
    description: 'The door is the warmest part of the fridge and subject to frequent temperature changes.',
    spoilageRisk: 'Low',
    tips: [
      'Do not store milk or eggs here.',
      'Keep high-acid items like pickles and jams here.',
      'Clean spills immediately to prevent sticky buildup.'
    ]
  },
  [ZoneId.FREEZER]: {
    id: ZoneId.FREEZER,
    name: 'Freezer',
    temperature: 'Below Freezing (< 0°C)',
    bestFor: ['Frozen Veggies', 'Ice Cream', 'Meat for long storage', 'Bread'],
    description: 'For long-term storage. Halts bacterial growth but quality can degrade over time (freezer burn).',
    spoilageRisk: 'Low',
    tips: [
      'Pack food tightly to prevent air pockets.',
      'Label everything with a date.',
      'Cool hot foods before freezing to prevent ice crystal formation.'
    ]
  },

  // --- DRY STORAGE ZONES ---
  [ZoneId.PANTRY]: {
    id: ZoneId.PANTRY,
    name: 'Pantry',
    temperature: 'Cool, Dark, Dry',
    bestFor: ['Potatoes', 'Onions', 'Garlic', 'Canned Goods', 'Rice', 'Pasta'],
    description: 'Ideal for shelf-stable foods and produce that needs darkness to prevent sprouting.',
    spoilageRisk: 'Low',
    tips: [
      'Keep potatoes away from onions; they make each other spoil faster.',
      'Store dry goods in airtight containers to prevent pests.',
      'Keep cool and away from the oven heat.'
    ]
  },
  [ZoneId.KITCHEN_SHELVES]: {
    id: ZoneId.KITCHEN_SHELVES,
    name: 'Kitchen Shelves',
    temperature: 'Room Temp (Variable)',
    bestFor: ['Spices', 'Oils', 'Honey', 'Coffee', 'Bread (Short term)'],
    description: 'Accessible storage for daily cooking items. Avoid placing near direct sunlight or stove heat.',
    spoilageRisk: 'Medium',
    tips: [
      'Heat degrades spices and oils; keep them away from the stove.',
      'Honey should not be refrigerated (it crystallizes).',
      'Bread goes stale faster in the fridge; keep it here or freeze it.'
    ]
  },
  [ZoneId.COUNTER]: {
    id: ZoneId.COUNTER,
    name: 'Countertop',
    temperature: 'Room Temp (Airflow)',
    bestFor: ['Tomatoes', 'Avocados', 'Bananas', 'Citrus', 'Stone Fruit (until ripe)'],
    description: 'The best place for produce that needs to ripen or loses flavor in the cold.',
    spoilageRisk: 'High',
    tips: [
      'Tomatoes lose flavor and become mealy in the fridge.',
      'Move avocados to the fridge ONLY once they are fully ripe to pause ripening.',
      'Keep bananas separate to stop them from ripening other fruit too fast.'
    ]
  }
};

export const SPOILAGE_GUIDE = [
  {
    title: 'Understanding Spores & Mold',
    icon: AlertTriangle,
    content: 'Mold spores are microscopic and float in the air. When they land on food in favorable conditions (moisture + nutrients), they grow. Unlike bacteria, mold is often visible, but its "roots" can penetrate deep into soft foods.'
  },
  {
    title: 'The Ethylene Factor',
    icon: Wind,
    content: 'Some fruits release ethylene gas which speeds up ripening. Keep ethylene producers (apples, melons, tomatoes) away from ethylene sensitive foods (greens, carrots, cucumbers) to prevent premature rotting.'
  },
  {
    title: 'Moisture Control',
    icon: Droplets,
    content: 'Excess moisture is the enemy of vegetables. It promotes bacterial slime and mold. However, too little moisture causes wilting. The goal is "damp but not wet".'
  },
  {
    title: 'Temperature Danger Zone',
    icon: Thermometer,
    content: 'Bacteria grow most rapidly between 40°F and 140°F (4°C - 60°C). Keep your fridge below 40°F (4°C) to slow down spoilage significantly.'
  }
];
