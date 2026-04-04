export enum ZoneId {
  UPPER_SHELVES = 'UPPER_SHELVES',
  LOWER_SHELVES = 'LOWER_SHELVES',
  CRISPER_DRAWER = 'CRISPER_DRAWER',
  DOOR = 'DOOR',
  FREEZER = 'FREEZER',
  PANTRY = 'PANTRY',
  KITCHEN_SHELVES = 'KITCHEN_SHELVES',
  COUNTER = 'COUNTER'
}

export interface ZoneData {
  id: ZoneId;
  name: string;
  temperature: string;
  bestFor: string[];
  description: string;
  spoilageRisk: 'Low' | 'Medium' | 'High';
  tips: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  zoneId: ZoneId;
  addedDate: number;
  expiryDate: number;
  estimatedDays: number;
  note?: string;
  quantity: number;
  unit?: string;
  recommendedStorage?: string;
}

export type ThemeName =
  | 'dark'
  | 'light'
  | 'zen'
  | 'banana'
  | 'arctic'
  | 'summer'
  | 'pitch_black'
  | 'red';

export type StoreType = 'grocery' | 'mall' | 'amazon_specialty';

export interface Shop {
  id: string;
  name: string;
  type: StoreType;
  color?: string;
  isDefault?: boolean;
}

export type ShoppingItemSource = 'manual' | 'discover_recipe' | 'planner_gap' | 'restock';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: 'Restock' | 'Expiring Soon' | 'AI Suggestion' | 'User Added';
  reason?: string;
  isChecked: boolean;
  shopId?: string;
  source?: ShoppingItemSource;
  storeType?: StoreType;
}

// --- MEAL PLANNING TYPES ---
export type MealType = 'Breakfast' | 'Brunch' | 'Lunch' | 'Snack' | 'Dinner';
export type MealSlot = MealType;

export type DietaryRestriction = 'None' | 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Dairy-Free' | 'Keto' | 'Paleo' | 'Low-Carb';

export interface RecipeIngredient {
  name: string;
  amount: string;
  inInventory: boolean;
}

export interface MealIdeaBase {
  id: string;
  title: string;
  type: MealType;
  description: string;
  isRecipe: boolean;
  expiringItemsUsed: string[];
  prepTime?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  ingredients?: RecipeIngredient[];
  instructions?: string[];
  chefTip?: string;
  flavorProfile?: string;
}

export interface PlanIdea extends MealIdeaBase {
  source?: 'plan_bank';
  inventoryMatchScore: number;
  missingIngredientCount: number;
}

export interface DiscoveredMeal extends MealIdeaBase {
  source?: 'discover';
}

export interface AssignedMeal extends MealIdeaBase {
  source?: 'plan_bank' | 'discover' | 'manual';
  scheduledFor?: MealSlot;
}

export type MealSuggestion = PlanIdea | DiscoveredMeal | AssignedMeal;

export interface DailyMealPlan {
  date: string; // ISO string
  meals: AssignedMeal[];
}
