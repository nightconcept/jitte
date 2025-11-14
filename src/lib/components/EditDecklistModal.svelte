<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { parsePlaintext, type ParseResult } from "$lib/utils/decklist-parser";
  import type { Card } from "$lib/types/card";

  export let isOpen = false;
  export let currentDecklist = "";

  const dispatch = createEventDispatcher<{
    close: void;
    save: { decklist: string };
  }>();

  let decklistInput = currentDecklist;
  let parseResult: ParseResult | null = null;
  let showErrors = false;

  // Update input when modal opens
  $: if (isOpen) {
    decklistInput = currentDecklist;
    parseResult = null;
    showErrors = false;
  }

  function handleSave() {
    // Parse and validate
    if (decklistInput.trim()) {
      parseResult = parsePlaintext(decklistInput);

      // Check for errors
      if (parseResult.errors.length > 0) {
        showErrors = true;
        return; // Don't close modal, show errors
      }
    } else {
      parseResult = { cards: [], errors: [], totalLines: 0 };
    }

    // If we got here, no errors - proceed with save
    showErrors = false;
    dispatch("save", { decklist: decklistInput });
    handleClose();
  }

  function handleClose() {
    parseResult = null;
    showErrors = false;
    dispatch("close");
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  // Calculate summary stats
  $: totalCards =
    parseResult?.cards.reduce((sum, card) => sum + card.quantity, 0) || 0;
  $: uniqueCards = parseResult?.cards.length || 0;
  $: errorCount = parseResult?.errors.length || 0;
  $: lineCount = decklistInput.split("\n").length;
</script>

{#if isOpen}
  <!-- Modal Backdrop -->
  <div
    class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    onclick={handleBackdropClick}
    onkeydown={(e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClose();
      }
    }}
    role="presentation"
  >
    <!-- Modal Content - Much larger -->
    <div
      class="bg-[var(--color-surface)] rounded-lg shadow-xl w-full max-w-6xl mx-4 border border-[var(--color-border)] h-[85vh] flex flex-col"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-[var(--color-border)]">
        <h2 class="text-xl font-bold text-[var(--color-text-primary)]">
          Bulk Edit Decklist
        </h2>
        <p class="text-sm text-[var(--color-text-secondary)] mt-1">
          Edit the 99 cards in plaintext format. Commander is not included and
          will be preserved.
        </p>
      </div>

      <!-- Body - Full height textarea -->
      <div class="px-6 py-4 flex-1 flex flex-col min-h-0">
        <div class="flex-1 flex flex-col">
          <label
            for="edit-decklist-input"
            class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
          >
            Decklist
          </label>
          <textarea
            id="edit-decklist-input"
            bind:value={decklistInput}
            placeholder={"1 Lightning Bolt\n1 Sol Ring (2XM) 97\n2x Counterspell\n1 Command Tower\n\n(Commander not shown here)"}
            class="flex-1 px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] font-mono text-sm resize-none"
          ></textarea>

          <!-- Status Bar -->
          <div class="flex justify-between items-center mt-2">
            <p class="text-xs text-[var(--color-text-tertiary)]">
              Formats: "1 Card Name", "2x Card", "1 Card (SET) 123"
            </p>
            <p class="text-xs text-[var(--color-text-secondary)]">
              {lineCount} lines
            </p>
          </div>

          <!-- Syntax Errors (shown only after attempting save) -->
          {#if showErrors && errorCount > 0 && parseResult}
            <div
              class="mt-3 border border-red-800 rounded-lg p-3 bg-red-900/20 max-h-48 overflow-y-auto"
            >
              <h4 class="text-sm font-semibold text-red-400 mb-2">
                Syntax Errors ({errorCount})
              </h4>
              <div class="space-y-1">
                {#each parseResult.errors as error}
                  <div class="text-xs">
                    <span class="text-red-300">Line {error.line}:</span>
                    <span class="text-[var(--color-text-secondary)] ml-2"
                      >{error.text}</span
                    >
                    <div class="text-red-400 ml-4 mt-0.5">→ {error.reason}</div>
                  </div>
                {/each}
              </div>
              <p class="text-xs text-yellow-400 mt-2 font-medium">
                Please fix these errors before saving
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
          {#if showErrors && errorCount > 0}
            <span class="text-red-400"
              >Fix {errorCount}
              {errorCount === 1 ? "error" : "errors"} to continue</span
            >
          {:else}
            Click Save to validate and update deck
          {/if}
        </div>
        <div class="flex gap-3">
          <button
            onclick={handleClose}
            class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
          >
            Cancel
          </button>
          <button
            onclick={handleSave}
            class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
