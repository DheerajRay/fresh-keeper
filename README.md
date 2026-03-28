# FreshKeeper

FreshKeeper is a React + TypeScript + Vite web application for fridge organization, food storage guidance, spoilage awareness, inventory tracking, shopping planning, and AI-assisted meal discovery.

This project appears to have been exported from Google AI Studio and then adapted into a standalone Vite application. It now uses a server-side OpenAI proxy for AI features, with a local Vite dev bridge and a Vercel-ready API function.

## What The App Does

The application is organized into four main tabs:

### 1. My Fridge

This is the operational inventory area.

Capabilities:

- Add food and kitchen items manually.
- Assign each item to a storage zone such as lower shelves, crisper drawer, freezer, pantry, kitchen shelves, or countertop.
- Estimate expiry dates when items are added.
- Show freshness state as `Fresh`, `Eat Soon`, or `Expired`.
- Display inventory in both list view and visual fridge/pantry view.
- Increase or decrease quantity after an item is added.
- Move items between storage zones.
- Remove items from inventory.
- Store removed items in local consumption history for later shopping suggestions.
- Scan an item from a photo using the device camera or file upload.

Important implementation details:

- Inventory is stored in browser `localStorage` under `fridge_inventory`.
- Removed items are written to `fridge_consumption_history`.
- The inventory add flow calls OpenAI for shelf-life estimation and storage recommendations.
- Camera scanning depends on OpenAI image analysis.

### 2. Meal Plan

This is the AI meal discovery and scheduling area.

Capabilities:

- Generate meal ideas from current fridge inventory.
- Accept free-text cravings such as cuisine or meal style.
- Apply dietary filters:
  `Vegetarian`, `Vegan`, `Gluten-Free`, `Dairy-Free`, `Keto`, `Paleo`, `Low-Carb`.
- Request five meal suggestions at a time:
  breakfast, brunch, lunch, snack, and dinner.
- Show recipe-style details including ingredients, instructions, prep time, difficulty, flavor profile, and chef tip.
- Save generated meals into a 7-day plan.
- Move planned meals between dates.
- Keep "Tentative" meals when ingredients are missing.
- Auto-add missing ingredients to the shopping list when a meal is scheduled without enough inventory.
- Auto-promote tentative meals into the active plan when ingredients later appear in inventory.

Important implementation details:

- Meal plans are stored in `freshkeeper_meal_plans`.
- Unscheduled meal suggestions are stored in `freshkeeper_suggestion_queue`.
- Dietary restrictions are stored in `freshkeeper_dietary_restrictions`.
- Meal generation is OpenAI-dependent.

### 3. Shopping List

This is the restocking and store-planning area.

Capabilities:

- Maintain a manual shopping list.
- Create and manage multiple stores.
- Assign a color-coded identity to each store.
- Filter the list by store.
- Mark items complete.
- Clear completed items.
- Generate "smart suggestions" from fridge state and consumption history.
- Auto-classify manually added items to a likely store using AI.
- Accept AI-added missing ingredients from the meal planner.

Important implementation details:

- Shopping list data is stored in `freshkeeper_shopping_list`.
- Store definitions are stored in `freshkeeper_shops`.
- Suggestions are a mix of heuristics and OpenAI output.
- If AI store prediction fails, manual shopping still works.

### 4. Guide & Tips

This is the educational/static guidance area.

Capabilities:

- Interactive visual map of fridge and dry-storage zones.
- Zone descriptions for temperature, ideal item types, spoilage risk, and best practices.
- Spoilage education including mold, ethylene, humidity, and food safety temperature ranges.
- AI Q&A box for asking storage questions such as where to keep produce or how long leftovers last.

Important implementation details:

- The fridge zone knowledge base is hardcoded in `constants.ts`.
- The educational guide works fully without AI.
- The "Ask the FreshKeeper AI" search box depends on OpenAI.

## Tech Stack

- React 19
- TypeScript
- Vite
- `lucide-react` for icons
- `react-markdown` for rendering AI answers
- OpenAI Responses API through a server-side proxy
- Tailwind CSS via CDN in `index.html`
- Browser `localStorage` for persistence
- Service worker + web manifest for lightweight PWA behavior

## Architecture Summary

This app is a single-page client application with no routing library. AI features now run through a lightweight backend proxy.

- `App.tsx` manages the top-level tab navigation.
- `components/InventoryManager.tsx` handles inventory CRUD, expiry logic, and image scanning.
- `components/ShoppingListManager.tsx` handles store management, shopping items, and suggestion generation.
- `components/MealPlanner.tsx` handles meal discovery, scheduling, tentative meal logic, and shopping list injection.
- `components/GuideAiSearch.tsx` handles AI storage Q&A.
- `components/FridgeVisual.tsx` renders the fridge/pantry visualization.
- `components/ZoneDetail.tsx` renders the educational zone details.
- `components/SpoilageSection.tsx` renders the spoilage science content.
- `services/openai.ts` contains all frontend AI calls.
- `api/_lib/openai.ts` contains the shared OpenAI request logic for local development and shared server behavior.
- `api/ai.ts` exposes the Vercel serverless API endpoint.
- `constants.ts` contains the static storage guide, zone descriptions, shop defaults, and unit options.
- `types.ts` defines shared app types.

## AI Integration

OpenAI is integrated through a server-side proxy that calls the Responses API.

Current AI-backed functions:

- `askFridgeAI(query)`
  Purpose: food storage and spoilage Q&A
- `getShelfLifePrediction(itemName, zoneName)`
  Purpose: expiry estimate, food validation, and storage recommendation
- `identifyItemFromImage(base64Image)`
  Purpose: identify food from a photo and prefill inventory fields
- `predictShopForItem(itemName, availableShops)`
  Purpose: assign a likely store for shopping entries
- `getShoppingSuggestions(inventory, history, availableShops)`
  Purpose: create additional shopping ideas
- `getMealSuggestions(inventory, forDate, preference, dietaryRestrictions)`
  Purpose: generate recipe-style meal suggestions

## How Crucial AI Is

Short version: the app is partially usable without AI, but several headline features are AI-led.

### Works Well Without AI

- Navigation and general UI
- Fridge zone guide
- Spoilage education
- Visual fridge and dry storage map
- Manual shopping list management
- Manual store management
- Basic inventory viewing, editing, quantity changes, and deletion for items that already exist in storage
- PWA manifest and service worker behavior

### Degrades But Still Functions Without AI

- Manual inventory add
  The shelf-life service has a fallback response if the AI service fails, so the app can still add items, but estimates become generic and storage guidance becomes much less trustworthy.
- Shopping suggestions
  Heuristic "expiring soon" suggestions still work even if AI suggestions fail.
- Store prediction
  Manual item addition still works when shop prediction fails.
- Guide Q&A
  The search box returns an error-style message instead of a real answer.

### Does Not Meaningfully Work Without AI

- Camera/image-based inventory scan
- High-quality shelf-life estimation
- Recipe/meal discovery
- AI-generated shopping suggestions beyond simple heuristics

## Can We Make It Work Without AI?

Yes, but not at the current feature quality level.

To make the app fully AI-free, these areas would need replacement:

- Shelf-life prediction:
  Replace the OpenAI-backed classifier with a structured local rules dataset for common foods.
- Storage recommendation:
  Replace the OpenAI-backed recommender with a curated product-to-zone mapping table.
- Image scanning:
  Remove the feature or replace it with a separate image recognition workflow.
- Shopping suggestions:
  Expand heuristics based on inventory depletion, recurring removals, and expiry windows.
- Meal planning:
  Replace the OpenAI-backed meal generator with a fixed recipe library plus deterministic ingredient matching.
- Food Q&A:
  Replace the freeform chat with static FAQ content or search over a local knowledge base.

Conclusion:

- The app can be made to work without AI.
- The app cannot deliver its current "smart" positioning without replacing the current AI-backed features with either strong local data or a backend service.

## Security Note About AI

The OpenAI API key is server-side only.

That means:

- The browser no longer receives the raw OpenAI key.
- Local development uses a Vite middleware bridge for `/api/ai`.
- Deployment uses the Vercel function in `api/ai.ts`.
- The key should exist only in `.env.local` and in Vercel environment variables.

## Local Setup

### Prerequisites

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
OPENAI_API_KEY=your_openai_project_key_here
OPENAI_MODEL_LIGHT=gpt-5.4-nano
OPENAI_MODEL_MAIN=gpt-5.4-mini
OPENAI_MODEL_VISION=gpt-5.4-mini
OPENAI_MODEL_MEALS=gpt-5.4-mini
OPENAI_REASONING_EFFORT=low
```

Notes:

- `OPENAI_API_KEY` is read only on the server side.
- The model variables let you control cost by routing lighter tasks to cheaper models.
- If no key is provided, the app still loads, but AI-dependent features will fail or fall back.

### Run The App Locally

```bash
npm run dev
```

The Vite dev server is configured for:

- Host: `0.0.0.0`
- Port: `3000`

Expected local URL:

```text
http://localhost:3000
```

### Production Build

```bash
npm run build
```

### Test Commands

```bash
npm run test
```

```bash
npm run test:coverage
```

### Vercel Deployment

Add the same environment variables in Vercel Project Settings:

- `OPENAI_API_KEY`
- `OPENAI_MODEL_LIGHT`
- `OPENAI_MODEL_MAIN`
- `OPENAI_MODEL_VISION`
- `OPENAI_MODEL_MEALS`
- `OPENAI_REASONING_EFFORT`

### Type Check

```bash
npm run lint
```

## Verified Project Status

Checked locally on March 28, 2026:

- `npm install` completed successfully.
- `npm run lint` passed.
- `npm run test` passed.
- `npm run build` passed.

Build observations:

- Vite reported that `/index.css` does not exist at build time and will be resolved at runtime if present.
- The production bundle is large and triggers Vite's chunk-size warning.

## Offline / PWA Behavior

The app includes:

- `manifest.json`
- `sw.js`
- service worker registration in `index.tsx`

What this gives you:

- Installable app shell behavior in supported browsers
- Basic asset caching
- Better repeat-load performance

Limits:

- AI features still require network access.
- Some external CDN assets may not cache reliably depending on CORS behavior.
- The current service worker is simple and does not provide a full offline content strategy.

## Data Persistence

All data is browser-local. There is no user account system and no shared cloud sync.

Current local storage keys:

- `fridge_inventory`
- `fridge_consumption_history`
- `freshkeeper_shopping_list`
- `freshkeeper_shops`
- `freshkeeper_meal_plans`
- `freshkeeper_suggestion_queue`
- `freshkeeper_dietary_restrictions`
- `freshkeeper_ai_cache_v3`

Implications:

- Data is per browser and per device.
- Clearing browser storage removes user data.
- Users do not share state across devices.

## Known Caveats

- OpenAI usage depends on a server-side key and correctly configured environment variables.
- Tailwind is loaded from a CDN rather than installed through PostCSS or the Vite pipeline.
- `index.html` references `/index.css`, but that file is not present in the repository.
- Bundle output is currently large for a single-page app.
- Because meal generation and image recognition are AI-based, app quality varies with model behavior and network/API availability.

## Recommended Next Improvements

If this project is going to move beyond prototype stage, the highest-value next steps are:

1. Expand tests around the `/api/ai` action handlers and add more edge-case coverage for inventory scanning and fallback behavior.
2. Replace CDN Tailwind with a normal build-integrated styling pipeline.
3. Add a real local rules engine for common shelf-life and storage data so the app remains useful without AI.
4. Introduce export/import for local data.
5. Split the bundle and lazy-load the heaviest views.
6. Add request-level analytics and usage throttling for OpenAI cost control.

## Repository Purpose

FreshKeeper is not just a fridge guide. It is a combined:

- storage education tool
- fridge inventory tracker
- shopping planner
- meal discovery assistant
- food-waste reduction prototype

Its strongest value is the combination of static food-storage guidance plus AI-assisted day-to-day kitchen workflows.
