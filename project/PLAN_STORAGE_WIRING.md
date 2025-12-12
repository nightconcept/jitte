# Plan: Wire Up Storage Redesign

## Goal
Connect the existing slim format storage code to the main application flow to achieve ~25x storage reduction for large decks.

## Current State
- **Slim format code exists** at `src/lib/storage/deck-serializer.ts` (schemaVersion 2.0, ~80-120 bytes/card)
- **Legacy serializer** at `src/lib/utils/deck-serializer.ts` is still being used (schemaVersion 1.0, ~2-3KB/card)
- **DualStorageManager** and **IndexedDBDeckProvider** are fully implemented but never instantiated
- **Migration runs** but saves to IndexedDB which the app then ignores

## Approach: Minimal Viable Fix

Rather than replacing the entire storage manager, we can achieve the storage savings with surgical changes to the serialization layer. The storage providers (FileSystem, localStorage) work fine - the problem is what data we're giving them.

---

## Phase 1: Switch to Slim Serialization (High Impact)

### 1.1 Update `src/lib/utils/deck-serializer.ts`

**Change `serializeDeckToJSON()`** to use slim format:

```typescript
// Current (line 29-37):
export function serializeDeckToJSON(deck: Deck): string {
    const versionData: DeckVersionData = {
        schemaVersion: '1.0',
        lastModified: new Date().toISOString(),
        cards: deck.cards  // FULL card objects
    };
    return JSON.stringify(versionData, null, 2);
}

// New:
export function serializeDeckToJSON(deck: Deck): string {
    // Import from storage serializer
    const refs = cardsToReferences(deck.cards);
    const base: VersionBase = {
        schemaVersion: '2.0',
        version: deck.currentVersion,
        cards: refs  // SLIM references only
    };
    return JSON.stringify(base, null, 2);
}
```

**Files to modify:**
- `src/lib/utils/deck-serializer.ts` - Update `serializeDeckToJSON()` to use slim format

**New imports needed:**
- `cardsToReferences` from `$lib/utils/card-reference`
- `VersionBase` from `$lib/types/version-delta`

### 1.2 Update `deserializeDeck()` to handle both formats

The existing `deserializeDeck()` in `src/lib/utils/deck-serializer.ts` needs to:
1. Detect if content is slim (schemaVersion 2.0) or legacy (1.0)
2. If slim, hydrate CardReferences back to full Cards
3. If legacy, continue existing behavior

**Logic:**
```typescript
export async function deserializeDeck(content: string): Promise<CardsByCategory> {
    const parsed = JSON.parse(content);

    if (parsed.schemaVersion === '2.0') {
        // Slim format - need to hydrate
        const hydrationResult = await hydrateCardReferences(parsed.cards);
        return hydrationResult.cards;
    }

    // Legacy format - existing logic
    if (parsed.schemaVersion === '1.0' || parsed.cards) {
        return parsed.cards;
    }

    // Plaintext fallback
    return deserializeDeckFromPlaintext(content);
}
```

**New imports needed:**
- `hydrateCardReferences` from `$lib/utils/card-hydration`

### 1.3 Update maybeboard serialization

In `createDeckArchive()` and archive handling, maybeboard also stores full cards. Need to convert.

**Files:**
- `src/lib/utils/deck-serializer.ts` - `createDeckArchive()` should convert maybeboard to slim
- `src/lib/utils/deck-serializer.ts` - `extractDeckFromArchive()` should hydrate maybeboard

---

## Phase 2: Ensure Card Cache is Populated (Required for Hydration)

### 2.1 Pre-populate cache on save

When saving, the full Card objects are available. We should cache them so hydration on load doesn't require API calls.

**In `serializeDeckToJSON()` or `createDeckArchive()`:**
```typescript
// Before converting to slim, cache all cards
for (const categoryCards of Object.values(deck.cards)) {
    for (const card of categoryCards) {
        await cacheCardForHydration(card);
    }
}
```

**New utility needed:**
- `cacheCardForHydration(card: Card)` - stores minimal ScryfallCard data in `jitte-card-cache` IndexedDB

This ensures that when loading a slim deck, hydration is instant (no API calls).

---

## Phase 3: Update Storage Provider Serialization (If Needed)

### 3.1 Check FileSystemFolderProvider

File: `src/lib/storage/filesystem-folder-provider.ts`

Review if it does any additional serialization or if it just passes through the archive. The archive's version content is already serialized by `deck-manager.ts`, so this should be transparent.

### 3.2 Check LocalStorageProvider

Same review for `src/lib/storage/local-storage-provider.ts`.

---

## Phase 4: Testing & Validation

### 4.1 Manual Tests
- [ ] Save a new deck → verify version file contains `schemaVersion: '2.0'` and CardReferences
- [ ] Load the saved deck → verify cards are fully hydrated with all metadata
- [ ] Load an old deck (schemaVersion 1.0) → verify backward compatibility
- [ ] Test large cube (650 cards) → verify no storage quota errors
- [ ] Test offline load → verify cached cards hydrate without API calls

### 4.2 Size Validation
- [ ] Compare file sizes: old format vs new format for same deck
- [ ] Expected: ~25x reduction (from ~2-3KB/card to ~80-120 bytes/card)

---

## Optional: Phase 5: Full DualStorageManager Integration

This phase is **not required** for fixing the storage limit issue, but would complete the original design.

### 5.1 Add `initializeWithMigrations()` to DualStorageManager

Currently missing - StorageManager has it but DualStorageManager doesn't.

### 5.2 Switch deck-manager to use DualStorageManager

```typescript
// In deck-manager.ts line 66:
// FROM:
const storage = getStorageManager();

// TO:
const storage = getDualStorageManager();
```

### 5.3 Benefits of DualStorageManager
- Dual-write to both FileSystem AND IndexedDB
- Automatic folder handle restoration across sessions
- Better resilience (if one storage fails, other has backup)

### 5.4 Why Optional
- Slim serialization alone solves the storage limit problem
- Current providers (FileSystem/localStorage) work fine
- DualStorageManager adds complexity

---

## File Change Summary

### Must Change (Phase 1-2)
| File | Change |
|------|--------|
| `src/lib/utils/deck-serializer.ts` | Update `serializeDeckToJSON()` to use slim format |
| `src/lib/utils/deck-serializer.ts` | Update `deserializeDeck()` to handle slim + hydration |
| `src/lib/utils/deck-serializer.ts` | Update `createDeckArchive()` for slim maybeboard |
| `src/lib/utils/deck-serializer.ts` | Update `extractDeckFromArchive()` to hydrate maybeboard |

### May Need (Phase 2)
| File | Change |
|------|--------|
| `src/lib/utils/card-hydration.ts` | Add `cacheCardForHydration()` if not exists |

### Optional (Phase 5)
| File | Change |
|------|--------|
| `src/lib/storage/dual-storage-manager.ts` | Add `initializeWithMigrations()` |
| `src/lib/stores/deck-manager.ts` | Switch to `getDualStorageManager()` |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Old decks can't load | `deserializeDeck()` detects format and handles both |
| Hydration fails (no cache, no network) | Create placeholder cards with error state (already implemented in `card-hydration.ts`) |
| Migration breaks | Keep migration running but it becomes optional (new saves are already slim) |
| Performance on load | Cards cached on save, so hydration is instant |

---

## Rollback Plan

If issues arise:
1. Revert `serializeDeckToJSON()` to use 1.0 format
2. `deserializeDeck()` still handles both formats, so any 2.0 files saved would still load
3. No data loss possible since hydration falls back to API calls

---

## Success Criteria

- [ ] 650-card cube with 3+ versions saves without quota errors
- [ ] Version files are ~25x smaller (verify with file size check)
- [ ] Old decks (schemaVersion 1.0) continue to load correctly
- [ ] New saves use schemaVersion 2.0 with CardReferences
- [ ] Load performance acceptable (< 2 seconds including hydration)
