# Jitte Theme System

Dynamic color scheme management using Base16/Base24 YAML definitions.

## Quick Start

```bash
# List available schemes
node parse-schemes.js --check

# Generate theme files
node parse-schemes.js

# Generate only Tailwind config
node parse-schemes.js --tailwind

# Generate only CSS variables
node parse-schemes.js --css
```

## Adding New Schemes

1. Download Base16/Base24 YAML from [tinted-theming/schemes](https://github.com/tinted-theming/schemes)
2. Drop the `.yaml` file into `schemes/`
3. Edit `theme-config.json` to set `dark` and `light` scheme IDs
4. Run `node parse-schemes.js` to regenerate

## Configuration

Edit `theme-config.json`:

```json
{
  "dark": "equilibrium-gray-dark",
  "light": "equilibrium-gray-light",
  "brand": {
    "logo-bg": "#232136",
    "logo-jitte": "#ea9a97"
  }
}
```

## Generated Files

- `tailwind-colors.js` - Import into Tailwind config
- `theme.css` - CSS custom properties (optional alternative)

## Usage in Tailwind

```javascript
// tailwind.config.js
import themeColors from './theme/tailwind-colors.js';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: themeColors.theme.extend.colors
    }
  }
};
```

## Usage in Svelte

```svelte
<div class="bg-base-0 text-base-5">
  <h1 class="text-accent-blue">Heading</h1>
  <p class="text-base-3">Muted text</p>
</div>

<!-- Logo with brand colors -->
<div class="bg-[var(--logo-bg)]">
  <img src="/logo.svg" class="text-[var(--logo-jitte)]" />
</div>
```

## Color Naming

- `base-{0-7}` - Background/foreground shades
- `accent-{red,orange,yellow,green,cyan,blue,purple,magenta}` - Syntax colors
- `ansi-bright-*` - Extended colors (Base24 only)
- `logo-*` - Brand colors (Rose Pine)

## Current Themes

**11 schemes available** (8 dark, 3 light):
- Equilibrium Gray (accessible, neutral)
- Rose Pine + variants (cozy, warm)
- Kanagawa + Dragon (earthy, artistic)
- Tokyo Night + variants (modern, vibrant)

See **[THEMES.md](./THEMES.md)** for full comparison and recommendations.

## Documentation

- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** ⭐ Start here! Color usage patterns
- **[THEMES.md](./THEMES.md)** - Theme showcase and recommendations
- **[BASE16-VS-BASE24.md](./BASE16-VS-BASE24.md)** - What's the difference?
- **[COMPARISON.md](./COMPARISON.md)** - Base16 vs official implementation accuracy
- **[INTEGRATION.md](./INTEGRATION.md)** - How to use in your app
- **[SUMMARY.md](./SUMMARY.md)** - System overview

## Tools

- `parse-schemes.js` - Theme generator
- `check_contrast.py` - WCAG 2.1 compliance checker
