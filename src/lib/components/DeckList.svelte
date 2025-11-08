<script lang="ts">
	import { deckStore } from '$lib/stores/deck-store';
	import { CardCategory } from '$lib/types/card';
	import type { Card } from '$lib/types/card';
	import AddQuantityModal from './AddQuantityModal.svelte';
	import ChangePrintingModal from './ChangePrintingModal.svelte';
	import CardSearch from './CardSearch.svelte';

	let { onCardHover = undefined }: { onCardHover?: ((card: Card | null) => void) | undefined } = $props();

	let deckStoreState = $state($deckStore);

	// Subscribe to store updates
	$effect(() => {
		const unsubscribe = deckStore.subscribe(value => {
			deckStoreState = value;
		});
		return unsubscribe;
	});

	let deck = $derived(deckStoreState?.deck);
	let isEditing = $derived(deckStoreState?.isEditing ?? false);

	// View options
	type ViewMode = 'text' | 'condensed';
	type GroupMode = 'type';
	type SortMode = 'name' | 'mana_value';

	let viewMode: ViewMode = 'text';
	let groupMode: GroupMode = 'type';
	let sortMode: SortMode = 'name';

	// Dropdown states
	let viewDropdownOpen = false;
	let groupDropdownOpen = false;
	let sortDropdownOpen = false;

	// Card menu state (track which card's menu is open)
	let openCardMenu: string | null = null;

	function toggleCardMenu(cardName: string) {
		openCardMenu = openCardMenu === cardName ? null : cardName;
	}

	function closeCardMenu() {
		openCardMenu = null;
	}

	// Category display order (canonical order from requirements)
	const categoryOrder: CardCategory[] = [
		CardCategory.Commander,
		CardCategory.Companion,
		CardCategory.Planeswalker,
		CardCategory.Creature,
		CardCategory.Instant,
		CardCategory.Sorcery,
		CardCategory.Artifact,
		CardCategory.Enchantment,
		CardCategory.Land
	];

	const categoryLabels: Record<CardCategory, string> = {
		[CardCategory.Commander]: 'Commander',
		[CardCategory.Companion]: 'Companion',
		[CardCategory.Planeswalker]: 'Planeswalkers',
		[CardCategory.Creature]: 'Creatures',
		[CardCategory.Instant]: 'Instants',
		[CardCategory.Sorcery]: 'Sorceries',
		[CardCategory.Artifact]: 'Artifacts',
		[CardCategory.Enchantment]: 'Enchantments',
		[CardCategory.Land]: 'Lands',
		[CardCategory.Other]: 'Other'
	};

	// Collapsible sections state
	let collapsed: Record<string, boolean> = {
		[CardCategory.Commander]: false,
		[CardCategory.Companion]: false,
		[CardCategory.Planeswalker]: false,
		[CardCategory.Creature]: false,
		[CardCategory.Instant]: false,
		[CardCategory.Sorcery]: false,
		[CardCategory.Artifact]: false,
		[CardCategory.Enchantment]: false,
		[CardCategory.Land]: false,
		[CardCategory.Other]: false
	};

	function toggleCategory(category: CardCategory) {
		collapsed[category] = !collapsed[category];
	}

	function getCategoryCards(category: CardCategory): Card[] {
		const cards = deck?.cards[category] || [];

		// Sort cards based on sortMode
		if (sortMode === 'name') {
			return [...cards].sort((a, b) => a.name.localeCompare(b.name));
		} else if (sortMode === 'mana_value') {
			return [...cards].sort((a, b) => (a.cmc || 0) - (b.cmc || 0));
		}

		return cards;
	}

	function getCategoryCount(category: CardCategory): number {
		const cards = getCategoryCards(category);
		return cards.reduce((sum, card) => sum + card.quantity, 0);
	}

	function handleCardClick(card: Card, category: CardCategory) {
		if (!isEditing) return;
		// TODO: Show card menu
	}

	// Card menu actions
	function handleAddOne(card: Card, category: CardCategory) {
		deckStore.updateCardQuantity(card.name, category, 1);
		closeCardMenu();
	}

	function handleRemove(card: Card, category: CardCategory) {
		deckStore.removeCard(card.name, category);
		closeCardMenu();
	}

	// Modal states
	let addMoreCard: { card: Card; category: CardCategory } | null = null;
	let changePrintingCard: { card: Card; category: CardCategory } | null = null;

	function showAddMoreModal(card: Card, category: CardCategory) {
		addMoreCard = { card, category };
		closeCardMenu();
	}

	function showChangePrintingModal(card: Card, category: CardCategory) {
		changePrintingCard = { card, category };
		closeCardMenu();
	}

	function handleAddQuantity(quantity: number) {
		if (addMoreCard) {
			deckStore.updateCardQuantity(addMoreCard.card.name, addMoreCard.category, quantity);
			addMoreCard = null;
		}
	}

	function handleChangePrinting(newCard: Card) {
		if (changePrintingCard) {
			deckStore.switchPrinting(changePrintingCard.card.name, changePrintingCard.category, newCard);
			changePrintingCard = null;
		}
	}

	function handleMoveToMaybeboard(card: Card, category: CardCategory) {
		deckStore.moveToMaybeboard(card.name, category);
		closeCardMenu();
	}
</script>

<div class="flex-1 p-6" on:click={closeCardMenu} on:keydown={(e) => e.key === 'Escape' && closeCardMenu()} role="button" tabindex="-1">
	<!-- Card Search (Edit Mode Only) -->
	{#if isEditing}
		<div class="mb-4">
			<CardSearch />
		</div>
	{/if}

	<!-- Header with dropdowns -->
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Decklist</h2>

		<div class="flex items-center gap-3">
			<!-- View Dropdown -->
			<div class="relative">
				<button
					on:click={() => { viewDropdownOpen = !viewDropdownOpen; groupDropdownOpen = false; sortDropdownOpen = false; }}
					class="px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] flex items-center gap-2"
				>
					<span class="text-[var(--color-text-tertiary)]">View:</span>
					<span>{viewMode === 'text' ? 'Text' : 'Condensed Text'}</span>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				{#if viewDropdownOpen}
					<div class="absolute right-0 mt-1 w-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg z-10">
						<button
							on:click={() => { viewMode = 'text'; viewDropdownOpen = false; }}
							class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] {viewMode === 'text' ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-primary)]'}"
						>
							Text
						</button>
						<button
							on:click={() => { viewMode = 'condensed'; viewDropdownOpen = false; }}
							class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] {viewMode === 'condensed' ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-primary)]'}"
						>
							Condensed Text
						</button>
					</div>
				{/if}
			</div>

			<!-- Group Dropdown -->
			<div class="relative">
				<button
					on:click={() => { groupDropdownOpen = !groupDropdownOpen; viewDropdownOpen = false; sortDropdownOpen = false; }}
					class="px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] flex items-center gap-2"
				>
					<span class="text-[var(--color-text-tertiary)]">Group:</span>
					<span>Type</span>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				{#if groupDropdownOpen}
					<div class="absolute right-0 mt-1 w-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg z-10">
						<button
							on:click={() => { groupMode = 'type'; groupDropdownOpen = false; }}
							class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-brand-primary)]"
						>
							Type
						</button>
					</div>
				{/if}
			</div>

			<!-- Sort Dropdown -->
			<div class="relative">
				<button
					on:click={() => { sortDropdownOpen = !sortDropdownOpen; viewDropdownOpen = false; groupDropdownOpen = false; }}
					class="px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] flex items-center gap-2"
				>
					<span class="text-[var(--color-text-tertiary)]">Sort:</span>
					<span>{sortMode === 'name' ? 'Name' : 'Mana Value'}</span>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				{#if sortDropdownOpen}
					<div class="absolute right-0 mt-1 w-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg z-10">
						<button
							on:click={() => { sortMode = 'name'; sortDropdownOpen = false; }}
							class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] {sortMode === 'name' ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-primary)]'}"
						>
							Name
						</button>
						<button
							on:click={() => { sortMode = 'mana_value'; sortDropdownOpen = false; }}
							class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] {sortMode === 'mana_value' ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-primary)]'}"
						>
							Mana Value
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Card List -->
	<div class="space-y-2 overflow-visible">
		{#each categoryOrder as category}
			{@const cards = getCategoryCards(category)}
			{@const count = getCategoryCount(category)}

			{#if cards.length > 0}
				<div class="bg-[var(--color-surface)] rounded-lg overflow-visible">
					<!-- Category Header -->
					<button
						on:click={() => toggleCategory(category)}
						class="w-full flex items-center justify-between px-4 py-2 hover:bg-[var(--color-surface-hover)] transition-colors rounded-t-lg"
					>
						<div class="flex items-center gap-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4 text-[var(--color-text-tertiary)] transition-transform {collapsed[category] ? '-rotate-90' : ''}"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
							<span class="font-semibold text-[var(--color-text-primary)]">
								{categoryLabels[category]}
							</span>
							<span class="text-sm text-[var(--color-text-tertiary)]">
								({count})
							</span>
						</div>
					</button>

					<!-- Card List in Responsive Columns -->
					{#if !collapsed[category]}
						<div class="px-4 pb-2 rounded-b-lg overflow-visible">
							<div class="responsive-card-grid overflow-visible">
								{#each cards as card}
											<div
												class="relative flex items-center justify-between hover:bg-[var(--color-surface-active)] rounded transition-colors group {viewMode === 'condensed' ? 'py-0.5 px-2' : 'py-1.5 px-2'}"
												on:mouseenter={() => onCardHover?.(card)}
												role="button"
												tabindex="0"
											>
												<div class="flex items-center gap-2 flex-1 min-w-0">
													<!-- Quantity -->
													<span class="text-[var(--color-text-primary)] text-sm font-semibold flex-shrink-0 min-w-[1.5rem]">
														{card.quantity}
													</span>

													<!-- Card Name -->
													<span class="text-[var(--color-text-primary)] text-sm truncate">
														{card.name}
													</span>
												</div>

												<!-- Card Menu Icon -->
												<div class="relative flex-shrink-0">
													<button
														class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-border)] rounded"
														on:click|stopPropagation={() => toggleCardMenu(card.name)}
														title="Card options"
													>
														<svg class="w-4 h-4 text-[var(--color-text-secondary)]" fill="currentColor" viewBox="0 0 16 16">
															<circle cx="8" cy="3" r="1.5" />
															<circle cx="8" cy="8" r="1.5" />
															<circle cx="8" cy="13" r="1.5" />
														</svg>
													</button>

													<!-- Card Menu Dropdown -->
													{#if openCardMenu === card.name}
														<div class="absolute right-0 mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50">
															<button
																on:click|stopPropagation={() => handleAddOne(card, category)}
																class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
																</svg>
																Add one
															</button>
															<button
																on:click|stopPropagation={() => showAddMoreModal(card, category)}
																class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
																</svg>
																Add more...
															</button>
															<button
																on:click|stopPropagation={() => handleRemove(card, category)}
																class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
																</svg>
																Remove
															</button>
															<div class="border-t border-[var(--color-border)] my-1"></div>
															<button
																on:click|stopPropagation={() => showChangePrintingModal(card, category)}
																class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
																</svg>
																Change printing
															</button>
															<button
																on:click|stopPropagation={() => handleMoveToMaybeboard(card, category)}
																class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
																</svg>
																Move to Maybeboard
															</button>
														</div>
													{/if}
												</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
</div>

<!-- Modals -->
{#if addMoreCard}
	<AddQuantityModal
		card={addMoreCard.card}
		category={addMoreCard.category}
		onConfirm={handleAddQuantity}
		onClose={() => addMoreCard = null}
	/>
{/if}

{#if changePrintingCard}
	<ChangePrintingModal
		card={changePrintingCard.card}
		category={changePrintingCard.category}
		onConfirm={handleChangePrinting}
		onClose={() => changePrintingCard = null}
	/>
{/if}

<style>
	.responsive-card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		column-gap: 1rem;
	}

	/* At larger screens (1920px), aim for approximately 4 columns */
	@media (min-width: 1536px) {
		.responsive-card-grid {
			grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		}
	}

	/* At smaller screens, allow fewer columns */
	@media (max-width: 1024px) {
		.responsive-card-grid {
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		}
	}

	@media (max-width: 768px) {
		.responsive-card-grid {
			grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		}
	}
</style>
