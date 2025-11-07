<script lang="ts">
	import { onMount } from 'svelte';
	import { deckStore } from '$lib/stores/deck-store';
	import { loadDeckFromPlaintext } from '$lib/utils/deck-loader';
	import TopNavbar from '$lib/components/TopNavbar.svelte';
	import CommanderHeader from '$lib/components/CommanderHeader.svelte';
	import CardPreview from '$lib/components/CardPreview.svelte';
	import DeckList from '$lib/components/DeckList.svelte';
	import Maybeboard from '$lib/components/Maybeboard.svelte';
	import Statistics from '$lib/components/Statistics.svelte';
	import type { Card } from '$lib/types/card';
	import type { Maybeboard as MaybeboardType } from '$lib/types/maybeboard';

	let hoveredCard: Card | null = null;
	let isLoading = true;
	let loadError: string | null = null;

	// Load example deck on mount
	onMount(async () => {
		try {
			// Fetch the example deck file
			const response = await fetch('/examples/kenrith.txt');
			if (!response.ok) {
				throw new Error(`Failed to load example deck: ${response.statusText}`);
			}

			const deckText = await response.text();

			// Parse and load the deck
			console.log('Loading Kenrith deck...');
			const deck = await loadDeckFromPlaintext(deckText, 'Kenrith, the Returned King');

			// Create a default maybeboard
			const maybeboard: MaybeboardType = {
				categories: [
					{
						id: 'main',
						name: 'Main',
						cards: [],
						order: 0,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				],
				defaultCategoryId: 'main'
			};

			// Load into store
			deckStore.load(deck, maybeboard);

			console.log('Deck loaded successfully!', deck);
			isLoading = false;
		} catch (error) {
			console.error('Error loading deck:', error);
			loadError = error instanceof Error ? error.message : 'Unknown error';
			isLoading = false;
		}
	});

	function handleCardHover(card: Card | null) {
		// Only update if a card is provided, otherwise keep the last hovered card
		if (card !== null) {
			hoveredCard = card;
		}
	}

	function handleSave() {
		console.log('Save clicked');
		// TODO: Implement save functionality
	}

	function handleToggleEdit() {
		const current = $deckStore?.isEditing ?? false;
		deckStore.setEditMode(!current);
	}
</script>

<div class="min-h-screen flex flex-col bg-[var(--color-bg-primary)]">
	<!-- Top Navigation Bar -->
	<TopNavbar />

	{#if isLoading}
		<!-- Loading State -->
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center">
				<div class="text-[var(--color-text-primary)] text-lg mb-2">Loading deck...</div>
				<div class="text-[var(--color-text-tertiary)] text-sm">
					Fetching card data from Scryfall
				</div>
			</div>
		</div>
	{:else if loadError}
		<!-- Error State -->
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center max-w-md">
				<div class="text-[var(--color-error)] text-lg mb-2">Error Loading Deck</div>
				<div class="text-[var(--color-text-tertiary)] text-sm">{loadError}</div>
			</div>
		</div>
	{:else}
		<!-- Commander Header with Gradient -->
		<CommanderHeader onSave={handleSave} onToggleEdit={handleToggleEdit} />

		<!-- Main Content -->
		<div class="flex">
			<!-- Card Preview Sidebar (Left, Sticky) -->
			<CardPreview {hoveredCard} />

			<!-- Center Column -->
			<div class="flex-1 flex flex-col min-h-screen">
				<!-- Deck List -->
				<DeckList onCardHover={handleCardHover} />

				<!-- Statistics Panel (Bottom, Collapsible) -->
				<div class="border-t border-[var(--color-border)]">
					<Statistics />
				</div>
			</div>

			<!-- Maybeboard Sidebar (Right, Sticky) -->
			<Maybeboard onCardHover={handleCardHover} />
		</div>
	{/if}
</div>
