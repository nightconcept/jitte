<script lang="ts">
  import { getNextVersion, applyBump, isValidVersion } from "$lib/utils/semver";
  import type { VersionDiff } from "$lib/types/version";

  export let isOpen = false;
  export let currentVersion: string;
  export let diff: VersionDiff | null;
  export let onCommit: (version: string, message: string) => void;
  export let onCancel: () => void;

  // Suggested version based on diff
  $: suggestedVersion =
    currentVersion === "unsaved"
      ? "0.0.1"
      : diff
        ? getNextVersion(currentVersion, diff.totalChanges)
        : applyBump(currentVersion, "patch");

  let selectedVersion = suggestedVersion;
  let customVersion = "";
  let commitMessage = "";
  let isCustom = false;
  let showMessageInput = false;
  let versionError = "";

  // Update selected version when suggestion changes
  $: if (!isCustom) {
    selectedVersion = suggestedVersion;
  }

  function selectSuggested() {
    isCustom = false;
    selectedVersion = suggestedVersion;
    customVersion = "";
    versionError = "";
  }

  function selectCustom() {
    isCustom = true;
    customVersion = selectedVersion;
  }

  function handleCustomVersionInput() {
    if (isValidVersion(customVersion)) {
      selectedVersion = customVersion;
      versionError = "";
    } else {
      versionError = "Invalid version format (must be X.Y.Z)";
    }
  }

  function handleSubmit() {
    if (isCustom && !isValidVersion(customVersion)) {
      versionError = "Invalid version format (must be X.Y.Z)";
      return;
    }

    onCommit(selectedVersion, commitMessage.trim());
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onCancel();
    } else if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit();
    }
  }

  // Get summary text
  $: summaryText = diff
    ? `${diff.added.length} added, ${diff.removed.length} removed, ${diff.modified.length} modified`
    : "No changes detected";
</script>

{#if isOpen}
  <!-- Modal Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onclick={onCancel}
    onkeydown={handleKeydown}
    role="presentation"
    tabindex="-1"
  >
    <!-- Modal Content -->
    <div
      class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 border border-[var(--color-border)]"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="0"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-[var(--color-border)]">
        <h2 class="text-xl font-bold text-[var(--color-text-primary)]">
          Save Version
        </h2>
        <p class="text-sm text-[var(--color-text-secondary)] mt-1">
          {summaryText}
        </p>
      </div>

      <!-- Body -->
      <div class="px-6 py-4 space-y-4">
        <!-- Version Selection -->
        <div class="space-y-2">
          <!-- Suggested Version -->
          <button
            onclick={selectSuggested}
            class="w-full flex items-center justify-between px-4 py-3 rounded border transition-colors {!isCustom
              ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10'
              : 'border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50'}"
          >
            <div class="text-left">
              <div class="font-semibold text-[var(--color-text-primary)]">
                {suggestedVersion}
                <span
                  class="text-sm font-normal text-[var(--color-text-secondary)]"
                >
                  (suggested)
                </span>
              </div>
            </div>
            {#if !isCustom}
              <svg
                class="w-5 h-5 text-[var(--color-brand-primary)]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            {/if}
          </button>

          <!-- Custom Version -->
          <button
            onclick={selectCustom}
            class="w-full flex items-center justify-between px-4 py-3 rounded border transition-colors {isCustom
              ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10'
              : 'border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50'}"
          >
            <div class="text-left flex-1">
              <div class="font-semibold text-[var(--color-text-primary)]">
                Custom Version
              </div>
              {#if isCustom}
                <input
                  bind:value={customVersion}
                  oninput={handleCustomVersionInput}
                  onclick={(e) => e.stopPropagation()}
                  type="text"
                  placeholder="1.0.0"
                  class="mt-2 w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                />
                {#if versionError}
                  <div class="text-xs text-[var(--color-error)] mt-1">
                    {versionError}
                  </div>
                {/if}
              {/if}
            </div>
            {#if isCustom}
              <svg
                class="w-5 h-5 text-[var(--color-brand-primary)]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            {/if}
          </button>
        </div>

        <!-- Optional Message Toggle -->
        <button
          onclick={() => (showMessageInput = !showMessageInput)}
          class="w-full text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-2"
        >
          <svg
            class="w-4 h-4 transition-transform {showMessageInput
              ? 'rotate-90'
              : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
          Add commit message (optional)
        </button>

        <!-- Commit Message (Expandable) -->
        {#if showMessageInput}
          <div class="space-y-2">
            <textarea
              bind:value={commitMessage}
              placeholder="Describe what changed..."
              rows="3"
              class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none text-sm"
            ></textarea>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3"
      >
        <button
          onclick={onCancel}
          class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
        >
          Cancel
        </button>
        <button
          onclick={handleSubmit}
          disabled={isCustom && !isValidVersion(customVersion)}
          class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save as {selectedVersion}
        </button>
      </div>
    </div>
  </div>
{/if}
