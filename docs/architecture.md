# FreshKeeper Architecture

## Product intent

FreshKeeper helps a person capture food where it is used, store it as a durable
inventory, and act before it spoils. The first questions are practical: where
should this item be stored, and when should it be used? Meal ideas and shopping
lists reuse the same inventory rather than asking the user to repeat it.

## System boundaries

### Application shell

`App.tsx` coordinates the inventory, storage guide, spoilage, meal-planning, and
shopping-list experiences. Feature components own their presentation and local
interaction, while shared data access stays behind the library and service
modules.

### Durable data and identity

Supabase authentication identifies the user. The application data layer stores
inventory and related household context. Components should not create their own
storage contracts or bypass the authenticated data path.

The application must make service state clear. A paused or unavailable managed
service is an operational limitation, not permission to invent a second,
incompatible account model.

### Runtime AI

The server-side AI route and `services/openai.ts` handle variable interpretation
and suggestion work. AI may estimate freshness, recommend storage, or reuse
inventory context for meal and shopping ideas. Owned application data remains
the input, and the user remains able to review the result.

API keys stay on the server. UI components must not call OpenAI directly or
expose credentials to the browser.

### Mobile and PWA delivery

Food capture happens beside the fridge, so mobile behavior is a product
requirement. The manifest, service worker, icon set, and responsive layouts are
part of the release contract. A desktop feature is incomplete until its mobile
version preserves the same task and information.

## Invariants

1. Inventory is the durable shared context for every suggestion feature.
2. AI proposes variable guidance; it does not silently rewrite stored facts.
3. Authentication and storage use the shared Supabase boundary.
4. OpenAI credentials and calls remain server-side.
5. Desktop and mobile layouts support the same core workflow.
6. PWA installability is verified after manifest, asset, or shell changes.
7. Meaningful changes include a changelog entry and relevant automated tests.

## Verification

Unit and component tests cover data routing, OpenAI response handling, inventory,
meal planning, shopping lists, spoilage, and the storage guide. Playwright smoke
artifacts are used for authenticated browser and mobile checks.

Before a change is considered complete:

```bash
npm test
npm run build
```

For layout, authentication, or PWA changes, also run the relevant browser smoke
scenario at desktop and mobile sizes.

