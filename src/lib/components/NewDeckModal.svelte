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

  export let isOpen = false;

  const dispatch = createEventDispatcher<{
    close: void;
    create: { name: string; commanderNames: string[]; decklist?: string };
  }>();

  // Mode selection: 'empty' or 'import'
  let mode: "empty" | "import" = "empty";

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

  const cardServiceInstance = new CardService();

  // Check if selected commander has partner ability
  $: hasPartnerAbility = selectedCommander
    ? checkPartnerAbility(selectedCommander)
    : false;

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

  // Parse decklist and auto-detect commanders when input changes (import mode only)
  $: if (mode === "import" && decklistInput.trim()) {
    const newParseResult = parsePlaintext(decklistInput);
    parseResult = newParseResult;

    // Auto-detect commanders if we haven't already and user hasn't manually selected any
    if (selectedCommanders.length === 0 && newParseResult) {
      detectCommanders(newParseResult);
    }
  } else if (mode === "import" && !decklistInput.trim()) {
    parseResult = null;
  }

  // Calculate summary stats
  $: totalCards =
    parseResult?.cards.reduce((sum, card) => sum + card.quantity, 0) || 0;
  $: uniqueCards = parseResult?.cards.length || 0;
  $: errorCount = parseResult?.errors.length || 0;
  $: lineCount = decklistInput.split("\n").length;

  // Commander detection for import mode
  async function detectCommanders(result: ParseResult) {
    isDetectingCommanders = true;
    const detectedCommanders: Card[] = [];

    try {
      // First, check if the parser found commanders via [Commander{top}] tags
      if (result.commanderNames && result.commanderNames.length > 0) {
        for (const commanderName of result.commanderNames.slice(0, 2)) {
          const card = await fetchAndValidateCommander(commanderName);
          if (card) {
            detectedCommanders.push(card);
          }
        }
      } else {
        // Moxfield exports often place the commander last; try trailing entries first
        const trailingCards = getTrailingCards(result.cards, 2);
        await tryCommanderCandidates(trailingCards, detectedCommanders);

        // If no commanders found in trailing entries, try first couple of entries
        if (detectedCommanders.length === 0) {
          await tryCommanderCandidates(
            result.cards.slice(0, 2),
            detectedCommanders,
          );
        }
      }

      // Only update if we found valid commanders
      if (detectedCommanders.length > 0) {
        selectedCommanders = detectedCommanders;
      }
    } catch (error) {
      console.error("Error detecting commanders:", error);
    } finally {
      isDetectingCommanders = false;
    }
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
      const scryfallCard = await cardService.getCardByName(cardName);
      if (!scryfallCard) return null;

      // Validate it's a valid commander
      const typeLine = scryfallCard.type_line.toLowerCase();
      const oracleText = scryfallCard.oracle_text?.toLowerCase() || "";
      const isLegendary = typeLine.includes("legendary");
      const isCreature = typeLine.includes("creature");
      const canBeCommander = oracleText.includes("can be your commander");

      if (!canBeCommander && !(isLegendary && isCreature)) {
        return null;
      }

      // Convert to our Card type
      return scryfallToCard(scryfallCard);
    } catch (error) {
      console.error(`Error fetching commander ${cardName}:`, error);
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
      // Empty deck mode: use old commander search
      if (!deckName.trim() || !selectedCommander) {
        return;
      }

      const commanderNames = [selectedCommander.name];
      if (selectedPartner) {
        commanderNames.push(selectedPartner.name);
      }

      dispatch("create", {
        name: deckName.trim(),
        commanderNames,
      });
    } else {
      // Import mode: validate and dispatch with decklist
      if (!deckName.trim()) {
        showErrors = true;
        return;
      }

      if (selectedCommanders.length === 0) {
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
        commanderNames: selectedCommanders.map((c) => c.name),
        decklist: decklistInput,
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
  }
</script>

<BaseModal
  {isOpen}
  onClose={handleClose}
  title="Create New Deck"
  subtitle={mode === "empty"
    ? "Start with an empty deck"
    : "Import from decklist"}
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
            Import Decklist
          </button>
        </div>
      </div>

      <!-- Deck Name -->
      <div class={mode === "import" ? "mb-4" : ""}>
        <label
          class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
        >
          Deck Name <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          bind:value={deckName}
          placeholder="My Awesome Commander Deck"
          class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
        />
      </div>

      {#if mode === "empty"}
        <!-- Empty Deck Mode: Original Commander Search -->

        <!-- Commander Search -->
        <div class="relative">
          <label
            class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
          >
            Commander <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <input
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
      {:else}
        <!-- Import Mode: Commander Search + Decklist -->

        <!-- Commander Search -->
        <div class="mb-4">
          <label
            class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
          >
            Commander(s) <span class="text-red-500">*</span>
          </label>
          <p class="text-xs text-[var(--color-text-secondary)] mb-2">
            We'll attempt to auto-detect commander names from decklist tags,
            early cards, or the final entries (Moxfield format) to speed things
            up.
          </p>
          {#if isDetectingCommanders}
            <div
              class="px-4 py-3 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-300 flex items-center gap-2"
            >
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
          {:else}
            <CommanderSearch bind:selectedCommanders maxCommanders={2} />
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

        <!-- Decklist Textarea -->
        <div class="flex-1 flex flex-col">
          <label
            class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
          >
            Decklist <span class="text-red-500">*</span>
          </label>
          <textarea
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
          ? !deckName.trim() || !selectedCommander
          : !deckName.trim() || selectedCommanders.length === 0}
        class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mode === "empty" ? "Create Deck" : "Import Deck"}
      </button>
    </div>
  {/snippet}
</BaseModal>
