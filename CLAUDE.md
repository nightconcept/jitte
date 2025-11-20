# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jitte** is a local-first web application for managing Magic: The Gathering decklists across multiple formats (Commander, Cube, Standard, Modern) with git-style version control, branching, diff tracking, and export capabilities to popular deck-building platforms.

### Tech Stack
- **Framework**: SvelteKit with Svelte 5 (using Runes)
- **Styling**: Tailwind CSS 4 with Base16/Base24 color system
- **Storage**: Browser localStorage + FileSystem Access API
- **APIs**: Scryfall (primary card data source)
- **Build**: Vite with automated versioning
- **Code Quality**: Biome for linting/formatting

### Project Structure

```
jitte/
├── src/
│   ├── lib/
│   │   ├── api/              # Scryfall API client & card service
│   │   ├── components/       # Svelte components (all using Runes)
│   │   ├── formats/          # Multi-format system (rulesets, services, ban lists)
│   │   ├── storage/          # Storage layer (FileSystem + localStorage)
│   │   ├── stores/           # Svelte stores (4 total)
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # Utility modules
│   └── routes/               # SvelteKit routes (+page.svelte)
├── theme/                    # Base16/Base24 theme system
├── project/                  # Documentation (PRD, TASKS, VERIFICATION)
└── examples/                 # Example deck files
```

### Where to Look for Features

| I want to... | Look here |
|--------------|-----------|
| **Work with formats** | `src/lib/formats/format-registry.ts` (format definitions), `src/lib/formats/ruleset-factory.ts`, `src/lib/formats/services/format-service-factory.ts` |
| **Add a new format** | Create ruleset in `src/lib/formats/rulesets/`, add service in `src/lib/formats/services/`, update factories |
| **Update ban lists** | `src/lib/formats/ban-lists/` (commander.ts, modern.ts, standard.ts, cube.ts) |
| **Modify format validation** | `src/lib/formats/rulesets/` for format-specific rules, `src/lib/utils/deck-validation.ts` for shared logic |
| **Format categorization** | `src/lib/formats/categorization/` (commander-categories.ts for types, cube-categories.ts for colors) |
| **Work with themes** | `theme/QUICK-REFERENCE.md` for color usage, `theme/README.md` for setup |
| **Understand version control** | `src/lib/utils/version-control.ts`, `src/lib/utils/semver.ts`, `src/lib/utils/stash.ts` |
| **Modify deck operations** | `src/lib/stores/deck-store.ts` (current working deck), `src/lib/stores/deck-manager.ts` (persistence) |
| **Add/modify storage** | `src/lib/storage/storage-manager.ts` |
| **Work with Scryfall API** | `src/lib/api/scryfall-client.ts`, `src/lib/api/card-service.ts` (includes fuzzy matching) |
| **Understand deck types** | `src/lib/types/deck.ts` (discriminated union: CommanderDeck, CubeDeck, StandardDeck, ModernDeck) |
| **Modify statistics** | `src/lib/utils/deck-statistics.ts`, `src/lib/components/Statistics.svelte` |
| **Change import/export** | `src/routes/+page.svelte` → export handlers, `src/lib/utils/decklist-parser.ts` |
| **Modify maybeboard** | `src/lib/components/Maybeboard.svelte`, `src/lib/utils/maybeboard-manager.ts` |
| **Update diff/buylist** | `src/lib/utils/diff.ts`, `src/lib/components/BuylistModal.svelte` |
| **Work with z-index layering** | `src/lib/constants/z-index.ts` - centralized z-index constants for consistent UI layering |
| **Understand project goals** | `project/PRD.md` for full product requirements |
| **See what's implemented** | `project/TASKS.md` for task status |
| **Test a feature** | `project/VERIFICATION_GUIDE.md` for testing checklists |

### Icon Libraries

**Mana Font** (https://mana.andrewgioia.com/):
- Use `ManaSymbol.svelte` component for mana costs
- Direct usage: `<i class="ms ms-w ms-cost ms-shadow"></i>`
- Classes: `ms`, `ms-cost`, `ms-shadow`, `ms-{color}`, `ms-{0-20}`, `ms-x`
- Hybrid: `ms-wu`, `ms-ub`, `ms-br`, `ms-rg`, `ms-gw`

**Keyrune** (https://keyrune.andrewgioia.com/):
- Used for set symbols with rarity
- Usage: `<i class="ss ss-cmm ss-rare ss-grad ss-2x"></i>`
- Classes: `ss`, `ss-{set}`, `ss-{rarity}`, `ss-grad`, `ss-{2-6}x`

### Theme System

**Quick Commands:**
```bash
pnpm theme:list       # List available color schemes
pnpm theme:generate   # Apply theme from theme-config.json
```

**Documentation:**
- `theme/QUICK-REFERENCE.md` - ⭐ Color usage patterns (start here)
- `theme/README.md` - Quick start guide
- `theme/THEMES.md` - Available themes showcase
- `theme/INTEGRATION.md` - How the system works

**Color Variables:**
Use semantic color tokens in components:
```svelte
<div class="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
  <h1 class="text-[var(--color-accent-blue)]">Heading</h1>
</div>
```

See `theme/QUICK-REFERENCE.md` for the full list of available color tokens.

### Z-Index Layering System

Centralized z-index constants in `src/lib/constants/z-index.ts` ensure consistent UI layering:
- **Content (0-99)**: Card stacks (1), active cards (20), dropdowns (50)
- **Overlays (100-999)**: Context menus (100)
- **Modals (1000-9998)**: All modals (1000)
- **Tooltips (9999)**: Always on top

**Key Rules:**
- Import from `src/lib/constants/z-index.ts`, don't use arbitrary values
- Stack cards use **fixed z-index** (DOM order handles visual stacking, not variable z-index)
- All modals use `z-[1000]` to stay above content/overlays

## Svelte 5 Runes

This project uses **Svelte 5 Runes** for reactivity. Runes are compiler symbols using function syntax that provide universal, fine-grained reactivity.

### Core Runes Reference

#### `$state` - Reactive State
Declares reactive variables. Replaces implicit `let` reactivity from Svelte 4.

```javascript
let count = $state(0);
let user = $state({ name: 'Alice', age: 30 });
```

**When to use:** For any mutable state that should trigger reactivity when changed.

**🚨 CRITICAL WARNING - VERY IMPORTANT:**
In Svelte 5 runes mode, regular `let` variables are **NOT REACTIVE**. Once you use any rune in a component (`$props()`, `$state()`, `$derived()`, `$effect()`), the component enters "runes mode" and regular `let` declarations will not trigger reactivity.

**❌ WRONG - This will NOT update the UI:**
```javascript
let modalOpen = false; // Regular let - NOT REACTIVE in runes mode!
let selectedCard: Card | null = null; // NOT REACTIVE!

function openModal(card: Card) {
  selectedCard = card; // State changes but UI won't update!
  modalOpen = true; // State changes but UI won't update!
}
```

**✅ CORRECT - This WILL update the UI:**
```javascript
let modalOpen = $state(false); // Reactive in runes mode
let selectedCard = $state<Card | null>(null); // Reactive in runes mode

function openModal(card: Card) {
  selectedCard = card; // UI updates!
  modalOpen = true; // UI updates!
}
```

**Why this matters:**
- Regular `let` variables in runes mode are just plain JavaScript variables
- Changing them will NOT trigger Svelte's reactivity system
- `{#if modalOpen}` blocks will NOT react to changes in regular `let` variables
- This causes silent failures where state changes but the UI doesn't update
- **ALWAYS use `$state()` for any variable that controls rendering or needs to trigger reactivity**

#### `$derived` - Computed Values
Creates values that automatically update when dependencies change.

```javascript
let count = $state(0);
const doubled = $derived(count * 2);
const isEven = $derived(count % 2 === 0);
```

**When to use:** For computed values based on reactive state. Use instead of Svelte 4's `$:` labels.

#### `$effect` - Side Effects
Runs code when reactive values change. Replaces lifecycle functions.

```javascript
$effect(() => {
  console.log('Count changed to:', count);
  document.title = `Count: ${count}`;
});

// Cleanup function
$effect(() => {
  const interval = setInterval(() => {...}, 1000);
  return () => clearInterval(interval);
});

// Before DOM updates
$effect.pre(() => {
  // Runs before the DOM updates
});
```

**When to use:** For side effects like logging, setting timers, or DOM manipulation. Use `$effect.pre()` for actions before DOM updates.

#### `$props` - Component Props
Declares component props. Replaces `export let` from Svelte 4.

```javascript
interface Props {
  name: string;
  age?: number;
  onUpdate?: (value: string) => void;
}

let { name, age = 25, onUpdate }: Props = $props();

// With renaming
let { class: className, ...rest } = $props();
```

**When to use:** Always use `$props()` for receiving component properties in Svelte 5.

#### `$bindable` - Two-Way Binding
Allows parent components to bind to a prop.

```javascript
let { value = $bindable() } = $props();
```

**When to use:** When a component needs to expose a value that can be bound with `bind:` directive.

### Migration from Svelte 4

**Svelte 4 Pattern:**
```javascript
// Props
export let count = 0;
export let name;

// Reactive declarations
$: doubled = count * 2;

// Reactive statements
$: {
  console.log(count);
  updateTitle();
}

// Lifecycle
import { onMount, afterUpdate } from 'svelte';
onMount(() => {...});
afterUpdate(() => {...});
```

**Svelte 5 with Runes:**
```javascript
// Props
let { count = 0, name } = $props();

// Derived values
const doubled = $derived(count * 2);

// Effects
$effect(() => {
  console.log(count);
  updateTitle();
});

// Lifecycle equivalents
$effect(() => {
  // onMount equivalent
  return () => {
    // onDestroy equivalent
  };
});

$effect(() => {
  // afterUpdate equivalent - runs after each reactive change
});
```

### Mixing Runes and Legacy Syntax

**IMPORTANT:** Svelte 5 supports both rune-based and legacy syntax. You can gradually migrate:
- Components can mix legacy components with rune-based components
- **However**, within a single component, once you use any rune, the component enters "runes mode"
- In runes mode, legacy patterns (`export let`, implicit `let` reactivity, `$:`) are not allowed

**Best Practice for This Project:**
- Use runes for all new components
- When editing existing legacy components, consider migrating them to runes
- If you see `export let isOpen = false`, convert to `let { isOpen = false } = $props()`
- If you see reactive `let` declarations, convert to `$state()`
- Replace `$:` with `$derived` for computations or `$effect` for side effects
- **CRITICAL:** When consuming Svelte stores in runes mode, use `$state` + `$effect` subscription pattern (see "Working with Svelte Stores in Runes Mode" section below)
- **🚨 CRITICAL:** In runes mode, ALL state variables that control rendering MUST use `$state()`. Regular `let` variables are NOT reactive and will cause silent UI update failures!

### Common Patterns

**Modal State (CRITICAL - Common Mistake):**
```javascript
// ❌ WRONG - Will not work in runes mode
let modalOpen = false;
let selectedItem: Item | null = null;

// ✅ CORRECT - Use $state()
let modalOpen = $state(false);
let selectedItem = $state<Item | null>(null);

function openModal(item: Item) {
  selectedItem = item;
  modalOpen = true;
}

// In template:
{#if modalOpen && selectedItem}
  <Modal item={selectedItem} onClose={() => modalOpen = false} />
{/if}
```

**Reactive Object:**
```javascript
let user = $state({ name: 'Alice', count: 0 });
user.count += 1; // Triggers reactivity
```

**Conditional Derivation:**
```javascript
const message = $derived(
  count > 10 ? 'High' : count > 5 ? 'Medium' : 'Low'
);
```

**Async Effects:**
```javascript
$effect(() => {
  async function fetchData() {
    const response = await fetch(`/api/data/${id}`);
    data = await response.json();
  }
  fetchData();
});
```

**Form State:**
```javascript
let formData = $state({
  name: '',
  email: '',
  message: ''
});

const isValid = $derived(
  formData.name.length > 0 &&
  formData.email.includes('@')
);
```

### Working with Svelte Stores in Runes Mode

**CRITICAL:** When using Svelte 5 runes in components that consume Svelte stores, you **MUST NOT** use the `$store` auto-subscription syntax with reactive declarations (`$:`). This will cause reactivity issues.

**❌ WRONG - Do not use this pattern:**
```javascript
import { myStore } from './stores';

// BAD: Using $: with $store in runes mode
$: value = $myStore?.someProperty;
```

**✅ CORRECT - Use this pattern instead:**
```javascript
import { myStore } from './stores';

// Create a reactive state to hold store value
let storeState = $state($myStore);

// Subscribe to store updates using $effect
$effect(() => {
  const unsubscribe = myStore.subscribe(value => {
    storeState = value;
  });
  return unsubscribe; // Cleanup on component destroy
});

// Derive values from the store state
let value = $derived(storeState?.someProperty);
```

**Why this matters:**
- In Svelte 5 runes mode, `$:` reactive statements don't properly track store updates
- Using `$state` + `$effect` + `$derived` ensures proper reactivity
- The `$effect` cleanup function (return value) automatically unsubscribes when the component is destroyed

**Example - Component consuming a deck store:**
```javascript
import { deckStore } from '$lib/stores/deck-store';

// Props using runes
let { onCardHover = undefined } = $props();

// Store subscription
let deckStoreState = $state($deckStore);

$effect(() => {
  const unsubscribe = deckStore.subscribe(value => {
    deckStoreState = value;
  });
  return unsubscribe;
});

// Derived values
let deck = $derived(deckStoreState?.deck);
let isEditing = $derived(deckStoreState?.isEditing ?? false);
let cardCount = $derived(deck?.cardCount || 0);
```

## Svelte 5 Snippets

**🚨 CRITICAL:** Snippets replace slots in Svelte 5. You **CANNOT** mix `<slot>` and `{@render}` syntax in the same component.

### What Are Snippets?

Snippets are reusable chunks of markup that can be passed around and rendered. They replace the slot system from Svelte 4 with a more powerful and flexible API.

### Default Slot → `children` Snippet

In Svelte 4, the default slot was used with `<slot />`. In Svelte 5, this becomes the `children` snippet prop.

**❌ Svelte 4 (OLD - Don't use):**
```svelte
<script>
  // Component that accepts content
</script>

<div class="wrapper">
  <slot />
</div>
```

**✅ Svelte 5 (CORRECT):**
```svelte
<script lang="ts">
  import { type Snippet } from 'svelte';

  let { children }: { children?: Snippet } = $props();
</script>

<div class="wrapper">
  {#if children}
    {@render children()}
  {/if}
</div>
```

**Usage:**
```svelte
<Wrapper>
  <p>This content becomes the children snippet</p>
</Wrapper>
```

### Named Slots → Named Snippet Props

Named slots become named snippet props.

**Svelte 5:**
```svelte
<script lang="ts">
  let { header, children }: { header?: Snippet; children?: Snippet } = $props();
</script>

{#if header} {@render header()} {/if}
{#if children} {@render children()} {/if}

<!-- Usage -->
<Component>
  {#snippet header()}<span>Title</span>{/snippet}
  <p>Content here</p>
</Component>
```

### Snippets with Parameters (Slot Props)

Snippets can accept parameters: `Snippet<[param1: Type, param2: Type]>`

```svelte
<!-- Component -->
<script lang="ts">
  let { row }: { row: Snippet<[item: any, index: number]> } = $props();
</script>
{#each items as item, i}
  {@render row(item, i)}
{/each}

<!-- Usage -->
<Table>
  {#snippet row(user, index)}
    <td>{user.name}</td>
  {/snippet}
</Table>
```

### Common Patterns

**Component with optional snippets:**
```svelte
<script lang="ts">
  import { type Snippet } from 'svelte';
  let { header, children }: { header?: Snippet; children?: Snippet } = $props();
</script>

{#if header} {@render header()} {/if}
{#if children} {@render children()} {/if}
```

### Critical Rules

**🚨 NEVER mix `<slot>` and `{@render}` in the same component:**

**❌ WRONG - This will cause a compilation error:**
```svelte
<script lang="ts">
  import { type Snippet } from 'svelte';
  let { trigger }: { trigger?: Snippet } = $props();
</script>

{#if trigger}
  {@render trigger()}
{:else}
  <slot />  <!-- ERROR: Cannot mix slot and render -->
{/if}
```

**✅ CORRECT - Use snippets exclusively:**
```svelte
<script lang="ts">
  import { type Snippet } from 'svelte';
  let {
    trigger,
    children
  }: {
    trigger?: Snippet;
    children?: Snippet;
  } = $props();
</script>

{#if trigger}
  {@render trigger()}
{:else if children}
  {@render children()}
{/if}
```

### Key Takeaways

1. **Default slot** → `children` snippet prop
2. **Named slots** → Named snippet props
3. **Slot props** → Snippet parameters with type `Snippet<[param1: Type, param2: Type]>`
4. **Always import** `type Snippet` from 'svelte'
5. **Never mix** `<slot>` and `{@render}` in the same component
6. **Always check** if snippet exists before rendering: `{#if children} {@render children()} {/if}`
7. **Use optional chaining** when unsure: `{@render children?.()}`

## Multi-Format System

Jitte supports **4 Magic: The Gathering formats**: Commander, Cube, Standard, and Modern. The architecture uses a factory pattern with format-specific services to keep code DRY while supporting format-specific behavior.

### Supported Formats

| Format | Card Limit | Singleton | Key Rules |
|--------|-----------|-----------|-----------|
| **Commander** | Exactly 100 | Yes | 1-2 commanders, color identity validation, banned list, partner rules |
| **Cube** | No limit | No | Color-based categorization, no ban list, custom draft environment |
| **Standard** | Min 60 | No | 4-of rule, rotating ban list, current sets only |
| **Modern** | Min 60 | No | 4-of rule, format-specific ban list |

**See:** `src/lib/formats/format-registry.ts` (DeckFormat enum, FORMAT_METADATA)

### Format System Architecture

The format system is built on three main concepts:

#### 1. Format Registry
Central source of truth for format metadata and UI configuration.

```typescript
// src/lib/formats/format-registry.ts
export enum DeckFormat {
  Commander = 'commander',
  Cube = 'cube',
  Standard = 'standard',
  Modern = 'modern'
}

export const FORMAT_METADATA: Record<DeckFormat, FormatMetadata> = {
  [DeckFormat.Commander]: {
    name: 'Commander / EDH',
    description: '100-card singleton format with legendary commander',
    // ...
  },
  // ...
}
```

#### 2. Rulesets (Validation)
Each format has a ruleset implementing the `FormatRuleset` interface.

**Key files:**
- `src/lib/formats/ruleset.ts` - Interface definition
- `src/lib/formats/ruleset-factory.ts` - Singleton factory: `RulesetFactory.getRuleset(format)`
- `src/lib/formats/rulesets/` - Format-specific implementations

**Usage:**
```typescript
import { RulesetFactory } from '$lib/formats/ruleset-factory';

const ruleset = RulesetFactory.getRuleset(deck.format);
const validation = ruleset.validateDeck(deck);
const canAdd = ruleset.validateCardAddition(deck, card);
```

**What rulesets handle:**
- Deck size validation (min/max/exact)
- Card copy limits (4-of rule, singleton)
- Banned card checking (via BanListService)
- Commander count & color identity (Commander only)
- Partner compatibility (Commander only)

#### 3. Format Services (Categorization & Stats)
Services handle format-specific categorization and statistics.

**Key files:**
- `src/lib/formats/services/format-service.ts` - Interface definition
- `src/lib/formats/services/format-service-factory.ts` - Singleton factory: `getFormatService(format)`
- `src/lib/formats/services/commander-service.ts` - Commander/Standard/Modern service
- `src/lib/formats/services/cube-service.ts` - Cube service

**Usage:**
```typescript
import { getFormatService } from '$lib/formats/services/format-service-factory';

const service = getFormatService(deck.format);
const category = service.categorizeCard(card, deck);
const stats = service.calculateStatistics(deck);
```

**What services handle:**
- Card categorization (type-based for Commander, color-based for Cube)
- Statistics calculation
- Format-specific display logic

### Categorization Systems

**Commander/Standard/Modern** (type-based):
- Categories: Commander, Companion, Planeswalker, Creature, Instant, Sorcery, Artifact, Enchantment, Land, Other
- See: `src/lib/formats/categorization/commander-categories.ts`

**Cube** (color-based):
- Categories: White, Blue, Black, Red, Green, Colorless, Multicolored, Lands
- See: `src/lib/formats/categorization/cube-categories.ts`

### Deck Type System

Decks use a **discriminated union** in TypeScript:

```typescript
// src/lib/types/deck.ts
export type Deck = CommanderDeck | CubeDeck | StandardDeck | ModernDeck;

// All extend BaseDeck with format-specific fields:
export interface CommanderDeck extends BaseDeck {
  format: DeckFormat.Commander;
  colorIdentity: ManaColor[];
  // ...
}

export interface CubeDeck extends BaseDeck {
  format: DeckFormat.Cube;
  // No additional fields
}

// Type guards available:
export function isCommanderDeck(deck: Deck): deck is CommanderDeck;
export function isCubeDeck(deck: Deck): deck is CubeDeck;
// ...
```

### Working with Formats in Components

Format-agnostic components accept a `format` prop and use format services:

```svelte
<script lang="ts">
  import { getFormatService } from '$lib/formats/services/format-service-factory';
  import type { DeckFormat } from '$lib/formats/format-registry';

  let { format, deck }: { format: DeckFormat; deck: Deck } = $props();

  // Get format-specific service
  const formatService = getFormatService(format);

  // Use service for categorization
  const categorizedCards = $derived(
    deck.cards.map(card => ({
      ...card,
      category: formatService.categorizeCard(card, deck)
    }))
  );
</script>
```

**Examples:**
- `src/lib/components/ListEditNav.svelte` - Shows format-specific stats (Cube: color breakdown, Commander: type distribution)
- `src/lib/components/ListView.svelte` - Uses FormatService for categorization
- `src/lib/components/FormatBadge.svelte` - Displays FORMAT_METADATA

### Adding a New Format

1. Add format to `DeckFormat` enum in `format-registry.ts`
2. Add metadata to `FORMAT_METADATA` in `format-registry.ts`
3. Create ban list in `src/lib/formats/ban-lists/your-format.ts`
4. Create ruleset in `src/lib/formats/rulesets/your-format-ruleset.ts`
5. Create or reuse service in `src/lib/formats/services/`
6. Update factories: `RulesetFactory.getRuleset()` and `getFormatService()`
7. Add deck type to discriminated union in `src/lib/types/deck.ts`

## Key Architecture Concepts

### Storage System
Decks are stored as `.zip` files with this structure:
```
deck-name.zip
├── manifest.json              # Deck metadata (format, branches, versions)
├── maybeboard.json            # Shared maybeboard
├── main/
│   ├── v0.0.1.json           # JSON format (current)
│   ├── v1.0.0.txt            # Legacy plaintext format
│   └── metadata.json         # Per-version metadata
└── experimental/
    └── ...
```

**Manifest includes:**
- `format: DeckFormat` - Identifies which format the deck uses
- Branch metadata and version history
- Stash data (one per branch)
- App version and versioning scheme

**See:** `src/lib/storage/` for implementation, `src/lib/utils/zip.ts` for archive operations, `src/lib/types/deck.ts` (DeckManifest interface)

### Version Control
Git-like branching with semantic versioning (MAJOR.MINOR.PATCH):
- Auto-suggestion based on card change magnitude (1-2 cards = patch, 3-10 = minor, 10+ = major)
- Full snapshot per version (no diffs stored)
- Stash system (one per branch)

**See:** `src/lib/utils/version-control.ts`, `src/lib/utils/semver.ts`, `src/lib/utils/stash.ts`

### Card Categorization (Format-Dependent)

**Commander/Standard/Modern** (type-based ordering):
1. Commander → 2. Companion → 3. Planeswalkers → 4. Creatures → 5. Instants → 6. Sorceries → 7. Artifacts → 8. Enchantments → 9. Lands → 10. Other

**Cube** (color-based ordering):
1. White → 2. Blue → 3. Black → 4. Red → 5. Green → 6. Colorless → 7. Multicolored → 8. Lands

**See:** `src/lib/formats/categorization/` for format-specific categorization, `src/lib/types/card.ts` (CardCategory and CubeCardCategory enums)

### State Management
4 Svelte stores:
- `deck-store.ts` - Current working deck (addCard, removeCard, updateQuantity, etc.)
- `deck-manager.ts` - Deck persistence & lifecycle (load, save, createBranch, etc.)
- `themeStore.ts` - Theme state (light/dark mode)
- `toast-store.ts` - Toast notifications

**See:** `src/lib/stores/`

### API Integration
- Scryfall API with 100ms rate limiting (configurable)
- Autocomplete (min 2 characters)
- Batch card fetching (max 75 cards)
- **Fuzzy matching** for alternate card names and split/adventure cards (e.g., "Fire // Ice")
- IndexedDB caching (prepared but not fully wired up)

**See:** `src/lib/api/scryfall-client.ts`, `src/lib/api/card-service.ts` (fuzzy matching in getCardByName), `src/lib/api/rate-limiter.ts`

### Validation & Statistics

**Validation (Format-Specific):**
- Deck size (exact 100 for Commander, min 60 for Standard/Modern, no limit for Cube)
- Banned cards detection (format-specific ban lists)
- Card copy limits (singleton for Commander, 4-of rule for Standard/Modern)
- Color identity validation (Commander only)
- Partner compatibility (Commander only: Partner, Partner With, Friends Forever, Choose a Background)

**Statistics:**
- Mana curve (split by permanents/spells)
- Color distribution
- Type/color breakdown (format-dependent)
- Average/median CMC
- Price tracking (3 vendors: CardKingdom, TCGPlayer, Manapool)
- Commander bracket level (1-4) with Game Changer detection (68 cards) - Commander only

**See:**
- Validation: `src/lib/formats/rulesets/`, `src/lib/utils/deck-validation.ts`, `src/lib/utils/partner-detection.ts`
- Statistics: `src/lib/utils/deck-statistics.ts`, `src/lib/utils/game-changers.ts`
- Ban lists: `src/lib/formats/ban-lists/`

## Development Workflow

**Commands:**
```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm check            # Type-check with svelte-check
pnpm format           # Format with Biome
pnpm lint             # Lint with Biome
pnpm test             # Run tests (Vitest)
pnpm theme:list       # List available color schemes
pnpm theme:generate   # Apply theme from theme-config.json
```

**IMPORTANT FOR CLAUDE CODE**: Never start dev servers or long-running commands automatically. Only run quick verification commands like `pnpm check`.
