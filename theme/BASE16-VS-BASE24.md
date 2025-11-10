# Base16 vs Base24

## TL;DR

- **Base16** = 16 colors (8 shades + 8 accents)
- **Base24** = 24 colors (Base16 + 6 bright colors + 2 extra backgrounds)
- **Use Base24 for:** Terminal apps with full ANSI color support
- **Use Base16 for:** Everything else (simpler, more themes available)

## Visual Comparison

```
┌──────────────────────────────────────────────────┐
│                   Base16 (16)                    │
├──────────────────────────────────────────────────┤
│ base00-07  │  Backgrounds & Foregrounds (8)      │
│ base08-0F  │  Accent Colors (8)                  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                   Base24 (24)                    │
├──────────────────────────────────────────────────┤
│ base00-07  │  Same as Base16                     │
│ base08-0F  │  Same as Base16                     │
│ base10-11  │  Extra dark/light backgrounds (2)   │
│ base12-17  │  Bright ANSI colors (6)             │
└──────────────────────────────────────────────────┘
```

## Base16 Breakdown (16 colors)

### Shades (base00-07)
Used for backgrounds, foregrounds, and text hierarchy:

| Color | Dark Theme Use | Light Theme Use | ANSI |
|-------|----------------|-----------------|------|
| base00 | Main background (darkest) | Main background (lightest) | 0 (Black) |
| base01 | Lighter background (status bars) | Darker background | 18 |
| base02 | Selection background | Selection background | 19 (Bright Black) |
| base03 | Comments, line highlights | Comments | 8 (Gray) |
| base04 | Dark foreground (status bars) | Light foreground | 20 |
| base05 | Main foreground | Main foreground | 21 (Foreground) |
| base06 | Light foreground | Dark foreground | 7 (White) |
| base07 | Lightest foreground | Darkest foreground | 15 (Bright White) |

### Accents (base08-0F)
Used for syntax highlighting and semantic colors:

| Color | Use | ANSI |
|-------|-----|------|
| base08 | Red - Variables, errors, deletions | 1 (Red) |
| base09 | Orange - Integers, constants | 16 |
| base0A | Yellow - Classes, warnings, search highlights | 3 (Yellow) |
| base0B | Green - Strings, success, additions | 2 (Green) |
| base0C | Cyan - Support, regex, quotes | 6 (Cyan) |
| base0D | Blue - Functions, methods, links | 4 (Blue) |
| base0E | Purple - Keywords, storage, selectors | 5 (Magenta) |
| base0F | Brown/Dark Red - Deprecated, special tags | 17 |

## Base24 Additions (+8 colors)

### Extra Backgrounds (base10-11)

| Color | Dark Theme | Light Theme |
|-------|------------|-------------|
| base10 | Darker than base00 | Lighter than base00 |
| base11 | Darkest background | Lightest background |

**Use:** Multiple layers of UI depth (floating windows, modals, popovers)

### Bright ANSI Colors (base12-17)

These are **brighter/more saturated versions** of base08-0E for terminal emulators:

| Color | Use | Maps to | ANSI |
|-------|-----|---------|------|
| base12 | Bright Red | base08 | 9 |
| base13 | Bright Yellow | base0A | 11 |
| base14 | Bright Green | base0B | 10 |
| base15 | Bright Cyan | base0C | 14 |
| base16 | Bright Blue | base0D | 12 |
| base17 | Bright Magenta | base0E | 13 |

**Note:** Orange (base09) and Brown (base0F) don't get bright variants in Base24.

## When to Use Each

### Use Base16 When:
- ✅ Building GUI applications
- ✅ Web applications
- ✅ Text editors (VSCode, Sublime, etc.)
- ✅ You want maximum theme compatibility (300+ themes)
- ✅ You don't need full ANSI terminal colors
- ✅ Simpler is better

### Use Base24 When:
- ✅ Building terminal emulators
- ✅ Shell themes (zsh, fish, bash)
- ✅ CLI applications with rich color output
- ✅ You need all 16 ANSI colors
- ✅ Multiple UI depth levels (base10-11)

## ANSI Terminal Color Mapping

### Base16 Coverage (10 of 16 ANSI colors)

```
ANSI 0-7 (Normal):
✓ 0  Black       → base00
✓ 1  Red         → base08
✓ 2  Green       → base0B
✓ 3  Yellow      → base0A
✓ 4  Blue        → base0D
✓ 5  Magenta     → base0E
✓ 6  Cyan        → base0C
✓ 7  White       → base06

ANSI 8-15 (Bright):
✓ 8  Bright Black    → base03
✗ 9  Bright Red      → ??? (fallback to base08)
✗ 10 Bright Green    → ??? (fallback to base0B)
✗ 11 Bright Yellow   → ??? (fallback to base0A)
✗ 12 Bright Blue     → ??? (fallback to base0D)
✗ 13 Bright Magenta  → ??? (fallback to base0E)
✗ 14 Bright Cyan     → ??? (fallback to base0C)
✓ 15 Bright White    → base07
```

### Base24 Coverage (16 of 16 ANSI colors) ✅

```
ANSI 8-15 (Bright):
✓ 8  Bright Black    → base03
✓ 9  Bright Red      → base12
✓ 10 Bright Green    → base14
✓ 11 Bright Yellow   → base13
✓ 12 Bright Blue     → base16
✓ 13 Bright Magenta  → base17
✓ 14 Bright Cyan     → base15
✓ 15 Bright White    → base07
```

## Current Status: Jitte Theme System

**All 11 of our schemes are Base16** (none have base12-17 colors).

This is perfect for a web application! We don't need the terminal bright colors.

### If You Wanted Base24:

```bash
# Download Base24 schemes from:
# https://github.com/tinted-theming/schemes/tree/main/base24

# Example:
cd theme/schemes
wget https://raw.githubusercontent.com/tinted-theming/schemes/main/base24/one-dark.yaml
wget https://raw.githubusercontent.com/tinted-theming/schemes/main/base24/dracula.yaml

# Our parser already supports Base24!
node ../parse-schemes.js
```

The parser will automatically detect `base17` and add `ansi-bright-*` colors to the output.

## Example: Base16 vs Base24 Usage

### Base16 (Web App)
```svelte
<div class="bg-base-0 text-base-5">
  <h1 class="text-accent-blue">Functions</h1>
  <span class="text-accent-red">Errors</span>
  <span class="text-accent-green">Success</span>
</div>
```

### Base24 (Terminal App)
```svelte
<div class="bg-base-0 text-base-5">
  <!-- Normal colors -->
  <span class="text-accent-red">Error</span>

  <!-- Bright colors (only in Base24) -->
  <span class="text-ansi-bright-red">CRITICAL ERROR</span>

  <!-- Extra background depth -->
  <div class="bg-base-10">  <!-- Darker background -->
    <div class="bg-base-11">  <!-- Darkest background -->
      Nested floating window
    </div>
  </div>
</div>
```

## Recommendations for Jitte

**Stick with Base16** ✅

Reasons:
1. We're building a web app, not a terminal
2. 16 colors is plenty for UI design
3. 300+ themes available vs ~20 Base24 themes
4. Simpler mental model
5. Base24 mainly benefits terminal emulators

**If we ever need more colors:**
- Add custom Tailwind colors
- Use CSS variables
- Extend specific themes

## Further Reading

- [Base16 Styling Guide](https://github.com/tinted-theming/home/blob/main/styling.md)
- [Base24 Styling Guide](https://github.com/tinted-theming/base24/blob/master/styling.md)
- [Base16 Gallery](https://tinted-theming.github.io/base16-gallery)
