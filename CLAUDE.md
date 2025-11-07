# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jitte** is a local-first web application for managing Magic: The Gathering Commander/EDH decklists with git-style version control, branching, diff tracking, and export capabilities to popular deck-building platforms.

### Tech Stack
- **Framework**: SvelteKit
- **Styling**: Tailwind CSS
- **Storage**: Browser localStorage + FileSystem API
- **APIs**: Scryfall (primary), MTG API (secondary fallback)
- **Caching**: IndexedDB for card images and bulk data

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
