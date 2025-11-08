<script lang="ts">
	import { onMount } from 'svelte';
	import { cardService } from '$lib/api/card-service';
	import type { Card } from '$lib/types/card';
	import type { ScryfallCard } from '$lib/types/scryfall';
	import { CardCategory } from '$lib/types/card';

	export let card: Card;
	export let category: CardCategory;
	export let onConfirm: (newCard: Card) => void;
	export let onClose: () => void;

	let printings: ScryfallCard[] = [];
	let loading = true;
	let error: string | null = null;

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
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each printings as printing}
						<button
							on:click={() => selectPrinting(printing)}
							class="flex flex-col bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] transition-colors p-3 text-left {printing.id === card.scryfallId ? 'ring-2 ring-[var(--color-brand-primary)]' : ''}"
						>
							<!-- Card Image -->
							{#if printing.image_uris?.normal || printing.card_faces?.[0]?.image_uris?.normal}
								<img
									src={printing.image_uris?.normal || printing.card_faces?.[0]?.image_uris?.normal}
									alt={printing.name}
									class="w-full rounded mb-2"
								/>
							{:else}
								<div class="w-full aspect-[2/3] bg-[var(--color-surface)] rounded mb-2 flex items-center justify-center">
									<span class="text-xs text-[var(--color-text-tertiary)]">No image</span>
								</div>
							{/if}

							<!-- Set Info -->
							<div class="text-sm font-semibold text-[var(--color-text-primary)]">
								{printing.set.toUpperCase()} #{printing.collector_number}
							</div>
							<div class="text-xs text-[var(--color-text-tertiary)] mb-2">
								{new Date(printing.released_at).getFullYear()}
							</div>

							<!-- Price -->
							{#if printing.prices.usd}
								<div class="text-sm font-semibold text-green-500">
									${parseFloat(printing.prices.usd).toFixed(2)}
								</div>
							{:else}
								<div class="text-xs text-[var(--color-text-tertiary)]">Price unavailable</div>
							{/if}

							<!-- Current indicator -->
							{#if printing.id === card.scryfallId}
								<div class="text-xs text-[var(--color-brand-primary)] font-semibold mt-2">
									Current printing
								</div>
							{/if}
						</button>
					{/each}
				</div>
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
