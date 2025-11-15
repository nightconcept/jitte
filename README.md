# Jitte

A local-first web application for managing Magic: The Gathering Commander/EDH decklists with git-style version control.

## Features

- **Version Control**: Branch, commit, and track deck changes with semantic versioning
- **Diff & Compare**: Visual diffs between deck versions with buylist generation
- **Validation**: Commander legality checks, color identity, banned cards, partner compatibility
- **Statistics**: Mana curve analysis, type distribution, pricing (CardKingdom, TCGPlayer, Manapool), bracket levels
- **Import/Export**: Support for popular formats (Moxfield, Archidekt, MTGO, Arena)
- **Maybeboard**: Shared maybeboard across all deck versions
- **Local-First**: All data stored in browser with optional file system persistence
- **Scryfall Integration**: Fast card search with autocomplete and comprehensive data

## Tech Stack

- **SvelteKit** with Svelte 5 (Runes)
- **Tailwind CSS 4** with Base16/Base24 theming
- **Scryfall API** for card data
- **FileSystem Access API** + localStorage for storage
- **Biome** for linting and formatting

## Getting Started

```sh
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Available Commands

```sh
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm check            # Type-check
pnpm format           # Format code
pnpm lint             # Lint code
pnpm test             # Run tests
pnpm theme:list       # List available themes
pnpm theme:generate   # Apply theme from config
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Project overview and architecture guide
- **[theme/QUICK-REFERENCE.md](theme/QUICK-REFERENCE.md)** - Theme system color usage
- **[project/PRD.md](project/PRD.md)** - Full product requirements
- **[project/TASKS.md](project/TASKS.md)** - Development task tracking
- **[project/VERIFICATION_GUIDE.md](project/VERIFICATION_GUIDE.md)** - Feature testing guide

## Storage Format

Decks are stored as `.zip` archives containing:
- Version snapshots (JSON)
- Branch metadata
- Shared maybeboard
- Per-version metadata

## Attribution

Jitte is powered by data and resources from the following sources:

### Card Data & APIs
- **[Scryfall](https://scryfall.com/)** - Primary card database, search, and pricing data
- **[EDHREC](https://edhrec.com/)** - Salt score metrics and Commander format insights

### Icon Resources
- **[Mana Font](https://mana.andrewgioia.com/)** by Andrew Gioia - Mana symbol icon font
- **[Keyrune](https://keyrune.andrewgioia.com/)** by Andrew Gioia - Magic set symbol icon font

All card data, images, and Magic: The Gathering content are property of Wizards of the Coast LLC, a subsidiary of Hasbro, Inc. Jitte is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.

## License

MIT
