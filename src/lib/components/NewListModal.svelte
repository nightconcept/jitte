<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { CardService } from "$lib/api/card-service";
  import type { CardSearchResult } from "$lib/api/card-service";
  import { debounce } from "$lib/utils/debounce";
  import CommanderSearch from "./CommanderSearch.svelte";
  import BaseModal from "./BaseModal.svelte";
  import type { Card } from "$lib/types/card";
  import { cardService } from "$lib/api/card-service";
  import { scryfallToCard } from "$lib/utils/card-converter";
  import { detectPartnerType } from "$lib/utils/partner-detection";
  import { parsePlaintext, type ParseResult } from "$lib/utils/decklist-parser";
  import { DeckFormat, FORMAT_METADATA } from "$lib/formats/format-registry";
  import type { FormatMetadata } from "$lib/formats/format-registry";

  export let isOpen = false;

  const dispatch = createEventDispatcher<{
    close: void;
    create: {
      name: string;
      commanderNames: string[];
      decklist?: string;
      format: DeckFormat;
    };
  }>();

  // Mode selection: 'empty' or 'import'
  let mode: "empty" | "import" = "empty";

  // Format selection
  let selectedFormat: DeckFormat = DeckFormat.Commander;

  let deckName = "";
  let commanderSearchQuery = "";
  let commanderSearchResults: CardSearchResult[] = [];
  let selectedCommander: CardSearchResult | null = null;
  let partnerSearchQuery = "";
  let partnerSearchResults: CardSearchResult[] = [];
  let selectedPartner: CardSearchResult | null = null;
  let isSearching = false;
  let isSearchingPartner = false;

  // Import mode state
  let selectedCommanders: Card[] = [];
  let decklistInput = "";
  let parseResult: ParseResult | null = null;
  let showErrors = false;
  let isDetectingCommanders = false;
  let detectionTimeoutId: number | undefined;
  let autoDetectEnabled = true; // Auto-detection enabled by default (bypasses queue)
  let previousCommandersLength = 0; // Track to detect manual clearing

  const cardServiceInstance = new CardService();

  // Get format metadata for selected format
  $: formatMeta = FORMAT_METADATA[selectedFormat];

  // Query metadata for format capabilities
  $: needsCommander = formatMeta.commanderRules?.required ?? false;
  $: maxCommanders = formatMeta.commanderRules?.maxCount ?? 0;

  // Check if selected commander has partner ability
  $: hasPartnerAbility = selectedCommander
    ? checkPartnerAbility(selectedCommander)
    : false;

  // Detect when user manually clears commanders (disable auto-detection)
  $: {
    if (previousCommandersLength > 0 && selectedCommanders.length === 0) {
      autoDetectEnabled = false;
    }
    previousCommandersLength = selectedCommanders.length;
  }

  // Get UI text from metadata
  $: deckNamePlaceholder = formatMeta.ui.deckNamePlaceholder;
  $: listTypeLabel = selectedFormat === DeckFormat.Cube ? "List" : "Deck";

  function checkPartnerAbility(commander: CardSearchResult): boolean {
    const oracleText = commander.oracle_text?.toLowerCase() || "";
    return (
      oracleText.includes("partner") ||
      oracleText.includes("friends forever") ||
      oracleText.includes("choose a background")
    );
  }

  // Reset when modal opens
  $: if (isOpen) {
    resetForm();
  }

  // Parse decklist when input changes (import mode only)
  $: if (mode === "import" && decklistInput.trim()) {
    const newParseResult = parsePlaintext(decklistInput);
    parseResult = newParseResult;

    // Cancel any pending detection
    if (detectionTimeoutId) {
      clearTimeout(detectionTimeoutId);
    }

    // Auto-detect commanders if enabled, haven't already selected any, and user hasn't manually selected any
    // Debounce to avoid triggering on every keystroke
    if (autoDetectEnabled && selectedCommanders.length === 0 && newParseResult && !isDetectingCommanders) {
      detectionTimeoutId = window.setTimeout(() => {
        detectCommanders(newParseResult);
      }, 500); // Wait 500ms after user stops typing
    }
  } else if (mode === "import" && !decklistInput.trim()) {
    parseResult = null;
    // Cancel any pending detection
    if (detectionTimeoutId) {
      clearTimeout(detectionTimeoutId);
    }
  }

  // Calculate summary stats
  $: totalCards =
    parseResult?.cards.reduce((sum, card) => sum + card.quantity, 0) || 0;
  $: uniqueCards = parseResult?.cards.length || 0;
  $: errorCount = parseResult?.errors.length || 0;
  $: lineCount = decklistInput.split("\n").length;

  // Commander detection for import mode
  async function detectCommanders(result: ParseResult) {
    // Prevent concurrent detections
    if (isDetectingCommanders) {
      console.log('[detectCommanders] Already detecting, skipping...');
      return;
    }

    console.log('[detectCommanders] Starting detection...', {
      totalCards: result.cards.length,
      hasCommanderTags: !!(result.commanderNames && result.commanderNames.length > 0),
      commanderNames: result.commanderNames
    });

    isDetectingCommanders = true;
    const detectedCommanders: Card[] = [];

    try {
      // First, check if the parser found commanders via [Commander{top}] tags
      if (result.commanderNames && result.commanderNames.length > 0) {
        console.log('[detectCommanders] Checking tagged commanders:', result.commanderNames);
        for (const commanderName of result.commanderNames.slice(0, 2)) {
          const card = await fetchAndValidateCommander(commanderName);
          if (card) {
            detectedCommanders.push(card);
          }
        }
      } else {
        // Moxfield exports often place the commander last; try trailing entries first
        const trailingCards = getTrailingCards(result.cards, 2);
        console.log('[detectCommanders] Checking trailing cards:', trailingCards.map(c => c.name));
        await tryCommanderCandidates(trailingCards, detectedCommanders);

        // If no commanders found in trailing entries, try first couple of entries
        if (detectedCommanders.length === 0) {
          console.log('[detectCommanders] No commanders in trailing cards, checking first 2...');
          await tryCommanderCandidates(
            result.cards.slice(0, 2),
            detectedCommanders,
          );
        }
      }

      // Only update if we found valid commanders
      if (detectedCommanders.length > 0) {
        console.log('[detectCommanders] ✓ Found commanders:', detectedCommanders.map(c => c.name));
        selectedCommanders = detectedCommanders;
      } else {
        console.log('[detectCommanders] ✗ No commanders detected');
      }
    } catch (error) {
      console.error("[detectCommanders] Error:", error);
    } finally {
      isDetectingCommanders = false;
    }
  }

  function cancelDetection() {
    // Cancel pending detection timeout
    if (detectionTimeoutId) {
      clearTimeout(detectionTimeoutId);
      detectionTimeoutId = undefined;
    }
    // Stop the detection spinner
    isDetectingCommanders = false;
    // Disable auto-detection when user cancels
    autoDetectEnabled = false;
  }

  async function tryCommanderCandidates(
    candidates: Card[],
    detectedCommanders: Card[],
  ): Promise<void> {
    for (const parsedCard of candidates) {
      if (!parsedCard) break;

      // If we already have 2 commanders, stop
      if (detectedCommanders.length >= 2) break;

      // If we have 1 commander and it doesn't have partner, stop
      if (detectedCommanders.length === 1) {
        const firstCommander = detectedCommanders[0];
        const partnerType = detectPartnerType(firstCommander);
        if (!partnerType) {
          // First commander has no partner ability, stop looking for more
          break;
        }
      }

      if (detectedCommanders.some((card) => card.name === parsedCard.name))
        continue;

      const card = await fetchAndValidateCommander(parsedCard.name);
      if (card && !detectedCommanders.some((c) => c.name === card.name)) {
        detectedCommanders.push(card);
      }
    }
  }

  function getTrailingCards(cards: Card[], count: number): Card[] {
    if (cards.length === 0) return [];
    // Return in reverse order so the very last card is checked first
    return cards.slice(Math.max(cards.length - count, 0)).reverse();
  }

  async function fetchAndValidateCommander(
    cardName: string,
  ): Promise<Card | null> {
    try {
      console.log(`[fetchAndValidateCommander] Fetching: "${cardName}"`);

      // Bypass the queue entirely by making a direct fetch call
      const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;

      // Add timeout wrapper (5 seconds)
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000);
      });

      const fetchPromise = fetch(url).then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return await response.json();
      });

      const scryfallCard = await Promise.race([fetchPromise, timeoutPromise]);

      if (!scryfallCard) {
        console.log(`[fetchAndValidateCommander] ✗ Not found: "${cardName}"`);
        return null;
      }

      // Add small delay to respect Scryfall rate limit (150ms)
      await new Promise(resolve => setTimeout(resolve, 150));

      // Validate it's a valid commander
      const typeLine = scryfallCard.type_line.toLowerCase();
      const oracleText = scryfallCard.oracle_text?.toLowerCase() || "";
      const isLegendary = typeLine.includes("legendary");
      const isCreature = typeLine.includes("creature");
      const canBeCommander = oracleText.includes("can be your commander");

      console.log(`[fetchAndValidateCommander] Card: "${scryfallCard.name}"`, {
        typeLine: scryfallCard.type_line,
        isLegendary,
        isCreature,
        canBeCommander,
        valid: canBeCommander || (isLegendary && isCreature)
      });

      if (!canBeCommander && !(isLegendary && isCreature)) {
        console.log(`[fetchAndValidateCommander] ✗ Not a valid commander: "${cardName}"`);
        return null;
      }

      // Convert to our Card type
      const card = scryfallToCard(scryfallCard);
      console.log(`[fetchAndValidateCommander] ✓ Valid commander: "${card.name}"`, {
        hasImageUrls: !!card.imageUrls,
        hasCardFaces: !!card.cardFaces,
        layout: card.layout
      });
      return card;
    } catch (error) {
      console.error(`[fetchAndValidateCommander] Error fetching commander ${cardName}:`, error);
      return null;
    }
  }

  // Debounced search function (for empty mode)
  const searchCommanders = debounce(async (query: string) => {
    if (query.length < 2) {
      commanderSearchResults = [];
      return;
    }

    isSearching = true;
    try {
      // Search for legendary creatures
      const fullQuery = `${query} is:commander`;
      const results = await cardService.searchCards(fullQuery, 20); // Get more results for better sorting

      // Sort results: prioritize matches at the start of the name
      const sorted = results.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const searchLower = query.toLowerCase();

        const aStartsWith = aName.startsWith(searchLower);
        const bStartsWith = bName.startsWith(searchLower);

        // If one starts with query and other doesn't, prioritize the one that does
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // Otherwise, maintain alphabetical order
        return aName.localeCompare(bName);
      });

      // Take top 10 after sorting
      commanderSearchResults = sorted.slice(0, 10);
    } catch (error) {
      console.error("Commander search failed:", error);
      commanderSearchResults = [];
    } finally {
      isSearching = false;
    }
  }, 300);

  // Debounced partner search function
  const searchPartners = debounce(async (query: string) => {
    if (query.length < 2) {
      partnerSearchResults = [];
      return;
    }

    isSearchingPartner = true;
    try {
      // Search for legendary creatures
      const fullQuery = `${query} is:commander`;
      const results = await cardService.searchCards(fullQuery, 20);

      // Sort results: prioritize matches at the start of the name
      const sorted = results.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const searchLower = query.toLowerCase();

        const aStartsWith = aName.startsWith(searchLower);
        const bStartsWith = bName.startsWith(searchLower);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return aName.localeCompare(bName);
      });

      partnerSearchResults = sorted.slice(0, 10);
    } catch (error) {
      console.error("Partner search failed:", error);
      partnerSearchResults = [];
    } finally {
      isSearchingPartner = false;
    }
  }, 300);

  $: {
    // Only search if we don't already have a selected commander
    if (commanderSearchQuery && !selectedCommander) {
      searchCommanders(commanderSearchQuery);
    } else {
      commanderSearchResults = [];
    }
  }

  $: {
    // Only search for partner if we don't already have one selected
    if (partnerSearchQuery && !selectedPartner && hasPartnerAbility) {
      searchPartners(partnerSearchQuery);
    } else {
      partnerSearchResults = [];
    }
  }

  function selectCommander(commander: CardSearchResult) {
    selectedCommander = commander;
    commanderSearchQuery = commander.name; // Show commander name
    commanderSearchResults = []; // Clear dropdown
  }

  function selectPartner(partner: CardSearchResult) {
    selectedPartner = partner;
    partnerSearchQuery = partner.name;
    partnerSearchResults = [];
  }

  function handleCreate() {
    if (mode === "empty") {
      // Empty deck mode
      if (!deckName.trim()) {
        return;
      }

      // For Commander format, require commander selection
      if (needsCommander && !selectedCommander) {
        return;
      }

      const commanderNames = [];
      if (needsCommander && selectedCommander) {
        commanderNames.push(selectedCommander.name);
        if (selectedPartner) {
          commanderNames.push(selectedPartner.name);
        }
      }

      dispatch("create", {
        name: deckName.trim(),
        commanderNames,
        format: selectedFormat,
      });
    } else {
      // Import mode: validate and dispatch with decklist
      if (!deckName.trim()) {
        showErrors = true;
        return;
      }

      // For Commander format, require commander selection
      if (needsCommander && selectedCommanders.length === 0) {
        showErrors = true;
        return;
      }

      if (!decklistInput.trim()) {
        showErrors = true;
        return;
      }

      // Check for critical parse errors
      if (!parseResult || parseResult.cards.length === 0) {
        showErrors = true;
        return;
      }

      dispatch("create", {
        name: deckName.trim(),
        commanderNames: needsCommander ? selectedCommanders.map((c) => c.name) : [],
        decklist: decklistInput,
        format: selectedFormat,
      });
    }

    // Reset form
    resetForm();
  }

  function handleClose() {
    dispatch("close");
    resetForm();
  }

  function resetForm() {
    mode = "empty";
    selectedFormat = DeckFormat.Commander;
    deckName = "";
    commanderSearchQuery = "";
    selectedCommander = null;
    partnerSearchQuery = "";
    selectedPartner = null;
    selectedCommanders = [];
    decklistInput = "";
    parseResult = null;
    showErrors = false;
    isDetectingCommanders = false;
    autoDetectEnabled = true; // Keep auto-detection enabled
    // Clean up detection timeout
    if (detectionTimeoutId) {
      clearTimeout(detectionTimeoutId);
      detectionTimeoutId = undefined;
    }
  }
</script>

<BaseModal
  {isOpen}
  onClose={handleClose}
  title={`Create New ${listTypeLabel}`}
  subtitle={mode === "empty"
    ? "Start from scratch"
    : `Import from ${selectedFormat === DeckFormat.Cube ? 'list' : 'decklist'}`}
  size={mode === "empty" ? "2xl" : "4xl"}
  height={mode === "import" ? "h-[85vh]" : undefined}
>
  {#snippet children()}
    <!-- Body -->
    <div
      class="px-6 py-4 {mode === 'import'
        ? 'flex-1 flex flex-col min-h-0 overflow-y-auto'
        : 'space-y-4'}"
    >
      <!-- Mode Selector -->
      <div class="mb-4">
        <div
          class="flex gap-2 p-1 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)]"
        >
          <button
            onclick={() => (mode = "empty")}
            class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors {mode ===
            'empty'
              ? 'bg-[var(--color-brand-primary)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
          >
            Start from Scratch
          </button>
          <button
            onclick={() => (mode = "import")}
            class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors {mode ===
            'import'
              ? 'bg-[var(--color-brand-primary)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
          >
            Import List
          </button>
        </div>
      </div>

      <!-- Format Selector -->
      <div class="mb-4">
        <label
          for="format-select"
          class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
        >
          Format <span class="text-red-500">*</span>
        </label>
        <select
          id="format-select"
          bind:value={selectedFormat}
          class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
        >
          {#each Object.values(DeckFormat) as format}
            <option value={format}>
              {FORMAT_METADATA[format].displayName}
            </option>
          {/each}
        </select>
        <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
          {FORMAT_METADATA[selectedFormat].description}
        </p>
      </div>

      <!-- Deck/List Name -->
      <div class={mode === "import" ? "mb-4" : ""}>
        <label
          for="deck-name-input"
          class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
        >
          {listTypeLabel} Name <span class="text-red-500">*</span>
        </label>
        <input
          id="deck-name-input"
          type="text"
          bind:value={deckName}
          placeholder={deckNamePlaceholder}
          class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
        />
      </div>

      {#if mode === "empty"}
        <!-- Empty Deck Mode: Commander Search (if needed for format) -->

        {#if needsCommander}
          <!-- Commander Search -->
        <div class="relative">
          <label
            for="commander-search-input"
            class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
          >
            Commander <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <input
              id="commander-search-input"
              type="text"
              bind:value={commanderSearchQuery}
              placeholder="Search for a commander..."
              disabled={selectedCommander !== null}
              class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] disabled:opacity-75 disabled:cursor-not-allowed"
            />
            {#if selectedCommander}
              <button
                type="button"
                onclick={() => {
                  selectedCommander = null;
                  commanderSearchQuery = "";
                  selectedPartner = null;
                  partnerSearchQuery = "";
                }}
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--color-surface-hover)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                title="Clear selection"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            {/if}
          </div>

          <!-- Search Results Dropdown -->
          {#if commanderSearchResults.length > 0}
            <div
              class="absolute z-10 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg max-h-60 overflow-y-auto"
            >
              {#each commanderSearchResults as commander}
                <button
                  type="button"
                  class="w-full px-3 py-2 text-left hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border-b border-[var(--color-border)] last:border-b-0"
                  onclick={() => selectCommander(commander)}
                >
                  <div class="font-medium">{commander.name}</div>
                </button>
              {/each}
            </div>
          {/if}

          {#if isSearching}
            <div class="text-sm text-[var(--color-text-secondary)] mt-2">
              Searching...
            </div>
          {/if}
        </div>

        <!-- Partner Commander Search (Only shown if commander has partner ability) -->
        {#if hasPartnerAbility}
          <div class="relative">
            <label
              for="partner-search-input"
              class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
            >
              Partner Commander
              <span
                class="text-xs text-[var(--color-text-tertiary)] font-normal ml-1"
                >(Optional)</span
              >
            </label>
            <div class="relative">
              <input
                id="partner-search-input"
                type="text"
                bind:value={partnerSearchQuery}
                placeholder="Search for a partner commander..."
                disabled={selectedPartner !== null}
                class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] disabled:opacity-75 disabled:cursor-not-allowed"
              />
              {#if selectedPartner}
                <button
                  type="button"
                  onclick={() => {
                    selectedPartner = null;
                    partnerSearchQuery = "";
                  }}
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--color-surface-hover)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  title="Clear selection"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              {/if}
            </div>

            <!-- Partner Search Results Dropdown -->
            {#if partnerSearchResults.length > 0}
              <div
                class="absolute z-10 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg max-h-60 overflow-y-auto"
              >
                {#each partnerSearchResults as partner}
                  <button
                    type="button"
                    class="w-full px-3 py-2 text-left hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border-b border-[var(--color-border)] last:border-b-0"
                    onclick={() => selectPartner(partner)}
                  >
                    <div class="font-medium">{partner.name}</div>
                  </button>
                {/each}
              </div>
            {/if}

            {#if isSearchingPartner}
              <div class="text-sm text-[var(--color-text-secondary)] mt-2">
                Searching...
              </div>
            {/if}

            <div class="text-xs text-[var(--color-text-tertiary)] mt-2">
              Your commander has partner. You can optionally select a partner
              commander now, or add one later.
            </div>
          </div>
        {/if}
        {/if}
      {:else}
        <!-- Import Mode: Commander Search + Decklist -->

        {#if needsCommander}
          <!-- Commander Search -->
          <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label
              for="import-commander-input"
              class="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Commander(s) <span class="text-red-500">*</span>
            </label>
            {#if !isDetectingCommanders && selectedCommanders.length === 0 && parseResult && parseResult.cards.length > 0}
              <button
                type="button"
                onclick={() => {
                  if (parseResult) {
                    detectCommanders(parseResult);
                  }
                }}
                class="text-xs px-2 py-1 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800 rounded text-blue-300 transition-colors"
              >
                Auto-Detect Commanders
              </button>
            {/if}
          </div>
          <p class="text-xs text-[var(--color-text-secondary)] mb-2">
            We'll auto-detect commanders from your decklist (tagged commanders, trailing cards, or first cards). You can also manually search below or click "Auto-Detect" to retry.
          </p>
          {#if isDetectingCommanders}
            <div
              class="px-4 py-3 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-300 flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Detecting commanders from decklist...
              </div>
              <button
                type="button"
                onclick={cancelDetection}
                class="px-2 py-1 text-xs bg-blue-800 hover:bg-blue-700 rounded text-blue-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          {:else}
            <CommanderSearch bind:selectedCommanders maxCommanders={maxCommanders} />
          {/if}
          {#if showErrors && selectedCommanders.length === 0}
            <div class="mt-3 p-3 bg-red-900/20 border border-red-800 rounded">
              <div class="flex items-start gap-2">
                <svg
                  class="w-5 h-5 text-red-400 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p class="text-sm font-medium text-red-400">
                    Commander Required
                  </p>
                  <p class="text-sm text-red-300 mt-1">
                    You must select at least one commander.
                  </p>
                </div>
              </div>
            </div>
          {/if}
        </div>
        {/if}

        <!-- Decklist Textarea -->
        <div class="flex-1 flex flex-col">
          <label
            for="decklist-input"
            class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
          >
            Decklist <span class="text-red-500">*</span>
          </label>
          <textarea
            id="decklist-input"
            bind:value={decklistInput}
            placeholder={"1x Thrasios, Triton Hero [Commander{top}]\n1x Tymna the Weaver [Commander{top}]\n1x Sol Ring (cma) 231\n1x Command Tower (cma) 245\n1x Arcane Signet *F* [Ramp]\n..."}
            class="flex-1 px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] font-mono text-sm resize-none"
          ></textarea>

          <!-- Status Bar -->
          <div class="flex justify-between items-center mt-2">
            <p class="text-xs text-[var(--color-text-tertiary)]">
              Formats: "1 Card Name", "2x Card", "1 Card (SET) 123"
            </p>
            <p class="text-xs text-[var(--color-text-secondary)]">
              {lineCount} lines • {totalCards} cards
            </p>
          </div>

          <!-- Parse Errors (if any) -->
          {#if showErrors && errorCount > 0 && parseResult}
            <div
              class="mt-3 border border-yellow-800 rounded-lg p-3 bg-yellow-900/20 max-h-32 overflow-y-auto"
            >
              <h4 class="text-sm font-semibold text-yellow-400 mb-2">
                Parsing Warnings ({errorCount})
              </h4>
              <div class="space-y-1">
                {#each parseResult.errors.slice(0, 5) as error}
                  <div class="text-xs">
                    <span class="text-yellow-300">Line {error.line}:</span>
                    <span class="text-[var(--color-text-secondary)] ml-2"
                      >{error.text}</span
                    >
                  </div>
                {/each}
                {#if errorCount > 5}
                  <p class="text-xs text-yellow-400 mt-1">
                    ...and {errorCount - 5} more
                  </p>
                {/if}
              </div>
              <p class="text-xs text-yellow-400 mt-2">
                Note: Lines will be skipped, but the import will continue.
              </p>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div
      class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3"
    >
      <button
        onclick={handleClose}
        class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
      >
        Cancel
      </button>
      <button
        onclick={handleCreate}
        disabled={mode === "empty"
          ? !deckName.trim() || (needsCommander && !selectedCommander)
          : !deckName.trim() || (needsCommander && selectedCommanders.length === 0)}
        class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mode === "empty" ? `Create ${listTypeLabel}` : `Import ${listTypeLabel}`}
      </button>
    </div>
  {/snippet}
</BaseModal>
