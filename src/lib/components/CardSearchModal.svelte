<script lang="ts">
  import { cardService } from "$lib/api/card-service";
  import { deckStore } from "$lib/stores/deck-store";
  import { toastStore } from "$lib/stores/toast-store";
  import BaseModal from "./BaseModal.svelte";
  import type { CardSearchResult } from "$lib/api/card-service";
  import type { Card } from "$lib/types/card";
  import type { ScryfallCard } from "$lib/types/scryfall";
  import CardPreviewInfo from "./CardPreviewInfo.svelte";
  import ManaSymbol from "./ManaSymbol.svelte";
  import GameChangerBadge from "./GameChangerBadge.svelte";
  import { MIN_SEARCH_CHARACTERS } from "$lib/constants/search";
  import { scryfallToCard } from "$lib/utils/card-converter";
  import { isGameChanger } from "$lib/utils/game-changers";

  let {
    isOpen = false,
    addToMaybeboard = false,
    maybeboardCategoryId = undefined,
    initialQuery = "",
    onClose,
  }: {
    isOpen?: boolean;
    addToMaybeboard?: boolean;
    maybeboardCategoryId?: string | undefined;
    initialQuery?: string;
    onClose: () => void;
  } = $props();

  let searchQuery = $state("");
  let allResults = $state<CardSearchResult[]>([]);
  let totalCards = $state(0);
  let currentPage = $state(1);
  const itemsPerPage = 50;
  let isLoading = $state(false);
  let debounceTimer: number | undefined;
  let selectedResult = $state<CardSearchResult | null>(null);
  let selectedCardFull = $state<Card | null>(null);
  let selectedScryfallCard = $state<ScryfallCard | null>(null);
  let loadingCardDetails = $state(false);

  // Flip animation state
  let currentFaceIndex = $state(0);

  // Check if selected card has multiple faces
  let isDoubleFaced = $derived(
    selectedCardFull?.cardFaces && selectedCardFull.cardFaces.length > 1
  );

  // Debug logging for double-faced cards
  $effect(() => {
    if (selectedCardFull) {
      if (selectedCardFull.layout && (selectedCardFull.layout === 'modal_dfc' || selectedCardFull.layout === 'transform')) {
        console.log('[CardSearchModal] Double-faced card detected:', {
          name: selectedCardFull.name,
          layout: selectedCardFull.layout,
          hasCardFaces: !!selectedCardFull.cardFaces,
          cardFacesCount: selectedCardFull.cardFaces?.length || 0,
          isDoubleFaced,
          willShowFlipButton: isDoubleFaced
        });
      }
    }
  });

  let commanderLegalOnly = $state(true);

  // Track whether modal was previously open (to detect opening transition)
  let wasOpen = $state(false);

  // Subscribe to deck store to get commander color identity
  let deckStoreState = $state($deckStore);
  $effect(() => {
    const unsubscribe = deckStore.subscribe((value) => {
      deckStoreState = value;
    });
    return unsubscribe;
  });

  // Get commander color identity
  let commanderColors = $derived(() => {
    const commanders = deckStoreState?.deck?.cards?.commander;
    if (!commanders || commanders.length === 0) return [];

    // Combine all commander color identities
    const allColors = new Set<string>();
    for (const commander of commanders) {
      if (commander.colorIdentity) {
        for (const color of commander.colorIdentity) {
          allColors.add(color);
        }
      }
    }

    // Sort in WUBRG order for Scryfall
    const colorOrder = ["W", "U", "B", "R", "G"];
    return Array.from(allColors).sort(
      (a, b) => colorOrder.indexOf(a) - colorOrder.indexOf(b),
    );
  });

  // Paginated results for current page
  let results = $derived(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return allResults.slice(start, end);
  });

  // Calculate total pages
  let totalPages = $derived(Math.ceil(allResults.length / itemsPerPage));

  // Check if a card is outside commander's color identity
  function isOutsideColorIdentity(cardResult: CardSearchResult): boolean {
    const cmdColors = commanderColors();
    // If no commander, all cards are valid
    if (cmdColors.length === 0) return false;

    // If card has no color identity, it's colorless and valid for all decks
    if (!cardResult.color_identity || cardResult.color_identity.length === 0)
      return false;

    // Check if any color in the card's identity is NOT in the commander's identity
    const commanderColorSet = new Set(cmdColors);
    for (const color of cardResult.color_identity) {
      if (!commanderColorSet.has(color)) {
        return true; // Card has a color not in commander's identity
      }
    }

    return false; // All colors are within commander's identity
  }

  // Reset only when modal first opens (not when initialQuery changes)
  $effect(() => {
    // Only reset when transitioning from closed to open
    if (isOpen && !wasOpen) {
      searchQuery = initialQuery;
      allResults = [];
      totalCards = 0;
      currentPage = 1;
      selectedResult = null;
      selectedCardFull = null;
      selectedScryfallCard = null;
      commanderLegalOnly = true;

      // Trigger search if there's an initial query
      if (initialQuery && initialQuery.length >= MIN_SEARCH_CHARACTERS) {
        handleInput();
      }
    }

    // Track the previous open state
    wasOpen = isOpen;
  });

  async function handleInput() {
    // Clear previous timer
    if (debounceTimer) clearTimeout(debounceTimer);

    // Only search if enough characters
    if (searchQuery.length < MIN_SEARCH_CHARACTERS) {
      allResults = [];
      totalCards = 0;
      currentPage = 1;
      return;
    }

    // Debounce the search
    debounceTimer = window.setTimeout(async () => {
      isLoading = true;
      currentPage = 1; // Reset to first page on new search

      try {
        // Build search query - always show Commander-legal cards
        let query = searchQuery + " format:commander";

        // Fetch ALL results across all pages
        const { cards, totalCards: total } = await cardService.searchCardsAll(
          query,
          false,
        );

        totalCards = total;

        // Sort results: prioritize exact matches first, then starts-with
        const sorted = cards.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const searchLower = searchQuery.toLowerCase();

          // Exact match priority
          const aExact = aName === searchLower;
          const bExact = bName === searchLower;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

          // Starts-with priority
          const aStartsWith = aName.startsWith(searchLower);
          const bStartsWith = bName.startsWith(searchLower);
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;

          // Alphabetical fallback
          return aName.localeCompare(bName);
        });

        // Filter out cards outside color identity if checkbox is checked
        allResults = commanderLegalOnly
          ? sorted.filter((card) => !isOutsideColorIdentity(card))
          : sorted;
      } catch (error) {
        console.error("Search error:", error);
        allResults = [];
        totalCards = 0;
      } finally {
        isLoading = false;
      }
    }, 300);
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage++;
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
    }
  }

  async function selectCard(result: CardSearchResult) {
    selectedResult = result;
    loadingCardDetails = true;

    try {
      // Fetch full card data
      let scryfallCard;

      if (result.set && result.collector_number) {
        scryfallCard = await cardService.getCardBySetAndNumber(
          result.set,
          result.collector_number,
          result.name,
        );
      } else {
        scryfallCard = await cardService.getCardByName(result.name);
      }

      if (!scryfallCard) {
        toastStore.error(
          `Failed to fetch card: ${result.name}`,
          0,
          `The card was found in search results but could not be fetched from Scryfall.`,
        );
        loadingCardDetails = false;
        return;
      }

      // Convert to our Card type
      const card = scryfallToCard(scryfallCard);

      selectedCardFull = card;
      selectedScryfallCard = scryfallCard;
      loadingCardDetails = false;

      // Reset to front face when new card is selected
      currentFaceIndex = 0;
    } catch (error) {
      console.error("Error selecting card:", error);
      toastStore.error("Failed to fetch card data");
      loadingCardDetails = false;
    }
  }

  function toggleFace() {
    if (isDoubleFaced) {
      // Toggle between front (0) and back (1) face
      currentFaceIndex = currentFaceIndex === 0 ? 1 : 0;
    }
  }

  async function addToDecklist() {
    if (!selectedCardFull) return;

    try {
      deckStore.addCard(selectedCardFull);
      toastStore.success(`Added ${selectedCardFull.name} to decklist`);
      onClose();
    } catch (error) {
      console.error("Error adding card:", error);
      toastStore.error(`Failed to add ${selectedCardFull.name}`);
    }
  }

  async function addToMaybeboardList() {
    if (!selectedCardFull) return;

    try {
      // Add to maybeboard - if maybeboardCategoryId is provided, use it, otherwise use "main"
      deckStore.addCardToMaybeboard(selectedCardFull, maybeboardCategoryId || "main");
      toastStore.success(`Added ${selectedCardFull.name} to maybeboard`);
      onClose();
    } catch (error) {
      console.error("Error adding card:", error);
      toastStore.error(`Failed to add ${selectedCardFull.name}`);
    }
  }

  function searchOnScryfall() {
    const query = encodeURIComponent(searchQuery);
    window.open(`https://scryfall.com/search?q=${query}`, "_blank");
  }
</script>

<BaseModal
  {isOpen}
  {onClose}
  title="Search All Cards"
  subtitle={addToMaybeboard
    ? "Search for any card to add to your maybeboard"
    : "Search for any card to add to your deck"}
  size="4xl"
  height="h-[85vh]"
  contentClass="flex flex-col"
>
  {#snippet children()}
    <!-- Wrapper to ensure proper flex layout -->
    <div class="flex flex-col h-full">
      <!-- Body - Split Layout -->
      <div class="flex-1 flex overflow-hidden min-h-0">
      <!-- Left Side: Search and Results -->
      <div class="w-1/2 border-r border-[var(--color-border)] flex flex-col min-h-0">
        <!-- Search Input -->
        <div class="p-4 border-b border-[var(--color-border)] space-y-3">
          <div class="relative">
            <input
              type="text"
              bind:value={searchQuery}
              oninput={handleInput}
              placeholder="Search for cards (min {MIN_SEARCH_CHARACTERS} characters)..."
              class="w-full px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
            />

            {#if isLoading}
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <div
                  class="w-5 h-5 border-2 border-[var(--color-brand-primary)] border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
            {/if}
          </div>

          <!-- Commander-legal filter toggle -->
          <label
            class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer"
          >
            <input
              type="checkbox"
              bind:checked={commanderLegalOnly}
              oninput={handleInput}
              class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary)]"
            />
            <span>
              {#if commanderColors().length > 0}
                Search only cards within commander's color identity
                <span class="inline-flex gap-0.5 ml-1">
                  {#each commanderColors() as color}
                    <i
                      class="ms ms-{color.toLowerCase()} ms-cost ms-shadow text-sm"
                      title={color}
                    ></i>
                  {/each}
                </span>
              {:else}
                Commander-legal cards only
              {/if}
            </span>
          </label>

          {#if allResults.length > 0}
            <p class="text-xs text-[var(--color-text-tertiary)]">
              Found {allResults.length} cards • Showing {(currentPage - 1) *
                itemsPerPage +
                1}-{Math.min(currentPage * itemsPerPage, allResults.length)} of {allResults.length}
            </p>
          {/if}
        </div>

        <!-- Search Results -->
        <div class="flex-1 overflow-y-auto p-4">
          {#if results().length > 0}
            <div class="space-y-2">
              {#each results() as result}
                <button
                  onclick={() => selectCard(result)}
                  class="w-full px-4 py-2 text-left rounded border-2 transition-all {selectedResult?.id ===
                  result.id
                    ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)]'}"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex-1 min-w-0 flex items-center gap-2">
                      {#if isOutsideColorIdentity(result)}
                        <span
                          class="text-red-500 font-bold flex-shrink-0"
                          title="Outside commander's color identity">!</span
                        >
                      {/if}
                      <span
                        class="font-medium text-[var(--color-text-primary)] truncate"
                      >
                        {result.name}
                      </span>
                    </div>
                    {#if result.mana_cost}
                      <div class="flex-shrink-0" style="transform: translateY(4px);">
                        <ManaSymbol cost={result.mana_cost} size="xs" />
                      </div>
                    {/if}
                  </div>
                </button>
              {/each}
            </div>

            <!-- Pagination Controls -->
            {#if totalPages > 1}
              <div class="mt-4 flex items-center justify-center gap-2">
                <button
                  onclick={prevPage}
                  disabled={currentPage === 1}
                  class="px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <div class="flex items-center gap-1">
                  {#if totalPages <= 7}
                    <!-- Show all pages if 7 or fewer -->
                    {#each Array(totalPages) as _, i}
                      <button
                        onclick={() => goToPage(i + 1)}
                        class="w-8 h-8 rounded {currentPage === i + 1
                          ? 'bg-[var(--color-brand-primary)] text-white'
                          : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'} border border-[var(--color-border)] transition-colors"
                      >
                        {i + 1}
                      </button>
                    {/each}
                  {:else}
                    <!-- Show truncated pagination for many pages -->
                    {#if currentPage <= 3}
                      {#each Array(5) as _, i}
                        <button
                          onclick={() => goToPage(i + 1)}
                          class="w-8 h-8 rounded {currentPage === i + 1
                            ? 'bg-[var(--color-brand-primary)] text-white'
                            : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'} border border-[var(--color-border)] transition-colors"
                        >
                          {i + 1}
                        </button>
                      {/each}
                      <span class="px-2 text-[var(--color-text-tertiary)]"
                        >...</span
                      >
                      <button
                        onclick={() => goToPage(totalPages)}
                        class="w-8 h-8 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] transition-colors"
                      >
                        {totalPages}
                      </button>
                    {:else if currentPage >= totalPages - 2}
                      <button
                        onclick={() => goToPage(1)}
                        class="w-8 h-8 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] transition-colors"
                      >
                        1
                      </button>
                      <span class="px-2 text-[var(--color-text-tertiary)]"
                        >...</span
                      >
                      {#each Array(5) as _, i}
                        <button
                          onclick={() => goToPage(totalPages - 4 + i)}
                          class="w-8 h-8 rounded {currentPage ===
                          totalPages - 4 + i
                            ? 'bg-[var(--color-brand-primary)] text-white'
                            : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'} border border-[var(--color-border)] transition-colors"
                        >
                          {totalPages - 4 + i}
                        </button>
                      {/each}
                    {:else}
                      <button
                        onclick={() => goToPage(1)}
                        class="w-8 h-8 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] transition-colors"
                      >
                        1
                      </button>
                      <span class="px-2 text-[var(--color-text-tertiary)]"
                        >...</span
                      >
                      {#each Array(3) as _, i}
                        <button
                          onclick={() => goToPage(currentPage - 1 + i)}
                          class="w-8 h-8 rounded {currentPage ===
                          currentPage - 1 + i
                            ? 'bg-[var(--color-brand-primary)] text-white'
                            : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'} border border-[var(--color-border)] transition-colors"
                        >
                          {currentPage - 1 + i}
                        </button>
                      {/each}
                      <span class="px-2 text-[var(--color-text-tertiary)]"
                        >...</span
                      >
                      <button
                        onclick={() => goToPage(totalPages)}
                        class="w-8 h-8 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] transition-colors"
                      >
                        {totalPages}
                      </button>
                    {/if}
                  {/if}
                </div>

                <button
                  onclick={nextPage}
                  disabled={currentPage === totalPages}
                  class="px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            {/if}
          {:else if searchQuery.length >= 4 && !isLoading}
            <div class="text-center py-12 space-y-4">
              <div class="text-[var(--color-text-secondary)]">
                No cards found for "{searchQuery}"
              </div>
              <button
                onclick={searchOnScryfall}
                class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
              >
                Search on Scryfall →
              </button>
            </div>
          {:else if searchQuery.length > 0 && searchQuery.length < 4}
            <div class="text-center py-12 text-[var(--color-text-tertiary)]">
              Type at least 4 characters to search
            </div>
          {:else}
            <div class="text-center py-12 text-[var(--color-text-tertiary)]">
              Start typing to search for cards
            </div>
          {/if}
        </div>
      </div>

      <!-- Right Side: Large Card Preview -->
      <div
        class="w-1/2 flex flex-col p-6 bg-[var(--color-bg-primary)] overflow-hidden min-h-0"
      >
        <div class="flex-1 overflow-y-auto flex items-start justify-center">
          {#if loadingCardDetails}
            <div class="text-center pt-12">
              <div
                class="w-12 h-12 border-4 border-[var(--color-brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"
              ></div>
              <p class="text-[var(--color-text-secondary)]">
                Loading card details...
              </p>
            </div>
          {:else if selectedCardFull && selectedScryfallCard}
            <div class="w-full max-w-md">
              <!-- Large Card Image with 3D Flip -->
              <div class="perspective-container mb-2">
                <div class="flip-card" class:is-flipped={currentFaceIndex === 1}>
                  <!-- Front Face -->
                  <div class="card-face card-face--front">
                    {#if isDoubleFaced && selectedCardFull.cardFaces?.[0]?.imageUrls}
                      <div class="relative w-full h-full overflow-hidden rounded-lg">
                        <img
                          src={selectedCardFull.cardFaces[0].imageUrls.large || selectedCardFull.cardFaces[0].imageUrls.normal}
                          alt={selectedCardFull.cardFaces[0].name || selectedCardFull.name}
                          class="w-full h-full object-cover rounded-lg shadow-2xl"
                        />
                        {#if isGameChanger(selectedCardFull.name)}
                          <GameChangerBadge position="left" />
                        {/if}
                      </div>
                    {:else if selectedCardFull.imageUrls}
                      <div class="relative w-full h-full overflow-hidden rounded-lg">
                        <img
                          src={selectedCardFull.imageUrls.large || selectedCardFull.imageUrls.normal}
                          alt={selectedCardFull.name}
                          class="w-full h-full object-cover rounded-lg shadow-2xl"
                        />
                        {#if isGameChanger(selectedCardFull.name)}
                          <GameChangerBadge position="left" />
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <!-- Back Face -->
                  <div class="card-face card-face--back">
                    {#if isDoubleFaced && selectedCardFull.cardFaces?.[1]?.imageUrls}
                      <div class="relative w-full h-full overflow-hidden rounded-lg">
                        <img
                          src={selectedCardFull.cardFaces[1].imageUrls.large || selectedCardFull.cardFaces[1].imageUrls.normal}
                          alt={selectedCardFull.cardFaces[1].name || 'Card back'}
                          class="w-full h-full object-cover rounded-lg shadow-2xl"
                        />
                        {#if isGameChanger(selectedCardFull.name)}
                          <GameChangerBadge position="left" />
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>

              <!-- Flip button for double-faced cards -->
              {#if isDoubleFaced}
                <button
                  type="button"
                  onclick={toggleFace}
                  class="w-full mb-4 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded py-2 px-3 transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium"
                  aria-label="Flip to {currentFaceIndex === 0 ? 'back' : 'front'} face"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M17 3l4 4-4 4" />
                    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                    <path d="M7 21l-4-4 4-4" />
                    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                  </svg>
                  <span>Turn Over</span>
                </button>
              {/if}

              <!-- Card Info -->
              <CardPreviewInfo card={selectedCardFull} scryfallCard={selectedScryfallCard} />
            </div>
          {:else}
            <div class="text-center text-[var(--color-text-tertiary)] pt-12">
              <svg
                class="w-24 h-24 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p>Select a card to preview</p>
            </div>
          {/if}
        </div>
      </div>
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center flex-shrink-0"
      >
      <div class="text-sm text-[var(--color-text-secondary)]">
        {#if selectedCardFull}
          <span class="text-green-400">✓ Card selected</span>
        {:else}
          Select a card to continue
        {/if}
      </div>
      <div class="flex gap-3">
        <button
          onclick={onClose}
          class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
        >
          Cancel
        </button>
        <button
          onclick={addToMaybeboardList}
          disabled={!selectedCardFull}
          class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Card to Maybeboard
        </button>
        <button
          onclick={addToDecklist}
          disabled={!selectedCardFull}
          class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Card to Decklist
        </button>
      </div>
      </div>
    </div>
  {/snippet}
</BaseModal>

<style>
  .perspective-container {
    perspective: 1000px;
    width: 100%;
  }

  .flip-card {
    width: 100%;
    transform-style: preserve-3d;
    transition: transform 0.6s ease-in-out;
    position: relative;
    /* Maintain aspect ratio even with absolute children */
    aspect-ratio: 5 / 7;
  }

  .flip-card.is-flipped {
    transform: rotateY(180deg);
  }

  .card-face {
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    position: absolute;
    top: 0;
    left: 0;
  }

  .card-face--front {
    /* Front face is at 0 degrees */
  }

  .card-face--back {
    /* Back face is pre-rotated 180 degrees */
    transform: rotateY(180deg);
  }
</style>
