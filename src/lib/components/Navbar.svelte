<script lang="ts">
  import { deckStore } from "$lib/stores/deck-store";

  export let onSave: (() => void) | undefined = undefined;
  export let onToggleEdit: (() => void) | undefined = undefined;

  $: deck = $deckStore?.deck;
  $: isEditing = $deckStore?.isEditing ?? false;
  $: hasUnsavedChanges = $deckStore?.hasUnsavedChanges ?? false;
</script>

<nav
  class="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-6 py-4"
>
  <div class="flex items-center justify-between">
    <!-- Left: Deck Name -->
    <div class="flex items-center gap-4">
      <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">
        {deck?.name || "Untitled Deck"}
      </h1>
      <div class="text-sm text-[var(--color-text-secondary)]">
        {deck?.cardCount || 0} cards
      </div>
    </div>

    <!-- Center: Branch & Version Selector -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 text-sm">
        <span class="text-[var(--color-text-tertiary)]">Branch:</span>
        <span class="font-medium text-[var(--color-brand-primary)]">
          {deck?.currentBranch || "main"}
        </span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-[var(--color-text-tertiary)]">Version:</span>
        <span class="font-medium text-[var(--color-text-secondary)]">
          {deck?.currentVersion || "1.0.0"}
        </span>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-3">
      <!-- View/Edit Toggle -->
      <button
        onclick={onToggleEdit}
        class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors border border-[var(--color-border)]"
      >
        {isEditing ? "View Mode" : "Edit Mode"}
      </button>

      <!-- Save Button -->
      <button
        onclick={onSave}
        disabled={!isEditing || !hasUnsavedChanges}
        class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save
      </button>

      <!-- Settings Button -->
      <button
        class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors border border-[var(--color-border)]"
        title="Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>
  </div>
</nav>
