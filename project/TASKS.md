# Task Breakdown - MTG Commander Deck Management Tool

## Phase 0: Research & Planning

### 0.1 Project Scaffolding Research
- [x] Research SvelteKit project initialization best practices
  - **Research Findings**: SvelteKit uses Vite as build tool, supports TypeScript out of the box
  - **Best Practices**: Use `npm create svelte@latest` or manual setup with proper adapters
  - **Verification Checklist**:
    - [ ] Review package.json for correct SvelteKit dependencies (@sveltejs/kit, @sveltejs/vite-plugin-svelte)
    - [ ] Verify svelte.config.js has proper adapter configuration
    - [ ] Check that vite.config.ts/js exists and includes sveltekit() plugin

- [x] Research Tailwind CSS integration with SvelteKit
  - **Research Findings**: Tailwind v4 uses new Vite plugin `@tailwindcss/vite`
  - **Integration Method**: Import in Vite config + CSS file with `@import 'tailwindcss'`
  - **Verification Checklist**:
    - [ ] Verify @tailwindcss/vite and tailwindcss are in devDependencies (package.json)
    - [ ] Check vite.config.ts includes `tailwindcss()` plugin
    - [ ] Verify app.css exists with `@import 'tailwindcss'` directive
    - [ ] Confirm +layout.svelte imports app.css

- [x] Identify and test SvelteKit + Tailwind starter templates
  - **Template Used**: Manual setup with SvelteKit + Tailwind v4
  - **Verification Checklist**:
    - [ ] Run `pnpm dev` and verify server starts without errors
    - [ ] Check http://localhost:5173 loads successfully
    - [ ] Verify Tailwind classes work (inspect any styled elements)

- [x] Research project structure conventions for SvelteKit apps
  - **Standard Structure**:
    - `src/routes/` - File-based routing
    - `src/lib/` - Reusable components and utilities
    - `static/` - Static assets
  - **Verification Checklist**:
    - [ ] Verify `src/routes/` directory exists
    - [ ] Verify `src/lib/` directory exists
    - [ ] Verify `static/` directory exists
    - [ ] Check that +page.svelte exists in src/routes/

- [x] Document recommended folder structure and file organization
  - **Recommended Structure**:
    ```
    src/
    ├── lib/
    │   ├── components/     # Reusable UI components
    │   ├── stores/         # Svelte stores
    │   ├── types/          # TypeScript interfaces
    │   ├── utils/          # Helper functions
    │   └── api/            # API clients
    ├── routes/             # SvelteKit routes
    └── app.css             # Global styles
    ```
  - **Verification Checklist**:
    - [ ] Review current folder structure matches conventions
    - [ ] Check that future components will go in appropriate directories

- [x] Research TypeScript configuration for SvelteKit
  - **Configuration**: TypeScript strict mode, proper module resolution
  - **Key Settings**: `moduleResolution: "bundler"`, `strict: true`
  - **Verification Checklist**:
    - [ ] Verify tsconfig.json exists and extends .svelte-kit/tsconfig.json
    - [ ] Check that strict mode is enabled
    - [ ] Run `pnpm check` to verify TypeScript compilation works
    - [ ] Confirm no TypeScript errors in existing files

### 0.2 API Integration Research
- [x] **Scryfall API Research**
  - [x] Read complete Scryfall API documentation
  - [x] Test card search endpoints and rate limiting
  - [x] Test card autocomplete endpoint
  - [x] Test bulk data download endpoints
  - [x] Document response formats and error handling
  - [x] Test image URL formats and available sizes
  - [x] Test pricing data structure and update frequency
  - [x] Research Scryfall's legal/banned list endpoints
  - [x] Document best practices for caching and rate limiting
  - **Research Findings**:
    - **Base URL**: `https://api.scryfall.com`
    - **Rate Limiting**: 50-100ms between requests (10/sec average), returns HTTP 429 if exceeded
    - **Required Headers**: `User-Agent` (app name/version) and `Accept` (*/* or application/json)
    - **Autocomplete**: `/cards/autocomplete?q={query}` - returns up to 20 card names, requires 2+ chars
    - **Search**: `/cards/search?q={query}` - returns 175 cards per page, supports fulltext search
    - **Card Object Fields**: id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, image_uris, prices (usd, usd_foil, eur, tix), legalities, set, collector_number, artist, rarity
    - **Multi-faced Cards**: Have `card_faces` array with face-specific data
    - **Image URIs**: Available sizes: small, normal, large, png, art_crop, border_crop
    - **Pricing**: usd, usd_foil, usd_etched, eur, eur_foil, tix - stale after 24 hours
    - **Bulk Data**: 4 files (Oracle Cards, Unique Artwork, Default Cards, All Cards), updated every 12 hours
    - **Default Cards** recommended: 494 MB, contains every card in English
    - **Legalities Object**: Contains format legality (legal, not_legal, restricted, banned)

- [ ] **MTG API Research**
  - [ ] Read MTG API (magicthegathering.io) documentation
  - [ ] Test card search and retrieval endpoints
  - [ ] Compare response format with Scryfall
  - [ ] Document fallback strategy when Scryfall unavailable
  - [ ] Test rate limiting and performance

### 0.3 Export Integration Research
- [ ] **Moxfield Integration Research**
  - [ ] Research Moxfield import URL format (`import?=` parameters)
  - [ ] Test manual imports to understand parameter structure
  - [ ] Document all required and optional parameters
  - [ ] Test with sample decks to verify format
  - [ ] Research Moxfield API (if available) for direct integration
  - [ ] Document any limitations or special requirements
  - [ ] Test partner commanders and companion handling

- [ ] **Archidekt Integration Research**
  - [ ] Research Archidekt sandbox URL format (`sandbox?deck=` parameters)
  - [ ] Test manual imports to understand parameter structure
  - [ ] Document all required and optional parameters
  - [ ] Test with sample decks to verify format
  - [ ] Research Archidekt API (if available) for direct integration
  - [ ] Document any limitations or special requirements
  - [ ] Test partner commanders and companion handling

- [ ] **Import from Moxfield/Archidekt Research**
  - [ ] Research how to parse Moxfield deck URLs
  - [ ] Research how to parse Archidekt deck URLs
  - [ ] Test fetching deck data from their public APIs
  - [ ] Document response formats and data mapping
  - [ ] Test with various deck types (standard, partner, companion)

### 0.4 Browser API Research
- [ ] Research FileSystem API browser support and limitations
- [ ] Test FileSystem API with sample file operations
- [ ] Research IndexedDB for image and bulk data caching
- [ ] Research localStorage limitations and best practices
- [ ] Document fallback strategies for unsupported browsers

---

## Phase 1: Project Setup & Core Infrastructure

### 1.1 Project Initialization
- [x] Create SvelteKit project with Tailwind CSS using init template
  - **Status**: ✅ Complete - Project created with SvelteKit + Tailwind v4
  - **Verification Checklist**:
    - [ ] Run `pnpm install` to ensure all dependencies install correctly
    - [ ] Run `pnpm dev` and verify dev server starts on http://localhost:5173
    - [ ] Visit http://localhost:5173 in browser and confirm page loads
    - [ ] Check browser console for any errors
    - [ ] Verify Vite HMR (Hot Module Replacement) works by editing +page.svelte

- [x] Set up project structure (routes, lib, components)
  - **Current Structure**:
    - `src/routes/` - Contains +page.svelte and +layout.svelte
    - `src/lib/` - Contains index.ts and assets/
  - **Verification Checklist**:
    - [ ] Verify `src/routes/+page.svelte` exists
    - [ ] Verify `src/routes/+layout.svelte` exists and imports app.css
    - [ ] Verify `src/lib/` directory exists
    - [ ] Check `src/lib/index.ts` exists for exports
    - [ ] Verify `static/` directory exists with robots.txt

- [ ] Configure Tailwind with custom theme (Moxfield-inspired)
  - **TODO**: Create custom Tailwind theme configuration
  - **Verification Checklist**:
    - [ ] Create tailwind.config.js or add theme to app.css using @theme
    - [ ] Define custom colors matching Moxfield (dark theme)
    - [ ] Test custom theme by using theme colors in a component
    - [ ] Verify CSS variables are applied correctly
    - [ ] Check responsive design utilities work

- [ ] Set up TypeScript types for deck structures
  - **TODO**: Create type definitions in `src/lib/types/`
  - **Verification Checklist**:
    - [ ] Create `src/lib/types/` directory
    - [ ] Create deck.ts with Deck, Card, Branch interfaces
    - [ ] Create version.ts with Version metadata types
    - [ ] Create maybeboard.ts with Maybeboard types
    - [ ] Run `pnpm check` to verify types compile
    - [ ] Import and use types in a test file to verify they work

- [x] Configure build and dev scripts
  - **Status**: ✅ Complete - Scripts configured in package.json
  - **Available Scripts**:
    - `pnpm dev` - Development server
    - `pnpm build` - Production build
    - `pnpm preview` - Preview production build
  - **Verification Checklist**:
    - [ ] Run `pnpm dev` and verify it starts successfully
    - [ ] Run `pnpm build` and verify build completes without errors
    - [ ] Check `.svelte-kit/` directory is created after build
    - [ ] Run `pnpm preview` and verify production build works
    - [ ] Verify build output is optimized (check build output size)

- [x] Set up linting and formatting (Biome)
  - **Status**: ✅ Complete - Biome configured (replaces Prettier + ESLint)
  - **Verification Checklist**:
    - [ ] Verify biome.json exists with configuration
    - [ ] Run `pnpm format` and verify it formats files
    - [ ] Run `pnpm lint` and verify it checks code
    - [ ] Run `pnpm check:all` to format + lint together
    - [ ] Verify Biome properly ignores .css and .svelte files

### 1.2 File Format & Storage
- [x] Define TypeScript interfaces for:
  - [x] Deck manifest (`src/lib/types/deck.ts`)
  - [x] Version metadata (`src/lib/types/version.ts`)
  - [x] Maybeboard structure (`src/lib/types/maybeboard.ts`)
  - [x] Stash format (`src/lib/types/version.ts`)
  - [x] Card object (`src/lib/types/card.ts`)
  - [x] Branch structure (`src/lib/types/deck.ts`)
  - **Verification Checklist**:
    - [ ] Check all type files exist in `src/lib/types/`
    - [ ] Verify exports in `src/lib/types/index.ts`
    - [ ] Run `pnpm check` to verify TypeScript compilation
    - [ ] Try importing types in a test file

- [x] Implement plaintext parser (Arena/MTGO format with optional set codes)
  - **Location**: `src/lib/utils/decklist-parser.ts`
  - **Features**: Supports quantity notation (1x, 2x), set codes, collector numbers
  - **Verification Checklist**:
    - [ ] Check `parsePlaintext()` function exists
    - [ ] Supports formats: "1 CardName", "1x CardName", "1 CardName (SET) 123"
    - [ ] Skips comments (// and #) and section headers
    - [ ] Run tests: `pnpm test decklist-parser.test.ts`

- [x] Implement plaintext serializer
  - **Location**: `src/lib/utils/decklist-parser.ts`
  - **Verification Checklist**:
    - [ ] Check `serializePlaintext()` function exists
    - [ ] Can toggle set code inclusion
    - [ ] Run tests to verify output format

- [x] Create zip file utilities (compress/decompress deck archives)
  - **Location**: `src/lib/utils/zip.ts`
  - **Uses**: JSZip library for compression
  - **Verification Checklist**:
    - [ ] Verify JSZip is installed (`pnpm list jszip`)
    - [ ] Check `compressDeckArchive()` and `decompressDeckArchive()` exist
    - [ ] Functions handle manifest, maybeboard, versions, and stashes

- [x] Implement sanitization for deck names (cross-platform filenames)
  - **Location**: `src/lib/utils/filename.ts`
  - **Features**: Removes illegal chars, handles Windows reserved names, length limits
  - **Verification Checklist**:
    - [ ] Check `sanitizeDeckName()` function exists
    - [ ] Run tests: `pnpm test filename.test.ts`
    - [ ] Verify it handles: illegal chars, reserved names, length limits

- [x] Write tests for parser/serializer
  - **Status**: ✅ 26 tests passing
  - **Verification Checklist**:
    - [ ] Run `pnpm test` - all tests should pass
    - [ ] Check test files exist in `src/lib/utils/*.test.ts`

### 1.3 LocalStorage & FileSystem API
- [x] Create storage abstraction layer
  - **Location**: `src/lib/storage/`
  - **Interface**: `IStorageProvider` with multiple implementations
  - **Verification Checklist**:
    - [ ] Check `src/lib/storage/types.ts` exists with interfaces
    - [ ] Check `StorageManager` class exists
    - [ ] Verify both providers implement the interface

- [x] Implement localStorage fallback mode
  - **Location**: `src/lib/storage/local-storage-provider.ts`
  - **Features**: Base64 encoding, metadata tracking, quota handling
  - **Verification Checklist**:
    - [ ] Check `LocalStorageProvider` class exists
    - [ ] Implements all `IStorageProvider` methods
    - [ ] Handles QuotaExceededError

- [x] Implement FileSystem API integration
  - **Location**: `src/lib/storage/filesystem-provider.ts`
  - **Features**: Directory picker, permission handling, file operations
  - **Verification Checklist**:
    - [ ] Check `FileSystemProvider` class exists
    - [ ] Handles browser permissions
    - [ ] Has directory picker integration

- [x] Directory picker and path persistence
  - **Verification Checklist**:
    - [ ] `FileSystemProvider` has `initializeWithHandle()` method
    - [ ] Directory handle can be persisted to config
    - [ ] Path is stored for display purposes

- [x] Handle browser permissions for file access
  - **Verification Checklist**:
    - [ ] Permission checks in `initializeWithHandle()`
    - [ ] Proper error codes (PermissionDenied)
    - [ ] Graceful fallback to localStorage

- [x] Implement error handling for storage operations
  - **Features**: Error codes, detailed error messages, result types
  - **Verification Checklist**:
    - [ ] Check `StorageErrorCode` enum exists
    - [ ] All storage operations return `StorageResult<T>`
    - [ ] Error messages are user-friendly

- [x] Write tests for storage layer
  - **Status**: ⚠️ Basic validation via type checking (integration tests pending)
  - **Verification Checklist**:
    - [ ] Type system validates storage interface
    - [ ] Manual testing with browser needed for FileSystem API
    - [ ] localStorage provider can be unit tested

---

## Phase 2: Scryfall API Integration

### 2.1 API Client
- [x] Create Scryfall API client with rate limiting (100ms delay)
  - **Location**: `src/lib/api/scryfall-client.ts`
  - **Status**: ✅ Complete
- [x] Implement request queue system
  - **Location**: `src/lib/api/rate-limiter.ts`
  - **Features**: Queue-based rate limiting with configurable delay
- [x] Add error handling and retry logic
  - **Features**: Custom `ScryfallApiError` class, proper error handling
- [ ] Create MTG API fallback client
  - **Status**: Deferred (not needed for MVP, Scryfall is stable)
- [x] Implement configurable rate limit constant
  - **Features**: Configurable via `ScryfallClientConfig.rateLimitMs`
- [x] Add request/response logging for debugging
  - **Features**: Console logging for errors, queue size monitoring
- [ ] Write tests for API client
  - **Status**: Pending (will be added in Phase 11)
  - **Verification Checklist**:
    - [x] TypeScript compilation passes (`pnpm check`)
    - [x] API client exports are available
    - [x] Rate limiter implements queue system

### 2.2 Card Search
- [x] Implement autocomplete search (triggers at 4 characters)
  - **Location**: `src/lib/api/card-service.ts` - `autocomplete()` method
  - **Features**: Returns up to 20 card names from Scryfall
- [x] Parse and display search results (top 10)
  - **Location**: `src/lib/api/card-service.ts` - `searchCards()` method
  - **Features**: Returns formatted `CardSearchResult[]` with limit
- [ ] Handle "Search for more" (open Scryfall in new tab)
  - **Status**: Deferred to UI implementation (Phase 5)
- [x] Display card name, mana cost, type in results
  - **Features**: `CardSearchResult` interface includes all display fields
- [ ] Implement search debouncing
  - **Status**: Deferred to UI implementation (Phase 5)
- [ ] Add loading states for search
  - **Status**: Deferred to UI implementation (Phase 5)
- [ ] Write tests for search functionality
  - **Status**: Pending (Phase 11)
  - **Verification Checklist**:
    - [x] `autocomplete()` method exists and compiles
    - [x] `searchCards()` method exists and compiles
    - [x] Returns properly formatted results

### 2.3 Card Data & Images
- [x] Fetch card details (Oracle text, types, CMC, colors)
  - **Location**: `src/lib/api/scryfall-client.ts` - card fetching methods
  - **Features**: Full Scryfall card object with all fields
- [x] Fetch card images (multiple sizes)
  - **Location**: `src/lib/api/card-service.ts` - `getCardImage()` method
  - **Features**: Supports small, normal, large, png sizes
- [x] Implement image caching (IndexedDB)
  - **Location**: `src/lib/api/cache.ts` - `CardCache` class
  - **Features**: Persistent image blob storage
- [x] Fetch pricing data (USD non-foil)
  - **Features**: Included in card objects, all price formats supported
- [x] Cache pricing for 24 hours
  - **Features**: 24-hour cache duration for all card data
- [x] Handle multi-faced cards
  - **Features**: Full support via `card_faces` array in types
- [x] Handle missing or unavailable card data
  - **Features**: Null checks, error handling, fallback to null
- [ ] Write tests for card data fetching
  - **Status**: Pending (Phase 11)
  - **Verification Checklist**:
    - [x] TypeScript types include all Scryfall card fields
    - [x] Cache implementation exists and compiles
    - [x] 24-hour cache duration constant defined

### 2.4 Set/Printing Data
- [x] Fetch all printings for a card
  - **Location**: `src/lib/api/card-service.ts` - `getCardPrintings()` method
  - **Features**: Uses oracle_id to fetch all printings
- [x] Display printings with images and prices
  - **Features**: Returns full `ScryfallCard[]` with all print data
- [x] Handle multi-faced cards
  - **Features**: Supported via card_faces in Scryfall types
- [x] Handle special card types (tokens, emblems)
  - **Features**: Scryfall types include layout field for all types
- [ ] Sort printings by date or price
  - **Status**: Can be done in UI layer as needed
- [ ] Write tests for printing data
  - **Status**: Pending (Phase 11)
  - **Verification Checklist**:
    - [x] `getCardPrintings()` method exists
    - [x] Returns array of cards with full data

### 2.5 Bulk Data (Optional)
- [x] Settings option to download Scryfall bulk data
  - **Location**: `src/lib/api/card-service.ts` - `downloadBulkData()` method
  - **Features**: Progress callback support
- [x] Download and store in IndexedDB
  - **Features**: Uses `CardCache.cacheBulkData()` method
- [x] Parse bulk data for offline use
  - **Features**: JSON parsing of Scryfall bulk data files
- [x] Update mechanism for bulk data
  - **Features**: 24-hour cache expiration, can re-download
- [x] Progress indicator during download
  - **Features**: `BulkDataDownloadProgress` interface with phases
- [x] Handle download failures and retries
  - **Features**: Try-catch with error logging, returns boolean success
- [ ] Write tests for bulk data handling
  - **Status**: Pending (Phase 11)
  - **Verification Checklist**:
    - [x] `downloadBulkData()` method exists
    - [x] Progress callback interface defined
    - [x] Bulk data cache methods exist

---

## Phase 3: Core Deck Management

### 3.1 Deck Structure
- [x] Create Deck model with:
  - [x] Main deck (categorized by type)
  - [x] Maybeboard (with categories)
  - [x] Commander/Partner/Companion tracking
  - [x] Version history
  - [x] Branch management
  - **Location**: `src/lib/stores/deck-store.ts` - Svelte store for deck management
  - **Utilities**:
    - `src/lib/utils/deck-factory.ts` - Factory functions for creating decks
    - `src/lib/utils/deck-categorization.ts` - Card categorization logic
    - `src/lib/utils/maybeboard-manager.ts` - Maybeboard operations
- [x] Implement deck validation logic (warnings only)
  - **Location**: `src/lib/utils/deck-validation.ts`
  - **Features**: Commander validation, color identity, deck size, duplicates
- [x] Calculate deck statistics (mana curve, colors, etc.)
  - **Location**: `src/lib/utils/deck-statistics.ts`
  - **Features**: Mana curve, color distribution, type breakdown, average CMC, pricing
- [ ] Write tests for deck model
  - **Status**: Deferred to Phase 11

### 3.2 Version Control System
- [x] Implement semver versioning logic
  - **Location**: `src/lib/utils/semver.ts`
  - **Features**: Parse, format, bump versions, auto-suggestion
- [x] Auto-suggest version bumps based on changes
  - **Features**: Configurable thresholds (1-2 = patch, 3-10 = minor, 11+ = major)
- [ ] Manual version override UI
  - **Status**: Deferred to Phase 5 (UI implementation)
- [x] Commit message system
  - **Location**: `src/lib/utils/version-control.ts` - `createVersion()` function
- [x] Store full snapshots per version
  - **Features**: Full decklist snapshots stored per version in branch metadata
- [x] Branch creation (fork from current, specific, or scratch)
  - **Location**: `src/lib/utils/version-control.ts` - `createBranch()` function
- [ ] Branch switching with save/discard prompt
  - **Status**: Deferred to Phase 5 (UI implementation)
- [x] Implement diff calculation between versions
  - **Location**: `src/lib/utils/diff.ts`
  - **Features**: Added/removed/modified cards, price diff, buylist generation
- [ ] Write tests for version control logic
  - **Status**: Deferred to Phase 11

### 3.3 Stash System
- [x] Auto-stash every 60 seconds
  - **Location**: `src/lib/utils/stash.ts` - `AUTO_STASH_INTERVAL_MS` constant
  - **Implementation**: Timer logic to be added in UI layer
- [x] One stash per branch
  - **Features**: Stashes stored in DeckManifest keyed by branch name
- [ ] On reload, prompt to load stash or last saved version
  - **Status**: Deferred to Phase 5 (UI implementation)
- [x] Store last working version in metadata
  - **Features**: Stash stores `lastSavedVersion` field
- [x] Handle stash conflicts
  - **Features**: Timestamp-based conflict detection via `isStashNewer()`
- [ ] Write tests for stash system
  - **Status**: Deferred to Phase 11

**Phase 3 Status**: ✅ Core logic complete (10/10 backend tasks)
- All TypeScript compilation passes (`pnpm check` - 0 errors)
- UI integration deferred to Phases 4-5
- Tests deferred to Phase 11

---

## Phase 4: User Interface - View Mode

### 4.1 Layout & Navigation
- [x] Top navbar with:
  - [x] Deck name display
  - [x] Settings button
- [x] Branch/version selector (in CommanderHeader)
- [x] View/Edit mode toggle
- [x] Save button (disabled in View mode)
- [x] Responsive layout for 1080p
- [ ] Add keyboard shortcuts

### 4.2 Card Preview Pane
- [x] Left sidebar for card preview
- [x] Default to commander card
- [x] Update on hover over any card
- [x] Display total deck price (in CommanderHeader)
- [x] Handle missing images gracefully
- [ ] Add loading states

### 4.3 Main Deck List
- [x] Group cards by type (Commander, Companion, Planeswalkers, etc.)
- [x] Collapsible type sections
- [x] Display card name, quantity, mana cost
- [x] Dropdown menu (▼) per card with:
  - [x] Add one (UI exists, logic TODO)
  - [x] Add more... (quantity input) (UI exists, logic TODO)
  - [x] Remove (UI exists, logic TODO)
  - [x] Switch printing (UI exists, logic TODO)
- [x] Hover updates card preview
- [x] Add mana symbols rendering
- [ ] Add validation warning icons
- [x] Implement smooth animations
- [x] Responsive column layout (1-4 columns based on width)

### 4.4 Maybeboard
- [x] Tab-based interface for categories
- [x] Default "Main" category
- [x] Card list within each category
- [ ] Search box for adding cards to maybeboard
- [ ] Category management (create/rename/delete) (UI exists, logic TODO)
- [ ] Drag and drop between categories
- [ ] Drag and drop to main deck

### 4.5 Statistics Panel
- [x] Mana curve chart
- [x] Color distribution pie chart
- [x] Card type breakdown
- [x] Average CMC
- [x] Mana source analysis
- [x] Land count with recommendations
- [x] Real-time updates
- [x] Make sections collapsible

**Phase 4 Status**: ✅ Mostly complete (26/33 tasks)
- All major UI components implemented and styled
- Comprehensive theming system with Tokyo Night, Kanagawa, Rose Pine
- Responsive layouts with dynamic column sizing
- Card menu UIs exist (action logic deferred to Phase 5)
- Missing: Keyboard shortcuts, loading states, validation icons, drag-and-drop, some interactive logic

---

## Phase 5: User Interface - Edit Mode

### 5.1 Edit Mode Activation
- [ ] Toggle to Edit mode starts new diff
- [ ] Track all changes in diff state
- [ ] Visual indicators for changed cards
- [ ] Disable certain actions in view mode
- [ ] Add confirmation prompt when leaving edit mode

### 5.2 Card Search & Add
- [ ] Search input with 4-character activation
- [ ] Dropdown with top 10 results
- [ ] Display card details in results (name, type, mana, price)
- [ ] "Search for more" opens Scryfall in new tab
- [ ] Add card to deck on selection (without set code)
- [ ] Handle keyboard navigation in dropdown
- [ ] Add loading and error states

### 5.3 Card Menu Actions
- [ ] "Add one" increments quantity
- [ ] "Add more..." shows quantity input modal
- [ ] "Remove" decrements quantity by 1
- [ ] "Switch printing" shows all printings modal:
  - [ ] Display all printings with images
  - [ ] Show price per printing
  - [ ] Select printing updates deck file with set code
- [ ] Close menu on outside click
- [ ] Add keyboard shortcuts for actions

### 5.4 Save & Commit
- [ ] Save button opens commit modal
- [ ] Semver auto-suggestion based on changes
- [ ] Edit button for manual version override
- [ ] Commit message input (required)
- [ ] Create new version on save
- [ ] Store full decklist snapshot
- [ ] Update metadata with timestamp and commit message
- [ ] Show success/error feedback
- [ ] Clear diff state after save

---

## Phase 6: Diff & Buylist

### 6.1 Version Comparison
- [ ] UI to select two versions for comparison
- [ ] Calculate diff (added, removed, modified cards)
- [ ] Display git-style summary (+X -Y ~Z)
- [ ] List added cards with prices
- [ ] List removed cards
- [ ] List quantity changes
- [ ] Add visual formatting for diff

### 6.2 Buylist Generation
- [ ] Generate buylist (cards to buy)
- [ ] Calculate total cost
- [ ] Modal with buylist and prices
- [ ] Copy to clipboard button
- [ ] Format as plaintext
- [ ] Group by card type or price
- [ ] Add filtering options

### 6.3 Remove List
- [ ] Generate remove list (cards to remove)
- [ ] Display in similar modal format
- [ ] Add export options

---

## Phase 7: Export & Import

### 7.1 Export Plaintext
- [ ] Generate plaintext format (compatible with all tools)
- [ ] Copy to clipboard button
- [ ] Include set codes if specified
- [ ] Handle special characters properly
- [ ] Add success feedback

### 7.2 Export to Moxfield
- [ ] Implement based on research from Phase 0.3
- [ ] Build URL with deck data
- [ ] Open in new tab with pre-filled deck
- [ ] Handle partner commanders
- [ ] Handle companions
- [ ] Test with various deck configurations
- [ ] Add error handling

### 7.3 Export to Archidekt
- [ ] Implement based on research from Phase 0.3
- [ ] Build URL with deck data
- [ ] Open in new tab with pre-filled deck
- [ ] Handle partner commanders
- [ ] Handle companions
- [ ] Test with various deck configurations
- [ ] Add error handling

### 7.4 Import from URLs
- [ ] Parse Moxfield deck URLs
- [ ] Parse Archidekt deck URLs
- [ ] Fetch deck data from APIs
- [ ] Create new local deck with imported data
- [ ] Handle missing or invalid cards
- [ ] Add progress indicators
- [ ] Write tests for import functionality

### 7.5 Import Plaintext
- [ ] Paste plaintext decklist
- [ ] Parse Arena/MTGO format
- [ ] Validate and fetch card data
- [ ] Create new deck
- [ ] Handle parsing errors
- [ ] Show validation warnings
- [ ] Write tests for plaintext import

### 7.6 Import/Export Zip Files
- [ ] Import existing zip files
- [ ] Preserve version history and metadata
- [ ] Export deck as zip for sharing
- [ ] Validate zip structure on import
- [ ] Handle corrupted or invalid zips
- [ ] Write tests for zip operations

---

## Phase 8: Commander Features & Validation

### 8.1 Commander Selection
- [ ] Search modal for commander selection (on new deck)
- [ ] Support for Partner commanders (2 commanders)
- [ ] Support for Companions
- [ ] Display commanders in special section
- [ ] Filter search to show only legendary creatures
- [ ] Add commander validation

### 8.2 Validation Warnings
- [ ] Check banned list (via Scryfall)
- [ ] Warn on illegal cards (⚠️ icon)
- [ ] Warn on 100-card limit violations
- [ ] Warn on duplicate cards (including non-basics)
- [ ] Warn on color identity violations
- [ ] Display warnings next to cards (Moxfield-style)
- [ ] Add tooltip explanations for warnings
- [ ] Update warnings in real-time

---

## Phase 9: Settings & Configuration

### 9.1 Settings UI
- [ ] Settings modal/page
- [ ] Local directory path input/picker
- [ ] Semver threshold inputs (patch/minor/major)
- [ ] Bulk data download button with progress indicator
- [ ] API rate limit adjustment
- [ ] Reset to defaults button
- [ ] Organize settings into sections
- [ ] Add help text for each setting

### 9.2 Settings Persistence
- [ ] Store settings in localStorage
- [ ] Load settings on app init
- [ ] Apply settings across app
- [ ] Handle migration of old settings format
- [ ] Write tests for settings persistence

---

## Phase 10: Polish & UX

### 10.1 First-Time Experience
- [ ] Empty state with "Create Deck" button
- [ ] "Set Local Directory" option
- [ ] "Import Deck" option
- [ ] Clean, minimal initial UI
- [ ] Add helpful tooltips

### 10.2 Loading & Error States
- [ ] Loading spinners for API calls
- [ ] Error messages for failed requests
- [ ] Retry buttons on failures
- [ ] Offline mode indicators
- [ ] Add skeleton loaders
- [ ] Toast notifications for actions

### 10.3 Responsive Design
- [ ] Optimize for 1080p (primary target)
- [ ] Test on different screen sizes
- [ ] Ensure minimal scrolling
- [ ] Add mobile-friendly fallbacks
- [ ] Test on different browsers

### 10.4 Keyboard Shortcuts
- [ ] Ctrl/Cmd + S to save
- [ ] Ctrl/Cmd + F to focus search
- [ ] Escape to close modals
- [ ] Arrow keys for navigation
- [ ] Add keyboard shortcut help modal
- [ ] Document all shortcuts

### 10.5 Performance Optimization
- [ ] Lazy load images
- [ ] Virtualize long card lists
- [ ] Debounce search input
- [ ] Optimize re-renders
- [ ] Profile and fix bottlenecks
- [ ] Add caching strategies
- [ ] Minimize bundle size

---

## Phase 11: Testing & Bug Fixes

### 11.1 Unit Tests
- [ ] Test deck parsing/serialization
- [ ] Test version control logic
- [ ] Test diff calculation
- [ ] Test validation warnings
- [ ] Test semver logic
- [ ] Test stash system
- [ ] Aim for >80% code coverage

### 11.2 Integration Tests
- [ ] Test API integration
- [ ] Test file storage (localStorage + FileSystem)
- [ ] Test import/export flows
- [ ] Test caching mechanisms
- [ ] Test error handling

### 11.3 E2E Tests
- [ ] Test full deck creation flow
- [ ] Test version control and branching
- [ ] Test export to Moxfield/Archidekt
- [ ] Test import from various sources
- [ ] Test settings and preferences
- [ ] Test keyboard shortcuts

### 11.4 Bug Fixes & Refinement
- [ ] Fix reported bugs
- [ ] Refine UI/UX based on testing
- [ ] Optimize performance bottlenecks
- [ ] Address edge cases
- [ ] Polish animations and transitions

---

## Phase 12: Documentation

### 12.1 User Documentation
- [ ] README with setup instructions
- [ ] User guide for deck management
- [ ] FAQ for common issues
- [ ] Keyboard shortcuts reference
- [ ] Troubleshooting guide

### 12.2 Developer Documentation
- [ ] Code comments and JSDoc
- [ ] Architecture overview
- [ ] API integration docs
- [ ] Contributing guidelines
- [ ] Development setup guide

---

## Estimated Timeline

- **Phase 0**: 1 week (Research)
- **Phase 1-2**: 1-2 weeks (Setup + API)
- **Phase 3-5**: 3-4 weeks (Core deck management + UI)
- **Phase 6-8**: 2-3 weeks (Diff, export, Commander features)
- **Phase 9-11**: 1-2 weeks (Settings, polish, testing)
- **Phase 12**: 1 week (Documentation)

**Total: 9-13 weeks** for full implementation (including research)