<script lang="ts">
  import { parsePlaintext, type ParseResult } from "$lib/utils/decklist-parser";
  import CommanderSearch from "./CommanderSearch.svelte";
  import BaseModal from "./BaseModal.svelte";
  import type { Card } from "$lib/types/card";
  import { cardService } from "$lib/api/card-service";
  import { scryfallToCard } from "$lib/utils/card-converter";
  import { detectPartnerType } from "$lib/utils/partner-detection";

  let {
    isOpen = false,
    onClose = undefined,
    onImport = undefined,
  }: {
    isOpen?: boolean;
    onClose?: () => void;
    onImport?: (data: {
      deckName: string;
      commanderNames: string[];
      decklist: string;
    }) => void;
  } = $props();

  let deckName = $state("");
  let decklistInput = $state("");
  let selectedCommanders = $state<Card[]>([]);
  let parseResult = $state<ParseResult | null>(null);
  let showErrors = $state(false);
  let isDetectingCommanders = $state(false);

  // Reset when modal opens
  $effect(() => {
    if (isOpen) {
      deckName = "";
      decklistInput = "";
      selectedCommanders = [];
      parseResult = null;
      showErrors = false;
      isDetectingCommanders = false;
    }
  });

  // Parse decklist and auto-detect commanders when input changes
  $effect(() => {
    if (decklistInput.trim()) {
      const newParseResult = parsePlaintext(decklistInput);
      parseResult = newParseResult;

      // Auto-detect commanders if we haven't already and user hasn't manually selected any
      if (selectedCommanders.length === 0 && newParseResult) {
        detectCommanders(newParseResult);
      }
    } else {
      parseResult = null;
    }
  });

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
          await tryCommanderCandidates(result.cards.slice(0, 2), detectedCommanders);
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

      if (detectedCommanders.some((card) => card.name === parsedCard.name)) continue;

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

  async function fetchAndValidateCommander(cardName: string): Promise<Card | null> {
    try {
      const scryfallCard = await cardService.getCardByName(cardName);
      if (!scryfallCard) return null;

      // Validate it's a valid commander
      const typeLine = scryfallCard.type_line.toLowerCase();
      const oracleText = scryfallCard.oracle_text?.toLowerCase() || '';
      const isLegendary = typeLine.includes('legendary');
      const isCreature = typeLine.includes('creature');
      const canBeCommander = oracleText.includes('can be your commander');

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

  function handleImport() {
    // Validate deck name
    if (!deckName.trim()) {
      showErrors = true;
      return;
    }

    // Validate commander
    if (selectedCommanders.length === 0) {
      showErrors = true;
      return;
    }

    // Parse and validate decklist
    if (!decklistInput.trim()) {
      showErrors = true;
      return;
    }

    parseResult = parsePlaintext(decklistInput);

    // Check for critical parse errors (cards not found is okay, we'll fetch from Scryfall)
    if (!parseResult || parseResult.cards.length === 0) {
      showErrors = true;
      return;
    }

    // Call onImport callback with deck name, commanders, and full decklist
    if (onImport) {
      onImport({
        deckName: deckName.trim(),
        commanderNames: selectedCommanders.map((c) => c.name),
        decklist: decklistInput,
      });
    }

    // Reset form
    deckName = "";
    decklistInput = "";
    selectedCommanders = [];
    parseResult = null;
    showErrors = false;
  }

  // Calculate summary stats
  let totalCards = $derived(
    parseResult?.cards.reduce((sum, card) => sum + card.quantity, 0) || 0,
  );
  let uniqueCards = $derived(parseResult?.cards.length || 0);
  let errorCount = $derived(parseResult?.errors.length || 0);
  let lineCount = $derived(decklistInput.split("\n").length);
</script>

<BaseModal
  {isOpen}
  {onClose}
  title="Import Deck"
  subtitle="Paste a decklist from Moxfield, Archidekt, or any service."
  size="4xl"
  height="h-[85vh]"
>
  {#snippet children()}
    <!-- Body - Full height content -->
    <div class="px-6 py-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
      <!-- Deck Name -->
      <div class="mb-4">
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

      <!-- Commander Search -->
      <div class="mb-4">
        <label
          class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
        >
          Commander(s) <span class="text-red-500">*</span>
        </label>
        <p class="text-xs text-[var(--color-text-secondary)] mb-2">
          We'll attempt to auto-detect commander names from decklist tags, early cards, or the final entries (Moxfield format) to speed things up.
        </p>
        {#if isDetectingCommanders}
          <div class="px-4 py-3 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-300 flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
          autofocus
        />

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
    </div>

    <!-- Footer -->
    <div
      class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center"
    >
      <div class="text-sm text-[var(--color-text-secondary)]">
        {#if showErrors && (selectedCommanders.length === 0 || !deckName.trim())}
          <span class="text-red-400"
            >Please provide a deck name and valid commander(s)</span
          >
        {:else if selectedCommanders.length > 0 && deckName.trim()}
          <span class="text-green-400">Ready to import</span>
        {:else}
          Enter deck details to get started
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
          onclick={handleImport}
          disabled={!deckName.trim() || selectedCommanders.length === 0}
          class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import Deck
        </button>
      </div>
    </div>
  {/snippet}
</BaseModal>
