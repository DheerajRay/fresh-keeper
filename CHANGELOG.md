# Changelog

All notable changes to this project should be documented in this file.

This project starts versioning with Semantic Versioning.

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
