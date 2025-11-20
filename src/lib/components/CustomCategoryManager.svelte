<script lang="ts">
  import BaseModal from './BaseModal.svelte';
  import { deckStore } from '$lib/stores/deck-store';
  import type { CategoryDefinition } from '$lib/types/card';
  import { UNCATEGORIZED_CATEGORY_ID } from '$lib/types/card';
  import type { Snippet } from 'svelte';

  let {
    isOpen = $bindable(false),
    onClose
  }: {
    isOpen?: boolean;
    onClose?: () => void;
  } = $props();

  // Subscribe to deck store to get current deck
  let deckStoreState = $state($deckStore);
  $effect(() => {
    const unsubscribe = deckStore.subscribe((value) => {
      deckStoreState = value;
    });
    return unsubscribe;
  });

  let deck = $derived(deckStoreState?.deck);
  let customCategories = $derived((deck?.customCategories || []).sort((a, b) => a.order - b.order));

  // New category form state
  let showAddForm = $state(false);
  let newCategoryName = $state('');

  // Edit state
  let editingCategoryId = $state<string | null>(null);
  let editingCategoryName = $state('');

  // Delete confirmation state
  let deletingCategoryId = $state<string | null>(null);

  function handleAddCategory() {
    if (newCategoryName.trim()) {
      // Generate ID from name
      const id = newCategoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      deckStore.createCustomCategory({
        id,
        label: newCategoryName.trim(),
        icon: '' // Could add icon picker later
      });

      newCategoryName = '';
      showAddForm = false;
    }
  }

  function startEdit(category: CategoryDefinition) {
    editingCategoryId = category.id;
    editingCategoryName = category.label;
  }

  function saveEdit() {
    if (editingCategoryId && editingCategoryName.trim()) {
      deckStore.updateCustomCategory(editingCategoryId, {
        label: editingCategoryName.trim()
      });
      editingCategoryId = null;
      editingCategoryName = '';
    }
  }

  function cancelEdit() {
    editingCategoryId = null;
    editingCategoryName = '';
  }

  function confirmDelete(categoryId: string) {
    deletingCategoryId = categoryId;
  }

  function handleDelete() {
    if (deletingCategoryId) {
      deckStore.deleteCustomCategory(deletingCategoryId);
      deletingCategoryId = null;
    }
  }

  function getCategoryCardCount(categoryId: string): number {
    if (!deck) return 0;
    const cards = deck.cards[categoryId] || [];
    return cards.reduce((sum, card) => sum + card.quantity, 0);
  }

  function handleClose() {
    isOpen = false;
    showAddForm = false;
    editingCategoryId = null;
    deletingCategoryId = null;
    onClose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (showAddForm) {
        handleAddCategory();
      } else if (editingCategoryId) {
        saveEdit();
      }
    } else if (e.key === 'Escape') {
      if (showAddForm) {
        showAddForm = false;
        newCategoryName = '';
      } else if (editingCategoryId) {
        cancelEdit();
      } else if (deletingCategoryId) {
        deletingCategoryId = null;
      }
    }
  }
</script>

<BaseModal {isOpen} onClose={handleClose} title="Manage Custom Categories" size="lg">
  {#snippet children()}
    <div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
      <!-- Category List -->
      {#if customCategories.length === 0 && !showAddForm}
        <div class="text-center py-8 text-[var(--color-text-secondary)]">
          <p class="mb-2">No custom categories yet.</p>
          <p class="text-sm">Click "Add Category" to create your first one.</p>
        </div>
      {:else}
        <div class="space-y-2 mb-4">
          {#each customCategories as category}
            {@const cardCount = getCategoryCardCount(category.id)}
            <div class="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded border border-[var(--color-border)]">
              {#if editingCategoryId === category.id}
                <!-- Edit mode -->
                <input
                  type="text"
                  bind:value={editingCategoryName}
                  onkeydown={handleKeydown}
                  class="flex-1 px-2 py-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                  autofocus
                />
                <div class="flex items-center gap-2 ml-2">
                  <button
                    onclick={saveEdit}
                    class="p-1 text-green-500 hover:text-green-400"
                    title="Save"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onclick={cancelEdit}
                    class="p-1 text-red-500 hover:text-red-400"
                    title="Cancel"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              {:else}
                <!-- View mode -->
                <div class="flex items-center gap-3 flex-1">
                  {#if category.icon}
                    <i class="ms {category.icon} text-base text-[var(--color-text-primary)]"></i>
                  {/if}
                  <span class="font-medium text-[var(--color-text-primary)]">{category.label}</span>
                  <span class="text-sm text-[var(--color-text-tertiary)]">({cardCount} cards)</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    onclick={() => startEdit(category)}
                    class="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    title="Edit"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onclick={() => confirmDelete(category.id)}
                    class="p-1 text-red-500 hover:text-red-400"
                    title="Delete"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <!-- Add Category Form -->
      {#if showAddForm}
        <div class="p-3 bg-[var(--color-surface)] rounded border border-[var(--color-brand-primary)]">
          <label for="new-category-name" class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Category Name
          </label>
          <input
            id="new-category-name"
            type="text"
            bind:value={newCategoryName}
            onkeydown={handleKeydown}
            placeholder="e.g., Ramp, Removal, Win Cons"
            class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
            autofocus
          />
          <div class="flex justify-end gap-2 mt-3">
            <button
              onclick={() => { showAddForm = false; newCategoryName = ''; }}
              class="px-3 py-1.5 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
            >
              Cancel
            </button>
            <button
              onclick={handleAddCategory}
              class="px-3 py-1.5 text-sm rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
              disabled={!newCategoryName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      {:else if !deletingCategoryId}
        <button
          onclick={() => showAddForm = true}
          class="w-full px-4 py-2 rounded border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/5 text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-colors"
        >
          + Add Category
        </button>
      {/if}

      <!-- Delete Confirmation -->
      {#if deletingCategoryId}
        {@const category = customCategories.find(c => c.id === deletingCategoryId)}
        {@const cardCount = getCategoryCardCount(deletingCategoryId)}
        <div class="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded">
          <h4 class="font-medium text-[var(--color-text-primary)] mb-2">Delete "{category?.label}"?</h4>
          {#if cardCount > 0}
            <p class="text-sm text-[var(--color-text-secondary)] mb-3">
              This category has {cardCount} card{cardCount === 1 ? '' : 's'}. They will be moved to Uncategorized.
            </p>
          {:else}
            <p class="text-sm text-[var(--color-text-secondary)] mb-3">
              This category is empty.
            </p>
          {/if}
          <div class="flex justify-end gap-2">
            <button
              onclick={() => deletingCategoryId = null}
              class="px-3 py-1.5 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
            >
              Cancel
            </button>
            <button
              onclick={handleDelete}
              class="px-3 py-1.5 text-sm rounded bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Category
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex justify-end gap-3">
      <button
        onclick={handleClose}
        class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
      >
        Done
      </button>
    </div>
  {/snippet}
</BaseModal>
