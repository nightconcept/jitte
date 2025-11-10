# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jitte** is a local-first web application for managing Magic: The Gathering Commander/EDH decklists with git-style version control, branching, diff tracking, and export capabilities to popular deck-building platforms.

### Tech Stack
- **Framework**: SvelteKit with Svelte 5 (using Runes)
- **Styling**: Tailwind CSS
- **Storage**: Browser localStorage + FileSystem API
- **APIs**: Scryfall (primary), MTG API (secondary fallback)
- **Caching**: IndexedDB for card images and bulk data

### Icon Libraries
This project uses two specialized icon libraries for Magic: The Gathering:

#### Mana Font (https://mana.andrewgioia.com/)
Used for rendering mana symbols and color identity.

**Usage with ManaSymbol component:**
```svelte
import ManaSymbol from '$lib/components/ManaSymbol.svelte';

<!-- Display mana cost -->
{#if card.mana_cost}
  <ManaSymbol cost={card.mana_cost} size="lg" />
{/if}
```

**Direct usage for color identity:**
```svelte
<!-- Display color identity -->
{#each card.colorIdentity as color}
  <i class="ms ms-{color.toLowerCase()} ms-cost ms-shadow text-lg" title={color}></i>
{/each}
```

**Available classes:**
- Base: `ms` (required)
- Cost style: `ms-cost` (for mana symbols)
- Shadow: `ms-shadow` (adds depth)
- Sizes: `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`
- Symbols: `ms-w`, `ms-u`, `ms-b`, `ms-r`, `ms-g`, `ms-c`, `ms-0` through `ms-20`, `ms-x`, etc.
- Hybrid: `ms-wu`, `ms-ub`, `ms-br`, `ms-rg`, `ms-gw`, etc.
- Phyrexian: `ms-wp`, `ms-up`, `ms-bp`, `ms-rp`, `ms-gp`

#### Keyrune (https://keyrune.andrewgioia.com/)
Used for rendering Magic set symbols.

**Usage:**
```svelte
<!-- Display set symbol with rarity -->
<i class="ss ss-{set.toLowerCase()} ss-{rarity} ss-grad ss-2x"
   title="{setName} - {rarity}">
</i>

<!-- Full set information display -->
<div class="flex items-center gap-2">
  <i class="ss ss-cmm ss-rare ss-grad ss-2x" title="Commander Masters - rare"></i>
  <span>Commander Masters (CMM) #123</span>
</div>
```

**Available classes:**
- Base: `ss` (required)
- Set code: `ss-{set}` (e.g., `ss-cmm`, `ss-ltr`, `ss-woe`)
- Rarity: `ss-common`, `ss-uncommon`, `ss-rare`, `ss-mythic`
- Gradient: `ss-grad` (adds color gradient based on rarity)
- Sizes: `ss-2x`, `ss-3x`, `ss-4x`, `ss-5x`, `ss-6x`

**Best practices:**
- Always include set name and rarity in the title attribute for accessibility
- Use `ss-grad` with rarity classes for colored symbols
- Always display full set information: set name, set code (uppercase), and collector number
- Example: "Commander Masters (CMM) #123" not just "CMM #123"

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

### Version Control System
The application implements a git-like version control system for MTG decks:
- **Semantic versioning** (MAJOR.MINOR.PATCH) with auto-suggestion based on card change magnitude
- **Branching support** with "main" as default branch
- **Commit system** storing full snapshots per version
- **Stash system** auto-saves every 60 seconds with one stash per branch

### Storage Structure
Decks are stored as `.zip` files with this internal structure:
```
deck-name.zip
├── manifest.json              # Deck metadata, branch info
├── maybeboard.json            # Shared across all revisions
├── main/
│   ├── v1.0.0.txt            # Full decklist snapshots
│   ├── v1.1.0.txt
│   └── metadata.json         # Per-version commit messages, timestamps
├── experimental/
│   ├── v1.0.0.txt
│   └── metadata.json
└── stash.json                # Per-branch unsaved changes
```

Decklists use plaintext format compatible with Moxfield/MTGGoldfish:
```
1 Lightning Bolt
1 Sol Ring (2XM) 97
```

### Data Flow
1. **localStorage** for settings and temporary work before first save
2. **FileSystem API** for persistent deck storage in user-selected directory
3. **IndexedDB** for card image cache and optional bulk Scryfall data
4. **Scryfall API** with 100ms rate limiting (configurable) for card search and metadata

### Card Type Ordering
Cards are always displayed in this canonical order:
1. Commander
2. Companion (if present)
3. Planeswalkers
4. Creatures
5. Instants
6. Sorceries
7. Artifacts
8. Enchantments
9. Lands

### Maybeboard System
- Shared across all versions of a deck (not versioned per branch)
- Supports user-created categories (e.g., "Burn Package", "Ramp")
- Cards can be moved between maybeboard categories and main deck

## Development Commands

**IMPORTANT FOR CLAUDE CODE**: Never start dev servers, build processes, or long-running commands automatically. Always prompt the user to run these commands themselves. Only run quick verification commands like `pnpm check` or file system operations.

Once the SvelteKit project is initialized, typical commands will be:

### Development
```bash
npm run dev              # Start dev server
npm run dev -- --open    # Start dev server and open browser
```

### Building
```bash
npm run build           # Build for production
npm run preview         # Preview production build locally
```

### Testing
```bash
npm run test            # Run test suite (when implemented)
npm run test:unit       # Run unit tests (when implemented)
```

### Linting & Formatting
```bash
npm run lint            # Run ESLint
npm run format          # Run Prettier
npm run check           # Run svelte-check for TypeScript/component errors
```

## Important Implementation Notes

### Scryfall API Integration
- **Rate limit**: 100ms between requests (enforced via queue/delay)
- **Bulk data option**: Download entire Scryfall database to IndexedDB (user opt-in)
- Download ALL cards, not just Commander-legal (rules change over time)
- **Caching**: 24-hour cache for card data, daily price updates

### Semver Auto-suggestion Logic
Default thresholds (configurable in settings):
- 1-2 cards changed → Patch (0.0.x)
- 3-10 cards changed → Minor (0.x.0)
- 10+ cards changed → Major (x.0.0)

### Commander Validation Warnings
Show non-blocking warnings (⚠️ icon) for:
- Banned cards in Commander format
- Deck size ≠ 100 cards
- Duplicate cards (including non-basic lands)
- Cards outside commander's color identity

### Performance Requirements
- Deck list rendering: < 100ms for 100-card decks
- Search results: < 200ms after 4 characters typed
- Lazy load and aggressively cache images

### Browser Compatibility
- Primary: Chrome, Edge, Opera (FileSystem API support)
- Fallback: localStorage-only mode for other browsers

## File Naming & Cross-Platform Compatibility
Deck zip files must be sanitized for Windows/Mac/Linux filesystem compatibility. Special characters should be converted or removed to ensure portability.

## Export Formats
1. **Plaintext** (clipboard)
2. **Moxfield** (new tab with `import?=` parameters)
3. **Archidekt** (new tab with `sandbox?deck=` parameters)
4. **Buylist/Diff** (clipboard with price information)

## Import Sources
1. Moxfield/Archidekt URLs (parse and create local deck)
2. Plaintext paste (Arena/MTGO format)
3. Zip files (import with version history)

## Statistics & Analysis
Implement Moxfield-parity statistics:
- Mana curve (CMC distribution chart)
- Color distribution (pie chart of mana symbols)
- Card type breakdown (percentage by type)
- Average CMC
- Mana source analysis (sources per color)
- Land count with recommendations

Display below main deck list with collapsible sections that update in real-time.

## UI/UX Principles
- **1080p optimized**: Minimal scrolling on standard displays
- **Card preview pane**: Left side, shows hovered card (defaults to commander)
- **Search activation**: Only trigger after 4 characters typed
- **Top 10 results**: 11th row links to "Search for more on Scryfall"
- **Auto-stash**: Every 60 seconds
- **Prompt on reload**: Option to load stash or last saved version
- **Prompt on branch switch**: Save or discard unsaved changes

## Task Management & Verification

When working on this project, Claude Code must:

### Task Tracking (TASKS.md)
1. **Update TASKS.md at the end of each phase** with completion status
2. Check off completed items with [x]
3. Add any discovered subtasks or issues that need addressing
4. Update verification checklists as tasks are completed

### Automated Verification
For verification tasks in TASKS.md that **do not require human visual inspection**, Claude Code must perform these checks automatically:

**Automated Checks (DO THESE):**
- File existence checks (e.g., "Verify package.json exists")
- Package dependency verification (e.g., "Check that tailwindcss is in devDependencies")
- Command execution verification (e.g., "Run `pnpm check` and verify no errors")
- TypeScript compilation checks (e.g., "Run `pnpm check` to verify types compile")
- Test execution (e.g., "Run `pnpm test` and verify all tests pass")
- Code structure verification (e.g., "Check that function exists in file")
- Configuration validation (e.g., "Verify config file has required settings")
- Build process checks (e.g., "Run `pnpm build` and verify success")

**Manual Checks (SKIP THESE):**
- Browser visual inspection (e.g., "Visit http://localhost:5173 and confirm page loads")
- UI/UX validation (e.g., "Verify Tailwind classes work by inspecting styled elements")
- Interactive testing (e.g., "Test HMR by editing a file")
- Visual design verification (e.g., "Check responsive design")

### Phase Completion Protocol
At the end of each phase:
1. Run all automated verification checks for that phase
2. Update TASKS.md with [x] for completed items
3. Document any issues or blockers discovered
4. List verification items that require manual testing for the user
5. Commit the updated TASKS.md
