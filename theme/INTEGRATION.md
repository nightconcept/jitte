# Integration Guide

## Step 1: Import into Tailwind Config

Edit your `tailwind.config.js`:

```javascript
import themeColors from './theme/tailwind-colors.js';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class', // Enable dark mode via class
  theme: {
    extend: {
      colors: themeColors.theme.extend.colors
    }
  }
};
```

## Step 2: Import CSS Variables (Optional)

If you want to use CSS custom properties instead:

```css
/* src/app.css */
@import '../theme/theme.css';
```

Then use like:

```svelte
<div style="background-color: var(--base-0); color: var(--base-5)">
  <h1 style="color: var(--accent-blue)">Hello</h1>
</div>
```

## Step 3: Dark Mode Toggle

```svelte
<script lang="ts">
  let darkMode = $state(true);

  function toggleTheme() {
    darkMode = !darkMode;
    document.documentElement.classList.toggle('theme-light', !darkMode);
  }
</script>

<button onclick={toggleTheme}>
  {darkMode ? '☀️ Light' : '🌙 Dark'}
</button>
```

## Available Classes

### Backgrounds
- `bg-base-0` - Main background (#111 dark, #f1f1f1 light)
- `bg-base-1` - Secondary background
- `bg-base-2` - Selection background

### Text
- `text-base-5` - Primary text (#ababab dark, #474747 light)
- `text-base-3` - Muted/comment text
- `text-base-6` - Emphasized text

### Accents
- `text-accent-red` - Errors, deletions
- `text-accent-green` - Success, additions
- `text-accent-blue` - Links, functions
- `text-accent-yellow` - Warnings, highlights
- `text-accent-purple` - Keywords
- `text-accent-cyan` - Support, regex
- `text-accent-orange` - Constants
- `text-accent-magenta` - Special tags

### Brand (Logo)
- `bg-[var(--logo-bg)]` - Rose Pine background
- `text-[var(--logo-jitte)]` - Rose Pine rose color

## Example Component

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import { type Snippet } from 'svelte';

  let {
    title,
    children
  }: {
    title: string;
    children?: Snippet;
  } = $props();
</script>

<div class="bg-base-1 border border-base-2 rounded-lg p-4">
  <h2 class="text-accent-blue text-xl font-bold mb-2">
    {title}
  </h2>
  <div class="text-base-5">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
```

## Switching Themes

To change to a different Base16 theme:

1. Download YAML from https://github.com/tinted-theming/schemes
2. Copy to `theme/schemes/`
3. Edit `theme/theme-config.json`:
   ```json
   {
     "dark": "new-theme-dark",
     "light": "new-theme-light"
   }
   ```
4. Run: `node theme/parse-schemes.js`
5. Colors will update automatically throughout the app

## Adding More Schemes

```bash
# Example: Add Gruvbox theme
cd theme/schemes
wget https://raw.githubusercontent.com/tinted-theming/schemes/main/base16/gruvbox-dark-hard.yaml
wget https://raw.githubusercontent.com/tinted-theming/schemes/main/base16/gruvbox-light-hard.yaml

# Update config
echo '{
  "dark": "gruvbox-dark-hard",
  "light": "gruvbox-light-hard",
  "brand": {
    "logo-bg": "#232136",
    "logo-jitte": "#ea9a97"
  }
}' > ../theme-config.json

# Regenerate
cd ..
node parse-schemes.js
```

That's it! Your entire app will use the new color scheme.
