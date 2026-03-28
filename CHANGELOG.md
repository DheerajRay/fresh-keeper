# Changelog

All notable changes to this project should be documented in this file.

This project starts versioning with Semantic Versioning.

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
