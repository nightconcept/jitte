<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { CardService } from '$lib/api/card-service';
	import type { CardSearchResult } from '$lib/api/card-service';
	import { debounce } from '$lib/utils/debounce';

	export let isOpen = false;

	const dispatch = createEventDispatcher<{
		close: void;
		create: { name: string; commanderName: string };
	}>();

	let deckName = '';
	let commanderSearchQuery = '';
	let commanderSearchResults: CardSearchResult[] = [];
	let selectedCommander: CardSearchResult | null = null;
	let isSearching = false;

	const cardService = new CardService();

	// Debounced search function
	const searchCommanders = debounce(async (query: string) => {
		if (query.length < 2) {
			commanderSearchResults = [];
			return;
		}

		isSearching = true;
		try {
			// Search for legendary creatures
			const fullQuery = `${query} is:commander`;
			const results = await cardService.searchCards(fullQuery, 20); // Get more results for better sorting

			// Sort results: prioritize matches at the start of the name
			const sorted = results.sort((a, b) => {
				const aName = a.name.toLowerCase();
				const bName = b.name.toLowerCase();
				const searchLower = query.toLowerCase();

				const aStartsWith = aName.startsWith(searchLower);
				const bStartsWith = bName.startsWith(searchLower);

				// If one starts with query and other doesn't, prioritize the one that does
				if (aStartsWith && !bStartsWith) return -1;
				if (!aStartsWith && bStartsWith) return 1;

				// Otherwise, maintain alphabetical order
				return aName.localeCompare(bName);
			});

			// Take top 10 after sorting
			commanderSearchResults = sorted.slice(0, 10);
		} catch (error) {
			console.error('Commander search failed:', error);
			commanderSearchResults = [];
		} finally {
			isSearching = false;
		}
	}, 300);

	$: {
		// Only search if we don't already have a selected commander
		if (commanderSearchQuery && !selectedCommander) {
			searchCommanders(commanderSearchQuery);
		} else {
			commanderSearchResults = [];
		}
	}

	function selectCommander(commander: CardSearchResult) {
		selectedCommander = commander;
		commanderSearchQuery = commander.name; // Show commander name
		commanderSearchResults = []; // Clear dropdown
	}

	function handleCreate() {
		if (!deckName.trim() || !selectedCommander) {
			return;
		}

		dispatch('create', {
			name: deckName.trim(),
			commanderName: selectedCommander.name
		});

		// Reset form
		deckName = '';
		commanderSearchQuery = '';
		selectedCommander = null;
	}

	function handleClose() {
		dispatch('close');
		// Reset form
		deckName = '';
		commanderSearchQuery = '';
		selectedCommander = null;
	}
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
		role="presentation"
	>
		<!-- Modal Content -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 border border-[var(--color-border)]"
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-[var(--color-border)]">
				<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Create New Deck</h2>
			</div>

			<!-- Body -->
			<div class="px-6 py-4 space-y-4">
				<!-- Deck Name -->
				<div>
					<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Deck Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						bind:value={deckName}
						placeholder="My Awesome Commander Deck"
						class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
						autofocus
					/>
				</div>

				<!-- Commander Search -->
				<div class="relative">
					<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Commander <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<input
							type="text"
							bind:value={commanderSearchQuery}
							placeholder="Search for a commander..."
							disabled={selectedCommander !== null}
							class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] disabled:opacity-75 disabled:cursor-not-allowed"
						/>
						{#if selectedCommander}
							<button
								type="button"
								on:click={() => { selectedCommander = null; commanderSearchQuery = ''; }}
								class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--color-surface-hover)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
								title="Clear selection"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						{/if}
					</div>

					<!-- Search Results Dropdown -->
					{#if commanderSearchResults.length > 0}
						<div
							class="absolute z-10 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg max-h-60 overflow-y-auto"
						>
							{#each commanderSearchResults as commander}
								<button
									type="button"
									class="w-full px-3 py-2 text-left hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border-b border-[var(--color-border)] last:border-b-0"
									on:click={() => selectCommander(commander)}
								>
									<div class="font-medium">{commander.name}</div>
								</button>
							{/each}
						</div>
					{/if}

					{#if isSearching}
						<div class="text-sm text-[var(--color-text-secondary)] mt-2">Searching...</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
				<button
					on:click={handleClose}
					class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
				>
					Cancel
				</button>
				<button
					on:click={handleCreate}
					disabled={!deckName.trim() || !selectedCommander}
					class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Create Deck
				</button>
			</div>
		</div>
	</div>
{/if}
