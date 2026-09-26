# Development

## Start and verify

Use the versions in [`mise.toml`](../../mise.toml), then run `pnpm install`.
Use pnpm for every project task.
Run `pnpm dev` for local work.
Run `pnpm check`, `pnpm lint`, and `pnpm test` before you finish a code change.
Run `pnpm build` when you change routes, bundling, or deployment behavior.
Run `pnpm format` only on files you intend to format; it writes matching JS, TS, and JSON files.

## Code paths

Use Svelte 5 runes in components that use runes.
Use `$state` for local values that change the UI and `$props` for component inputs.
Use snippets and `{@render}` where the surrounding components use them.
Follow the existing store patterns in [`src/lib/stores/`](../../src/lib/stores/).
Put deck rules in [`src/lib/formats/`](../../src/lib/formats/) or [`src/lib/utils/`](../../src/lib/utils/), as the caller requires.
Put API requests in [`src/lib/api/`](../../src/lib/api/).
Check neighboring code and tests before you add a helper or dependency.

## UI and theme

Read [`STYLE.md`](../../STYLE.md) for component and spacing conventions.
Use [`z-index.ts`](../../src/lib/constants/z-index.ts) for shared overlay levels.
Use [`ManaSymbol.svelte`](../../src/lib/components/ManaSymbol.svelte) for mana icons.
Read [`theme/README.md`](../../theme/README.md) for theme generation.
[`src/app.css`](../../src/app.css) imports the generated [`theme/theme.css`](../../theme/theme.css).
Run `pnpm theme:list` to inspect schemes, then `pnpm theme:generate` after a theme config change.

## Generated data

Run `pnpm update-ban-lists` for ban data and review the generated diff.
Run `pnpm fetch-salt-scores` for EDHREC salt data and review the generated diff.
See [`scripts/README.md`](../../scripts/README.md) for data source details.
