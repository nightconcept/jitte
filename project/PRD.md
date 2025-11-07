# Product Requirements Document (PRD)
## Local MTG Commander Deck Management Tool

### Overview
A local-first web application for managing Magic: The Gathering Commander/EDH decklists with version control, diff tracking, and export capabilities to popular deck-building platforms.

### Tech Stack
- **Framework**: SvelteKit
- **Styling**: Tailwind CSS
- **Initialization**: SvelteKit + Tailwind starter template
- **Storage**: Browser localStorage + FileSystem API
- **APIs**: Scryfall (primary), MTG API (secondary fallback)

---

## Core Features

### 1. Deck Storage & File Management

#### File Format
- **Plaintext decklists** with optional set information:
  ```
  1 Lightning Bolt
  1 Sol Ring (2XM) 97
  ```
- Compatible with Moxfield, MTGGoldfish, Arena, and other tools

#### Storage Structure
```
deck-name.zip
├── manifest.json              # Deck metadata, branch info
├── maybeboard.json            # Categories + cards (shared across revisions)
├── main/
│   ├── v1.0.0.txt            # Full decklist
│   ├── v1.1.0.txt
│   ├── v2.0.0.txt
│   └── metadata.json         # Per-version commit messages, timestamps
├── experimental/
│   ├── v1.0.0.txt
│   └── metadata.json
└── stash.json                # Per-branch unsaved changes
```

#### File Naming
- Deck zip files named by deck name, sanitized for Windows/Mac/Linux filesystems
- Special characters converted or removed to ensure cross-platform compatibility

#### Local Directory Management
- Users can set a specific directory for deck storage (FileSystem API)
- If no directory set, work in localStorage until first save
- First save prompts directory selection

---

### 2. Version Control System

#### Semantic Versioning (Semver)
- **Strict semver enforcement**: `MAJOR.MINOR.PATCH`
- **Auto-increment**: Patch by default
- **Auto-suggestion based on changes**:
  - 1-2 cards changed: Patch (0.0.x)
  - 3-10 cards changed: Minor (0.x.0)
  - 10+ cards changed: Major (x.0.0)
- **User configurable thresholds** in settings
- **Manual override**: Click edit button to manually set version number

#### Branching
- **Default branch**: "main"
- **Branch creation options**:
  1. Fork from current version (default)
  2. Fork from specific version (user selects)
  3. Start from scratch (empty deck with commander selection prompt)
- **Branch switching**: Prompt to save or discard unsaved changes

#### Commit System
- Each version save includes:
  - Version number (semver)
  - Commit message (git-style description)
  - Timestamp
  - Full decklist snapshot
- **Metadata stored** in `metadata.json` per branch

#### Stash System
- **Auto-stash**: Every 60 seconds
- **One stash per branch**: Overwrites previous stash
- **On reload**: Prompt user to load stash or last saved version
- Last working version stored in metadata

---

### 3. User Interface

#### Layout (1080p optimized, minimal scrolling)
```
┌────────────────────────────────────────────────────────────┐
│ [Navbar: Deck Name | Settings]                            │
│ [Branch: main ▼] [Version: v1.2.0] [View/Edit] [Save]     │
└────────────────────────────────────────────────────────────┘
┌──────────────────┬─────────────────────────────────────────┐
│  Card Preview    │  Main Deck List (grouped by type)      │
│                  │  ┌─────────────────────────────────┐   │
│  [Card Image]    │  │ Commander                       │   │
│                  │  │ Companion (if present)           │   │
│  Total: $X.XX    │  │ Planeswalkers                   │   │
│                  │  │ Creatures                        │   │
│                  │  │ Instants                         │   │
│                  │  │ Sorceries                        │   │
│                  │  │ Artifacts                        │   │
│                  │  │ Enchantments                     │   │
│                  │  │ Lands                            │   │
│                  │  └─────────────────────────────────┘   │
└──────────────────┴─────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ [Maybeboard Tabs: Main | Burn Package | Ramp | ...]     │
│ [Search: ____________________] [Category Management]     │
│  - Card name (qty) [▼ dropdown menu]                     │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ Stats: Mana Curve | Color Dist | Type Breakdown | Avg CMC│
└──────────────────────────────────────────────────────────┘
```

#### Card Interaction
- **Hover**: Shows card image in preview pane (left side)
- **Default preview**: Commander card
- **Dropdown menu** (▼ icon to right of each card):
  - Add one
  - Add more... (quantity input)
  - Remove (removes 1 copy)
  - Switch printing (shows all printings with images and prices)

#### Card Type Grouping
Order:
1. Commander
2. Companion (if present)
3. Planeswalkers
4. Creatures
5. Instants
6. Sorceries
7. Artifacts
8. Enchantments
9. Lands

---

### 4. Edit Mode & Diff System

#### Edit Mode
- Toggle between **View** and **Edit** modes
- Edit mode starts a new diff (tracks changes)
- Changes tracked in real-time

#### Card Search (Edit Mode)
- **Fast search**: Activates after 4 characters typed
- **Dropdown results**: Top 10 matches
- **11th row**: "🔍 Search for more on Scryfall" (opens new tab)
- **Display**: Card name, set, mana cost, card type
- **Pricing**: Show USD (non-foil) price
- **Set/printing**: Not shown in search dropdown, only in card menu after adding

#### Saving
- **Save button**: Creates new version with semver bump
- **Commit message**: Required git-style description
- **Stores**: Full decklist snapshot in new version file

---

### 5. Diff & Buylist Generation

#### Diff Comparison
- User selects **two versions** to compare
- Shows git-style summary:
```
+4 -2 ~1

Added:
+ 1 Lightning Bolt ($0.25)
+ 1 Counterspell ($0.50)
+ 2 Sol Ring ($2.00 each)

Removed:
- 1 Opt ($0.10)
- 1 Ponder ($1.50)

Modified:
~ 3 → 4 Island ($0.05)

Total to buy: $6.75
```

#### Buylist Export
- **Modal with**:
  - Cards to buy (in new, not in old)
  - Prices per card (USD, non-foil)
  - Total cost
  - Easy copy button (copies plaintext to clipboard)

#### Remove List
- Separate view for cards to remove (in old, not in new)

---

### 6. Maybeboard

#### Structure
- **Shared across all revisions** of a deck
- **Categories**: User-created, tab-based interface
  - Default: "Main" category
  - Examples: "Burn Package", "Ramp", "Draw"
- **Category contents**: Can contain any card types (creatures, instants, lands, etc.)

#### Category Management
- Create/rename/delete categories
- Move cards between categories
- Move cards from maybeboard → main deck and vice versa

---

### 7. Commander-Specific Features

#### Commander Selection
- Marked as special card type in list
- **Partner commanders**: Supported
- **Companions**: Supported as special card type

#### Validation (Warnings, Not Enforcement)
- ⚠️ Cards illegal in Commander (banned list)
- ⚠️ Deck has more/less than 100 cards
- ⚠️ Duplicate cards (including non-basic lands)
- ⚠️ Cards outside commander's color identity
- All warnings shown with icon (Moxfield-style)

---

### 8. Statistics & Analysis

#### Moxfield Parity
- **Mana curve**: CMC distribution chart
- **Color distribution**: Pie chart of mana symbols
- **Card type breakdown**: Percentage by type
- **Average CMC**: Calculated average
- **Mana source analysis**: Sources per color
- **Land count**: Total lands + recommendations

#### Display
- Below main deck list
- Collapsible sections
- Real-time updates as deck changes

---

### 9. Export & Import

#### Export Formats
1. **Plaintext** (copy to clipboard)
2. **Moxfield** (open in new tab with `import?=` parameters)
3. **Archidekt** (open in new tab with `sandbox?deck=` parameters)
4. **Buylist/Diff** (as described above)

#### Import Sources
1. **Moxfield/Archidekt URLs**: Parse and create new local deck
2. **Plaintext paste**: Parse Arena/MTGO format
3. **Zip files**: Import existing deck with version history

---

### 10. API Integration & Caching

#### Scryfall API (Primary)
- **Rate limiting**: 100ms between requests (configurable constant)
- **Endpoints used**:
  - Card search/autocomplete
  - Card details (name, mana cost, type, Oracle text)
  - Card images (multiple sizes)
  - Pricing (USD, non-foil)
  - Set/printing information

#### MTG API (Secondary Fallback)
- Used if Scryfall fails or is unavailable

#### Caching Strategy
- **Card images**: Browser cache (IndexedDB)
- **Card data**: Cache for 24 hours
- **Pricing**: Update once per day
- **Bulk data**: Optional setting to download all cards (not default)
  - Download ALL cards (not just Commander-legal due to rules changes)
  - Stored in IndexedDB
  - Settings option to trigger download

---

### 11. Settings

#### Accessible via Navbar
- **Location**: Top navbar (Settings button)

#### Configuration Options
1. **Local directory path**: Set/change deck storage location
2. **Semver thresholds**: Customize patch/minor/major change counts
3. **Bulk data**: Trigger download of full Scryfall database
4. **API rate limit**: Adjust delay between requests (default 100ms)
5. **Reset to defaults**: Button to restore all settings

#### Storage
- Stored in **localStorage**
- Persist across sessions

---

### 12. First-Time User Experience

#### Initial State
- Empty state with:
  - **"Create Deck"** button
  - **"Set Local Directory"** button (optional)
  - **"Import Deck"** button

#### Deck Creation Flow
1. Click "Create Deck"
2. Search modal for commander selection
3. Deck created with commander in Commander section
4. Enter edit mode by default

---

## Technical Specifications

### Browser Compatibility
- Modern browsers with FileSystem API support (Chrome, Edge, Opera)
- Fallback to localStorage-only mode for unsupported browsers

### Performance Requirements
- Deck list rendering: < 100ms for 100-card decks
- Search results: < 200ms after 4 characters typed
- Image loading: Lazy load, cache aggressively

### Data Persistence
- Auto-save stash every 60 seconds
- Prompt before closing with unsaved changes
- Metadata updates on every save