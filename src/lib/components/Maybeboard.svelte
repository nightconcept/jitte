<script lang="ts">
  import { deckStore } from "$lib/stores/deck-store";
  import type { Card } from "$lib/types/card";
  import CardSearch from "./CardSearch.svelte";
  import ImportMaybeboardModal from "./ImportMaybeboardModal.svelte";

  let {
    onCardHover = undefined,
  }: { onCardHover?: ((card: Card | null) => void) | undefined } = $props();

  // Store subscription
  let deckStoreState = $state($deckStore);

  $effect(() => {
    const unsubscribe = deckStore.subscribe((value) => {
      deckStoreState = value;
    });
    return unsubscribe;
  });

  // Derived values
  let maybeboard = $derived(deckStoreState?.maybeboard);
  let isEditing = $derived(deckStoreState?.isEditing ?? false);
  let categories = $derived(maybeboard?.categories || []);
  let currentCategory = $derived(
    categories.find((c) => c.id === activeCategory),
  );
  let cards = $derived(currentCategory?.cards || []);
  let totalCards = $derived(
    categories.reduce(
      (sum, cat) => sum + cat.cards.reduce((s, c) => s + c.quantity, 0),
      0,
    ),
  );

  // Active category
  let activeCategory = $state("main");
  let isCollapsed = $state(false);

  // Dropdown state
  let categoryDropdownOpen = $state(false);
  let categoryDropdownRef: HTMLDivElement | undefined = $state();

  // Modal state
  let importModalOpen = $state(false);

  // Card menu state
  let openMaybeboardCardMenu = $state<string | null>(null);

  // New category state
  let showNewCategoryInput = $state(false);
  let newCategoryName = $state("");

  // Quantity modal state
  let editQuantityCard = $state<Card | null>(null);
  let editQuantityAmount = $state(1);

  function selectCategory(categoryId: string) {
    activeCategory = categoryId;
    categoryDropdownOpen = false;
  }

  function toggleCollapsed() {
    isCollapsed = !isCollapsed;
  }

  function toggleCardMenu(cardName: string) {
    openMaybeboardCardMenu =
      openMaybeboardCardMenu === cardName ? null : cardName;
  }

  function closeCardMenu() {
    openMaybeboardCardMenu = null;
  }

  function handleMoveToDeck(card: Card) {
    deckStore.moveToDeck(card.name, activeCategory);
    closeCardMenu();
  }

  function handleRemove(card: Card) {
    deckStore.removeCardFromMaybeboard(card.name, activeCategory);
    closeCardMenu();
  }

  function handleEditQuantity(card: Card) {
    editQuantityCard = card;
    editQuantityAmount = card.quantity;
    closeCardMenu();
  }

  function saveQuantityEdit() {
    if (editQuantityCard) {
      deckStore.updateMaybeboardCardQuantity(
        editQuantityCard.name,
        activeCategory,
        editQuantityAmount,
      );
    }
    editQuantityCard = null;
  }

  function handleAddCategory() {
    if (newCategoryName.trim()) {
      deckStore.createMaybeboardCategory({ name: newCategoryName.trim() });
      newCategoryName = "";
      showNewCategoryInput = false;
    }
  }

  function handleDeleteCategory(categoryId: string) {
    if (confirm("Delete this maybeboard? All cards will be removed.")) {
      deckStore.deleteMaybeboardCategory(categoryId);
      // Switch to main if we deleted the active category
      if (activeCategory === categoryId) {
        activeCategory = "main";
      }
    }
  }

  function handleImport(decklist: string) {
    deckStore.importToMaybeboard(decklist, activeCategory);
    importModalOpen = false;
  }

  // Click outside handler for dropdown
  $effect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        categoryDropdownOpen &&
        categoryDropdownRef &&
        !categoryDropdownRef.contains(target)
      ) {
        categoryDropdownOpen = false;
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  });

  // Drag and drop handlers
  let draggedMaybeboardCard = $state<{ card: Card; categoryId: string } | null>(
    null,
  );
  let isDragging = $state(false);

  function handleDragStart(event: DragEvent, card: Card) {
    if (!isEditing) return;

    draggedMaybeboardCard = { card, categoryId: activeCategory };
    isDragging = true;

    // Set drag data
    event.dataTransfer!.effectAllowed = "move";
    event.dataTransfer!.setData(
      "application/json",
      JSON.stringify({
        card,
        categoryId: activeCategory,
        source: "maybeboard",
      }),
    );

    // Create custom drag image with card image
    if (card.imageUrls?.small) {
      const dragImage = new Image();
      dragImage.src = card.imageUrls.small;
      dragImage.style.width = "146px";
      dragImage.style.height = "204px";
      dragImage.style.borderRadius = "8px";
      dragImage.style.position = "absolute";
      dragImage.style.top = "-9999px";
      document.body.appendChild(dragImage);

      // Set drag image after a brief delay to ensure image is loaded
      setTimeout(() => {
        event.dataTransfer!.setDragImage(dragImage, 73, 102);
        setTimeout(() => document.body.removeChild(dragImage), 0);
      }, 0);
    }
  }

  function handleDragEnd() {
    draggedMaybeboardCard = null;
    isDragging = false;
  }

  function handleDragOver(event: DragEvent) {
    if (!isEditing) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
  }

  function handleDrop(event: DragEvent) {
    if (!isEditing) return;
    event.preventDefault();

    try {
      const data = JSON.parse(event.dataTransfer!.getData("application/json"));
      if (data.source === "decklist") {
        // Card dropped from decklist to maybeboard
        deckStore.moveToMaybeboard(
          data.card.name,
          data.category,
          activeCategory,
        );
      }
    } catch (e) {
      console.error("Failed to parse drag data:", e);
    }

    draggedMaybeboardCard = null;
    isDragging = false;
  }
</script>

<aside
  class="{isCollapsed
    ? 'w-12'
    : 'w-80'} bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col sticky top-[64px] self-start h-[calc(100vh-64px)] relative transition-all duration-200"
>
  <!-- Collapsible Header -->
  <button
    onclick={toggleCollapsed}
    class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors {isCollapsed
      ? 'writing-mode-vertical px-2'
      : ''}"
    title={isCollapsed ? "Expand Maybeboard" : "Collapse Maybeboard"}
  >
    {#if isCollapsed}
      <!-- Collapsed state: vertical text -->
      <div class="flex flex-col items-center gap-2 w-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 text-[var(--color-text-tertiary)] transition-transform rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span
          class="text-sm font-bold text-[var(--color-text-primary)] vertical-text"
        >
          Maybeboard
        </span>
        <span class="text-xs text-[var(--color-text-tertiary)]">
          {totalCards}
        </span>
      </div>
    {:else}
      <!-- Expanded state: horizontal layout -->
      <div class="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 text-[var(--color-text-tertiary)] transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <h2 class="text-lg font-bold text-[var(--color-text-primary)]">
          Maybeboard
        </h2>
        <span class="text-sm text-[var(--color-text-tertiary)]"
          >({totalCards})</span
        >
      </div>
    {/if}
  </button>

  {#if !isCollapsed}
    <div class="flex-1 overflow-y-auto p-4 flex flex-col">
      <!-- Category Selector and Actions -->
      {#if categories.length > 0}
        <div class="flex items-center gap-2 mb-4">
          <!-- Category Dropdown -->
          <div class="relative flex-1" bind:this={categoryDropdownRef}>
            <button
              onclick={() => (categoryDropdownOpen = !categoryDropdownOpen)}
              class="w-full px-3 py-2 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center justify-between"
              title="Select Maybeboard"
            >
              <span class="truncate">
                {currentCategory?.name || "Select Maybeboard"}
                <span class="text-xs text-[var(--color-text-tertiary)] ml-1">
                  ({cards.reduce((sum, c) => sum + c.quantity, 0)})
                </span>
              </span>
              <svg
                class="w-4 h-4 ml-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <!-- Category Dropdown Menu -->
            {#if categoryDropdownOpen}
              <div
                class="absolute top-full mt-1 left-0 right-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50 max-h-60 overflow-y-auto"
              >
                {#each categories as category}
                  <div
                    class="flex items-center hover:bg-[var(--color-surface-hover)] {activeCategory ===
                    category.id
                      ? 'bg-[var(--color-surface-hover)]'
                      : ''}"
                  >
                    <button
                      onclick={() => selectCategory(category.id)}
                      class="flex-1 px-4 py-2 text-left text-sm text-[var(--color-text-primary)]"
                    >
                      <span class="truncate">
                        {category.name}
                        <span
                          class="text-xs text-[var(--color-text-tertiary)] ml-1"
                        >
                          ({category.cards.reduce(
                            (sum, c) => sum + c.quantity,
                            0,
                          )})
                        </span>
                      </span>
                    </button>
                    {#if isEditing && category.id !== "main"}
                      <button
                        onclick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                        class="mr-2 p-1 hover:bg-[var(--color-border)] rounded flex-shrink-0"
                        title="Delete Maybeboard"
                      >
                        <svg
                          class="w-3 h-3 text-red-400"
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
                {/each}
              </div>
            {/if}
          </div>

          <!-- Add Category Button -->
          {#if isEditing}
            <button
              onclick={() => (showNewCategoryInput = !showNewCategoryInput)}
              class="px-3 py-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] rounded text-white text-sm font-bold flex-shrink-0"
              title="Add Maybeboard"
            >
              +
            </button>
          {/if}
        </div>

        <!-- New Category Input -->
        {#if showNewCategoryInput}
          <div class="flex items-center gap-2 mb-4">
            <input
              type="text"
              bind:value={newCategoryName}
              placeholder="Maybeboard name"
              class="flex-1 px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
              onkeydown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") showNewCategoryInput = false;
              }}
            />
            <button
              onclick={handleAddCategory}
              class="px-3 py-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] rounded text-white text-sm"
            >
              Add
            </button>
            <button
              onclick={() => {
                showNewCategoryInput = false;
                newCategoryName = "";
              }}
              class="px-3 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] rounded text-[var(--color-text-primary)] text-sm"
            >
              Cancel
            </button>
          </div>
        {/if}

        <!-- Search and Import (Edit Mode) -->
        {#if isEditing}
          <div
            class="mb-4 pb-4 border-b border-[var(--color-border)] space-y-3"
          >
            <!-- Import Button -->
            <button
              onclick={() => (importModalOpen = true)}
              class="w-full px-3 py-2 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center justify-center gap-2"
              title="Bulk Import Cards"
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Bulk Import Cards
            </button>

            <!-- Search Box -->
            <CardSearch
              addToMaybeboard={true}
              maybeboardCategoryId={activeCategory}
            />
          </div>
        {/if}

        <!-- Cards in Active Category -->
        <div
          class="space-y-1 flex-1 overflow-y-auto"
          onclick={closeCardMenu}
          ondragover={handleDragOver}
          ondrop={handleDrop}
          role="presentation"
        >
          {#if cards.length > 0}
            {#each cards as card}
              <div class="relative">
                <div
                  class="flex items-center justify-between py-2 px-3 hover:bg-[var(--color-brand-primary)]/5 rounded transition-colors group {isEditing
                    ? 'cursor-grab active:cursor-grabbing'
                    : ''}"
                  draggable={isEditing}
                  ondragstart={(e) => handleDragStart(e, card)}
                  ondragend={handleDragEnd}
                  onmouseenter={() => onCardHover?.(card)}
                  onmouseleave={() => onCardHover?.(null)}
                  role="button"
                  tabindex="0"
                >
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <!-- Quantity -->
                    <span
                      class="text-[var(--color-text-tertiary)] text-sm w-6 flex-shrink-0"
                    >
                      {card.quantity}x
                    </span>

                    <!-- Card Name -->
                    <span
                      class="text-[var(--color-text-primary)] text-sm truncate"
                    >
                      {card.name}
                    </span>
                  </div>

                  <!-- Menu -->
                  {#if isEditing}
                    <button
                      class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-border)] rounded flex-shrink-0"
                      onclick={(e) => {
                        e.stopPropagation();
                        toggleCardMenu(card.name);
                      }}
                      title="Card options"
                    >
                      <svg
                        class="w-4 h-4 text-[var(--color-text-secondary)]"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path
                          d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
                        />
                      </svg>
                    </button>
                  {/if}
                </div>

                <!-- Card Menu Dropdown (positioned relative to this card row) -->
                {#if openMaybeboardCardMenu === card.name}
                  <div
                    class="absolute right-0 top-full mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-[100]"
                  >
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        handleEditQuantity(card);
                      }}
                      class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      Edit Quantity ({card.quantity})
                    </button>
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        handleMoveToDeck(card);
                      }}
                      class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
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
                          d="M11 17l-5-5m0 0l5-5m-5 5h12"
                        />
                      </svg>
                      Move to Deck
                    </button>
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        handleRemove(card);
                      }}
                      class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2 border-t border-[var(--color-border)]"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Remove
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          {:else}
            <div class="text-center py-8 px-4">
              <p class="text-[var(--color-text-tertiary)] text-sm mb-2">
                Empty maybeboard
              </p>
              {#if isEditing}
                <p
                  class="text-[var(--color-text-tertiary)] text-xs flex items-center justify-center gap-1.5"
                >
                  <svg
                    class="w-3.5 h-3.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span
                    >Tip: You can drag and drop cards between decklist and
                    maybeboard</span
                  >
                </p>
              {/if}
            </div>
          {/if}
        </div>
      {:else}
        <div class="text-center py-8 text-[var(--color-text-tertiary)] text-sm">
          No maybeboards
        </div>
      {/if}
    </div>
  {/if}
</aside>

<!-- Import Modal -->
<ImportMaybeboardModal
  isOpen={importModalOpen}
  onClose={() => (importModalOpen = false)}
  onImport={handleImport}
  categoryName={currentCategory?.name || ""}
/>

<!-- Edit Quantity Modal -->
{#if editQuantityCard}
  <div
    class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div
      class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 border border-[var(--color-border)]"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-[var(--color-border)]">
        <h2 class="text-xl font-bold text-[var(--color-text-primary)]">
          Edit Quantity
        </h2>
        <p class="text-sm text-[var(--color-text-secondary)] mt-1">
          {editQuantityCard.name}
        </p>
      </div>

      <!-- Body -->
      <div class="px-6 py-4">
        <label
          class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
        >
          Quantity
        </label>
        <input
          type="number"
          bind:value={editQuantityAmount}
          min="1"
          max="100"
          class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
          autofocus
        />
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3"
      >
        <button
          onclick={() => (editQuantityCard = null)}
          class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
        >
          Cancel
        </button>
        <button
          onclick={saveQuantityEdit}
          class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .vertical-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }
</style>
