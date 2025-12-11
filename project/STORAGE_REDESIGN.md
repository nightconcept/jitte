# Storage Redesign: Slim Format + Delta-Based Versioning

> **Status**: In Progress (Phases 1-5 Complete)
> **Created**: 2024-12-10
> **Last Updated**: 2024-12-10
>
> **Completed**: Phase 1 (Foundation), Phase 2 (Card Reference), Phase 3 (Delta System), Phase 4 (Storage Providers), Phase 5 (Serialization)
> **Next**: Phase 6 (Migration), Phase 7 (Store Updates), Phase 8 (UI Integration)

## Problem Statement

The current storage architecture stores full card metadata per card per version, causing:
- localStorage quota exceeded for large decks (540-650 card cubes with 3+ versions)
- ~2-3KB per card × 650 cards × 3 versions = ~6MB (exceeds ~5-10MB localStorage limit)
- No delta compression between versions

## Solution Overview

1. **Slim card format**: Store only `scryfallId`, `quantity`, `setCode`, `collectorNumber` (~80-120 bytes vs ~2-3KB)
2. **Delta-based versioning**: Store changes between versions, not full snapshots
3. **Dual storage**: FileSystem API (primary) + IndexedDB (fallback/backup)
4. **Card hydration**: Fetch full card data from Scryfall cache (IndexedDB) on load

---

## Architecture Decisions

### Storage Strategy

| Aspect | Decision |
|--------|----------|
| Primary storage | FileSystem API (user-selected folder, e.g., Documents/Jitte) |
| Fallback storage | IndexedDB (`jitte-deck-storage`) |
| Folder handle persistence | Store in IndexedDB, re-request permission on session start |
| Write strategy | **Dual write** to both folder AND IndexedDB for redundancy |
| New deck location | Current folder if selected, else IndexedDB only |

### Card Reference Format (Slim)

```typescript
interface CardReference {
  scryfallId: string;      // Primary lookup key for Scryfall cache
  quantity: number;
  setCode: string;         // Specific printing
  collectorNumber: string; // Specific printing
  // Optional overrides (primarily for Cube format)
  customCmc?: number;
  customColorIdentity?: string[];
  customCategory?: string;
}
```

**Applies to**: Deck versions, maybeboard, stash

**Size comparison**:
- Current full card: ~2000-3000 bytes
- New CardReference: ~80-120 bytes
- **~25x reduction**

### Version Storage (Delta-Based)

| Aspect | Decision |
|--------|----------|
| Base snapshot frequency | On branch creation + every 10 versions |
| Delta format | `{ added: [], removed: [], modified: [] }` |
| Version reconstruction | Load base, apply deltas sequentially |

**File structure**:
```
branches/main/
├── base-v1.0.0.json      # Full CardReference[] snapshot
├── v1.0.0.meta.json      # Metadata (timestamp, message)
├── v1.1.0.delta.json     # Delta from v1.0.0
├── v1.2.0.delta.json     # Delta from v1.1.0
...
├── v1.10.0.delta.json    # Delta from v1.9.0
├── base-v1.11.0.json     # New base (10 versions threshold)
├── v1.11.0.meta.json     # Metadata
├── v1.12.0.delta.json    # Delta from v1.11.0
```

### Card Data Hydration

| Aspect | Decision |
|--------|----------|
| Cache location | IndexedDB (`jitte-card-cache`, existing) |
| Cache TTL | 24 hours (unchanged) |
| Missing cards strategy | Batch fetch all missing from Scryfall (max 75/request) |
| Deleted/unavailable cards | Show placeholder with card name + error state |

### IndexedDB Schema

**Two separate databases** (isolation between ephemeral cache and precious user data):

```
jitte-card-cache (v2)        # Ephemeral, rebuildable from Scryfall
├── cards                    # ScryfallCard objects (24hr TTL)
├── images                   # Card image blobs
├── sets                     # Set metadata (7 day TTL)
└── bulk-data                # Bulk download cache

jitte-deck-storage (v1)      # Precious user data
├── decks                    # DeckManifest + metadata
├── deck-versions            # Base snapshots + deltas
├── deck-maybeboards         # Maybeboard CardReference[]
├── deck-stashes             # Stash CardReference[]
└── folder-handles           # Persisted FileSystemDirectoryHandle
```

### Export/Import

| Aspect | Decision |
|--------|----------|
| Export format | Slim (CardReference) |
| Import old .jitte | Migrate to slim, cache cards in IndexedDB |
| Import new .jitte | Load slim, batch fetch missing cards |

### Migration

| Aspect | Decision |
|--------|----------|
| Strategy | Required one-time migration |
| Migration location | `src/lib/storage/migrations/` |
| Old format handling | Detect schema version, run appropriate migration |

---

## Data Structures

### CardReference (Slim Card)

```typescript
// src/lib/types/card-reference.ts
export interface CardReference {
  scryfallId: string;
  quantity: number;
  setCode: string;
  collectorNumber: string;
  // Cube format overrides
  customCmc?: number;
  customColorIdentity?: string[];
  customCategory?: string;
}

export type CardReferencesByCategory = Record<string, CardReference[]>;
```

### Version Delta

```typescript
// src/lib/types/version-delta.ts
export interface CardReferenceIdentifier {
  scryfallId: string;
  setCode: string;
  collectorNumber: string;
}

export interface VersionDelta {
  schemaVersion: '2.0';
  baseVersion: string;           // e.g., "1.0.0" - the base this chain starts from
  previousVersion: string;       // e.g., "1.4.0" - immediate predecessor
  added: CardReference[];
  removed: CardReferenceIdentifier[];
  modified: {
    card: CardReferenceIdentifier;
    changes: Partial<CardReference>;
  }[];
  categoryChanges?: {
    card: CardReferenceIdentifier;
    fromCategory: string;
    toCategory: string;
  }[];
}

export interface VersionBase {
  schemaVersion: '2.0';
  version: string;
  cards: CardReferencesByCategory;
}

export interface VersionMeta {
  version: string;
  branch: string;
  commitMessage: string;
  timestamp: string;
  isBase: boolean;
  baseVersion?: string;  // Which base this version derives from
}
```

### Deck Manifest (Updated)

```typescript
// Updates to src/lib/types/deck.ts
export interface DeckManifestV2 extends DeckManifest {
  storageSchemaVersion: '2.0';
  // Track base versions per branch for reconstruction
  branchBases: Record<string, string[]>;  // { "main": ["1.0.0", "1.11.0", "1.21.0"] }
}
```

### IndexedDB Deck Storage

```typescript
// src/lib/storage/deck-database.ts
interface StoredDeck {
  name: string;                    // Primary key
  manifest: DeckManifestV2;
  folderPath?: string;             // If synced to folder
  lastSynced?: number;
  createdAt: number;
  updatedAt: number;
}

interface StoredVersion {
  id: string;                      // "{deckName}/{branch}/{version}"
  deckName: string;
  branch: string;
  version: string;
  isBase: boolean;
  content: VersionBase | VersionDelta;
  meta: VersionMeta;
}

interface StoredMaybeboard {
  deckName: string;                // Primary key
  categories: {
    id: string;
    name: string;
    cards: CardReference[];
  }[];
  defaultCategoryId: string;
}

interface StoredStash {
  id: string;                      // "{deckName}/{branch}"
  deckName: string;
  branch: string;
  cards: CardReferencesByCategory;
  stashedAt: number;
  message?: string;
}

interface StoredFolderHandle {
  id: string;                      // "default" or custom identifier
  handle: FileSystemDirectoryHandle;
  path: string;
  lastUsed: number;
}
```

---

## Implementation Tasks

### Phase 1: Foundation (Types + Database) ✅

- [x] **1.1** Create `src/lib/types/card-reference.ts` with CardReference types
- [x] **1.2** Create `src/lib/types/version-delta.ts` with delta/base types
- [x] **1.3** Create `src/lib/storage/deck-database.ts` - IndexedDB wrapper for deck storage
- [x] **1.4** Add `folder-handles` object store to deck database
- [x] **1.5** Create `src/lib/storage/migrations/types.ts` - migration interfaces
- [x] **1.6** Create `src/lib/storage/migrations/index.ts` - migration runner

### Phase 2: Card Reference Conversion ✅

- [x] **2.1** Create `src/lib/utils/card-reference.ts` - conversion utilities:
  - `cardToReference(card: Card): CardReference`
  - `referenceToCard(ref: CardReference, scryfallCard: ScryfallCard): Card`
  - `cardsToReferences(cards: CardsByCategory): CardReferencesByCategory`
  - `referencesToCards(refs: CardReferencesByCategory, cache: Map<string, ScryfallCard>): CardsByCategory`
- [x] **2.2** Create `src/lib/utils/card-hydration.ts` - batch hydration from Scryfall
- [x] **2.3** Add placeholder card generation for missing/deleted cards

### Phase 3: Delta System ✅

- [x] **3.1** Create `src/lib/utils/version-delta.ts`:
  - `calculateDelta(oldCards: CardReferencesByCategory, newCards: CardReferencesByCategory): VersionDelta`
  - `applyDelta(base: CardReferencesByCategory, delta: VersionDelta): CardReferencesByCategory`
  - `shouldCreateBase(versionNumber: string, branchBases: string[]): boolean`
- [x] **3.2** Create `src/lib/utils/version-reconstruction.ts`:
  - `reconstructVersion(targetVersion: string, bases: VersionBase[], deltas: VersionDelta[]): CardReferencesByCategory`
- [ ] **3.3** Update `src/lib/utils/version-control.ts` to use delta system

### Phase 4: Storage Providers ✅

- [x] **4.1** Create `src/lib/storage/indexeddb-deck-provider.ts` - new IndexedDB provider for decks
- [x] **4.2** Update `src/lib/storage/filesystem-folder-provider.ts` to use slim format
- [x] **4.3** Create `src/lib/storage/dual-storage-manager.ts` - orchestrates dual writes
- [x] **4.4** Implement folder handle persistence and permission re-request

### Phase 5: Serialization ✅

- [x] **5.1** Create `src/lib/storage/deck-serializer.ts`:
  - `serializeToBase()` / `serializeCardsToSlimJson()` - convert cards to slim format
  - `parseVersionFileContentAsync()` - parse and hydrate version content
  - `maybeboardToSlimFormat()` / `slimMaybeboardToFull()` - maybeboard conversion
  - `stashToSlimFormat()` / `slimStashToArchiveFormat()` - stash conversion
  - `detectVersionFormat()` / `convertLegacyToSlim()` - format detection + migration
- [ ] **5.2** Update `src/lib/utils/zip.ts` for new archive structure (optional - providers work with DeckArchive)

### Phase 6: Migration System

- [ ] **6.1** Create `src/lib/storage/migrations/v1-to-v2.ts`:
  - Detect old format (full card data, no delta)
  - Convert cards to CardReference format
  - Cache full card data in `jitte-card-cache`
  - Create initial base version
  - Update manifest to V2
- [ ] **6.2** Create `src/lib/storage/migrations/localstorage-to-indexeddb.ts`:
  - Move deck data from localStorage to IndexedDB
  - Clean up old localStorage keys
- [ ] **6.3** Create `src/lib/storage/migrations/import-old-jitte.ts`:
  - Handle importing old .jitte files with full card data

### Phase 7: Store Updates

- [ ] **7.1** Update `src/lib/stores/deck-store.ts`:
  - Work with CardReference internally where possible
  - Hydrate to full Card objects for UI
- [ ] **7.2** Update `src/lib/stores/deck-manager.ts`:
  - Use dual storage manager
  - Handle version reconstruction
  - Trigger migrations on load

### Phase 8: UI Integration

- [ ] **8.1** Add folder selection UI (Settings or first-run modal)
- [ ] **8.2** Add storage status indicator (synced to folder vs IndexedDB only)
- [ ] **8.3** Add loading states for card hydration
- [ ] **8.4** Add error states for missing/deleted cards
- [ ] **8.5** Update export to use slim format
- [ ] **8.6** Update import to handle both old and new formats

### Phase 9: Testing + Cleanup

- [ ] **9.1** Test migration with existing decks (Commander, Cube, Standard, Modern)
- [ ] **9.2** Test large cube (650 cards, multiple versions)
- [ ] **9.3** Test offline mode (cards in cache)
- [ ] **9.4** Test cache miss scenario (batch fetch)
- [ ] **9.5** Test folder sync + IndexedDB redundancy
- [ ] **9.6** Remove deprecated code paths
- [ ] **9.7** Update CLAUDE.md with new storage architecture

---

## File Changes Summary

### New Files
```
src/lib/types/card-reference.ts              ✅ Created
src/lib/types/version-delta.ts               ✅ Created
src/lib/storage/deck-database.ts             ✅ Created
src/lib/storage/dual-storage-manager.ts      ✅ Created
src/lib/storage/indexeddb-deck-provider.ts   ✅ Created
src/lib/storage/deck-serializer.ts           ✅ Created
src/lib/storage/migrations/types.ts          ✅ Created
src/lib/storage/migrations/index.ts          ✅ Created
src/lib/storage/migrations/v1-to-v2.ts       (Phase 6)
src/lib/storage/migrations/localstorage-to-indexeddb.ts  (Phase 6)
src/lib/storage/migrations/import-old-jitte.ts           (Phase 6)
src/lib/utils/card-reference.ts              ✅ Created
src/lib/utils/card-hydration.ts              ✅ Created
src/lib/utils/version-delta.ts               ✅ Created
src/lib/utils/version-reconstruction.ts      ✅ Created
```

### Modified Files
```
src/lib/types/card-reference.ts          ✅ Updated (MaybeboardCategoryReference metadata)
src/lib/storage/types.ts                 ✅ Updated (IndexedDB storage provider enum)
src/lib/storage/filesystem-folder-provider.ts  ✅ Updated (slim format methods)
src/lib/types/deck.ts                    (Phase 7 - DeckManifestV2)
src/lib/storage/storage-manager.ts       (Phase 7 - dual storage integration)
src/lib/utils/version-control.ts         (Phase 7 - delta integration)
src/lib/utils/zip.ts                     (optional - providers handle DeckArchive)
src/lib/stores/deck-store.ts             (Phase 7 - CardReference support)
src/lib/stores/deck-manager.ts           (Phase 7 - dual storage + migrations)
src/lib/api/card-service.ts              (optional - batch fetch already exists)
```

---

## Rollback Plan

If issues arise:
1. Keep old serialization code paths (marked deprecated)
2. Migration stores backup of original data before converting
3. Can re-export from IndexedDB in old format if needed

---

## Success Criteria

- [ ] 650-card cube with 10+ versions saves without quota errors
- [ ] Version load time < 2 seconds (including delta reconstruction)
- [ ] First load with empty cache < 5 seconds (batch Scryfall fetch)
- [ ] Subsequent loads < 500ms (cards cached)
- [ ] Folder sync works across browser sessions
- [ ] Old decks migrate successfully without data loss
- [ ] Old .jitte imports work correctly
