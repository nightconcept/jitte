<script lang="ts">
	import { deckStore } from '$lib/stores/deck-store';
	import type { Card } from '$lib/types/card';
	import ManaSymbol from './ManaSymbol.svelte';
	import CardSearch from './CardSearch.svelte';

	export let onCardHover: ((card: Card | null) => void) | undefined = undefined;

	$: maybeboard = $deckStore?.maybeboard;
	$: isEditing = $deckStore?.isEditing ?? false;

	// Active category tab
	let activeCategory = 'main';
	let isCollapsed = false;

	function selectCategory(categoryId: string) {
		activeCategory = categoryId;
	}

	function toggleCollapsed() {
		isCollapsed = !isCollapsed;
	}

	$: categories = maybeboard?.categories || [];
	$: currentCategory = categories.find(c => c.id === activeCategory);
	$: cards = currentCategory?.cards || [];
	$: totalCards = categories.reduce((sum, cat) => sum + cat.cards.reduce((s, c) => s + c.quantity, 0), 0);

	// Card menu state
	let openCardMenu: string | null = null;

	function toggleCardMenu(cardName: string) {
		openCardMenu = openCardMenu === cardName ? null : cardName;
	}

	function closeCardMenu() {
		openCardMenu = null;
	}

	function handleMoveToDeck(card: Card) {
		deckStore.moveToDeck(card.name, activeCategory);
		closeCardMenu();
	}

	function handleRemove(card: Card) {
		deckStore.removeCardFromMaybeboard(card.name, activeCategory);
		closeCardMenu();
	}
</script>

<aside class="w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col sticky top-[121px] self-start h-[calc(100vh-121px)]">
	<!-- Collapsible Header -->
	<button
		on:click={toggleCollapsed}
		class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
	>
		<div class="flex items-center gap-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4 text-[var(--color-text-tertiary)] transition-transform {isCollapsed ? '-rotate-90' : ''}"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
			<h2 class="text-lg font-bold text-[var(--color-text-primary)]">Maybeboard</h2>
			<span class="text-sm text-[var(--color-text-tertiary)]">({totalCards})</span>
		</div>
	</button>

	{#if !isCollapsed}
		<div class="flex-1 overflow-y-auto p-4">

	<!-- Category Tabs -->
	{#if categories.length > 0}
		<div class="flex items-center gap-2 mb-4 border-b border-[var(--color-border)]">
			{#each categories as category}
				<button
					on:click={() => selectCategory(category.id)}
					class="px-4 py-2 text-sm font-medium transition-colors border-b-2 {activeCategory === category.id
						? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
						: 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
				>
					{category.name}
					<span class="text-xs text-[var(--color-text-tertiary)] ml-1">
						({category.cards.reduce((sum, c) => sum + c.quantity, 0)})
					</span>
				</button>
			{/each}

			{#if isEditing}
				<button
					class="px-3 py-1 text-xs bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] rounded text-[var(--color-text-primary)] transition-colors"
					title="Add Category"
				>
					+
				</button>
			{/if}
		</div>

		<!-- Cards in Active Category -->
		<div class="space-y-1 max-h-48 overflow-y-auto" on:click={closeCardMenu} role="presentation">
			{#if cards.length > 0}
				{#each cards as card}
					<div
						class="flex items-center justify-between py-2 px-3 hover:bg-[var(--color-surface)] rounded transition-colors group"
						on:mouseenter={() => onCardHover?.(card)}
						on:mouseleave={() => onCardHover?.(null)}
						role="button"
						tabindex="0"
					>
						<div class="flex items-center gap-3 flex-1 min-w-0">
							<!-- Quantity -->
							<span class="text-[var(--color-text-tertiary)] text-sm w-6 flex-shrink-0">
								{card.quantity}x
							</span>

							<!-- Card Name -->
							<span class="text-[var(--color-text-primary)] text-sm truncate">
								{card.name}
							</span>

							<!-- Mana Cost -->
							{#if card.manaCost}
								<div class="flex items-center gap-0.5 flex-shrink-0">
									<ManaSymbol cost={card.manaCost} />
								</div>
							{/if}
						</div>

						<!-- Price and Menu -->
						<div class="flex items-center gap-2 flex-shrink-0">
							{#if card.price}
								<span class="text-xs text-[var(--color-accent-green)]">
									${card.price.toFixed(2)}
								</span>
							{/if}

							{#if isEditing}
								<div class="relative">
									<button
										class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-border)] rounded"
										on:click|stopPropagation={() => toggleCardMenu(card.name)}
										title="Card options"
									>
										<svg class="w-4 h-4 text-[var(--color-text-secondary)]" fill="currentColor" viewBox="0 0 16 16">
											<path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
										</svg>
									</button>

									<!-- Card Menu Dropdown -->
									{#if openCardMenu === card.name}
										<div class="absolute right-0 mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50">
											<button
												on:click|stopPropagation={() => handleMoveToDeck(card)}
												class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
												</svg>
												Move to Deck
											</button>
											<button
												on:click|stopPropagation={() => handleRemove(card)}
												class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
												</svg>
												Remove
											</button>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			{:else}
				<div class="text-center py-8 text-[var(--color-text-tertiary)] text-sm">
					No cards in this category
				</div>
			{/if}
		</div>
	{:else}
		<div class="text-center py-8 text-[var(--color-text-tertiary)] text-sm">
			No maybeboard categories
		</div>
	{/if}

	<!-- Search Box (Edit Mode) -->
	{#if isEditing}
		<div class="mt-4">
			<CardSearch addToMaybeboard={true} maybeboardCategoryId={activeCategory} />
		</div>
	{/if}
		</div>
	{/if}
</aside>
