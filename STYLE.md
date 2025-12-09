# Jitte Design System

A comprehensive style guide for building applications with Jitte's visual language using **Equilibrium Gray Dark** theme.

## Table of Contents

- [Color System](#color-system)
- [Typography](#typography)
- [Spacing](#spacing)
- [Layout & Structure](#layout--structure)
- [Components](#components)
  - [Buttons](#buttons)
  - [Badges](#badges)
  - [Modals](#modals)
  - [Form Controls](#form-controls)
- [Effects & Interactions](#effects--interactions)
- [Z-Index Layering](#z-index-layering)
- [Quick Reference](#quick-reference)

---

## Color System

### Base Palette (Equilibrium Gray Dark)

```css
/* Backgrounds - Darkest to Lightest */
--base-0: #111111;  /* Primary background */
--base-1: #1b1b1b;  /* Secondary background */
--base-2: #262626;  /* Tertiary background / Surface */
--base-3: #777777;  /* Elevated surface / Border */

/* Text - Lightest to Darkest */
--base-4: #919191;  /* Secondary text */
--base-5: #ababab;  /* Primary text */
--base-6: #c6c6c6;  /* Bright text */
--base-7: #e2e2e2;  /* Brightest text */

/* Accent Colors */
--accent-red: #f04339;
--accent-orange: #df5923;
--accent-yellow: #bb8801;
--accent-green: #7f8b00;
--accent-cyan: #00948b;
--accent-blue: #008dd1;
--accent-purple: #6a7fd2;
--accent-magenta: #e3488e;
```

### Semantic Color Tokens

Use these semantic tokens instead of raw base values for consistent theming:

```css
/* Backgrounds */
--color-bg-primary: var(--base-0);      /* #111111 - Main app background */
--color-bg-secondary: var(--base-1);    /* #1b1b1b - Elevated sections */
--color-bg-tertiary: var(--base-2);     /* #262626 - Cards, panels */

/* Surfaces */
--color-surface: var(--base-2);         /* #262626 - Interactive surfaces */
--color-surface-hover: var(--base-3);   /* #777777 - Hover state */
--color-surface-active: var(--base-4);  /* #919191 - Active/pressed state */

/* Borders */
--color-border: var(--base-3);          /* #777777 - Default borders */
--color-border-light: var(--base-4);    /* #919191 - Subtle borders */
--color-border-focus: var(--accent-blue); /* #008dd1 - Focus rings */

/* Text */
--color-text-primary: var(--base-5);    /* #ababab - Main text */
--color-text-secondary: var(--base-4);  /* #919191 - Secondary text */
--color-text-tertiary: var(--base-3);   /* #777777 - Muted text */

/* Brand & Actions */
--color-brand-primary: var(--accent-cyan);   /* #00948b - Primary actions */
--color-brand-secondary: var(--accent-blue); /* #008dd1 - Secondary actions */

/* Status */
--color-success: var(--accent-green);   /* #7f8b00 */
--color-warning: var(--accent-yellow);  /* #bb8801 */
--color-error: var(--accent-red);       /* #f04339 */
--color-info: var(--accent-blue);       /* #008dd1 */
```

### Usage Examples

```css
/* Good - Uses semantic tokens */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

/* Avoid - Direct base values (less flexible) */
.card {
  background: var(--base-2);
  border: 1px solid var(--base-3);
  color: var(--base-5);
}
```

---

## Typography

### Font Sizes & Weights

```css
/* Font Sizes (rem units) */
--text-xs: 0.75rem;    /* 12px - Small labels, badges */
--text-sm: 0.875rem;   /* 14px - Secondary text */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Subheadings */
--text-xl: 1.25rem;    /* 20px - Headings */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Typography Scale

| Element | Size | Weight | Color Token |
|---------|------|--------|-------------|
| **Modal Title** | `text-xl` (1.25rem) | `bold` (700) | `--color-text-primary` |
| **Modal Subtitle** | `text-sm` (0.875rem) | `normal` (400) | `--color-text-secondary` |
| **Badge Text** | `text-xs` (0.75rem) | `bold` (700) | varies |
| **Button Text** | `text-sm` (0.875rem) | `medium` (500) | varies |
| **Body Text** | `text-base` (1rem) | `normal` (400) | `--color-text-primary` |
| **Label Text** | `text-sm` (0.875rem) | `semibold` (600) | `--color-text-secondary` |

---

## Spacing

### Spacing Scale

```css
/* Consistent spacing using 0.25rem (4px) increments */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
```

### Common Patterns

```css
/* Badge Padding */
padding: 0.25rem 0.5rem; /* 4px 8px - Compact badges */

/* Button Padding */
padding: 0.5rem 1rem;    /* 8px 16px - Standard buttons */

/* Modal Content Padding */
padding: 1.5rem;         /* 24px - Modal sections */

/* Card Padding */
padding: 1rem;           /* 16px - Cards, panels */
```

---

## Layout & Structure

### Border Radius

```css
/* Rounded corners - 0.25rem (4px) is the standard */
border-radius: 0.25rem;  /* Badges, buttons, inputs */
border-radius: 0.5rem;   /* Cards, modals */
```

### Borders

```css
/* Border widths */
border: 1px solid var(--color-border);        /* Standard border */
border: 2px solid var(--color-brand-primary); /* Emphasized border */

/* Border examples */
.card {
  border: 1px solid var(--color-border);
}

.selected {
  border: 1px solid var(--color-brand-primary);
}

.error {
  border: 1px solid var(--color-error);
}
```

---

## Components

### Buttons

#### Primary Button
```css
.btn-primary {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background: var(--color-brand-primary);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.btn-primary:hover {
  background: var(--color-brand-secondary);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Example:**
```html
<button class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white">
  Save
</button>
```

#### Secondary Button
```css
.btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-surface-hover);
}
```

**Example:**
```html
<button class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
  Cancel
</button>
```

#### Selection Button (Radio-style)
```css
.btn-select {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.btn-select:hover {
  border-color: color-mix(in srgb, var(--color-brand-primary) 50%, transparent);
}

.btn-select.selected {
  border-color: var(--color-brand-primary);
  background: color-mix(in srgb, var(--color-brand-primary) 10%, transparent);
}
```

**Example:**
```html
<button class="w-full flex items-center justify-between px-4 py-3 rounded border transition-colors
  border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10">
  <span class="font-semibold text-[var(--color-text-primary)]">Option</span>
  <svg class="w-5 h-5 text-[var(--color-brand-primary)]">...</svg>
</button>
```

### Badges

#### Game Changer Badge
High-visibility badge with backdrop blur and strong color.

```css
.badge-gc {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.9);
  color: rgb(0, 0, 0);
  border: 1px solid rgba(245, 158, 11, 1);
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

**Example:**
```html
<span class="badge badge-gc" title="Game Changer">GC</span>
```

#### Format Badge
Subtle, informational badge.

```css
.format-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
```

**Example:**
```html
<span class="format-badge">Commander</span>
```

#### Corner Badge
SVG-based triangular badge for card overlays.

```css
.corner-badge {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  pointer-events: none;
}

/* Text in SVG */
text {
  font-size: 13px;
  font-weight: normal;
  fill: rgb(31, 41, 55);
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
}
```

**Sizes:**
- **Small:** `svgSize: 34px`, `textSize: 11px`
- **Normal:** `svgSize: 40px`, `textSize: 13px`
- **Large:** `svgSize: 48px`, `textSize: 15px`

### Modals

#### Modal Backdrop
```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
```

#### Modal Container
```css
.modal {
  background: var(--color-surface);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  max-width: 32rem; /* md */
  width: 100%;
  margin: 1rem;
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}
```

**Modal Size Variants:**
- `sm`: `max-w-sm` (384px)
- `md`: `max-w-md` (448px)
- `lg`: `max-w-lg` (512px)
- `xl`: `max-w-xl` (576px)
- `2xl`: `max-w-2xl` (672px)

#### Close Button
```css
.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: var(--color-text-tertiary);
  transition: color 0.2s ease;
}

.modal-close:hover {
  color: var(--color-text-primary);
}
```

### Form Controls

#### Input
```css
.input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.input:focus {
  outline: none;
  ring: 2px solid var(--color-border-focus);
  border-color: var(--color-border-focus);
}
```

**Example:**
```html
<input type="text"
  class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]
  placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]" />
```

#### Textarea
```css
.textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  resize: none;
}
```

---

## Effects & Interactions

### Transitions

Global smooth transitions for theme-aware elements:

```css
* {
  transition-property: background-color, border-color, color;
  transition-duration: 0.2s;
  transition-timing-function: ease;
}

body {
  transition: background-color 0.2s ease, color 0.2s ease;
}
```

**Component-specific transitions:**
```css
/* Buttons, links */
transition: all 0.2s ease;

/* Color-only transitions */
transition: color 0.2s ease;

/* Background-only transitions */
transition: background-color 0.2s ease;
```

### Hover States

```css
/* Button hover */
.btn:hover {
  background: var(--color-surface-hover);
}

/* Text hover */
.link:hover {
  color: var(--color-text-primary);
}

/* Border hover */
.card:hover {
  border-color: var(--color-brand-primary);
}
```

### Focus States

```css
/* Focus ring (2px) */
.focusable:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-border-focus);
}

/* Alternative focus ring using Tailwind */
.focusable {
  @apply focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)];
}
```

### Backdrop Blur

```css
/* Glass effect for badges */
.badge-glass {
  backdrop-filter: blur(4px);
  background: rgba(38, 38, 38, 0.9); /* base-2 with opacity */
}

/* Glass effect for modals */
.modal-backdrop {
  backdrop-filter: blur(2px);
}
```

### Shadows

```css
/* Elevation shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.3);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5);

/* Text shadows for readability */
text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
```

**Usage:**
```css
/* Badge elevation */
.badge {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Modal elevation */
.modal {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

/* SVG text readability */
text {
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
}
```

---

## Z-Index Layering

Consistent z-index values for proper stacking order:

```css
/* Content Layer (0-99) */
--z-card-stack: 1;
--z-active-card: 20;
--z-dropdown: 50;

/* Overlay Layer (100-999) */
--z-context-menu: 100;

/* Modal Layer (1000-9998) */
--z-modal: 1000;

/* Tooltip Layer (9999+) */
--z-tooltip: 9999;
```

**Rules:**
- **Content:** Regular page elements (0-99)
- **Overlays:** Dropdowns, context menus (100-999)
- **Modals:** All modals use `z-[1000]` (never varies)
- **Tooltips:** Always on top (9999)

---

## Quick Reference

### Component Checklist

When building a new component, ensure:

- [ ] Uses semantic color tokens (`--color-*`) not raw base values
- [ ] Includes `0.2s ease` transitions for interactive states
- [ ] Has proper hover states (`:hover`)
- [ ] Has proper focus states (`:focus` with ring)
- [ ] Uses standard spacing (multiples of 0.25rem)
- [ ] Uses standard border-radius (0.25rem)
- [ ] Includes disabled state for interactive elements
- [ ] Uses appropriate z-index layer
- [ ] Includes proper ARIA attributes for accessibility
- [ ] Text contrast meets accessibility standards

### Common Patterns

```css
/* Card/Panel */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1rem;
}

/* Interactive List Item */
.list-item {
  padding: 0.75rem 1rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s ease;
}
.list-item:hover {
  background: var(--color-surface-hover);
}

/* Badge with Glow */
.badge-glow {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Focus Ring */
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-border-focus);
}
```

---

## Notes

- **Color Scheme:** This guide uses **Equilibrium Gray Dark** as the base theme
- **Framework:** Designed for Tailwind CSS 4, but adaptable to any CSS framework
- **Accessibility:** Ensure text contrast ratios meet WCAG AA standards
- **Responsiveness:** All spacing and sizes use `rem` units for scalability
- **Icons:** Consider using SVG icons with `currentColor` for automatic color theming

For implementation examples, see the Jitte codebase:
- `src/lib/components/GameChangerBadge.svelte`
- `src/lib/components/CornerBadge.svelte`
- `src/lib/components/BaseModal.svelte`
- `src/lib/components/CommitModal.svelte`
