<script lang="ts">
	import { cardService } from '$lib/api/card-service';
	import type { CardSearchResult } from '$lib/api/card-service';
	import type { Card } from '$lib/types/card';
	import { MIN_SEARCH_CHARACTERS } from '$lib/constants/search';
	import { scryfallToCard } from '$lib/utils/card-converter';

	let {
		selectedCommanders = $bindable([]),
		maxCommanders = 2
	}: {
		selectedCommanders?: Card[];
		maxCommanders?: number;
	} = $props();

	let searchQuery = $state('');
	let results = $state<CardSearchResult[]>([]);
	let isLoading = $state(false);
	let showDropdown = $state(false);
	let debounceTimer: number | undefined = $state();
	let searchInputRef = $state<HTMLInputElement>();
	let validationStatus = $state<Record<string, 'checking' | 'valid' | 'invalid'>>({});

	// Check if the first commander has partner ability
	let canHavePartner = $derived(
		selectedCommanders.length > 0 &&
			(() => {
				const firstCommander = selectedCommanders[0];
				const oracleText = firstCommander.oracleText?.toLowerCase() || '';

				// Check for various partner mechanics
				return (
					oracleText.includes('partner') ||
					oracleText.includes('friends forever') ||
					oracleText.includes('choose a background') ||
					oracleText.includes("doctor's companion")
				);
			})()
	);

	// Click outside handler
	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (searchInputRef && !searchInputRef.contains(target)) {
				showDropdown = false;
			}
		}

		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			if (debounceTimer) clearTimeout(debounceTimer);
		};
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
				// Search with legendary filter
				const searchResults = await cardService.searchCards(
					`${searchQuery} (is:commander OR type:legendary type:creature)`,
					20
				);

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
		// Don't add if we're at max commanders
		if (selectedCommanders.length >= maxCommanders) {
			return;
		}

		// Don't add duplicates
		if (selectedCommanders.some((c) => c.name === result.name)) {
			return;
		}

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
				return;
			}

			// Validate it's a valid commander
			const typeLine = scryfallCard.type_line.toLowerCase();
			const oracleText = scryfallCard.oracle_text?.toLowerCase() || '';
			const isLegendary = typeLine.includes('legendary');
			const isCreature = typeLine.includes('creature');
			const canBeCommander = oracleText.includes('can be your commander');

			if (!canBeCommander && !(isLegendary && isCreature)) {
				validationStatus[result.name] = 'invalid';
				return;
			}

			// Convert to our Card type
			const card = scryfallToCard(scryfallCard);

			// Add to selected commanders
			selectedCommanders = [...selectedCommanders, card];
			validationStatus[result.name] = 'valid';

			// Clear search
			searchQuery = '';
			results = [];
			showDropdown = false;
		} catch (error) {
			console.error('Error adding commander:', error);
			validationStatus[result.name] = 'invalid';
		}
	}

	function removeCommander(index: number) {
		selectedCommanders = selectedCommanders.filter((_, i) => i !== index);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showDropdown = false;
			searchQuery = '';
		}
	}
</script>

<div class="space-y-3">
	<!-- Selected Commanders -->
	{#if selectedCommanders.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each selectedCommanders as commander, index}
				<div
					class="flex items-center gap-2 px-3 py-1.5 bg-green-900/20 border border-green-800 rounded text-sm"
				>
					<span class="text-green-300">{commander.name}</span>
					<button
						onclick={() => removeCommander(index)}
						class="text-green-400 hover:text-green-300"
						title="Remove commander"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Search Input -->
	{#if selectedCommanders.length === 0 || (selectedCommanders.length < maxCommanders && canHavePartner)}
		<div class="relative">
			<div class="relative">
				<input
					bind:this={searchInputRef}
					bind:value={searchQuery}
					oninput={handleInput}
					onkeydown={handleKeydown}
					onfocus={() => {
						if (results.length > 0) {
							showDropdown = true;
						}
					}}
					type="text"
					placeholder={selectedCommanders.length === 0
						? 'Search for a legendary creature...'
						: 'Search for partner commander...'}
					class="w-full px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
				/>

				<!-- Search icon -->
				<div
					class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
			</div>

			<!-- Dropdown Results -->
			{#if showDropdown}
				<div
					class="absolute z-50 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl max-h-96 overflow-y-auto"
				>
					{#if isLoading}
						<div class="px-4 py-3 text-center text-[var(--color-text-secondary)]">
							Searching...
						</div>
					{:else if results.length === 0}
						<div class="px-4 py-3 text-center text-[var(--color-text-secondary)]">
							{searchQuery.length < MIN_SEARCH_CHARACTERS
								? `Type at least ${MIN_SEARCH_CHARACTERS} characters to search`
								: 'No legendary creatures found'}
						</div>
					{:else}
						<!-- Search Results -->
						{#each results as result}
							<button
								onclick={() => selectCard(result)}
								class="w-full px-4 py-2 text-left hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={selectedCommanders.some((c) => c.name === result.name)}
							>
								<div class="font-medium text-[var(--color-text-primary)]">
									{result.name}
									{#if selectedCommanders.some((c) => c.name === result.name)}
										<span class="text-xs text-[var(--color-text-tertiary)] ml-2"
											>(already selected)</span
										>
									{/if}
								</div>
								{#if result.type_line}
									<div class="text-xs text-[var(--color-text-secondary)] mt-1">
										{result.type_line}
									</div>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{:else if selectedCommanders.length === 1 && !canHavePartner}
		<div
			class="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-secondary)] text-center"
		>
			{selectedCommanders[0].name} does not have Partner
		</div>
	{:else}
		<div
			class="px-4 py-2 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-300 text-center"
		>
			Maximum {maxCommanders} commander{maxCommanders > 1 ? 's' : ''} selected
		</div>
	{/if}
</div>
