# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jitte** is a local-first web application for managing Magic: The Gathering Commander/EDH decklists with git-style version control, branching, diff tracking, and export capabilities to popular deck-building platforms.

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
│   │   ├── components/       # 47 Svelte components (all using Runes)
│   │   ├── storage/          # Storage layer (FileSystem + localStorage)
│   │   ├── stores/           # Svelte stores (4 total)
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # 26 utility modules
│   └── routes/               # SvelteKit routes (+page.svelte)
├── theme/                    # Base16/Base24 theme system
├── project/                  # Documentation (PRD, TASKS, VERIFICATION)
└── examples/                 # Example deck files
```

### Where to Look for Features

| I want to... | Look here |
|--------------|-----------|
| **Work with themes** | `theme/QUICK-REFERENCE.md` for color usage, `theme/README.md` for setup |
| **Understand version control** | `src/lib/utils/version-control.ts`, `src/lib/utils/semver.ts` |
| **Modify deck operations** | `src/lib/stores/deck-store.ts` (current working deck) |
| **Add/modify storage** | `src/lib/storage/storage-manager.ts` |
| **Work with Scryfall API** | `src/lib/api/scryfall-client.ts`, `src/lib/api/card-service.ts` |
| **Understand card types** | `src/lib/types/card.ts`, `src/lib/types/deck.ts` |
| **Modify statistics** | `src/lib/utils/deck-statistics.ts`, `src/lib/components/Statistics.svelte` |
| **Update validation** | `src/lib/utils/deck-validation.ts`, `src/lib/utils/partner-detection.ts` |
| **Change import/export** | `src/routes/+page.svelte` → export handlers, `src/lib/utils/decklist-parser.ts` |
| **Modify maybeboard** | `src/lib/components/Maybeboard.svelte`, `src/lib/utils/maybeboard-manager.ts` |
| **Update diff/buylist** | `src/lib/utils/diff.ts`, `src/lib/components/BuylistModal.svelte` |
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

## Key Architecture Concepts

### Storage System
Decks are stored as `.zip` files with this structure:
```
deck-name.zip
├── manifest.json              # Deck metadata, branches, versions
├── maybeboard.json            # Shared maybeboard
├── main/
│   ├── v0.0.1.json           # JSON format (current)
│   ├── v1.0.0.txt            # Legacy plaintext format
│   └── metadata.json         # Per-version metadata
└── experimental/
    └── ...
```

**See:** `src/lib/storage/` for implementation, `src/lib/utils/zip.ts` for archive operations

### Version Control
Git-like branching with semantic versioning (MAJOR.MINOR.PATCH):
- Auto-suggestion based on card change magnitude (1-2 cards = patch, 3-10 = minor, 10+ = major)
- Full snapshot per version (no diffs stored)
- Stash system (one per branch)

**See:** `src/lib/utils/version-control.ts`, `src/lib/utils/semver.ts`, `src/lib/utils/stash.ts`

### Card Type Ordering
Canonical order for display:
1. Commander → 2. Companion → 3. Planeswalkers → 4. Creatures → 5. Instants → 6. Sorceries → 7. Artifacts → 8. Enchantments → 9. Lands → 10. Other

**See:** `src/lib/utils/deck-categorization.ts`, `src/lib/types/card.ts` (CardCategory enum)

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
- IndexedDB caching (prepared but not fully wired up)

**See:** `src/lib/api/scryfall-client.ts`, `src/lib/api/card-service.ts`, `src/lib/api/rate-limiter.ts`

### Validation & Statistics
**Validation:**
- Deck size (100 cards for Commander)
- Banned cards detection
- Color identity validation
- Duplicate detection
- Partner compatibility (Partner, Partner With, Friends Forever, Choose a Background)

**Statistics:**
- Mana curve (split by permanents/spells)
- Color distribution
- Type breakdown
- Average/median CMC
- Price tracking (3 vendors: CardKingdom, TCGPlayer, Manapool)
- Commander bracket level (1-4) with Game Changer detection (68 cards)

**See:** `src/lib/utils/deck-validation.ts`, `src/lib/utils/partner-detection.ts`, `src/lib/utils/deck-statistics.ts`, `src/lib/utils/game-changers.ts`

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
