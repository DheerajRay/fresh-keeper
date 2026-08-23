---
name: build-evolution
description: Extend FreshKeeper using the inherited product-memory and verification rules, plus connected-data, runtime-AI, mobile-layout, and PWA constraints. Use for feature work, fixes, refactors, and release preparation in this repository.
---

# Build Evolution

Carry the rules learned in the previous build forward, then apply the additional
constraints learned from a product used beside the fridge.

## Inherited rules

- Read `README.md`, `docs/architecture.md`, and the relevant `CHANGELOG.md`
  entries before changing behavior.
- Preserve documented ownership boundaries instead of placing logic wherever it
  is easiest to render.
- Record the reason and impact of behavioral changes.
- Add or update focused unit tests, then run the full suite and production build.

## Connected application rules

- Treat stored inventory as the shared source of context.
- Keep authentication and persistence behind the shared Supabase data layer.
- Keep OpenAI calls and credentials on the server.
- Use AI for variable estimates and suggestions. Do not let a suggestion
  silently overwrite user-owned facts.
- Make managed-service failure visible and recoverable.

## Mobile and PWA rules

- Design the mobile interaction at the same time as the desktop interaction.
- Preserve the complete task at narrow widths; do not merely hide essential
  controls.
- Recheck the manifest, icons, service worker, and installability after shell or
  asset changes.
- Use browser smoke checks for layout, authentication, capture, and PWA changes.

## Completion contract

A change is complete only when its product intent is clear, stored data remains
compatible, AI behavior stays reviewable, desktop and mobile workflows work,
the changelog explains the decision, and automated verification passes.
