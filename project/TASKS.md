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
- [ ] **Scryfall API Research**
  - [ ] Read complete Scryfall API documentation
  - [ ] Test card search endpoints and rate limiting
  - [ ] Test card autocomplete endpoint
  - [ ] Test bulk data download endpoints
  - [ ] Document response formats and error handling
  - [ ] Test image URL formats and available sizes
  - [ ] Test pricing data structure and update frequency
  - [ ] Research Scryfall's legal/banned list endpoints
  - [ ] Document best practices for caching and rate limiting

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

- [x] Set up linting and formatting (ESLint, Prettier)
  - **Status**: ✅ Complete - Prettier configured
  - **Note**: ESLint not yet configured (Prettier-only setup)
  - **Verification Checklist**:
    - [ ] Verify .prettierrc exists with configuration
    - [ ] Verify .prettierignore exists
    - [ ] Run `pnpm format` and verify it formats files
    - [ ] Run `pnpm lint` and verify it checks formatting
    - [ ] Test formatting by creating a poorly formatted file and running format
    - [ ] Optional: Add ESLint if stricter linting is needed

### 1.2 File Format & Storage
- [ ] Define TypeScript interfaces for:
  - [ ] Deck manifest
  - [ ] Version metadata
  - [ ] Maybeboard structure
  - [ ] Stash format
  - [ ] Card object
  - [ ] Branch structure
- [ ] Implement plaintext parser (Arena/MTGO format with optional set codes)
- [ ] Implement plaintext serializer
- [ ] Create zip file utilities (compress/decompress deck archives)
- [ ] Implement sanitization for deck names (cross-platform filenames)
- [ ] Write tests for parser/serializer

### 1.3 LocalStorage & FileSystem API
- [ ] Create storage abstraction layer
- [ ] Implement localStorage fallback mode
- [ ] Implement FileSystem API integration
- [ ] Directory picker and path persistence
- [ ] Handle browser permissions for file access
- [ ] Implement error handling for storage operations
- [ ] Write tests for storage layer

---

## Phase 2: Scryfall API Integration

### 2.1 API Client
- [ ] Create Scryfall API client with rate limiting (100ms delay)
- [ ] Implement request queue system
- [ ] Add error handling and retry logic
- [ ] Create MTG API fallback client
- [ ] Implement configurable rate limit constant
- [ ] Add request/response logging for debugging
- [ ] Write tests for API client

### 2.2 Card Search
- [ ] Implement autocomplete search (triggers at 4 characters)
- [ ] Parse and display search results (top 10)
- [ ] Handle "Search for more" (open Scryfall in new tab)
- [ ] Display card name, mana cost, type in results
- [ ] Implement search debouncing
- [ ] Add loading states for search
- [ ] Write tests for search functionality

### 2.3 Card Data & Images
- [ ] Fetch card details (Oracle text, types, CMC, colors)
- [ ] Fetch card images (multiple sizes)
- [ ] Implement image caching (IndexedDB)
- [ ] Fetch pricing data (USD non-foil)
- [ ] Cache pricing for 24 hours
- [ ] Handle multi-faced cards
- [ ] Handle missing or unavailable card data
- [ ] Write tests for card data fetching

### 2.4 Set/Printing Data
- [ ] Fetch all printings for a card
- [ ] Display printings with images and prices
- [ ] Handle multi-faced cards
- [ ] Handle special card types (tokens, emblems)
- [ ] Sort printings by date or price
- [ ] Write tests for printing data

### 2.5 Bulk Data (Optional)
- [ ] Settings option to download Scryfall bulk data
- [ ] Download and store in IndexedDB
- [ ] Parse bulk data for offline use
- [ ] Update mechanism for bulk data
- [ ] Progress indicator during download
- [ ] Handle download failures and retries
- [ ] Write tests for bulk data handling

---

## Phase 3: Core Deck Management

### 3.1 Deck Structure
- [ ] Create Deck model with:
  - [ ] Main deck (categorized by type)
  - [ ] Maybeboard (with categories)
  - [ ] Commander/Partner/Companion tracking
  - [ ] Version history
  - [ ] Branch management
- [ ] Implement deck validation logic (warnings only)
- [ ] Calculate deck statistics (mana curve, colors, etc.)
- [ ] Write tests for deck model

### 3.2 Version Control System
- [ ] Implement semver versioning logic
- [ ] Auto-suggest version bumps based on changes
- [ ] Manual version override UI
- [ ] Commit message system
- [ ] Store full snapshots per version
- [ ] Branch creation (fork from current, specific, or scratch)
- [ ] Branch switching with save/discard prompt
- [ ] Implement diff calculation between versions
- [ ] Write tests for version control logic

### 3.3 Stash System
- [ ] Auto-stash every 60 seconds
- [ ] One stash per branch
- [ ] On reload, prompt to load stash or last saved version
- [ ] Store last working version in metadata
- [ ] Handle stash conflicts
- [ ] Write tests for stash system

---

## Phase 4: User Interface - View Mode

### 4.1 Layout & Navigation
- [ ] Top navbar with:
  - [ ] Deck name display
  - [ ] Settings button
- [ ] Branch/version selector
- [ ] View/Edit mode toggle
- [ ] Save button (disabled in View mode)
- [ ] Responsive layout for 1080p
- [ ] Add keyboard shortcuts

### 4.2 Card Preview Pane
- [ ] Left sidebar for card preview
- [ ] Default to commander card
- [ ] Update on hover over any card
- [ ] Display total deck price below image
- [ ] Handle missing images gracefully
- [ ] Add loading states

### 4.3 Main Deck List
- [ ] Group cards by type (Commander, Companion, Planeswalkers, etc.)
- [ ] Collapsible type sections
- [ ] Display card name, quantity, mana cost
- [ ] Dropdown menu (▼) per card with:
  - [ ] Add one
  - [ ] Add more... (quantity input)
  - [ ] Remove
  - [ ] Switch printing
- [ ] Hover updates card preview
- [ ] Add mana symbols rendering
- [ ] Add validation warning icons
- [ ] Implement smooth animations

### 4.4 Maybeboard
- [ ] Tab-based interface for categories
- [ ] Default "Main" category
- [ ] Card list within each category
- [ ] Search box for adding cards to maybeboard
- [ ] Category management (create/rename/delete)
- [ ] Drag and drop between categories
- [ ] Drag and drop to main deck

### 4.5 Statistics Panel
- [ ] Mana curve chart
- [ ] Color distribution pie chart
- [ ] Card type breakdown
- [ ] Average CMC
- [ ] Mana source analysis
- [ ] Land count with recommendations
- [ ] Real-time updates
- [ ] Make sections collapsible

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