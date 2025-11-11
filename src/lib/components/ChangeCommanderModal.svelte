<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { cardService } from '$lib/api/card-service';
	import { toastStore } from '$lib/stores/toast-store';
	import type { CardSearchResult } from '$lib/api/card-service';
	import type { Card } from '$lib/types/card';
	import type { ScryfallCard } from '$lib/types/scryfall';
	import ManaSymbol from './ManaSymbol.svelte';
	import PartnerBadge from './PartnerBadge.svelte';
	import CornerBadge from './CornerBadge.svelte';
	import { canBePartners, detectPartnerType } from '$lib/utils/partner-detection';
	import { MIN_SEARCH_CHARACTERS } from '$lib/constants/search';
	import { scryfallToCard } from '$lib/utils/card-converter';
	import { isGameChanger } from '$lib/utils/game-changers';

	let {
		isOpen = false,
		mode = 'replace_all',
		existingCommanders = []
	}: {
		isOpen?: boolean;
		mode?: 'replace_all' | 'replace_partner' | 'add_partner';
		existingCommanders?: Card[];
	} = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		select: Card;
	}>();

	let searchQuery = $state('');
	let results = $state<CardSearchResult[]>([]);
	let isLoading = $state(false);
	let debounceTimer: number | undefined;
	let selectedResult = $state<CardSearchResult | null>(null);
	let selectedCardFull = $state<Card | null>(null);
	let selectedScryfallCard = $state<ScryfallCard | null>(null);
	let loadingCardDetails = $state(false);

	// Reset when modal opens
	$effect(() => {
		if (isOpen) {
			searchQuery = '';
			results = [];
			selectedResult = null;
			selectedCardFull = null;
			selectedScryfallCard = null;
		}
	});

	/**
	 * Check if a card can be a commander based on type line and oracle text
	 */
	function canBeCommander(typeLine: string, oracleText?: string): boolean {
		const lowerType = typeLine.toLowerCase();
		const lowerOracle = oracleText?.toLowerCase() || '';

		// Check if it's a legendary creature
		if (lowerType.includes('legendary') && lowerType.includes('creature')) {
			return true;
		}

		// Check if it explicitly says it can be your commander
		if (lowerOracle.includes('can be your commander')) {
			return true;
		}

		// Check for partner keywords (these can be commanders)
		if (
			lowerOracle.includes('partner') ||
			lowerOracle.includes('friends forever') ||
			lowerOracle.includes('choose a background')
		) {
			// But only if it's also legendary
			return lowerType.includes('legendary');
		}

		return false;
	}

	async function handleInput() {
		// Clear previous timer
		if (debounceTimer) clearTimeout(debounceTimer);

		// Only search if enough characters
		if (searchQuery.length < MIN_SEARCH_CHARACTERS) {
			results = [];
			return;
		}

		// Debounce the search
		debounceTimer = window.setTimeout(async () => {
			isLoading = true;

			try {
				// Search for legendary creatures and cards that can be commanders
				const searchResults = await cardService.searchCards(searchQuery, 50);

				// Filter to only legal commanders
				const legalCommanders = searchResults.filter((card) =>
					canBeCommander(card.type_line, card.oracle_text)
				);

				// Sort results: prioritize matches at the start of the name
				const sorted = legalCommanders.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					const searchLower = searchQuery.toLowerCase();

					const aStartsWith = aName.startsWith(searchLower);
					const bStartsWith = bName.startsWith(searchLower);

					// If one starts with query and other doesn't, prioritize the one that does
					if (aStartsWith && !bStartsWith) return -1;
					if (!aStartsWith && bStartsWith) return 1;

					// Otherwise, maintain alphabetical order
					return aName.localeCompare(bName);
				});

				// Take top 20 after filtering and sorting
				results = sorted.slice(0, 20);
			} catch (error) {
				console.error('Search error:', error);
				results = [];
			} finally {
				isLoading = false;
			}
		}, 300);
	}

	async function selectCard(result: CardSearchResult) {
		selectedResult = result;
		loadingCardDetails = true;

		try {
			// Fetch full card data
			let scryfallCard;

			if (result.set && result.collector_number) {
				scryfallCard = await cardService.getCardBySetAndNumber(
					result.set,
					result.collector_number,
					result.name
				);
			} else {
				scryfallCard = await cardService.getCardByName(result.name);
			}

			if (!scryfallCard) {
				toastStore.error(
					`Failed to fetch card: ${result.name}`,
					0,
					`The card was found in search results but could not be fetched from Scryfall.`
				);
				loadingCardDetails = false;
				return;
			}

			// Convert to our Card type
			const card = scryfallToCard(scryfallCard);

			selectedCardFull = card;
			selectedScryfallCard = scryfallCard;
			loadingCardDetails = false;
		} catch (error) {
			console.error('Error selecting card:', error);
			toastStore.error('Failed to fetch card data');
			loadingCardDetails = false;
		}
	}

	function confirmSelection() {
		if (selectedCardFull) {
			dispatch('select', selectedCardFull);
		}
	}

	function handleClose() {
		dispatch('close');
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	// Check if selected card is valid commander (should always be true due to filtering)
	let isValidCommander = $derived(selectedResult ? canBeCommander(selectedResult.type_line, selectedResult.oracle_text) : true);
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
		onclick={handleBackdropClick}
		role="presentation"
	>
		<!-- Modal Content -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-xl w-full max-w-6xl mx-4 border border-[var(--color-border)] h-[85vh] flex flex-col"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-[var(--color-border)]">
				<h2 class="text-xl font-bold text-[var(--color-text-primary)]">
					{#if mode === 'add_partner'}
						Add Partner Commander
					{:else if mode === 'replace_partner'}
						Replace Partner Commander
					{:else}
						Change Commander
					{/if}
				</h2>
				<p class="text-sm text-[var(--color-text-secondary)] mt-1">
					{#if mode === 'add_partner'}
						Search for a partner commander compatible with {existingCommanders[0]?.name || 'your commander'}
					{:else if mode === 'replace_partner'}
						Search for a new partner commander
					{:else}
						Search for a legendary creature or card that can be your commander
					{/if}
				</p>
			</div>

			<!-- Body - Split Layout -->
			<div class="flex-1 flex overflow-hidden">
				<!-- Left Side: Search and Results -->
				<div class="w-1/2 border-r border-[var(--color-border)] flex flex-col">
					<!-- Search Input -->
					<div class="p-4 border-b border-[var(--color-border)]">
						<div class="relative">
							<input
								type="text"
								bind:value={searchQuery}
								oninput={handleInput}
								placeholder="Search for commander (min {MIN_SEARCH_CHARACTERS} characters)..."
								class="w-full px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
								autofocus
							/>

							{#if isLoading}
								<div class="absolute right-3 top-1/2 -translate-y-1/2">
									<div class="w-5 h-5 border-2 border-[var(--color-brand-primary)] border-t-transparent rounded-full animate-spin"></div>
								</div>
							{/if}
						</div>
						{#if results.length > 0}
							<p class="text-xs text-[var(--color-text-tertiary)] mt-2">
								Found {results.length} legal commanders
							</p>
						{/if}
					</div>

					<!-- Search Results -->
					<div class="flex-1 overflow-y-auto p-4">
						{#if results.length > 0}
							<div class="space-y-2">
								{#each results as result}
									<button
										onclick={() => selectCard(result)}
										class="w-full px-4 py-3 text-left rounded border-2 transition-all {selectedResult?.id === result.id ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)]'}"
									>
										<div class="flex items-start gap-3">
											{#if result.image_uri}
												<img
													src={result.image_uri}
													alt={result.name}
													class="w-12 h-16 object-cover rounded flex-shrink-0"
												/>
											{/if}
											<div class="flex-1 min-w-0">
												<div class="font-medium text-[var(--color-text-primary)] truncate">
													{result.name}
												</div>
												<div class="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
													{result.type_line || ''}
												</div>
												{#if result.set}
													<div class="text-xs text-[var(--color-text-tertiary)] mt-1">
														{result.set.toUpperCase()} {#if result.collector_number}#{result.collector_number}{/if}
													</div>
												{/if}
											</div>
										</div>
									</button>
								{/each}
							</div>
						{:else if searchQuery.length >= MIN_SEARCH_CHARACTERS && !isLoading}
							<div class="text-center py-12 text-[var(--color-text-secondary)]">
								No legal commanders found for "{searchQuery}"
							</div>
						{:else if searchQuery.length > 0 && searchQuery.length < MIN_SEARCH_CHARACTERS}
							<div class="text-center py-12 text-[var(--color-text-tertiary)]">
								Type at least {MIN_SEARCH_CHARACTERS} characters to search
							</div>
						{:else}
							<div class="text-center py-12 text-[var(--color-text-tertiary)]">
								Start typing to search for a commander
							</div>
						{/if}
					</div>
				</div>

				<!-- Right Side: Large Card Preview -->
				<div class="w-1/2 flex flex-col items-center justify-center p-6 bg-[var(--color-bg-primary)]">
					{#if loadingCardDetails}
						<div class="text-center">
							<div class="w-12 h-12 border-4 border-[var(--color-brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
							<p class="text-[var(--color-text-secondary)]">Loading card details...</p>
						</div>
					{:else if selectedCardFull && selectedScryfallCard}
						<div class="w-full max-w-md">
							<!-- Large Card Image -->
							{#if selectedCardFull.imageUrls?.large || selectedCardFull.imageUrls?.normal}
								<div class="relative mb-4 overflow-hidden rounded-lg">
									<img
										src={selectedCardFull.imageUrls.large || selectedCardFull.imageUrls.normal}
										alt={selectedCardFull.name}
										class="w-full rounded-lg shadow-2xl"
									/>
									{#if isGameChanger(selectedCardFull.name)}
										<CornerBadge
											text="GC"
											size="large"
											color="rgb(245, 158, 11)"
											textColor="rgb(120, 53, 15)"
											title="Game Changer - This card affects your deck's bracket level"
										/>
									{/if}
								</div>
							{/if}

							<!-- Card Info -->
							<div class="bg-[var(--color-surface)] rounded-lg p-4 border border-[var(--color-border)] space-y-3">
								<!-- Card Name & Mana Cost -->
								<div class="flex items-start justify-between gap-3">
									<h3 class="text-lg font-bold text-[var(--color-text-primary)]">
										{selectedCardFull.name}
									</h3>
									{#if selectedScryfallCard.mana_cost}
										<ManaSymbol cost={selectedScryfallCard.mana_cost} size="lg" />
									{/if}
								</div>

								<!-- Type Line -->
								<p class="text-sm font-semibold text-[var(--color-text-primary)]">
									{selectedScryfallCard.type_line}
								</p>

								<!-- Set Information -->
								<div class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
									<i class="ss ss-{selectedScryfallCard.set.toLowerCase()} ss-{selectedScryfallCard.rarity} ss-grad ss-2x" title="{selectedScryfallCard.set_name} - {selectedScryfallCard.rarity}"></i>
									<span>{selectedScryfallCard.set_name} ({selectedScryfallCard.set.toUpperCase()}) #{selectedScryfallCard.collector_number}</span>
								</div>

								<!-- Commander Validity Warning -->
								{#if !isValidCommander}
									<div class="bg-red-900/20 border border-red-800 rounded p-3">
										<div class="flex items-start gap-2">
											<svg class="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											<div>
												<p class="text-sm font-medium text-red-400">Not a Legal Commander</p>
												<p class="text-xs text-red-300 mt-1">
													This card cannot be used as a commander. Choose a legendary creature or a card with "can be your commander" text.
												</p>
											</div>
										</div>
									</div>
								{/if}

								<!-- Color Identity with Mana Symbols -->
								{#if selectedCardFull.colorIdentity && selectedCardFull.colorIdentity.length > 0}
									<div class="flex items-center gap-2">
										<span class="text-sm text-[var(--color-text-tertiary)]">Color Identity:</span>
										<div class="flex gap-0.5">
											{#each selectedCardFull.colorIdentity as color}
												<i class="ms ms-{color.toLowerCase()} ms-cost ms-shadow text-lg" title={color}></i>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Price -->
								{#if selectedCardFull.price}
									<p class="text-sm text-[var(--color-text-tertiary)]">
										Price: ${selectedCardFull.price.toFixed(2)} USD
									</p>
								{/if}
							</div>
						</div>
					{:else}
						<div class="text-center text-[var(--color-text-tertiary)]">
							<svg class="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
							<p>Select a card to preview</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center">
				<div class="text-sm text-[var(--color-text-secondary)]">
					{#if selectedCardFull && isValidCommander}
						<span class="text-green-400">✓ Valid commander selected</span>
					{:else if selectedCardFull && !isValidCommander}
						<span class="text-red-400">⚠ Invalid commander selection</span>
					{:else}
						Select a commander to continue
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
						onclick={confirmSelection}
						disabled={!selectedCardFull || !isValidCommander}
						class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Change Commander
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
