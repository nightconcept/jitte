# Architecture

## App entry

[`src/routes/+page.svelte`](../../src/routes/+page.svelte) coordinates the deck UI and deck imports.
[`src/routes/+layout.svelte`](../../src/routes/+layout.svelte) loads global CSS, the footer, and toast UI.
Shared UI lives in [`src/lib/components/`](../../src/lib/components/).

## Deck state and storage

[`deck-store.ts`](../../src/lib/stores/deck-store.ts) holds the active deck and edit state.
[`deck-manager.ts`](../../src/lib/stores/deck-manager.ts) handles deck lists, loading, saving, and branches.
It calls [`StorageManager`](../../src/lib/storage/storage-manager.ts), which selects folder storage when available.
It falls back to local storage when folder storage fails or is unavailable.
[`deck-serializer.ts`](../../src/lib/utils/deck-serializer.ts) builds and reads deck archives.
[`version-control.ts`](../../src/lib/utils/version-control.ts) owns branch and version operations.
Keep archive compatibility and migration behavior in mind before you change stored data.

## Formats

[`format-registry.ts`](../../src/lib/formats/format-registry.ts) lists formats and metadata.
[`rulesets/`](../../src/lib/formats/rulesets/) and [`services/`](../../src/lib/formats/services/) hold format behavior.
[`ban-lists/`](../../src/lib/formats/ban-lists/) holds ban data.
[`deck-validation.ts`](../../src/lib/utils/deck-validation.ts) connects deck checks to the format rules.
Trace a format change through metadata, rules, deck types, and UI consumers.
When you add a format, update the registry, ruleset, service factory, deck types, and relevant UI.

## External data

[`card-service.ts`](../../src/lib/api/card-service.ts) and [`scryfall-client.ts`](../../src/lib/api/scryfall-client.ts) load card data.
[`request-queue.ts`](../../src/lib/api/request-queue.ts) and [`queue-configs.ts`](../../src/lib/api/queue-configs.ts) manage API requests.
[`edhrec-client.ts`](../../src/lib/api/edhrec-client.ts) uses the [`/api/edhrec` route](../../src/routes/api/edhrec/%5B...path%5D/+server.ts).
[`commander-spellbook-client.ts`](../../src/lib/api/commander-spellbook-client.ts) loads combo data.
Check each caller before you change a shared client or queue rule.
