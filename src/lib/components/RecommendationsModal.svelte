<script lang="ts">
  /**
   * EDHREC Recommendations Modal
   *
   * Displays card recommendations from EDHREC for a given commander.
   * Features:
   * - Card grid with images from Scryfall
   * - Multi-select functionality
   * - Category filtering
   * - Synergy threshold filtering
   * - Hide cards already in deck
   * - Hide cards already in maybeboard
   * - Bulk add to deck or maybeboard
   */

  import { type Snippet } from "svelte";
  import BaseModal from "./BaseModal.svelte";
  import { edhrecService } from "$lib/api/edhrec-service";
  import { cardService } from "$lib/api/card-service";
  import { deckStore } from "$lib/stores/deck-store";
  import { toastStore } from "$lib/stores/toast-store";
  import { imageCache } from "$lib/utils/image-cache";
  import type { EDHRECCardRecommendation } from "$lib/types/edhrec";
  import type { Card } from "$lib/types/card";
  import type { ScryfallCard } from "$lib/types/scryfall";
  import { scryfallToCard } from "$lib/utils/card-converter";

  let {
    isOpen = false,
    commanderName = "",
    onClose,
  }: {
    isOpen?: boolean;
    commanderName?: string;
    onClose: () => void;
  } = $props();

  // State
  let isLoading = $state(false);
  let allRecommendations = $state<EDHRECCardRecommendation[]>([]);
  let categories = $state<string[]>([]);
  let selectedCategory = $state<string>("High Synergy Cards");
  let minSynergy = $state(0);
  let minUsage = $state(0);
  let hideOwnedCards = $state(true);
  let hideMaybeboardCards = $state(true);
  let selectedCards = $state<Set<string>>(new Set());
  let hoveredCard = $state<EDHRECCardRecommendation | null>(null);
  let previewImage = $state<string | null>(null);
  let isLoadingPreview = $state(false);

  // In-memory cache for card images (map of card name -> image URL)
  // Fast access during current session, backed by persistent localStorage cache
  let cardImageCache = $state<Map<string, string>>(new Map());

  // Subscribe to deck store
  let deckStoreState = $state($deckStore);
  $effect(() => {
    const unsubscribe = deckStore.subscribe((value) => {
      deckStoreState = value;
    });
    return unsubscribe;
  });

  // Get cards currently in deck (for filtering)
  let cardsInDeck = $derived(() => {
    const deck = deckStoreState?.deck;
    if (!deck) return new Set<string>();

    const cardNames = new Set<string>();

    // Add all cards from all categories
    Object.values(deck.cards).forEach((categoryCards) => {
      if (Array.isArray(categoryCards)) {
        categoryCards.forEach((card) => {
          cardNames.add(card.name.toLowerCase());
        });
      }
    });

    return cardNames;
  });

  // Get cards currently in maybeboard (for filtering)
  let cardsInMaybeboard = $derived(() => {
    const maybeboard = deckStoreState?.maybeboard;
    if (!maybeboard || !maybeboard.categories) return new Set<string>();

    const cardNames = new Set<string>();

    // Add all cards from all maybeboard categories
    maybeboard.categories.forEach((category) => {
      category.cards.forEach((card) => {
        cardNames.add(card.name.toLowerCase());
      });
    });

    return cardNames;
  });

  // Filtered recommendations based on selected category and filters
  let filteredRecommendations = $derived(() => {
    let filtered = allRecommendations.filter((rec) => {
      // Category filter
      if (rec.category !== selectedCategory) return false;

      // Synergy threshold
      if (rec.synergyScore < minSynergy) return false;

      // Usage threshold
      if (rec.inclusionRate < minUsage) return false;

      // Hide owned cards
      if (hideOwnedCards && cardsInDeck().has(rec.name.toLowerCase())) {
        return false;
      }

      // Hide maybeboard cards
      if (hideMaybeboardCards && cardsInMaybeboard().has(rec.name.toLowerCase())) {
        return false;
      }

      return true;
    });

    // Sort by synergy score descending
    return filtered.sort((a, b) => b.synergyScore - a.synergyScore);
  });

  // Track which cards are currently loading
  let loadingCards = $state<Set<string>>(new Set());

  // Lazy load images for current category only
  $effect(() => {
    // Only fetch images for the currently selected category
    const currentCategoryCards = filteredRecommendations();

    // Fetch ALL images for the current category (in parallel)
    // Scryfall can handle this - it has good rate limiting
    const toLoad: string[] = [];
    currentCategoryCards.forEach((rec) => {
      if (!cardImageCache.has(rec.name) && !loadingCards.has(rec.name)) {
        toLoad.push(rec.name);
      }
    });

    if (toLoad.length > 0) {
      // Add to loading set (create new Set for reactivity)
      const newLoadingCards = new Set(loadingCards);
      toLoad.forEach((name) => newLoadingCards.add(name));
      loadingCards = newLoadingCards;

      // Fetch images
      toLoad.forEach((name) => fetchCardImageWithLoading(name));

      console.log(
        `[Recommendations] Loading ${toLoad.length} images for category "${selectedCategory}"`,
      );
    }
  });

  // Track last fetched commander to avoid re-fetching
  let lastFetchedCommander = $state("");

  // Fetch recommendations when modal opens or commander changes
  $effect(() => {
    if (isOpen && commanderName && commanderName !== lastFetchedCommander) {
      lastFetchedCommander = commanderName;
      fetchRecommendations();
    }
  });

  // Reset state when modal closes
  $effect(() => {
    if (!isOpen) {
      selectedCards = new Set();
      hoveredCard = null;
      previewImage = null;
      lastFetchedCommander = "";
    }
  });

  async function fetchRecommendations() {
    isLoading = true;
    try {
      console.log(`[Recommendations] Fetching for commander: ${commanderName}`);
      const data =
        await edhrecService.getCommanderRecommendations(commanderName);

      console.log("[Recommendations] Raw EDHREC data:", data);
      console.log("[Recommendations] Cardlists:", data.cardlists);

      // Extract all recommendations and organize by category
      const recs: EDHRECCardRecommendation[] = [];
      const categorySet = new Set<string>();

      data.cardlists.forEach((list) => {
        console.log(
          `[Recommendations] Processing list: ${list.header}, cards: ${list.cards.length}`,
        );
        categorySet.add(list.header);
        list.cards.forEach((card) => {
          recs.push({
            ...card,
            category: list.header,
          });
        });
      });

      allRecommendations = recs;
      categories = Array.from(categorySet);

      console.log(
        `[Recommendations] Loaded ${recs.length} recommendations in ${categories.length} categories`,
      );
      console.log("[Recommendations] Categories:", categories);

      // Default to "High Synergy Cards" if available
      if (categories.includes("High Synergy Cards")) {
        selectedCategory = "High Synergy Cards";
      } else if (categories.length > 0) {
        selectedCategory = categories[0];
      }
    } catch (error) {
      console.error("[Recommendations] Error fetching recommendations:", error);
      if (error instanceof Error) {
        console.error("[Recommendations] Error message:", error.message);
        console.error("[Recommendations] Error stack:", error.stack);
      }
      toastStore.error("Failed to fetch EDHREC recommendations", 5000);
    } finally {
      isLoading = false;
    }
  }

  function toggleCardSelection(
    cardName: string,
    rec: EDHRECCardRecommendation,
  ) {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardName)) {
      newSelection.delete(cardName);
    } else {
      newSelection.add(cardName);
      // When selecting a card, show it in preview panel
      handleCardHover(rec);
    }
    selectedCards = newSelection;
  }

  function selectAll() {
    const newSelection = new Set<string>();
    const recs = filteredRecommendations();
    recs.forEach((rec) => {
      newSelection.add(rec.name);
    });
    selectedCards = newSelection;

    // Show first card in preview when selecting all
    if (recs.length > 0) {
      handleCardHover(recs[0]);
    }
  }

  function deselectAll() {
    selectedCards = new Set();
    // Clear preview when deselecting all
    hoveredCard = null;
    previewImage = null;
    isLoadingPreview = false;
  }

  async function addSelectedToDeck() {
    if (selectedCards.size === 0) {
      toastStore.warning("No cards selected");
      return;
    }

    const cardNames = Array.from(selectedCards);
    let addedCount = 0;
    let failedCount = 0;

    toastStore.info(`Adding ${cardNames.length} cards to deck...`, 3000);

    for (const cardName of cardNames) {
      try {
        // Fetch full card data from Scryfall
        const scryfallCard = await cardService.getCardByName(cardName);
        if (!scryfallCard) {
          console.warn(`[Recommendations] Could not fetch card: ${cardName}`);
          failedCount++;
          continue;
        }

        // Convert to our Card type
        const card = scryfallToCard(scryfallCard);

        // Add to deck
        deckStore.addCard(card);
        addedCount++;
      } catch (error) {
        console.error(
          `[Recommendations] Error adding card ${cardName}:`,
          error,
        );
        failedCount++;
      }
    }

    // Clear selection
    selectedCards = new Set();

    // Show result toast
    if (addedCount > 0) {
      toastStore.success(
        `Added ${addedCount} card${addedCount > 1 ? "s" : ""} to deck`,
        5000,
      );
    }
    if (failedCount > 0) {
      toastStore.error(
        `Failed to add ${failedCount} card${failedCount > 1 ? "s" : ""}`,
        5000,
      );
    }
  }

  async function addSelectedToMaybeboard() {
    if (selectedCards.size === 0) {
      toastStore.warning("No cards selected");
      return;
    }

    const cardNames = Array.from(selectedCards);
    let addedCount = 0;
    let failedCount = 0;

    toastStore.info(`Adding ${cardNames.length} cards to maybeboard...`, 3000);

    for (const cardName of cardNames) {
      try {
        // Fetch full card data from Scryfall
        const scryfallCard = await cardService.getCardByName(cardName);
        if (!scryfallCard) {
          console.warn(`[Recommendations] Could not fetch card: ${cardName}`);
          failedCount++;
          continue;
        }

        // Convert to our Card type
        const card = scryfallToCard(scryfallCard);

        // Add to maybeboard (no category specified)
        deckStore.addCardToMaybeboard(card);
        addedCount++;
      } catch (error) {
        console.error(
          `[Recommendations] Error adding card ${cardName}:`,
          error,
        );
        failedCount++;
      }
    }

    // Clear selection
    selectedCards = new Set();

    // Show result toast
    if (addedCount > 0) {
      toastStore.success(
        `Added ${addedCount} card${addedCount > 1 ? "s" : ""} to maybeboard`,
        5000,
      );
    }
    if (failedCount > 0) {
      toastStore.error(
        `Failed to add ${failedCount} card${failedCount > 1 ? "s" : ""}`,
        5000,
      );
    }
  }

  // Fetch card image from Scryfall and cache it (with loading state)
  async function fetchCardImageWithLoading(cardName: string) {
    // Check in-memory cache first
    if (cardImageCache.has(cardName)) {
      // Remove from loading set (create new Set for reactivity)
      const newLoadingCards = new Set(loadingCards);
      newLoadingCards.delete(cardName);
      loadingCards = newLoadingCards;
      return;
    }

    // Check persistent cache second (localStorage)
    const cachedUrl = imageCache.get(cardName);
    if (cachedUrl) {
      // Add to in-memory cache (create new Map for reactivity)
      const newCache = new Map(cardImageCache);
      newCache.set(cardName, cachedUrl);
      cardImageCache = newCache;

      // Remove from loading set
      const newLoadingCards = new Set(loadingCards);
      newLoadingCards.delete(cardName);
      loadingCards = newLoadingCards;
      return;
    }

    // Not in cache, fetch from Scryfall
    try {
      const scryfallCard = await cardService.getCardByName(cardName);
      if (scryfallCard) {
        let imageUrl = scryfallCard.image_uris?.normal;
        if (!imageUrl && scryfallCard.card_faces?.[0]?.image_uris?.normal) {
          // Handle double-faced cards
          imageUrl = scryfallCard.card_faces[0].image_uris.normal;
        }
        if (imageUrl) {
          // Store in persistent cache (localStorage)
          imageCache.set(cardName, imageUrl);

          // Add to in-memory cache (create new Map for reactivity)
          const newCache = new Map(cardImageCache);
          newCache.set(cardName, imageUrl);
          cardImageCache = newCache;
        }
      }
    } catch (error) {
      console.warn(`[Recommendations] Could not fetch image for ${cardName}`);
    } finally {
      // Remove from loading set (create new Set for reactivity)
      const newLoadingCards = new Set(loadingCards);
      newLoadingCards.delete(cardName);
      loadingCards = newLoadingCards;
    }
  }

  // Fetch card image from Scryfall and cache it (without loading state)
  async function fetchCardImage(cardName: string) {
    // Check in-memory cache first
    if (cardImageCache.has(cardName)) return;

    // Check persistent cache second (localStorage)
    const cachedUrl = imageCache.get(cardName);
    if (cachedUrl) {
      // Add to in-memory cache (create new Map for reactivity)
      const newCache = new Map(cardImageCache);
      newCache.set(cardName, cachedUrl);
      cardImageCache = newCache;
      return;
    }

    // Not in cache, fetch from Scryfall
    try {
      const scryfallCard = await cardService.getCardByName(cardName);
      if (scryfallCard) {
        let imageUrl = scryfallCard.image_uris?.normal;
        if (!imageUrl && scryfallCard.card_faces?.[0]?.image_uris?.normal) {
          // Handle double-faced cards
          imageUrl = scryfallCard.card_faces[0].image_uris.normal;
        }
        if (imageUrl) {
          // Store in persistent cache (localStorage)
          imageCache.set(cardName, imageUrl);

          // Add to in-memory cache (create new Map for reactivity)
          const newCache = new Map(cardImageCache);
          newCache.set(cardName, imageUrl);
          cardImageCache = newCache;
        }
      }
    } catch (error) {
      console.warn(`[Recommendations] Could not fetch image for ${cardName}`);
    }
  }

  // Load card preview image when hovering
  async function handleCardHover(rec: EDHRECCardRecommendation) {
    hoveredCard = rec;

    // Check cache first
    const cachedImage = cardImageCache.get(rec.name);
    if (cachedImage) {
      previewImage = cachedImage;
      isLoadingPreview = false;
      return;
    }

    // Otherwise fetch
    isLoadingPreview = true;
    previewImage = null;
    await fetchCardImage(rec.name);
    previewImage = cardImageCache.get(rec.name) || null;
    isLoadingPreview = false;
  }

  function clearPreview() {
    // Don't clear preview if the card is selected
    if (hoveredCard && selectedCards.has(hoveredCard.name)) {
      return;
    }

    hoveredCard = null;
    previewImage = null;
    isLoadingPreview = false;
  }
</script>

<BaseModal
  {isOpen}
  {onClose}
  title="EDHREC Recommendations"
  subtitle={`For ${commanderName}`}
  size="custom"
  customSize="w-[95vw] max-w-[1800px]"
  height="h-[95vh]"
>
  <div class="flex flex-col h-full overflow-hidden">
    {#if isLoading}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-brand-primary)] mx-auto"
          ></div>
          <p class="mt-4 text-[var(--color-text-secondary)]">
            Loading recommendations from EDHREC...
          </p>
        </div>
      </div>
    {:else if categories.length === 0}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <p class="text-[var(--color-text-primary)] font-medium">
            No recommendations found
          </p>
          <p class="text-[var(--color-text-secondary)] text-sm mt-2">
            EDHREC may not have data for this commander yet.
          </p>
        </div>
      </div>
    {:else}
      <!-- Filters -->
      <div class="px-6 py-4 border-b border-[var(--color-border)] space-y-4">
        <div class="flex items-center gap-4 flex-wrap">
          <!-- Category Filter -->
          <div class="flex items-center gap-2">
            <label
              for="category-filter"
              class="text-sm font-medium text-[var(--color-text-secondary)]"
              >Category:</label
            >
            <select
              id="category-filter"
              bind:value={selectedCategory}
              class="px-3 py-1.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
            >
              {#each categories as category}
                <option value={category}>{category}</option>
              {/each}
            </select>
          </div>

          <!-- Min Synergy Filter -->
          <div class="flex items-center gap-2">
            <label
              for="synergy-filter"
              class="text-sm font-medium text-[var(--color-text-secondary)]"
              >Min Synergy:</label
            >
            <input
              id="synergy-filter"
              type="range"
              bind:value={minSynergy}
              min="0"
              max="100"
              step="5"
              class="w-32"
            />
            <span
              class="text-sm text-[var(--color-text-primary)] font-medium w-12"
              >{minSynergy}%</span
            >
          </div>

          <!-- Min Usage Filter -->
          <div class="flex items-center gap-2">
            <label
              for="usage-filter"
              class="text-sm font-medium text-[var(--color-text-secondary)]"
              >Min Usage:</label
            >
            <input
              id="usage-filter"
              type="range"
              bind:value={minUsage}
              min="0"
              max="100"
              step="5"
              class="w-32"
            />
            <span
              class="text-sm text-[var(--color-text-primary)] font-medium w-12"
              >{minUsage}%</span
            >
          </div>

          <!-- Hide Owned Cards -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={hideOwnedCards}
              class="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
            />
            <span class="text-sm font-medium text-[var(--color-text-secondary)]"
              >Hide cards in deck</span
            >
          </label>

          <!-- Hide Maybeboard Cards -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={hideMaybeboardCards}
              class="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
            />
            <span class="text-sm font-medium text-[var(--color-text-secondary)]"
              >Hide cards in maybeboard</span
            >
          </label>

          <!-- Results count -->
          <div class="ml-auto text-sm text-[var(--color-text-tertiary)]">
            {filteredRecommendations().length} cards
          </div>
        </div>

        <!-- Selection Actions -->
        {#if filteredRecommendations().length > 0}
          <div class="flex items-center gap-2">
            <button
              onclick={selectAll}
              class="px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]"
            >
              Select All
            </button>
            <button
              onclick={deselectAll}
              class="px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]"
            >
              Deselect All
            </button>
            <span class="text-sm text-[var(--color-text-tertiary)] ml-2">
              {selectedCards.size} selected
            </span>
          </div>
        {/if}
      </div>

      <!-- Content Area: Card Grid + Preview Panel -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Card Grid -->
        <div class="flex-1 overflow-y-auto p-6">
          {#if filteredRecommendations().length === 0}
            <div class="text-center py-12">
              <p class="text-[var(--color-text-secondary)]">
                No cards match the current filters
              </p>
            </div>
          {:else}
            <div
              class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4"
            >
              {#each filteredRecommendations() as rec (rec.name)}
                <div class="flex flex-col gap-2">
                  <button
                    class="relative group aspect-[5/7] rounded-lg overflow-hidden border-2 transition-all {selectedCards.has(
                      rec.name,
                    )
                      ? 'border-[var(--color-brand-primary)] ring-2 ring-[var(--color-brand-primary)]/30'
                      : 'border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50'}"
                    onclick={() => toggleCardSelection(rec.name, rec)}
                    onmouseenter={() => handleCardHover(rec)}
                    onmouseleave={clearPreview}
                  >
                    <!-- Checkbox -->
                    <div class="absolute bottom-2 left-2 z-10">
                      <div
                        class="w-5 h-5 rounded bg-[var(--color-surface)] border-2 border-[var(--color-border)] flex items-center justify-center {selectedCards.has(
                          rec.name,
                        )
                          ? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)]'
                          : ''}"
                      >
                        {#if selectedCards.has(rec.name)}
                          <svg
                            class="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        {/if}
                      </div>
                    </div>

                    <!-- Card image or placeholder -->
                    {#if cardImageCache.has(rec.name)}
                      <img
                        src={cardImageCache.get(rec.name)}
                        alt={rec.name}
                        class="w-full h-full object-cover"
                      />
                    {:else if loadingCards.has(rec.name)}
                      <!-- Loading spinner -->
                      <div
                        class="w-full h-full bg-[var(--color-bg-secondary)] flex flex-col items-center justify-center gap-3"
                      >
                        <div
                          class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"
                        ></div>
                        <div
                          class="text-xs font-medium text-[var(--color-text-secondary)] text-center px-2 line-clamp-2"
                        >
                          {rec.name}
                        </div>
                      </div>
                    {:else}
                      <!-- Placeholder - failed to load or not started -->
                      <div
                        class="w-full h-full bg-[var(--color-bg-secondary)] flex items-center justify-center p-3"
                      >
                        <div
                          class="text-sm font-medium text-[var(--color-text-primary)] line-clamp-3 text-center"
                        >
                          {rec.name}
                        </div>
                      </div>
                    {/if}
                  </button>

                  <!-- Stats below card -->
                  <div class="text-xs text-center space-y-0.5 px-1">
                    <div
                      class="font-semibold text-[var(--color-brand-primary)]"
                    >
                      {rec.synergyScore}% synergy
                    </div>
                    <div class="text-[var(--color-text-secondary)]">
                      {rec.inclusionRate}% of decks
                    </div>
                    <div class="text-[var(--color-text-tertiary)]">
                      {rec.deckCount.toLocaleString()} decks
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Preview Panel -->
        <div
          class="w-80 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 overflow-y-auto"
        >
          {#if hoveredCard}
            <div class="space-y-4">
              <!-- Card Image -->
              <div
                class="aspect-[5/7] rounded-lg overflow-hidden bg-[var(--color-bg-primary)] border border-[var(--color-border)]"
              >
                {#if isLoadingPreview}
                  <div class="w-full h-full flex items-center justify-center">
                    <div
                      class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"
                    ></div>
                  </div>
                {:else if previewImage}
                  <img
                    src={previewImage}
                    alt={hoveredCard.name}
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <div
                    class="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]"
                  >
                    No image available
                  </div>
                {/if}
              </div>

              <!-- EDHREC Stats -->
              <div class="space-y-3">
                <h3 class="font-bold text-[var(--color-text-primary)]">
                  {hoveredCard.name}
                </h3>

                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-[var(--color-text-secondary)]"
                      >Synergy Score</span
                    >
                    <span
                      class="text-sm font-medium text-[var(--color-brand-primary)]"
                      >{hoveredCard.synergyScore}%</span
                    >
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-[var(--color-text-secondary)]"
                      >Inclusion Rate</span
                    >
                    <span
                      class="text-sm font-medium text-[var(--color-text-primary)]"
                      >{hoveredCard.inclusionRate}%</span
                    >
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-[var(--color-text-secondary)]"
                      >Deck Count</span
                    >
                    <span
                      class="text-sm font-medium text-[var(--color-text-primary)]"
                      >{hoveredCard.deckCount.toLocaleString()}</span
                    >
                  </div>
                </div>

                <!-- Link to EDHREC -->
                <a
                  href={hoveredCard.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block w-full px-3 py-2 text-sm text-center bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-brand-primary)] font-medium"
                >
                  View on EDHREC →
                </a>
              </div>
            </div>
          {:else}
            <div class="h-full flex items-center justify-center text-center">
              <p class="text-sm text-[var(--color-text-tertiary)]">
                Hover over a card to see details
              </p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer Actions -->
      <div
        class="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between"
      >
        <div class="text-sm text-[var(--color-text-tertiary)]">
          {selectedCards.size} card{selectedCards.size !== 1 ? "s" : ""} selected
        </div>
        <div class="flex items-center gap-3">
          <button
            onclick={onClose}
            class="px-4 py-2 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] font-medium"
          >
            Close
          </button>
          <button
            onclick={addSelectedToMaybeboard}
            disabled={selectedCards.size === 0}
            class="px-4 py-2 text-sm bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Maybeboard
          </button>
          <button
            onclick={addSelectedToDeck}
            disabled={selectedCards.size === 0}
            class="px-4 py-2 text-sm bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Deck
          </button>
        </div>
      </div>
    {/if}
  </div>
</BaseModal>
