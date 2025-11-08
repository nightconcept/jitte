<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { cardService } from '$lib/api/card-service';
	import { deckStore } from '$lib/stores/deck-store';
	import type { CardSearchResult } from '$lib/api/card-service';
	import type { Card } from '$lib/types/card';

	export let addToMaybeboard = false;
	export let maybeboardCategoryId: string | undefined = undefined;

	let searchQuery = '';
	let results: CardSearchResult[] = [];
	let isLoading = false;
	let showDropdown = false;
	let debounceTimer: number | undefined;
	let searchInputRef: HTMLInputElement;

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

		// Only search if 4+ characters
		if (searchQuery.length < 4) {
			results = [];
			showDropdown = false;
			return;
		}

		// Debounce the search
		debounceTimer = window.setTimeout(async () => {
			isLoading = true;
			showDropdown = true;

			try {
				const searchResults = await cardService.searchCards(searchQuery, 20);

				// Sort results: prioritize matches at the start of the name
				const sorted = searchResults.sort((a, b) => {
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
		// Fetch full card data
		const scryfallCard = await cardService.getCardByName(result.name);

		if (scryfallCard) {
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
		}

		// Clear search
		searchQuery = '';
		results = [];
		showDropdown = false;
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
		}
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
			class="w-full px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
		/>

		<!-- Search icon -->
		<div class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</div>
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
					{searchQuery.length < 4 ? 'Type at least 4 characters to search' : 'No results found'}
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
