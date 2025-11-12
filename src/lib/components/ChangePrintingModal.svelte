<script lang="ts">
	import { onMount } from 'svelte';
	import { cardService } from '$lib/api/card-service';
	import type { Card } from '$lib/types/card';
	import type { ScryfallCard } from '$lib/types/scryfall';
	import { CardCategory } from '$lib/types/card';
	import GameChangerBadge from './GameChangerBadge.svelte';
	import { isGameChanger } from '$lib/utils/game-changers';

	export let card: Card;
	export let category: CardCategory;
	export let onConfirm: (newCard: Card) => void;
	export let onClose: () => void;

	let printings: ScryfallCard[] = [];
	let loading = true;
	let error: string | null = null;
	let searchQuery = '';
	let sortBy: 'year' | 'price' | 'set' = 'year';

	// Filtered and sorted printings
	$: filteredPrintings = printings
		.filter(p => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			return (
				p.set.toLowerCase().includes(query) ||
				p.set_name.toLowerCase().includes(query) ||
				p.collector_number.includes(query)
			);
		})
		.sort((a, b) => {
			if (sortBy === 'year') {
				return new Date(b.released_at).getTime() - new Date(a.released_at).getTime();
			} else if (sortBy === 'price') {
				const priceA = a.prices.usd ? parseFloat(a.prices.usd) : 999999;
				const priceB = b.prices.usd ? parseFloat(b.prices.usd) : 999999;
				return priceA - priceB;
			} else {
				return a.set_name.localeCompare(b.set_name);
			}
		});

	onMount(async () => {
		if (!card.oracleId) {
			// If no oracle ID, try fetching the card first
			const scryfallCard = await cardService.getCardByName(card.name);
			if (scryfallCard?.oracle_id) {
				card.oracleId = scryfallCard.oracle_id;
			} else {
				error = 'Unable to fetch printings for this card';
				loading = false;
				return;
			}
		}

		try {
			printings = await cardService.getCardPrintings(card.oracleId);
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load printings';
			loading = false;
		}
	});

	function selectPrinting(printing: ScryfallCard) {
		// Convert Scryfall card to our Card type
		const newCard: Card = {
			name: printing.name,
			quantity: card.quantity, // Keep the same quantity
			setCode: printing.set.toUpperCase(),
			collectorNumber: printing.collector_number,
			scryfallId: printing.id,
			oracleId: printing.oracle_id,
			types: printing.type_line.split(/[\s—]+/).filter(t =>
				['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'].includes(t)
			),
			cmc: printing.cmc,
			manaCost: printing.mana_cost || printing.card_faces?.[0]?.mana_cost,
			colorIdentity: printing.color_identity as Card['colorIdentity'],
			oracleText: printing.oracle_text || printing.card_faces?.[0]?.oracle_text,
			imageUrls: {
				small: printing.image_uris?.small || printing.card_faces?.[0]?.image_uris?.small,
				normal: printing.image_uris?.normal || printing.card_faces?.[0]?.image_uris?.normal,
				large: printing.image_uris?.large || printing.card_faces?.[0]?.image_uris?.large,
				png: printing.image_uris?.png || printing.card_faces?.[0]?.image_uris?.png,
				artCrop: printing.image_uris?.art_crop || printing.card_faces?.[0]?.image_uris?.art_crop,
				borderCrop: printing.image_uris?.border_crop || printing.card_faces?.[0]?.image_uris?.border_crop,
			},
			price: printing.prices.usd ? parseFloat(printing.prices.usd) : undefined,
			prices: printing.prices.usd ? {
				cardkingdom: parseFloat(printing.prices.usd) * 1.05,
				tcgplayer: parseFloat(printing.prices.usd),
				manapool: parseFloat(printing.prices.usd) * 0.95
			} : undefined,
			priceUpdatedAt: Date.now()
		};

		onConfirm(newCard);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<!-- Modal Backdrop -->
<div
	class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
	on:click={onClose}
	on:keydown={handleKeydown}
	role="button"
	tabindex="-1"
>
	<!-- Modal Content -->
	<div
		class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-4xl w-full mx-4 border border-[var(--color-border)] max-h-[80vh] flex flex-col"
		on:click|stopPropagation
		role="dialog"
		aria-modal="true"
	>
		<!-- Header -->
		<div class="px-6 py-4 border-b border-[var(--color-border)]">
			<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Change Printing</h2>
			<p class="text-sm text-[var(--color-text-secondary)] mt-1">{card.name}</p>

			<!-- Search and Sort Controls -->
			{#if !loading && !error && printings.length > 0}
				<div class="flex gap-3 mt-4">
					<!-- Search -->
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search by set name or code..."
						class="flex-1 px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
					/>

					<!-- Sort -->
					<select
						bind:value={sortBy}
						class="px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
					>
						<option value="year">Sort by Year (Newest)</option>
						<option value="price">Sort by Price (Low to High)</option>
						<option value="set">Sort by Set Name</option>
					</select>
				</div>

				<div class="text-xs text-[var(--color-text-tertiary)] mt-2">
					Showing {filteredPrintings.length} of {printings.length} printings
				</div>
			{/if}
		</div>

		<!-- Body -->
		<div class="px-6 py-4 overflow-y-auto flex-1">
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="text-[var(--color-text-primary)] mb-2">Loading printings...</div>
						<div class="text-sm text-[var(--color-text-tertiary)]">Fetching data from Scryfall</div>
					</div>
				</div>
			{:else if error}
				<div class="text-center py-12">
					<div class="text-[var(--color-error)] mb-2">Error</div>
					<div class="text-sm text-[var(--color-text-tertiary)]">{error}</div>
				</div>
			{:else if printings.length === 0}
				<div class="text-center py-12">
					<div class="text-[var(--color-text-secondary)]">No printings found</div>
				</div>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{#each filteredPrintings as printing}
						<button
							on:click={() => selectPrinting(printing)}
							class="group flex flex-col bg-[var(--color-bg-primary)] rounded-lg border-2 hover:border-[var(--color-brand-primary)] transition-all p-2 text-left {printing.id === card.scryfallId ? 'border-[var(--color-brand-primary)] ring-2 ring-[var(--color-brand-primary)]/50' : 'border-[var(--color-border)]'}"
						>
							<!-- Card Image -->
							<div class="relative overflow-hidden rounded mb-2">
								{#if printing.image_uris?.normal || printing.card_faces?.[0]?.image_uris?.normal}
									<img
										src={printing.image_uris?.normal || printing.card_faces?.[0]?.image_uris?.normal}
										alt={printing.name}
										class="w-full rounded transition-transform group-hover:scale-105"
										loading="lazy"
									/>
									{#if isGameChanger(card.name)}
										<GameChangerBadge position="left" />
									{/if}
									{#if printing.id === card.scryfallId}
										<div class="absolute top-2 right-2 bg-[var(--color-brand-primary)] text-white text-xs font-bold px-2 py-1 rounded">
											CURRENT
										</div>
									{/if}
								{:else}
									<div class="w-full aspect-[5/7] bg-[var(--color-surface)] rounded flex items-center justify-center">
										<span class="text-xs text-[var(--color-text-tertiary)]">No image</span>
									</div>
								{/if}
							</div>

							<!-- Set Info -->
							<div class="text-xs font-bold text-[var(--color-text-primary)] mb-1">
								{printing.set.toUpperCase()} #{printing.collector_number}
							</div>
							<div class="text-xs text-[var(--color-text-secondary)] mb-1 line-clamp-1" title={printing.set_name}>
								{printing.set_name}
							</div>
							<div class="text-xs text-[var(--color-text-tertiary)] mb-2">
								{new Date(printing.released_at).getFullYear()}
							</div>

							<!-- Price -->
							{#if printing.prices.usd}
								<div class="text-sm font-bold text-green-500">
									${parseFloat(printing.prices.usd).toFixed(2)}
								</div>
							{:else}
								<div class="text-xs text-[var(--color-text-tertiary)]">N/A</div>
							{/if}
						</button>
					{/each}
				</div>

				{#if filteredPrintings.length === 0}
					<div class="text-center py-12">
						<div class="text-[var(--color-text-secondary)]">No printings match your search</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Footer -->
		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end">
			<button
				on:click={onClose}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Cancel
			</button>
		</div>
	</div>
</div>
