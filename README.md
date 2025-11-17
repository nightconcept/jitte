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

- **SvelteKit** with Svelte 5
- **Tailwind CSS 4**
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

[MIT](LICENSE)
