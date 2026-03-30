# Changelog

All notable changes to this project should be documented in this file.

This project starts versioning with Semantic Versioning.

## [0.5.10] - 2026-03-30

- Moved the three summary cards on inventory, meals, and shopping into a mobile-only stats dialog so the working area appears immediately under the page actions while desktop keeps the full stat strip.

## [0.5.9] - 2026-03-30

- Inlined the AI server handler into \'api/ai.ts\' so Vercel no longer depends on a separate runtime module for POST requests, fixing the deployed \'Cannot find module /var/task/api/_lib/openai\' failures.

## [0.5.8] - 2026-03-30

- Hardened the Vercel AI route so POST requests lazy-load the AI handler and accept string-parsed request bodies instead of crashing the serverless function before it can return a JSON error.

## [0.5.7] - 2026-03-30

- Added a first-use shopping suggestions notice so tapping `Generate suggestions` explains that the feature needs inventory or item history before it can personalize results.

## [0.5.6] - 2026-03-30

- Fixed the desktop shell layout regression so the header and content stack correctly again instead of rendering side-by-side.
- Tightened the meal planner mobile layout so the summary strip and action rows no longer overflow like a desktop layout on narrow screens.
- Hardened shopping suggestion generation with a smaller AI request and a server-side heuristic fallback so the flow keeps working even when the AI request fails.

## [0.5.5] - 2026-03-30

- Fixed the meal planner mobile layout so summary cards, planner actions, and discover-bank actions no longer break or overflow on narrow screens.
- Restored backwards-compatible `shops.color` writes in the Supabase sync layer so shopping suggestion generation works against the current deployed database schema.

## [0.5.4] - 2026-03-29

- Moved mobile scrolling onto the main content pane so the header stays fixed in place while only the page sections beneath it scroll.
- Hid the mobile content scrollbar and removed the remaining body-level scroll bounce behavior from the app shell.

## [0.5.3] - 2026-03-29

- Renamed the theme presets to more distinctive in-app names while keeping the existing palettes and theme behavior intact.

## [0.5.2] - 2026-03-29

- Restored the desktop header tabs to a proper horizontal navigation layout instead of the broken stacked rendering.
- Simplified the app menu so it now focuses on theme and account actions rather than duplicating section switching that is already handled by the main nav and mobile dock.

## [0.5.1] - 2026-03-29

- Trimmed low-value helper copy across the app shell, auth screen, inventory, meal, shopping, and guide surfaces so the interface reads cleaner and more directly.
- Simplified the theme section in the menu by removing redundant descriptive text while keeping the compact picker intact.

## [0.5.0] - 2026-03-29

- Reworked the signed-in app around household-backed Supabase persistence for fridge, meal, shopping, dietary preference, and theme state, with code-first migrations and synced local fallback behavior.
- Split meal generation into inventory-backed `Plan` ideas and broader `Discover` ideas, so calendar planning now uses the current fridge while discover results can export only missing ingredients into shopping.
- Reframed shopping around type-first routing with default `Grocery`, `Mall`, and `Amazon / Specialty` buckets, custom store typing, grouped suggestions, and a compact add-item sheet instead of a permanent entry panel.
- Simplified the guide flow by removing the separate storage-question panel from the page, keeping the mobile zone reference as a closed-by-default accordion, and removing duplicated storage-map behavior.
- Updated inventory add behavior to auto-apply the recommended storage zone from the shelf-life lookup, leaving manual zone changes for later detail editing when needed.
- Added an account-backed theme system with `Dark`, `Light`, `Zen`, `Banana`, `Arctic`, `Summer`, `Pitch Black`, and `Red` modes, plus a compact in-menu theme picker and tokenized theme styling across the shell.
- Reduced the overly mechanical feel with lighter icon use, more compact menu interactions, and a tighter mobile-first shell.
- Expanded and refreshed tests for the new meal, shopping, inventory, guide, and theme-adjacent flows, and revalidated lint, test, and build after the refactor.

## [0.4.0] - 2026-03-29

- Added Supabase browser auth with a minimal email/password account flow and a protected app shell.
- Added a code-first Supabase workflow with CLI scripts, project config, versioned migrations, and a migration-backed bootstrap schema.
- Applied the initial household auth bootstrap and added a second remote schema migration for inventory, shopping, meal plans, preferences, and event tables with row-level security.
- Added a shared app-data sync layer that keeps the current local cache behavior while hydrating and mirroring signed-in household data through Supabase.
- Connected fridge inventory, consumption history, meal plans, meal suggestion queue, dietary restrictions, shops, and shopping list state to the new sync layer.
- Updated the auth screen copy to focus on the user task instead of backend implementation details.

## [0.3.3] - 2026-03-28

- Prevented iPhone form-focus zoom by normalizing mobile input, textarea, and select controls to a 16px minimum font size in the shared theme.

## [0.3.2] - 2026-03-28

- Simplified the PWA icon by removing the outer border frame and shrinking the central mark so the installed mobile icon reads cleaner against the dark theme.

## [0.3.1] - 2026-03-28

- Shifted the app to a mono-forward type system to better match the duel-engine reference while keeping the existing grayscale product language.
- Converted the app shell to a darker, flatter control-surface aesthetic with reduced radii, lighter visual nesting, and outlined active states instead of filled white highlights.
- Tightened mobile layout density with compact stat strips, a safer floating navigation dock, and smaller working surfaces so core actions appear earlier on iPhone.
- Fixed overlay behavior for mobile sheets and storage-map flows by locking page scroll correctly and moving the sheet content onto a dedicated touch scroll region.
- Restyled shopping store filters into the same chip-based system as dietary preferences for a more consistent selection model.
- Simplified the guide page on mobile into an accordion-style zone reference with inline details, and removed the duplicate storage-map entry from the guide flow.
- Updated the PWA icon and manifest styling to match the dark minimal theme, and refreshed related tests to cover the revised shell, guide, scroll, and interaction behavior.

## [0.3.0] - 2026-03-28

- Rebuilt the shell into a monochrome command-center layout with tighter page headers, calmer navigation, and a simplified guide experience.
- Added shared UI primitives for headers, stat strips, segmented controls, sheets, dialogs, and empty states so all tabs use the same interaction model.
- Refactored inventory into a list-first workflow with a single add flow, secondary zone map, and detail sheet actions.
- Refactored meal planning into explicit `Plan` and `Discover` modes with a visible `Needs Ingredients` queue and simplified save/move flows.
- Refactored shopping into a vertical list-first workflow with suggestion intake, lightweight store filters, and secondary store management.
- Restyled guide search, zone detail, spoilage reference, fridge map, and global surfaces into a grayscale system.
- Added inventory tests for add/remove and scan-to-confirm, and updated tab tests to match the new workflows.

## [0.2.8] - 2026-03-28

- Renamed the remaining live Gemini UI references to neutral FreshKeeper/OpenAI naming, including the guide AI component.
- Updated the README to reflect the current OpenAI architecture, shared handler location, and test commands.
- Added a Vitest + Testing Library test stack with unit coverage for `services/openai.ts`.
- Added functional tests for the guide AI panel, meal planner discovery flow, and shopping suggestion flow.
- Added `npm run test` and `npm run test:coverage` scripts and verified lint, test, coverage, and build locally.

## [0.2.6] - 2026-03-27

- Inlined the OpenAI AI handler logic directly into `api/ai.ts` so the deployed Vercel function no longer depends on a secondary runtime import.
- Added a favicon link to the app shell to remove the browser favicon 404.

## [0.2.5] - 2026-03-27

- Removed the top-level OpenAI helper import from the Vercel route.
- Switched the AI helper load to a dynamic import inside `POST` so route startup no longer depends on helper bundling.
- Preserved a lightweight GET health response for `/api/ai`.

## [0.2.4] - 2026-03-27

- Reverted the Vercel AI route to the classic `req`/`res` serverless handler shape.
- Added explicit route-level error handling and a GET health response inside the classic handler.

## [0.2.3] - 2026-03-27

- Moved the shared OpenAI handler under `api/_lib` so Vercel bundles the function code from inside the API tree.
- Hardened the client AI fetcher to surface non-JSON server failures more clearly.
- Moved manifest and service worker assets into `public/` for correct Vite production output.
- Removed the stale AI Studio import map and broken `/index.css` reference from `index.html`.
- Added a local SVG app icon for manifest and touch icon usage.

## [0.2.2] - 2026-03-27

- Switched the Vercel API function to named `GET` and `POST` web handlers for better platform compatibility.
- Added a simple `/api/ai` health response for deployment verification.

## [0.2.1] - 2026-03-27

- Switched the Vercel API entrypoint to a web-standard Request/Response handler.
- Improved the mobile shell with a bottom tab bar, tighter spacing, and more compact mobile headers.
- Added inline mobile guide details so the fridge zone information is easier to use on iPhone.

## [0.2.0] - 2026-03-27

- Replaced the Gemini integration with an OpenAI-backed AI service layer.
- Added a shared server-side OpenAI handler for local development and Vercel deployment.
- Added a Vercel API endpoint at `api/ai.ts`.
- Updated the frontend to call the server proxy instead of shipping an AI key to the browser.
- Removed the old Gemini dependency and updated the README for the OpenAI deployment flow.

## [0.1.0] - 2026-03-27

- Established the initial local project baseline.
- Added detailed project documentation in the README.
- Initialized git version control and connected the GitHub remote.
- Created local OpenAI environment configuration placeholders for migration work.




