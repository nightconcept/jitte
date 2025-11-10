<script lang="ts">
	import { cardService } from '$lib/api/card-service';
	import { deckStore } from '$lib/stores/deck-store';
	import { toastStore } from '$lib/stores/toast-store';
	import BaseModal from './BaseModal.svelte';
	import type { CardSearchResult } from '$lib/api/card-service';
	import type { Card } from '$lib/types/card';
	import type { ScryfallCard } from '$lib/types/scryfall';
	import ManaSymbol from './ManaSymbol.svelte';
	import { MIN_SEARCH_CHARACTERS } from '$lib/constants/search';

	let {
		isOpen = false,
		addToMaybeboard = false,
		maybeboardCategoryId = undefined,
		onClose
	}: {
		isOpen?: boolean;
		addToMaybeboard?: boolean;
		maybeboardCategoryId?: string | undefined;
		onClose: () => void;
	} = $props();

	let searchQuery = $state('');
	let results = $state<CardSearchResult[]>([]);
	let isLoading = $state(false);
	let debounceTimer: number | undefined;
	let selectedResult = $state<CardSearchResult | null>(null);
	let selectedCardFull = $state<Card | null>(null);
	let selectedScryfallCard = $state<ScryfallCard | null>(null);
	let loadingCardDetails = $state(false);
	let commanderLegalOnly = $state(true);

	// Subscribe to deck store to get commander color identity
	let deckStoreState = $state($deckStore);
	$effect(() => {
		const unsubscribe = deckStore.subscribe(value => {
			deckStoreState = value;
		});
		return unsubscribe;
	});

	// Get commander color identity
	let commanderColors = $derived(() => {
		const commanders = deckStoreState?.deck?.commanders;
		if (!commanders || commanders.length === 0) return [];

		// Combine all commander color identities
		const allColors = new Set<string>();
		for (const commander of commanders) {
			if (commander.colorIdentity) {
				for (const color of commander.colorIdentity) {
					allColors.add(color);
				}
			}
		}

		// Sort in WUBRG order for Scryfall
		const colorOrder = ['W', 'U', 'B', 'R', 'G'];
		return Array.from(allColors).sort((a, b) => colorOrder.indexOf(a) - colorOrder.indexOf(b));
	});

	// Check if a card is outside commander's color identity
	function isOutsideColorIdentity(cardResult: CardSearchResult): boolean {
		const cmdColors = commanderColors();
		// If no commander, all cards are valid
		if (cmdColors.length === 0) return false;

		// If card has no color identity, it's colorless and valid for all decks
		if (!cardResult.color_identity || cardResult.color_identity.length === 0) return false;

		// Check if any color in the card's identity is NOT in the commander's identity
		const commanderColorSet = new Set(cmdColors);
		for (const color of cardResult.color_identity) {
			if (!commanderColorSet.has(color)) {
				return true; // Card has a color not in commander's identity
			}
		}

		return false; // All colors are within commander's identity
	}

	// Reset when modal opens
	$effect(() => {
		if (isOpen) {
			searchQuery = '';
			results = [];
			selectedResult = null;
			selectedCardFull = null;
			selectedScryfallCard = null;
			commanderLegalOnly = true;
		}
	});

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
				// Build search query - always show Commander-legal cards
				// We'll mark invalid color identity ones with "!" instead of filtering them out
				let query = searchQuery + ' format:commander';

				// Search with the constructed query
				const searchResults = await cardService.searchCards(query, 100, false);

				// Sort results: prioritize exact matches first, then starts-with
				const sorted = searchResults.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					const searchLower = searchQuery.toLowerCase();

					// Exact match priority
					const aExact = aName === searchLower;
					const bExact = bName === searchLower;
					if (aExact && !bExact) return -1;
					if (!aExact && bExact) return 1;

					// Starts-with priority
					const aStartsWith = aName.startsWith(searchLower);
					const bStartsWith = bName.startsWith(searchLower);
					if (aStartsWith && !bStartsWith) return -1;
					if (!aStartsWith && bStartsWith) return 1;

					// Alphabetical fallback
					return aName.localeCompare(bName);
				});

				// Filter out cards outside color identity if checkbox is checked
				const filtered = commanderLegalOnly
					? sorted.filter(card => !isOutsideColorIdentity(card))
					: sorted;

				// Take top 50 after sorting and filtering
				results = filtered.slice(0, 50);
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
			const card: Card = {
				name: scryfallCard.name,
				quantity: 1,
				setCode: scryfallCard.set.toUpperCase(),
				collectorNumber: scryfallCard.collector_number,
				scryfallId: scryfallCard.id,
				oracleId: scryfallCard.oracle_id,
				types: scryfallCard.type_line.split(/[\s—]+/).filter(t =>
					['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'].includes(t)
				),
				cmc: scryfallCard.cmc,
				manaCost: scryfallCard.mana_cost || scryfallCard.card_faces?.[0]?.mana_cost,
				colorIdentity: scryfallCard.color_identity as Card['colorIdentity'],
				oracleText: scryfallCard.oracle_text || scryfallCard.card_faces?.[0]?.oracle_text,
				keywords: scryfallCard.keywords,
				imageUrls: {
					small: scryfallCard.image_uris?.small || scryfallCard.card_faces?.[0]?.image_uris?.small,
					normal: scryfallCard.image_uris?.normal || scryfallCard.card_faces?.[0]?.image_uris?.normal,
					large: scryfallCard.image_uris?.large || scryfallCard.card_faces?.[0]?.image_uris?.large,
					png: scryfallCard.image_uris?.png || scryfallCard.card_faces?.[0]?.image_uris?.png,
					artCrop: scryfallCard.image_uris?.art_crop || scryfallCard.card_faces?.[0]?.image_uris?.art_crop,
					borderCrop: scryfallCard.image_uris?.border_crop || scryfallCard.card_faces?.[0]?.image_uris?.border_crop,
				},
				price: scryfallCard.prices.usd ? parseFloat(scryfallCard.prices.usd) : undefined,
				prices: scryfallCard.prices.usd ? {
					cardkingdom: parseFloat(scryfallCard.prices.usd) * 1.05,
					tcgplayer: parseFloat(scryfallCard.prices.usd),
					manapool: parseFloat(scryfallCard.prices.usd) * 0.95
				} : undefined,
				priceUpdatedAt: Date.now()
			};

			selectedCardFull = card;
			selectedScryfallCard = scryfallCard;
			loadingCardDetails = false;
		} catch (error) {
			console.error('Error selecting card:', error);
			toastStore.error('Failed to fetch card data');
			loadingCardDetails = false;
		}
	}

	async function confirmSelection() {
		if (!selectedCardFull) return;

		try {
			// Add to deck or maybeboard
			if (addToMaybeboard) {
				deckStore.addCardToMaybeboard(selectedCardFull, maybeboardCategoryId);
			} else {
				deckStore.addCard(selectedCardFull);
			}

			// Show success message
			toastStore.success(`Added ${selectedCardFull.name} to ${addToMaybeboard ? 'maybeboard' : 'deck'}`);

			// Close modal
			onClose();
		} catch (error) {
			console.error('Error adding card:', error);
			toastStore.error(`Failed to add ${selectedCardFull.name}`);
		}
	}

	function searchOnScryfall() {
		const query = encodeURIComponent(searchQuery);
		window.open(`https://scryfall.com/search?q=${query}`, '_blank');
	}
</script>

<BaseModal
	isOpen={isOpen}
	onClose={onClose}
	title="Search All Cards"
	subtitle={addToMaybeboard ? "Search for any card to add to your maybeboard" : "Search for any card to add to your deck"}
	size="4xl"
	height="h-[85vh]"
	contentClass="flex flex-col"
>
	{#snippet children()}

			<!-- Body - Split Layout -->
			<div class="flex-1 flex overflow-hidden">
				<!-- Left Side: Search and Results -->
				<div class="w-1/2 border-r border-[var(--color-border)] flex flex-col">
					<!-- Search Input -->
					<div class="p-4 border-b border-[var(--color-border)] space-y-3">
						<div class="relative">
							<input
								type="text"
								bind:value={searchQuery}
								oninput={handleInput}
								placeholder="Search for cards (min {MIN_SEARCH_CHARACTERS} characters)..."
								class="w-full px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
								autofocus
							/>

							{#if isLoading}
								<div class="absolute right-3 top-1/2 -translate-y-1/2">
									<div class="w-5 h-5 border-2 border-[var(--color-brand-primary)] border-t-transparent rounded-full animate-spin"></div>
								</div>
							{/if}
						</div>

						<!-- Commander-legal filter toggle -->
						<label class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
							<input
								type="checkbox"
								bind:checked={commanderLegalOnly}
								oninput={handleInput}
								class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary)]"
							/>
							<span>
								{#if commanderColors().length > 0}
									Cards within commander's color identity
									<span class="inline-flex gap-0.5 ml-1">
										{#each commanderColors() as color}
											<i class="ms ms-{color.toLowerCase()} ms-cost ms-shadow text-sm" title={color}></i>
										{/each}
									</span>
								{:else}
									Commander-legal cards only
								{/if}
							</span>
						</label>

						{#if results.length > 0}
							<p class="text-xs text-[var(--color-text-tertiary)]">
								Found {results.length} cards {results.length === 50 ? '(showing first 50)' : ''}
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
												<div class="font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2">
													{#if isOutsideColorIdentity(result)}
														<span class="text-red-500 font-bold flex-shrink-0" title="Outside commander's color identity">!</span>
													{/if}
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
						{:else if searchQuery.length >= 4 && !isLoading}
							<div class="text-center py-12 space-y-4">
								<div class="text-[var(--color-text-secondary)]">
									No cards found for "{searchQuery}"
								</div>
								<button
									onclick={searchOnScryfall}
									class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
								>
									Search on Scryfall →
								</button>
							</div>
						{:else if searchQuery.length > 0 && searchQuery.length < 4}
							<div class="text-center py-12 text-[var(--color-text-tertiary)]">
								Type at least 4 characters to search
							</div>
						{:else}
							<div class="text-center py-12 text-[var(--color-text-tertiary)]">
								Start typing to search for cards
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
						<div class="w-full max-w-md overflow-y-auto">
							<!-- Large Card Image -->
							{#if selectedCardFull.imageUrls?.large || selectedCardFull.imageUrls?.normal}
								<img
									src={selectedCardFull.imageUrls.large || selectedCardFull.imageUrls.normal}
									alt={selectedCardFull.name}
									class="w-full rounded-lg shadow-2xl mb-4"
								/>
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

								<!-- Oracle Text -->
								{#if selectedCardFull.oracleText}
									<div class="text-sm text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-3">
										<div class="whitespace-pre-line">{selectedCardFull.oracleText}</div>
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
				{#if selectedCardFull}
					<span class="text-green-400">✓ Card selected</span>
				{:else}
					Select a card to continue
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
					onclick={confirmSelection}
					disabled={!selectedCardFull}
					class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Add Card
				</button>
			</div>
		</div>
	{/snippet}
</BaseModal>
