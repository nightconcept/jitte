# Quick Color Reference

## Base16 Color Map (What We Use)

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKGROUNDS & FOREGROUNDS                │
├─────────────────────────────────────────────────────────────┤
│ base-0  │ Main background          │ bg-base-0              │
│ base-1  │ Lighter background       │ bg-base-1              │
│ base-2  │ Selection background     │ bg-base-2              │
│ base-3  │ Comments, muted          │ text-base-3            │
│ base-4  │ Dark foreground          │ text-base-4            │
│ base-5  │ Main foreground          │ text-base-5  ← PRIMARY │
│ base-6  │ Light foreground         │ text-base-6            │
│ base-7  │ Lightest foreground      │ text-base-7            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      SEMANTIC COLORS                        │
├─────────────────────────────────────────────────────────────┤
│ Red     │ Errors, variables        │ text-accent-red        │
│ Orange  │ Numbers, constants       │ text-accent-orange     │
│ Yellow  │ Classes, warnings        │ text-accent-yellow     │
│ Green   │ Strings, success         │ text-accent-green      │
│ Cyan    │ Regex, support           │ text-accent-cyan       │
│ Blue    │ Functions, links         │ text-accent-blue       │
│ Purple  │ Keywords, storage        │ text-accent-purple     │
│ Magenta │ Deprecated, special      │ text-accent-magenta    │
└─────────────────────────────────────────────────────────────┘
```

## Common Patterns

### Card Component
```svelte
<div class="bg-base-1 border border-base-2 rounded-lg p-4">
  <h2 class="text-accent-blue text-xl">Title</h2>
  <p class="text-base-5">Body text</p>
  <span class="text-base-3 text-sm">Muted info</span>
</div>
```

### Status Indicators
```svelte
<span class="text-accent-green">✓ Success</span>
<span class="text-accent-red">✗ Error</span>
<span class="text-accent-yellow">⚠ Warning</span>
<span class="text-accent-blue">ℹ Info</span>
```

### Syntax Highlighting
```svelte
<code class="bg-base-1 p-2 rounded">
  <span class="text-accent-purple">const</span>
  <span class="text-base-5"> deck = </span>
  <span class="text-accent-blue">loadDeck</span>
  <span class="text-base-5">(</span>
  <span class="text-accent-green">"Commander.zip"</span>
  <span class="text-base-5">);</span>
</code>
```

### Interactive States
```svelte
<!-- Normal -->
<button class="bg-base-2 text-base-5 hover:bg-base-3">
  Click me
</button>

<!-- Primary -->
<button class="bg-accent-blue text-base-0 hover:bg-accent-purple">
  Save
</button>

<!-- Danger -->
<button class="bg-accent-red text-base-0 hover:bg-accent-magenta">
  Delete
</button>
```

### Forms
```svelte
<input
  class="bg-base-1 text-base-5 border border-base-2
         focus:border-accent-blue focus:outline-none"
  placeholder="Search cards..."
/>

<!-- Error state -->
<input
  class="bg-base-1 text-base-5 border border-accent-red"
/>
<span class="text-accent-red text-sm">Card not found</span>
```

### Dark/Light Mode
```svelte
<script>
  let isDark = $state(true);

  $effect(() => {
    document.documentElement.classList.toggle('theme-light', !isDark);
  });
</script>

<!-- Toggle button -->
<button
  onclick={() => isDark = !isDark}
  class="bg-base-2 text-base-5 p-2 rounded"
>
  {isDark ? '☀️' : '🌙'}
</button>
```

## Current Themes Comparison

### Equilibrium Gray (Default)
```
Dark:  #111 bg → #ababab fg (Professional, AAA accessible)
Light: #f1f1f1 bg → #474747 fg
Vibe:  Neutral, corporate, high contrast
```

### Rose Pine
```
Dark:  #191724 bg → #e0def4 fg (Cozy, warm, low contrast)
Light: #faf4ed bg → #575279 fg
Vibe:  Soho vibes, natural pine, artistic
```

### Kanagawa
```
Dark:  #1f1f28 bg → #dcd7ba fg (Earthy, artistic, warm)
Light: (Use Rose Pine Dawn)
Vibe:  Japanese aesthetic, Great Wave inspired
```

### Tokyo Night
```
Dark:  #1a1b26 bg → #a9b1d6 fg (Modern, vibrant, saturated)
Light: #d5d6db bg → #565f89 fg
Vibe:  Neon-inspired, clean, high contrast
```

## Brand Colors (Rose Pine)

```svelte
<!-- Logo always uses Rose Pine regardless of active theme -->
<div class="bg-[var(--logo-bg)]">  <!-- #232136 -->
  <img class="text-[var(--logo-jitte)]" />  <!-- #ea9a97 -->
</div>
```

## Switching Themes

```json
// theme/theme-config.json
{
  "dark": "rose-pine-moon",
  "light": "rose-pine-dawn"
}
```

```bash
node theme/parse-schemes.js
# ✓ Colors update everywhere instantly
```

## Color Theory Tips

**High contrast pairings:**
- bg-base-0 + text-base-5 (primary content)
- bg-base-1 + text-base-6 (emphasized content)

**Low contrast pairings:**
- bg-base-0 + text-base-3 (de-emphasized, muted)
- bg-base-2 + text-base-4 (subtle hover states)

**Never use:**
- bg-base-0 + text-base-0 (invisible!)
- bg-base-7 + text-base-7 (invisible!)

**Accent on neutral:**
- bg-base-0 + text-accent-* (good!)
- bg-accent-* + text-base-0 (good!)

**Accent on accent:**
- bg-accent-blue + text-accent-red (usually bad, low contrast)
- Exception: Complementary colors can work
