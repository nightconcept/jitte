# Multi-Format Architecture Refactor Plan

**Created:** 2025-11-19
**Status:** ✅ Phase 1 & 2 & 3 Complete
**Scope:** Convert Jitte from Commander-centric to format-agnostic architecture
**Last Updated:** 2025-11-19

---

## Executive Summary

Jitte currently has a Commander-first architecture with hard-coded dependencies on Commander-specific card categories (commander, companion, planeswalker, etc.). To properly support Cube and future formats, we need to refactor the core architecture to be format-agnostic while maintaining backward compatibility.

**Estimated Effort:** 20-30 hours of development + testing
**Risk Level:** Medium-High (touches 145+ files)
**Breaking Changes:** Minimal (with proper migration strategy)

---

## 1. Current State Analysis

### 1.1 Architecture Overview

```
Current Architecture (Commander-Centric):
┌─────────────────────────────────────────┐
│          Deck Type (Rigid)              │
│  - cards: CategorizedCards (hardcoded)  │
│  - 10 Commander-specific categories     │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     All Utilities & Components          │
│  - Assume CategorizedCards structure    │
│  - Direct property access (deck.cards.commander) │
│  - 233+ references to CardCategory enum │
└─────────────────────────────────────────┘
```

### 1.2 Format-Specific Dependencies

**Total Files:** 145 TypeScript/Svelte files
**CardCategory References:** 233 occurrences
**Direct deck.cards Access:** 50+ locations
**Format Checks:** 19 in components, scattered throughout utils

### 1.3 Existing Format Infrastructure (Good News!)

✅ **Already exists:**
- `FormatRuleset` interface for format-specific validation
- `RulesetFactory` for ruleset lookup
- `FORMAT_METADATA` registry
- Separate ban lists per format
- `deck.format` field on all decks

❌ **Missing:**
- Format-specific card categorization
- Format-specific statistics calculation
- Format-specific UI components/layouts
- Type-safe discriminated unions based on format

---

## 2. Key Technical Challenges

### 2.1 Type Safety Issues

**Problem:** `Deck.cards` is typed as `CategorizedCards | CubeCategorizedCards`, which:
- Breaks type inference throughout codebase
- Requires type guards at every access point
- Makes TypeScript unable to guarantee property existence

**Example Error:**
```typescript
// Current code (breaks with union type):
const commanderCount = deck.cards.commander.length;
// Error: Property 'commander' does not exist on type 'CubeCategorizedCards'
```

### 2.2 Deep Coupling

**Areas with tight Commander coupling:**

1. **Deck Store (1,306 lines)**
   - 11 direct `deck.cards.commander` accesses
   - Categorization logic assumes CategorizedCards
   - Commander-specific operations (setCommanders, addPartner, etc.)

2. **Deck Statistics (600+ lines)**
   - Iterates over CardCategory enum
   - Counts lands using `deck.cards.land`
   - Bracket/salt calculations assume Commander

3. **Components (58 Svelte files)**
   - DeckList, VisualSpoilerView, StacksView all assume CardCategory
   - Partner detection in multiple components
   - Commander-specific menus and modals

4. **Utilities (26 files)**
   - deck-categorization.ts (Commander-only)
   - game-changers.ts (Commander-only)
   - salt-calculator.ts (Commander-only)
   - partner-detection.ts (Commander-only)

### 2.3 Storage & Serialization

**Current:**
- Deck ZIP files contain CategorizedCards structure
- Manifest schema assumes Commander categories
- Migration needed for existing decks

---

## 3. Proposed Architecture

### 3.1 Core Type System (Generic Categories + Discriminated Unions)

**Key Innovation: Abstract Category System**

Instead of hardcoding category types (CategorizedCards, CubeCategorizedCards), use a **generic category system** where categories are just strings with metadata:

```typescript
// Generic card storage - works for ANY format
interface CardsByCategory {
  [categoryId: string]: Card[];
}

// Category metadata (format-specific)
interface CategoryDefinition {
  id: string;
  label: string;           // Display name
  icon?: string;           // Icon class (ms-creature, ms-w, etc.)
  order: number;           // Display order
  isRequired?: boolean;    // Must have at least one card?
  allowMultiple?: boolean; // Allow multiple copies?
  maxCards?: number;       // Max cards in this category
}

// Format defines its categories
interface CategorySchema {
  categories: CategoryDefinition[];
  defaultCategoryId?: string; // Where to put uncategorized cards
}
```

**Format-Specific Schemas:**

```typescript
// Commander schema (type-based)
const COMMANDER_CATEGORIES: CategoryDefinition[] = [
  { id: 'commander', label: 'Commander', icon: '', order: 0, isRequired: true, maxCards: 2 },
  { id: 'companion', label: 'Companion', icon: 'ms-planeswalker', order: 1, maxCards: 1 },
  { id: 'planeswalker', label: 'Planeswalkers', icon: 'ms-planeswalker', order: 2 },
  { id: 'creature', label: 'Creatures', icon: 'ms-creature', order: 3 },
  // ... etc
];

// Cube schema (color-based)
const CUBE_CATEGORIES: CategoryDefinition[] = [
  { id: 'white', label: 'White', icon: 'ms-w', order: 0 },
  { id: 'blue', label: 'Blue', icon: 'ms-u', order: 1 },
  { id: 'black', label: 'Black', icon: 'ms-b', order: 2 },
  // ... etc
];

// User can add custom categories!
const CUSTOM_CATEGORIES: CategoryDefinition[] = [
  { id: 'ramp', label: 'Ramp Package', icon: 'ms-g', order: 0 },
  { id: 'removal', label: 'Removal Suite', icon: 'ms-instant', order: 1 },
  { id: 'wincons', label: 'Win Conditions', icon: 'ms-planeswalker', order: 2 },
];
```

**Updated Deck Type:**

```typescript
type Deck = CommanderDeck | CubeDeck | StandardDeck | CustomDeck;

interface BaseDeck {
  name: string;
  format: DeckFormat;
  cards: CardsByCategory;  // Generic!
  cardCount: number;
  currentBranch: string;
  currentVersion: string;
  createdAt: string;
  updatedAt: string;

  // NEW: Category customization
  categorySchema?: CategorySchema;  // Override default categories
}

interface CommanderDeck extends BaseDeck {
  format: DeckFormat.Commander;
  colorIdentity: ManaColor[];
  // cards['commander'] exists (enforced by validation)
}

interface CubeDeck extends BaseDeck {
  format: DeckFormat.Cube;
  // cards['white'], cards['blue'], etc. (enforced by validation)
}

interface CustomDeck extends BaseDeck {
  format: DeckFormat.Custom;
  categorySchema: CategorySchema;  // Required for custom
}
```

**Benefits:**
- ✅ Works with Commander (type-based categories)
- ✅ Works with Cube (color-based categories)
- ✅ Works with Standard/Modern (same as Commander)
- ✅ **Allows user-defined custom categories**
- ✅ Easy to add categories without code changes
- ✅ Categories stored as data, not hardcoded types
- ✅ Still type-safe via discriminated unions

### 3.2 Format Service Layer (Updated for Generic Categories)

```typescript
// Enhanced abstraction layer with category management
interface FormatService {
  format: DeckFormat;

  // Category schema
  getCategorySchema(): CategorySchema;
  getCategory(categoryId: string): CategoryDefinition | undefined;
  getAllCategories(): CategoryDefinition[];
  getCategoriesInDisplayOrder(): CategoryDefinition[];

  // Card categorization
  categorizeCard(card: Card): string;  // Returns category ID
  categorizeCards(cards: Card[]): CardsByCategory;

  // Statistics
  calculateStatistics(deck: Deck): DeckStatistics;

  // Factory
  createEmptyDeck(name: string, customSchema?: CategorySchema): Deck;
  createEmptyCardsByCategory(schema?: CategorySchema): CardsByCategory;

  // Validation
  validateCategory(categoryId: string, cards: Card[]): ValidationWarning[];
}

class FormatServiceFactory {
  static getService(format: DeckFormat, customSchema?: CategorySchema): FormatService {
    switch (format) {
      case DeckFormat.Commander:
        return new CommanderFormatService();
      case DeckFormat.Cube:
        return new CubeFormatService();
      case DeckFormat.Custom:
        return new CustomFormatService(customSchema!);
      // etc.
    }
  }
}
```

**Implementation:**
- `CommanderFormatService` - uses COMMANDER_CATEGORIES schema
- `CubeFormatService` - uses CUBE_CATEGORIES schema
- `StandardFormatService` - uses COMMANDER_CATEGORIES schema (same categories)
- `ModernFormatService` - uses COMMANDER_CATEGORIES schema (same categories)
- `CustomFormatService` - **uses user-provided schema** ⭐

**Category Resolution:**
```typescript
class CommanderFormatService implements FormatService {
  getCategorySchema(): CategorySchema {
    return {
      categories: COMMANDER_CATEGORIES,
      defaultCategoryId: 'other'
    };
  }

  categorizeCard(card: Card): string {
    // Type-based categorization
    if (!card.types) return 'other';
    const types = card.types.map(t => t.toLowerCase());

    if (types.includes('planeswalker')) return 'planeswalker';
    if (types.includes('creature')) return 'creature';
    if (types.includes('instant')) return 'instant';
    // ... etc

    return 'other';
  }
}

class CubeFormatService implements FormatService {
  categorizeCard(card: Card): string {
    // Color-based categorization
    if (card.types?.some(t => t.toLowerCase() === 'land')) {
      return 'lands';
    }

    const colors = card.colorIdentity || [];
    if (colors.length === 0) return 'colorless';
    if (colors.length > 1) return 'multicolored';

    // Single color
    const colorMap = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green' };
    return colorMap[colors[0]] || 'colorless';
  }
}

class CustomFormatService implements FormatService {
  constructor(private schema: CategorySchema) {}

  categorizeCard(card: Card): string {
    // User defines categorization rules
    // Could be based on CMC, keywords, tribal types, etc.
    // For now, default to first category or user's default
    return this.schema.defaultCategoryId || this.schema.categories[0]?.id;
  }
}
```

### 3.3 Component Architecture

```svelte
<!-- Format-agnostic wrapper -->
<DeckList {deck} />

<!-- Inside DeckList.svelte: -->
<script lang="ts">
  let formatService = $derived(
    FormatServiceFactory.getService(deck.format)
  );

  let categories = $derived(
    formatService.getCategoryDisplayOrder()
  );

  let categoryCards = $derived.by(() => {
    const cards = {};
    for (const cat of categories) {
      cards[cat] = formatService.getCategoryCards(deck, cat);
    }
    return cards;
  });
</script>

{#each categories as category}
  {@const cards = categoryCards[category]}
  {@const label = formatService.getCategoryLabel(category)}
  {@const icon = formatService.getCategoryIcon(category)}

  <CategorySection {category} {cards} {label} {icon} />
{/each}
```

### 3.4 Updated Folder Structure

```
src/lib/
├── formats/
│   ├── format-registry.ts
│   ├── ruleset.ts
│   ├── ruleset-factory.ts
│   ├── services/                    # NEW
│   │   ├── format-service.ts        # Interface
│   │   ├── commander-service.ts     # Commander impl
│   │   ├── cube-service.ts          # Cube impl
│   │   ├── standard-service.ts
│   │   └── modern-service.ts
│   ├── rulesets/
│   │   ├── commander-ruleset.ts
│   │   ├── cube-ruleset.ts          # NEW
│   │   └── ...
│   ├── ban-lists/
│   │   └── ...
│   └── categorization/              # NEW
│       ├── commander-categories.ts
│       ├── cube-categories.ts
│       └── ...
│
├── types/
│   ├── deck.ts                      # Updated with discriminated unions
│   ├── card.ts                      # Keep both category enums
│   └── ...
│
├── utils/
│   ├── statistics/                  # NEW: format-specific
│   │   ├── commander-statistics.ts
│   │   ├── cube-statistics.ts
│   │   └── base-statistics.ts
│   └── ...
│
└── components/
    ├── DeckList.svelte              # Made format-agnostic
    ├── format-specific/             # NEW: format UI overrides
    │   ├── CommanderHeader.svelte
    │   ├── CubeHeader.svelte
    │   └── ...
    └── ...
```

---

## 4. Migration Strategy

### 4.1 Phase 1: Foundation (Week 1)

**Goal:** Set up new architecture without breaking existing code

**Tasks:**
1. Create discriminated union types for Deck
2. Implement FormatService interface
3. Create CommanderFormatService (wrapping existing logic)
4. Create CubeFormatService
5. Add FormatServiceFactory
6. Update RulesetFactory to include CubeRuleset
7. Write comprehensive tests

**Deliverables:**
- New types compile alongside old types
- Services tested and working
- No existing code broken

### 4.2 Phase 2: Core Utilities (Week 2)

**Goal:** Migrate utility functions to use format services

**Tasks:**
1. Update deck-factory.ts
   - Use FormatService.createEmptyDeck()
   - Type guard based on format parameter
2. Update deck-statistics.ts
   - Delegate to FormatService.calculateStatistics()
   - Keep base statistics calculation
3. Update deck-store.ts (most complex)
   - Add format detection
   - Route operations through FormatService
   - Maintain Commander-specific actions with type guards
4. Update deck-validation.ts
   - Already uses RulesetFactory (minimal changes)
5. Update decklist-parser.ts
   - Add format detection/parameter
   - Use appropriate categorization

**Deliverables:**
- All utilities work with both Commander and Cube
- Existing Commander decks still work
- Comprehensive test coverage

### 4.3 Phase 3: Components (Week 3)

**Goal:** Update UI components to be format-agnostic

**Tasks:**
1. Update DeckHeader.svelte
   - Already has format checks (just clean up)
   - Move Commander-specific display to CommanderHeader.svelte
   - Create CubeHeader.svelte
2. Update DeckList.svelte
   - Use FormatService for category iteration
   - Remove hardcoded CardCategory references
   - Keep Commander-specific menus with type guards
3. Update VisualSpoilerView.svelte
4. Update StacksView.svelte
5. Update CategorySection components
6. Update modals (AddCardModal, etc.)
   - Pass format through props
   - Validate based on format

**Deliverables:**
- All views work for both Commander and Cube
- No hardcoded category assumptions
- Clean separation of format-specific UI

### 4.4 Phase 4: Storage & Migration (Week 4)

**Goal:** Handle deck storage and format migration

**Tasks:**
1. Update deck-serializer.ts
   - Save format field prominently
   - Handle both category structures
2. Update deck-loader.ts
   - Detect format from manifest
   - Load appropriate category structure
3. Create migration utility
   - Detect old Commander-only decks
   - Add format field if missing
   - Validate category structure
4. Update ZIP structure documentation
5. Test with existing deck files

**Deliverables:**
- All existing decks migrate seamlessly
- New decks save with proper format
- No data loss

### 4.5 Phase 5: Polish & Testing (Week 5)

**Goal:** Complete feature parity and comprehensive testing

**Tasks:**
1. End-to-end testing
   - Create Commander deck
   - Create Cube deck
   - Import/export both
   - Branching with both
   - Diff calculation
2. Performance testing
   - Large Cube lists (540+ cards)
3. UI/UX polish
   - Ensure all features work
   - Format-specific help text
4. Documentation
   - Update README
   - Document format system
   - API documentation

**Deliverables:**
- Full feature parity for Commander
- Working Cube implementation
- Comprehensive documentation

---

## 5. Implementation Details

### 5.1 Type Guard Helpers

```typescript
// Type guard utilities
export function isCommanderDeck(deck: Deck): deck is CommanderDeck {
  return deck.format === DeckFormat.Commander;
}

export function isCubeDeck(deck: Deck): deck is CubeDeck {
  return deck.format === DeckFormat.Cube;
}

// Usage in components:
if (isCommanderDeck(deck)) {
  // TypeScript knows deck.cards is CategorizedCards
  const commanders = deck.cards.commander;
}
```

### 5.2 Backward Compatibility

**Deck Store:**
- Keep all Commander-specific methods
- Add guards: `if (!isCommanderDeck(state.deck)) return state;`
- New methods: `addCardGeneric()` that routes to format service

**Components:**
- Existing Commander components keep working
- New generic components work with all formats
- Graceful fallbacks for missing features

### 5.3 Statistics Refactor

```typescript
// Base statistics (format-agnostic)
interface BaseStatistics {
  totalCards: number;
  totalPrice: number;
  warnings: ValidationWarning[];
}

// Commander-specific
interface CommanderStatistics extends BaseStatistics {
  bracketLevel: number;
  gameChangerCount: number;
  saltScore?: DeckSaltScore;
  combos?: DetectedCombo[];
  // ... mana curve, color dist, etc.
}

// Cube-specific
interface CubeStatistics extends BaseStatistics {
  colorBreakdown: {
    white: number;
    blue: number;
    black: number;
    red: number;
    green: number;
    colorless: number;
    multicolored: number;
    lands: number;
  };
  // No brackets, no salt, no combos
}

type DeckStatistics = CommanderStatistics | CubeStatistics;
```

---

## 6. Risks & Mitigation

### 6.1 Breaking Changes

**Risk:** Existing decks fail to load
**Mitigation:**
- Comprehensive migration utility
- Fallback to Commander format for old decks
- Extensive testing with real deck files
- Keep backup of original deck files

### 6.2 Type System Complexity

**Risk:** Discriminated unions too complex, developers struggle
**Mitigation:**
- Comprehensive type guard utilities
- Clear documentation with examples
- Helper functions for common patterns
- Gradual migration (old code still works)

### 6.3 Performance

**Risk:** FormatService abstraction adds overhead
**Mitigation:**
- Services are stateless and lightweight
- Minimal overhead (just a switch statement)
- Can optimize with memoization if needed
- Profile before/after to measure impact

### 6.4 Testing Burden

**Risk:** Testing matrix explodes (2+ formats × N features)
**Mitigation:**
- Shared test utilities
- Format-agnostic base tests
- Format-specific test suites
- Automated regression testing

---

## 7. Success Criteria

### 7.1 Functional Requirements

✅ All existing Commander functionality preserved
✅ Cube format fully implemented:
  - 8 color-based categories
  - No card limits
  - No statistics panel
  - Color breakdown in header
✅ Easy to add new formats (Standard, Modern, etc.)
✅ No data loss in migration
✅ Type-safe throughout codebase

### 7.2 Non-Functional Requirements

✅ < 5% performance degradation
✅ No increase in bundle size (code splitting)
✅ Clear developer documentation
✅ Comprehensive test coverage (>80%)
✅ Backward compatible with existing decks

---

## 8. Future Considerations

### 8.1 Standard & Modern Support

After Cube is stable, implementing Standard/Modern will be:
- Add StandardFormatService
- Add standard-categorization.ts (same as Commander)
- Add standard-statistics.ts (similar to Commander, different validation)
- Minimal component changes (reuse existing)

**Estimated effort:** 2-3 days per format

### 8.2 Format-Specific Features

Each format can have unique features:
- **Commander:** Brackets, salt scores, combo detection
- **Cube:** Draft simulation, archetype analysis
- **Standard:** Rotation warnings, meta tracking
- **Modern:** Tier list integration

These plug into the FormatService without affecting other formats.

### 8.3 Custom Formats

Potential for user-defined formats:
- Peasant Cube (commons/uncommons only)
- Pauper Commander
- Custom rule sets
- House rules

Architecture supports this via:
- JSON-defined format metadata
- Configurable rulesets
- Dynamic category definitions

---

## 9. Implementation Task List

**Overall Progress:** Phase 1 ✅ Complete | Phase 2 ✅ Complete | Phase 3 ✅ Complete | Phase 4 🔄 60% | Phase 5 ⏳ Not Started

**Recent Completions (2025-11-19):**

**Phase 1:** ✅ All foundation work complete
- Type system, services, category schemas, rulesets

**Phase 2:** ✅ All core utilities complete
- deck-statistics.ts refactored to use CardsByCategory
- deck-validation.ts already format-agnostic
- decklist-parser.ts already format-agnostic
- deck-store.ts updated to accept string category IDs
- deck-factory.ts uses FormatService
- diff.ts, deck-serializer.ts, deck-manager.ts, deck-loader.ts all updated

**Phase 3:** ✅ All components complete
- DeckHeader.svelte: Uses type guards, dynamic category stats
- DeckList.svelte: Dynamic categories from FormatService
- VisualSpoilerView.svelte: Accepts string category IDs
- StacksView.svelte: Accepts string category IDs
- CardDisplay.svelte: Accepts string category IDs
- All modals: No updates needed (already format-agnostic)

**Testing:**
- ✅ All TypeScript errors resolved (0 errors, 0 warnings)
- ✅ Build verification successful

### Phase 1: Foundation - Type System & Services

**Core Types:**
- [x] Create `CategoryDefinition` interface in `src/lib/types/card.ts`
- [x] Create `CategorySchema` interface in `src/lib/types/card.ts`
- [x] Create `CardsByCategory` interface in `src/lib/types/card.ts`
- [x] Update `Deck` type to use discriminated unions in `src/lib/types/deck.ts`
- [x] Create `CommanderDeck`, `CubeDeck`, `StandardDeck`, `ModernDeck` interfaces
- [x] Create type guard utilities (`isCommanderDeck`, `isCubeDeck`, etc.)
- [x] Add `categorizationMode` and `customCategories` fields to `BaseDeck`

**Category Definitions:**
- [x] Create `src/lib/formats/categorization/commander-categories.ts`
- [x] Create `src/lib/formats/categorization/cube-categories.ts`
- [ ] Create `src/lib/formats/categorization/standard-categories.ts` (uses same as Commander)

**Format Services:**
- [x] Create `FormatService` interface in `src/lib/formats/services/format-service.ts`
- [x] Implement `CommanderFormatService` in `src/lib/formats/services/commander-service.ts`
- [x] Implement `CubeFormatService` in `src/lib/formats/services/cube-service.ts`
- [x] Create `FormatServiceFactory` in `src/lib/formats/services/format-service-factory.ts`
- [ ] Standard/Modern use CommanderFormatService (same categories, different validation)

**Rulesets:**
- [x] Create `CubeRuleset` in `src/lib/formats/rulesets/cube-ruleset.ts`
- [x] Update `RulesetFactory` to include Cube format

**Tests:**
- [ ] Test category definitions (deferred to Phase 5)
- [ ] Test format services (deferred to Phase 5)
- [ ] Test type guards (deferred to Phase 5)
- [ ] Test ruleset factory (deferred to Phase 5)

### Phase 2: Core Utilities

**Deck Factory:**
- [x] Update `deck-factory.ts` to use `FormatService`
- [x] Add format-specific deck creation methods
- [x] Update empty deck generation

**Deck Statistics:**
- [ ] Create `BaseStatistics` interface
- [ ] Create `CommanderStatistics` interface extending `BaseStatistics`
- [ ] Create `CubeStatistics` interface extending `BaseStatistics`
- [ ] Update `deck-statistics.ts` to delegate to `FormatService`
- [ ] Move Commander-specific stats to `CommanderFormatService`
- [ ] Implement Cube-specific stats in `CubeFormatService`

**Deck Store:**
- [x] Add format detection to `deck-store.ts` (type guards added)
- [ ] Route card operations through `FormatService` (partial - categorization still local)
- [x] Add type guards for Commander-specific operations
- [ ] Update `addCard` to use format service categorization (uses local determineCategory)
- [x] Update `removeCard` to work with generic categories (uses CardsByCategory)
- [x] Update `updateQuantity` to work with generic categories (uses CardsByCategory)

**Validation:**
- [ ] Update `deck-validation.ts` to use format service
- [ ] Ensure validation works for all formats

**Parser:**
- [ ] Update `decklist-parser.ts` to accept format parameter
- [ ] Use appropriate categorization based on format

### Phase 3: Components

**DeckHeader:**
- [ ] Update `DeckHeader.svelte` to use format service
- [ ] Create format-specific header sections
- [ ] Test with Commander format
- [ ] Test with Cube format

**DeckList:**
- [ ] Update `DeckList.svelte` to iterate categories via format service
- [ ] Remove hardcoded `CardCategory` references
- [ ] Add type guards for format-specific features
- [ ] Test with both formats

**Views:**
- [ ] Update `VisualSpoilerView.svelte` for generic categories
- [ ] Update `StacksView.svelte` for generic categories
- [ ] Update `CategorySection` components

**Modals:**
- [ ] Update `AddCardModal.svelte` to pass format
- [ ] Update `NewDeckModal.svelte` to allow format selection
- [ ] Update other modals as needed

### Phase 4: Storage & Migration

**Serialization:**
- [x] Update `deck-serializer.ts` to save format field
- [x] Handle generic `CardsByCategory` structure
- [x] Ensure backward compatibility (defaults categorizationMode to 'default')

**Loading:**
- [x] Update `deck-loader.ts` to detect format
- [x] Load appropriate category structure
- [x] Handle legacy decks (default to Commander, adds categorizationMode)

**Migration:**
- [ ] Create migration utility for legacy decks
- [ ] Add format field to old decks
- [ ] Validate migrated decks
- [ ] Test with real deck files

### Phase 5: Testing & Polish

**Testing:**
- [ ] End-to-end test: Create Commander deck
- [ ] End-to-end test: Create Cube deck
- [ ] Test import/export for both formats
- [ ] Test branching with both formats
- [ ] Test diff calculation
- [ ] Performance test with large Cube (540+ cards)

**Polish:**
- [ ] UI/UX review
- [ ] Format-specific help text
- [ ] Error messages
- [ ] Loading states

**Documentation:**
- [ ] Update README
- [ ] Document format system
- [ ] API documentation
- [ ] Migration guide

---

## 10. Next Steps

### 10.1 Immediate Action Items

**To proceed:**

1. ✅ Review this plan
2. ✅ Add task list to plan
3. ⬜ Begin Phase 1: Foundation
4. ⬜ Create feature branch: `feat/multi-format` (optional)
5. ⬜ Track progress with TodoWrite

---

## 10. Appendix

### 10.1 Files Requiring Changes

**High Priority (Core):**
```
src/lib/types/deck.ts
src/lib/types/card.ts
src/lib/stores/deck-store.ts (1,306 lines)
src/lib/utils/deck-factory.ts
src/lib/utils/deck-statistics.ts
src/lib/utils/deck-categorization.ts
src/lib/formats/ruleset-factory.ts
```

**Medium Priority (Features):**
```
src/lib/utils/deck-validation.ts
src/lib/utils/diff.ts
src/lib/utils/decklist-parser.ts
src/lib/components/DeckList.svelte
src/lib/components/DeckHeader.svelte
src/lib/components/VisualSpoilerView.svelte
src/lib/components/StacksView.svelte
```

**Low Priority (Polish):**
```
src/lib/components/AddCardModal.svelte
src/lib/components/NewDeckModal.svelte
src/lib/components/Statistics.svelte
All other components (58 total)
```

### 10.2 Reference Links

- **TypeScript Discriminated Unions:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- **Strategy Pattern:** https://refactoring.guru/design-patterns/strategy
- **Svelte 5 Runes:** https://svelte.dev/docs/svelte/$state

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Next Review:** After approval
