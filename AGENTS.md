# Jitte agent guide

⚠ This file is hard-limited to ≤100 lines. Update spokes, not the hub.

## Intent

Jitte is a local-first web app for Magic: The Gathering decklists across multiple formats.
It stores deck history, branches, and imports in the browser or a selected folder.

## Stack

- Node 22, pnpm 12, TypeScript, SvelteKit 2, Svelte 5, Vite 8.
- Tailwind CSS 4, Vitest, Oxlint, and Oxfmt.
- Browser storage and Scryfall, EDHREC, and Commander Spellbook integrations.

## Essential commands

- Install dependencies: `pnpm install`
- Develop: `pnpm dev`
- Build: `pnpm build`
- Type check: `pnpm check`
- Test: `pnpm test`
- Format: `pnpm format`
- Lint: `pnpm lint`

## Spoke index

- [Documentation map](docs/repo/README.md): Find the current guide for each topic.
- [Architecture](docs/repo/architecture.md): Follow the app, storage, format, and API paths.
- [Development](docs/repo/development.md): Make changes and run the relevant checks.

Read the matching spoke before you change a subsystem.
Update a spoke when a code change makes its guidance incorrect.
