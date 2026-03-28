const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const CACHE_KEY = 'freshkeeper_ai_cache_v3';

const STORAGE_OPTIONS = ['FRIDGE', 'FREEZER', 'PANTRY', 'COUNTER', 'KITCHEN_SHELVES', 'OTHER'] as const;
const ZONE_OPTIONS = ['UPPER_SHELVES', 'LOWER_SHELVES', 'CRISPER_DRAWER', 'DOOR', 'FREEZER', 'PANTRY', 'KITCHEN_SHELVES', 'COUNTER'] as const;

type Shop = { id: string; name: string; color?: string };
type InventoryItem = {
  id?: string;
  name: string;
  quantity?: number;
  unit?: string;
  expiryDate?: number;
};

type AiAction =
  | 'ask_fridge_ai'
  | 'shelf_life'
  | 'identify_image'
  | 'predict_shop'
  | 'shopping_suggestions'
  | 'meal_suggestions';

type AiRequestBody =
  | { action: 'ask_fridge_ai'; query: string }
  | { action: 'shelf_life'; itemName: string; zoneName: string }
  | { action: 'identify_image'; base64Image: string }
  | { action: 'predict_shop'; itemName: string; availableShops: Shop[] }
  | { action: 'shopping_suggestions'; inventory: InventoryItem[]; history: InventoryItem[]; availableShops: Shop[] }
  | { action: 'meal_suggestions'; inventory: InventoryItem[]; forDate: string; preference?: string; dietaryRestrictions?: string[] };

type HandlerResult = {
  status: number;
  body: Record<string, unknown>;
};

const shelfLifeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    days: { type: 'integer' },
    advice: { type: 'string' },
    isFood: { type: 'boolean' },
    recommendedStorage: {
      type: 'string',
      enum: [...STORAGE_OPTIONS],
    },
  },
  required: ['days', 'advice', 'isFood', 'recommendedStorage'],
};

const identifyImageSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    quantity: { type: 'integer' },
    unit: { type: 'string' },
    zoneId: {
      type: 'string',
      enum: [...ZONE_OPTIONS],
    },
    isFood: { type: 'boolean' },
    recommendedStorage: {
      type: 'string',
      enum: [...STORAGE_OPTIONS],
    },
    reasoning: { type: 'string' },
  },
  required: ['name', 'quantity', 'unit', 'zoneId', 'isFood', 'recommendedStorage', 'reasoning'],
};

const predictShopSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    shopName: { type: 'string' },
  },
  required: ['shopName'],
};

const shoppingSuggestionsSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string' },
      quantity: { type: 'integer' },
      unit: { type: 'string' },
      category: {
        type: 'string',
        enum: ['Restock', 'Expiring Soon', 'AI Suggestion', 'User Added'],
      },
      reason: { type: 'string' },
      shopName: { type: 'string' },
    },
    required: ['name', 'quantity', 'unit', 'category', 'reason', 'shopName'],
  },
};

const mealSuggestionsSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      type: {
        type: 'string',
        enum: ['Breakfast', 'Brunch', 'Lunch', 'Snack', 'Dinner'],
      },
      description: { type: 'string' },
      isRecipe: { type: 'boolean' },
      expiringItemsUsed: {
        type: 'array',
        items: { type: 'string' },
      },
      prepTime: { type: 'string' },
      difficulty: {
        type: 'string',
        enum: ['Easy', 'Medium', 'Hard'],
      },
      flavorProfile: { type: 'string' },
      chefTip: { type: 'string' },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            amount: { type: 'string' },
            inInventory: { type: 'boolean' },
          },
          required: ['name', 'amount', 'inInventory'],
        },
      },
      instructions: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: [
      'id',
      'title',
      'type',
      'description',
      'isRecipe',
      'expiringItemsUsed',
      'prepTime',
      'difficulty',
      'flavorProfile',
      'chefTip',
      'ingredients',
      'instructions',
    ],
  },
};

function getEnv(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

function getModel(name: string, fallback: string): string {
  return getEnv(name, fallback);
}

function getReasoningEffort(): string {
  return getEnv('OPENAI_REASONING_EFFORT', 'low');
}

function extractOutputText(response: any): string {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }

  const output = Array.isArray(response?.output) ? response.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === 'output_text' && typeof part?.text === 'string' && part.text.trim()) {
        return part.text;
      }
      if (part?.type === 'refusal' && typeof part?.refusal === 'string' && part.refusal.trim()) {
        throw new Error(part.refusal);
      }
    }
  }

  throw new Error('OpenAI returned no usable text output.');
}

async function callOpenAI({
  model,
  systemPrompt,
  userText,
  schemaName,
  schema,
  imageDataUrl,
  maxOutputTokens,
}: {
  model: string;
  systemPrompt: string;
  userText: string;
  schemaName?: string;
  schema?: Record<string, unknown>;
  imageDataUrl?: string;
  maxOutputTokens?: number;
}): Promise<any> {
  const apiKey = getEnv('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing.');
  }

  const input = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: systemPrompt }],
    },
    {
      role: 'user',
      content: imageDataUrl
        ? [
            { type: 'input_image', image_url: imageDataUrl, detail: 'low' },
            { type: 'input_text', text: userText },
          ]
        : [{ type: 'input_text', text: userText }],
    },
  ];

  const body: Record<string, unknown> = {
    model,
    input,
    reasoning: {
      effort: getReasoningEffort(),
    },
  };

  if (typeof maxOutputTokens === 'number') {
    body.max_output_tokens = maxOutputTokens;
  }

  if (schemaName && schema) {
    body.text = {
      format: {
        type: 'json_schema',
        name: schemaName,
        strict: true,
        schema,
      },
    };
  } else {
    body.text = {
      format: {
        type: 'text',
      },
    };
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function askFridgeAI(query: string): Promise<{ text: string }> {
  const response = await callOpenAI({
    model: getModel('OPENAI_MODEL_MAIN', 'gpt-5.4-mini'),
    systemPrompt:
      'You are a friendly and expert home economist and food safety scientist. Help users organize kitchen inventory and prevent food waste. Provide concise, practical advice on where to store items, how long they last, and signs of spoilage. Mention ethylene sensitivity for vegetables when relevant. Use short headings or bullet points and stay under 140 words.',
    userText: query,
    maxOutputTokens: 220,
  });

  return { text: extractOutputText(response) };
}

async function getShelfLifePrediction(itemName: string, zoneName: string): Promise<Record<string, unknown>> {
  const response = await callOpenAI({
    model: getModel('OPENAI_MODEL_LIGHT', 'gpt-5.4-nano'),
    systemPrompt:
      'You are a kitchen storage classifier. Return strict JSON only. Prefer safe food handling guidance. If the item is not food or a kitchen supply, mark isFood false and set days to 0.',
    userText: `Analyze the item "${itemName}" for kitchen storage.
1. Is this a valid food item or kitchen supply? (isFood)
2. Where is it best stored? (recommendedStorage)
3. Estimate safe shelf life in days if stored in "${zoneName}".
4. Provide short advice, max 10 words.`,
    schemaName: 'shelf_life_prediction',
    schema: shelfLifeSchema,
    maxOutputTokens: 180,
  });

  return JSON.parse(extractOutputText(response));
}

async function identifyItemFromImage(base64Image: string): Promise<Record<string, unknown>> {
  const response = await callOpenAI({
    model: getModel('OPENAI_MODEL_VISION', 'gpt-5.4-mini'),
    systemPrompt:
      'You identify kitchen items from photos. Return strict JSON only. Choose the single most prominent food or kitchen item. Use conservative classification if uncertain.',
    userText:
      'Identify the main item in this image for kitchen inventory. Return JSON with name, quantity, unit, zoneId, isFood, recommendedStorage, and reasoning.',
    schemaName: 'identified_inventory_item',
    schema: identifyImageSchema,
    imageDataUrl: `data:image/jpeg;base64,${base64Image}`,
    maxOutputTokens: 260,
  });

  return JSON.parse(extractOutputText(response));
}

async function predictShopForItem(itemName: string, availableShops: Shop[]): Promise<Record<string, unknown>> {
  const shopNames = availableShops.map((shop) => shop.name).join(', ');
  const response = await callOpenAI({
    model: getModel('OPENAI_MODEL_LIGHT', 'gpt-5.4-nano'),
    systemPrompt:
      'You assign a shopping item to the best matching store from the provided list. Return strict JSON only. Pick only from the given store names. If uncertain, choose the most general grocery option.',
    userText: `Item: "${itemName}"\nAvailable shops: ${shopNames}`,
    schemaName: 'predicted_shop',
    schema: predictShopSchema,
    maxOutputTokens: 120,
  });

  return JSON.parse(extractOutputText(response));
}

async function getShoppingSuggestions(
  inventory: InventoryItem[],
  history: InventoryItem[],
  availableShops: Shop[],
): Promise<unknown[]> {
  const inventorySummary =
    inventory.length > 0
      ? inventory
          .slice(0, 60)
          .map((item) => `- ${item.name}: ${item.quantity ?? 1} ${item.unit ?? 'item'}`)
          .join('\n')
      : 'Inventory is empty.';

  const historySummary =
    history.length > 0
      ? history
          .slice(0, 60)
          .map((item) => `- ${item.name}: ${item.quantity ?? 1} ${item.unit ?? 'item'}`)
          .join('\n')
      : 'No recent consumption history.';

  const shopsSummary = availableShops.map((shop) => shop.name).join(', ');

  const response = await callOpenAI({
    model: getModel('OPENAI_MODEL_LIGHT', 'gpt-5.4-nano'),
    systemPrompt:
      'You create compact shopping suggestions from kitchen state. Return strict JSON only. Focus on realistic restocks and useful staples, not novelty.',
    userText: `Generate up to 6 shopping items.

Available shops: ${shopsSummary}

Current inventory:
${inventorySummary}

Recent consumption history:
${historySummary}

Rules:
- Prefer items that are likely to be needed soon.
- Assign each item to one of the available shop names.
- Use category "AI Suggestion" unless a more specific category clearly fits.
- Keep reasons short.`,
    schemaName: 'shopping_suggestions',
    schema: shoppingSuggestionsSchema,
    maxOutputTokens: 420,
  });

  return JSON.parse(extractOutputText(response));
}

async function getMealSuggestions(
  inventory: InventoryItem[],
  forDate: string,
  preference = '',
  dietaryRestrictions: string[] = [],
): Promise<unknown[]> {
  const now = Date.now();
  const inventorySummary =
    inventory.length > 0
      ? inventory
          .slice(0, 80)
          .map((item) => {
            const daysLeft = item.expiryDate
              ? Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24))
              : 'unknown';
            return `- ${item.name}: ${item.quantity ?? 1} ${item.unit ?? 'item'}, expires in ${daysLeft} days`;
          })
          .join('\n')
      : 'Inventory is empty. Create a full shopping-dependent meal set.';

  const cravingText = preference
    ? `The user specifically wants: "${preference}".`
    : 'Suggest a balanced variety of meals.';

  const dietaryText =
    dietaryRestrictions.length > 0
      ? `Strict dietary restrictions: ${dietaryRestrictions.join(', ')}.`
      : 'No dietary restrictions.';

  const response = await callOpenAI({
    model: getModel('OPENAI_MODEL_MEALS', 'gpt-5.4-mini'),
    systemPrompt:
      'You are a practical home-cooking meal planner focused on food waste reduction. Return strict JSON only. Produce realistic recipes, not restaurant copy. Keep each instruction clear and actionable.',
    userText: `Suggest a meal plan for ${forDate}.

Current inventory:
${inventorySummary}

${cravingText}
${dietaryText}

Rules:
- Return exactly 5 suggestions: Breakfast, Brunch, Lunch, Snack, Dinner.
- Prioritize expiring items when possible.
- If inventory is sparse, include missing ingredients in the recipe ingredients list.
- Every meal must include title, type, description, flavorProfile, chefTip, prepTime, difficulty, ingredients, and instructions.
- Each recipe needs 5 to 8 concise steps.`,
    schemaName: 'meal_suggestions',
    schema: mealSuggestionsSchema,
    maxOutputTokens: 1800,
  });

  return JSON.parse(extractOutputText(response));
}

export async function handleAiRequest(body: AiRequestBody): Promise<HandlerResult> {
  try {
    if (!body || typeof body !== 'object' || !('action' in body)) {
      return {
        status: 400,
        body: { error: 'Invalid AI request body.' },
      };
    }

    switch (body.action) {
      case 'ask_fridge_ai':
        return { status: 200, body: await askFridgeAI(body.query) };
      case 'shelf_life':
        return { status: 200, body: await getShelfLifePrediction(body.itemName, body.zoneName) };
      case 'identify_image':
        return { status: 200, body: await identifyItemFromImage(body.base64Image) };
      case 'predict_shop':
        return { status: 200, body: await predictShopForItem(body.itemName, body.availableShops || []) };
      case 'shopping_suggestions':
        return {
          status: 200,
          body: {
            items: await getShoppingSuggestions(body.inventory || [], body.history || [], body.availableShops || []),
          },
        };
      case 'meal_suggestions':
        return {
          status: 200,
          body: {
            meals: await getMealSuggestions(
              body.inventory || [],
              body.forDate,
              body.preference || '',
              body.dietaryRestrictions || [],
            ),
          },
        };
      default:
        return {
          status: 400,
          body: { error: 'Unsupported AI action.' },
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI error.';
    return {
      status: 500,
      body: { error: message, cacheKey: CACHE_KEY },
    };
  }
}

async function readJsonBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      res.status(200).json({ ok: true, route: '/api/ai' });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }

    const body = await readJsonBody(req);
    const result = await handleAiRequest(body);
    res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled AI route error.';
    console.error('API route failure:', error);
    res.status(500).json({ error: message });
  }
}
