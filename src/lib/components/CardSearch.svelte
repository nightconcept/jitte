<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { cardService } from '$lib/api/card-service';
	import { deckStore } from '$lib/stores/deck-store';
	import { toastStore } from '$lib/stores/toast-store';
	import CardSearchModal from './CardSearchModal.svelte';
	import type { CardSearchResult } from '$lib/api/card-service';
	import type { Card } from '$lib/types/card';
	import { MIN_SEARCH_CHARACTERS } from '$lib/constants/search';

	export let addToMaybeboard = false;
	export let maybeboardCategoryId: string | undefined = undefined;

	let searchQuery = '';
	let results: CardSearchResult[] = [];
	let isLoading = false;
	let showDropdown = false;
	let debounceTimer: number | undefined;
	let searchInputRef: HTMLInputElement;
	let modalOpen = false;

	// Get commander color identity for filtering
	$: commanders = $deckStore?.deck?.cards?.commander || [];
	$: commanderColors = (() => {
		console.log('[CardSearch] Recalculating commander colors. Commanders:', commanders);

		if (commanders.length === 0) {
			console.log('[CardSearch] No commanders found, returning empty color array');
			return [];
		}

		// Combine all commander color identities
		const allColors = new Set<string>();
		for (const commander of commanders) {
			console.log('[CardSearch] Processing commander:', {
				name: commander.name,
				hasColorIdentity: !!commander.colorIdentity,
				colorIdentity: commander.colorIdentity
			});

			if (commander.colorIdentity) {
				for (const color of commander.colorIdentity) {
					allColors.add(color);
				}
			}
		}

		// Sort in WUBRG order for Scryfall
		const colorOrder = ['W', 'U', 'B', 'R', 'G'];
		const result = Array.from(allColors).sort((a, b) => colorOrder.indexOf(a) - colorOrder.indexOf(b));
		console.log('[CardSearch] Final commander colors:', result);
		return result;
	})();

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Node;
		if (searchInputRef && !searchInputRef.contains(target)) {
			showDropdown = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
	});

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside);
		if (debounceTimer) clearTimeout(debounceTimer);
	});

	async function handleInput() {
		// Clear previous timer
		if (debounceTimer) clearTimeout(debounceTimer);

		// Only search if enough characters
		if (searchQuery.length < MIN_SEARCH_CHARACTERS) {
			results = [];
			showDropdown = false;
			return;
		}

		// Debounce the search
		debounceTimer = window.setTimeout(async () => {
			isLoading = true;
			showDropdown = true;

			try {
				// Build search query with color identity filter for inline dropdown
				let query = searchQuery + ' format:commander';

				// Add color identity filter if we have a commander
				if (commanderColors.length > 0) {
					// Scryfall uses "id<=" to mean "color identity is subset of or equal to"
					const colorString = commanderColors.join('').toLowerCase();
					query += ` id<=${colorString}`;
					console.log('[CardSearch] Filtering by color identity:', commanderColors, 'Query:', query);
				} else {
					console.log('[CardSearch] No commander, showing all Commander-legal cards');
				}

				// Fetch more results (175 is Scryfall's page size) to have better pool for sorting
				const searchResults = await cardService.searchCards(query, 175, false);

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

					// Otherwise, maintain alphabetical order
					return aName.localeCompare(bName);
				});

				// Take top 10 after sorting
				results = sorted.slice(0, 10);
			} catch (error) {
				console.error('Search error:', error);
				results = [];
			} finally {
				isLoading = false;
			}
		}, 300);
	}

	async function selectCard(result: CardSearchResult) {
		try {
			// Fetch full card data - prefer set/collector for exact printing, fallback to name
			let scryfallCard;

			if (result.set && result.collector_number) {
				// Try to fetch the exact printing from the search result
				scryfallCard = await cardService.getCardBySetAndNumber(
					result.set,
					result.collector_number,
					result.name // Fallback to name if set/collector fails
				);
			} else {
				// No set/collector info, fetch by name only
				scryfallCard = await cardService.getCardByName(result.name);
			}

			if (!scryfallCard) {
				toastStore.error(
					`Failed to fetch card: ${result.name}`,
					0,
					`The card was found in search results but could not be fetched from Scryfall.\n\nCard Name: ${result.name}\nSet: ${result.set}\nCollector Number: ${result.collector_number}\n\nThis might be due to:\n- Network connectivity issues\n- Scryfall API being temporarily unavailable\n- The card data being incomplete or malformed`
				);
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

			// Add to deck or maybeboard
			if (addToMaybeboard) {
				deckStore.addCardToMaybeboard(card, maybeboardCategoryId);
			} else {
				deckStore.addCard(card);
			}

			// Clear search
			searchQuery = '';
			results = [];
			showDropdown = false;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			const errorStack = error instanceof Error ? error.stack : '';

			toastStore.error(
				`Failed to add card: ${result.name}`,
				0,
				`An error occurred while trying to add the card to your deck.\n\nCard Name: ${result.name}\nSet: ${result.set} (${result.collector_number})\n\nError: ${errorMessage}\n\n${errorStack ? `Stack Trace:\n${errorStack}` : ''}`
			);

			console.error('Error adding card:', {
				cardName: result.name,
				set: result.set,
				collectorNumber: result.collector_number,
				error
			});
		}
	}

	function searchOnScryfall() {
		const query = encodeURIComponent(searchQuery);
		window.open(`https://scryfall.com/search?q=${query}`, '_blank');
		showDropdown = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showDropdown = false;
			searchQuery = '';
		} else if (event.key === 'Enter') {
			// If there's a search query but no results shown, or user hasn't selected anything
			// Open the modal to show more results
			if (searchQuery.length >= MIN_SEARCH_CHARACTERS) {
				event.preventDefault();
				modalOpen = true;
				showDropdown = false;
			}
		}
	}

	// Check if a card is outside commander's color identity
	function isOutsideColorIdentity(cardResult: CardSearchResult): boolean {
		// If no commander, all cards are valid
		if (commanderColors.length === 0) return false;

		// If card has no color identity, it's colorless and valid for all decks
		if (!cardResult.color_identity || cardResult.color_identity.length === 0) return false;

		// Check if any color in the card's identity is NOT in the commander's identity
		const commanderColorSet = new Set(commanderColors);
		for (const color of cardResult.color_identity) {
			if (!commanderColorSet.has(color)) {
				return true; // Card has a color not in commander's identity
			}
		}

		return false; // All colors are within commander's identity
	}
</script>

<div class="relative">
	<div class="relative">
		<input
			bind:this={searchInputRef}
			bind:value={searchQuery}
			on:input={handleInput}
			on:keydown={handleKeydown}
			on:focus={() => {
				if (results.length > 0) {
					showDropdown = true;
				}
			}}
			type="text"
			placeholder="Search for cards..."
			class="w-full pl-4 pr-24 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
		/>

		<!-- Search button -->
		<button
			on:click={() => modalOpen = true}
			class="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white transition-colors flex items-center gap-1.5 text-sm font-medium"
			title="Open advanced search"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<span>Search</span>
		</button>
	</div>

	<!-- Dropdown Results -->
	{#if showDropdown}
		<div class="absolute z-50 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl max-h-96 overflow-y-auto">
			{#if isLoading}
				<div class="px-4 py-3 text-center text-[var(--color-text-secondary)]">
					Searching...
				</div>
			{:else if results.length === 0}
				<div class="px-4 py-3 text-center text-[var(--color-text-secondary)]">
					{searchQuery.length < MIN_SEARCH_CHARACTERS ? `Type at least ${MIN_SEARCH_CHARACTERS} characters to search` : 'No results found'}
				</div>
			{:else}
				<!-- Search Results -->
				{#each results as result}
					<button
						on:click={() => selectCard(result)}
						class="w-full px-4 py-2 text-left hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] last:border-b-0"
					>
						<div class="font-medium text-[var(--color-text-primary)]">
							{result.name}
						</div>
					</button>
				{/each}

				<!-- "Search for more" option -->
				<button
					on:click={searchOnScryfall}
					class="w-full px-4 py-3 text-left hover:bg-[var(--color-surface-hover)] text-[var(--color-brand-primary)] font-medium border-t border-[var(--color-border)]"
				>
					Search for more on Scryfall →
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Card Search Modal -->
<CardSearchModal
	isOpen={modalOpen}
	addToMaybeboard={addToMaybeboard}
	maybeboardCategoryId={maybeboardCategoryId}
	initialQuery={searchQuery}
	onClose={() => modalOpen = false}
/>
