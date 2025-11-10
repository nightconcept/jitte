# Available Themes

Quick reference for all available color schemes.

## Dark Themes

### Equilibrium Gray Dark
**By:** Carlo Abelli
**Best for:** Neutral, professional, accessible
**Accessibility:** AAA foreground, AA accents
```
bg: #111111  fg: #ababab  (8.22:1 contrast)
Muted greys with colorful accents
```

### Rose Pine (Main)
**By:** Emilia Dunfelt
**Best for:** Warm, cozy, low-contrast
**Colors:** Soho vibes, natural pine
```
bg: #191724  fg: #e0def4
Love: #eb6f92  Gold: #f6c177  Rose: #ebbcba
Pine: #31748f  Foam: #9ccfd8  Iris: #c4a7e7
```
**Official Match:** ✅ 100%

### Rose Pine Moon
**By:** Emilia Dunfelt
**Best for:** Slightly lighter than main
**Colors:** Same palette, lighter backgrounds

### Kanagawa (Wave)
**By:** Tommaso Laurenzi
**Best for:** Earthy, Japanese aesthetic, warm tones
**Colors:** Inspired by Hokusai's "The Great Wave"
```
bg: #1f1f28  fg: #dcd7ba
Autumn red/yellow/green, wave blues, oni violet
```
**Official Match:** ✅ 95%

### Kanagawa Dragon
**By:** Tommaso Laurenzi
**Best for:** Darker, late-night variant
**Colors:** Deeper, more saturated version

### Tokyo Night Dark (Fixed)
**By:** enkia (fixed mapping)
**Best for:** Modern, vibrant, high-contrast
**Colors:** Clean, saturated neon-inspired palette
```
bg: #1a1b26  fg: #a9b1d6
Red: #f7768e  Orange: #ff9e64  Yellow: #e0af68
Green: #9ece6a  Cyan: #7dcfff  Blue: #7aa2f7
Purple: #bb9af7
```
**Official Match:** ✅ 100% (fixed version)

### Tokyo Night Dark (Original Base16)
**By:** Michaël Ball
**Note:** Color mapping differs from official
**Official Match:** ⚠️ 70% (remapped colors)

### Tokyo Night Storm
**By:** Michaël Ball
**Best for:** Slightly lighter than dark variant
**Colors:** Storm-inspired, less contrast

---

## Light Themes

### Equilibrium Gray Light
**By:** Carlo Abelli
**Best for:** Neutral, professional, accessible
**Accessibility:** AAA foreground, AA accents
```
bg: #f1f1f1  fg: #474747  (8.23:1 contrast)
Muted greys with colorful accents
```

### Rose Pine Dawn
**By:** Emilia Dunfelt
**Best for:** Warm, gentle light theme
**Colors:** Morning vibes, soft pastels
```
bg: #faf4ed  fg: #575279
Same accent colors as dark variants
```
**Official Match:** ✅ 100%

### Tokyo Night Light
**By:** Michaël Ball
**Best for:** Clean, bright daytime coding
**Colors:** Inverted Tokyo Night palette

---

## Quick Comparison

| Theme | Vibe | Contrast | Accessibility | Official Match |
|-------|------|----------|---------------|----------------|
| Equilibrium Gray | Neutral, professional | High | AAA/AA | N/A |
| Rose Pine | Cozy, warm | Medium-low | Not verified | ✅ 100% |
| Kanagawa | Earthy, artistic | Medium | Not verified | ✅ 95% |
| Tokyo Night (Fixed) | Modern, vibrant | High | Not verified | ✅ 100% |
| Tokyo Night (Original) | Modern, vibrant | High | Not verified | ⚠️ 70% |

## Recommended Pairings

**For maximum accessibility:**
```json
{
  "dark": "equilibrium-gray-dark",
  "light": "equilibrium-gray-light"
}
```

**For Rose Pine fans:**
```json
{
  "dark": "rose-pine-moon",
  "light": "rose-pine-dawn"
}
```

**For vibrant modern look:**
```json
{
  "dark": "tokyo-night-dark-fixed",
  "light": "tokyo-night-light"
}
```

**For artistic, warm aesthetic:**
```json
{
  "dark": "kanagawa",
  "light": "rose-pine-dawn"
}
```

## Switching Themes

Edit `theme-config.json`:

```json
{
  "dark": "tokyo-night-dark-fixed",
  "light": "tokyo-night-light",
  "brand": {
    "logo-bg": "#232136",
    "logo-jitte": "#ea9a97"
  }
}
```

Then regenerate:
```bash
node theme/parse-schemes.js
```

## Adding More Themes

Visit https://github.com/tinted-theming/schemes and download any `.yaml` file into `theme/schemes/`.

Popular options:
- Gruvbox (warm retro)
- Nord (cold, minimal)
- Dracula (purple vampire)
- Solarized (scientific color theory)
- Catppuccin (pastel, modern)
- Monokai (classic)
