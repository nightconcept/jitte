<script lang="ts">
	import { deckStore, validationWarnings } from '$lib/stores/deck-store';
	import { CardCategory } from '$lib/types/card';
	import type { Card } from '$lib/types/card';
	import AddQuantityModal from './AddQuantityModal.svelte';
	import ChangePrintingModal from './ChangePrintingModal.svelte';
	import CardSearch from './CardSearch.svelte';
	import ValidationWarningIcon from './ValidationWarningIcon.svelte';
	import { isGameChanger } from '$lib/utils/game-changers';

	let { 
		onCardHover = undefined,
		onImport = undefined
	}: { 
		onCardHover?: ((card: Card | null) => void) | undefined;
		onImport?: (() => void) | undefined;
	} = $props();

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

	// Validation warnings subscription
	let warnings = $state($validationWarnings);

	$effect(() => {
		const unsubscribe = validationWarnings.subscribe(value => {
			warnings = value;
		});
		return unsubscribe;
	});

	// Helper function to get warnings for a specific card
	function getCardWarnings(cardName: string) {
		return warnings.filter(w => w.cardName === cardName);
	}

	// View options
	type ViewMode = 'text' | 'condensed';
	type GroupMode = 'type';
	type SortMode = 'name' | 'mana_value';

	let viewMode = $state<ViewMode>('text');
	let groupMode = $state<GroupMode>('type');
	let sortMode = $state<SortMode>('name');

	// Dropdown states
	let viewDropdownOpen = $state(false);
	let groupDropdownOpen = $state(false);
	let sortDropdownOpen = $state(false);

	// Card menu state (track which card's menu is open)
	let openCardMenu = $state<string | null>(null);
	let openCardMenuRef = $state<HTMLDivElement>();

	function toggleCardMenu(cardName: string) {
		openCardMenu = openCardMenu === cardName ? null : cardName;
	}

	function closeCardMenu() {
		openCardMenu = null;
	}

	// Close card menu when switching out of edit mode
	$effect(() => {
		if (!isEditing) {
			closeCardMenu();
		}
	});

	// Click outside handler for card menu
	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;

			if (openCardMenu && openCardMenuRef && !openCardMenuRef.contains(target)) {
				closeCardMenu();
			}
		}

		if (openCardMenu) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	});

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
		CardCategory.Land,
		CardCategory.Other
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
	let collapsed = $state<Record<string, boolean>>({
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
	});

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
	let addMoreCard = $state<{ card: Card; category: CardCategory } | null>(null);
	let changePrintingCard = $state<{ card: Card; category: CardCategory } | null>(null);

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

<div class="flex-1 p-6" onkeydown={(e) => e.key === 'Escape' && closeCardMenu()} role="button" tabindex="-1">
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
			<!-- Bulk Edit Button -->
			{#if isEditing && onImport}
				<button
					onclick={onImport}
					class="px-3 py-1.5 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center gap-2"
					title="Bulk Edit Decklist as Plaintext"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
					Bulk Edit
				</button>
			{/if}

			<!-- View Dropdown -->
			<div class="relative">
				<button
					onclick={() => { viewDropdownOpen = !viewDropdownOpen; groupDropdownOpen = false; sortDropdownOpen = false; }}
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
							onclick={() => { viewMode = 'text'; viewDropdownOpen = false; }}
							class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] {viewMode === 'text' ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-primary)]'}"
						>
							Text
						</button>
						<button
							onclick={() => { viewMode = 'condensed'; viewDropdownOpen = false; }}
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
					onclick={() => { groupDropdownOpen = !groupDropdownOpen; viewDropdownOpen = false; sortDropdownOpen = false; }}
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
							onclick={() => { groupMode = 'type'; groupDropdownOpen = false; }}
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
					onclick={() => { sortDropdownOpen = !sortDropdownOpen; viewDropdownOpen = false; groupDropdownOpen = false; }}
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
							onclick={() => { sortMode = 'name'; sortDropdownOpen = false; }}
							class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] {sortMode === 'name' ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-primary)]'}"
						>
							Name
						</button>
						<button
							onclick={() => { sortMode = 'mana_value'; sortDropdownOpen = false; }}
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
						onclick={() => toggleCategory(category)}
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
												onmouseenter={() => onCardHover?.(card)}
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

													<!-- Game Changer Icon -->
													{#if isGameChanger(card.name)}
														<span
															class="flex-shrink-0 text-amber-500 font-bold text-xs"
															title="Game Changer - This card affects your deck's bracket level"
														>
															<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
																<path d="M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm3.854 1.146a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 1 1-.708-.708l1.5-1.5a.5.5 0 0 1 .708 0zm-7.708 0a.5.5 0 0 1 .708 0l1.5 1.5a.5.5 0 1 1-.708.708l-1.5-1.5a.5.5 0 0 1 0-.708zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
															</svg>
														</span>
													{/if}

													<!-- Validation Warnings -->
													{#each getCardWarnings(card.name) as warning}
														<ValidationWarningIcon {warning} position="right" />
													{/each}
												</div>

												<!-- Card Menu Icon -->
												{#if isEditing}
												<div class="flex-shrink-0">
												<button
												 class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-border)] rounded"
												 onmousedown={(e) => e.stopPropagation()}
												 onclick={(e) => { e.stopPropagation(); toggleCardMenu(card.name); }}
												  title="Card options"
												>
												<svg class="w-4 h-4 text-[var(--color-text-secondary)]" fill="currentColor" viewBox="0 0 16 16">
												  <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
												  </svg>
												  </button>
											</div>
										{/if}

												<!-- Card Menu Dropdown (positioned relative to card row) -->
												{#if openCardMenu === card.name}
														<div
															bind:this={openCardMenuRef}
															class="absolute right-0 top-full mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-[100]"
														>
															<button
																onclick={(e) => { e.stopPropagation(); handleAddOne(card, category); }}
																class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
																</svg>
																Add one
															</button>
															<button
																onclick={(e) => { e.stopPropagation(); showAddMoreModal(card, category); }}
																class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
																</svg>
																Add more...
															</button>
															<button
																onclick={(e) => { e.stopPropagation(); handleRemove(card, category); }}
																class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
																</svg>
																Remove
															</button>
															<div class="border-t border-[var(--color-border)] my-1"></div>
															<button
																onclick={(e) => { e.stopPropagation(); showChangePrintingModal(card, category); }}
																class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
																</svg>
																Change printing
															</button>
															<button
																onclick={(e) => { e.stopPropagation(); handleMoveToMaybeboard(card, category); }}
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
