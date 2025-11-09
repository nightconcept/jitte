<script lang="ts">
	import type { Card } from '$lib/types/card';
	import type { ScryfallCard } from '$lib/types/scryfall';
	import { cardService } from '$lib/api/card-service';
	import { onMount } from 'svelte';

	let {
		card,
		isOpen = false,
		onClose = () => {}
	}: {
		card: Card;
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	let scryfallCard = $state<ScryfallCard | null>(null);
	let loading = $state(true);
	let rulings = $state<Array<{ published_at: string; comment: string }>>([]);

	// Fetch full Scryfall data when modal opens
	$effect(() => {
		if (isOpen && card) {
			loadCardDetails();
		}
	});

	async function loadCardDetails() {
		loading = true;
		try {
			// Get full Scryfall card data
			const fullCard = await cardService.getCardByName(card.name);
			if (fullCard) {
				scryfallCard = fullCard;

				// Fetch rulings if available
				if (fullCard.rulings_uri) {
					const rulingsResponse = await fetch(fullCard.rulings_uri);
					const rulingsData = await rulingsResponse.json();
					rulings = rulingsData.data || [];
				}
			}
		} catch (error) {
			console.error('Error loading card details:', error);
		} finally {
			loading = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function formatPrice(price: number | undefined): string {
		if (price === undefined || price === null) return 'N/A';
		return `$${price.toFixed(2)}`;
	}

	function formatLegality(legality: string): string {
		return legality.charAt(0).toUpperCase() + legality.slice(1).replace('_', ' ');
	}

	function getLegalityColor(legality: string): string {
		switch (legality) {
			case 'legal':
				return 'text-green-600';
			case 'banned':
				return 'text-red-600';
			case 'restricted':
				return 'text-yellow-600';
			case 'not_legal':
				return 'text-gray-500';
			default:
				return 'text-gray-500';
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
	>
		<!-- Modal Content -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[var(--color-border)]"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
				<h2 class="text-2xl font-bold text-[var(--color-text-primary)]">{card.name}</h2>
				<button
					onclick={onClose}
					class="p-2 hover:bg-[var(--color-surface-hover)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
					title="Close"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto p-6">
				{#if loading}
					<div class="flex items-center justify-center py-12">
						<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-brand-primary)]"></div>
					</div>
				{:else if scryfallCard}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Left Column: Image -->
						<div class="flex flex-col items-center">
							{#if scryfallCard.image_uris?.normal}
								<img
									src={scryfallCard.image_uris.normal}
									alt={scryfallCard.name}
									class="rounded-lg shadow-lg max-w-full h-auto"
								/>
							{:else if scryfallCard.card_faces?.[0]?.image_uris?.normal}
								<img
									src={scryfallCard.card_faces[0].image_uris.normal}
									alt={scryfallCard.name}
									class="rounded-lg shadow-lg max-w-full h-auto"
								/>
							{/if}
						</div>

						<!-- Right Column: Details -->
						<div class="flex flex-col gap-6">
							<!-- Oracle Text -->
							<div>
								<h3 class="text-lg font-bold text-[var(--color-text-primary)] mb-2">Oracle Text</h3>
								<div class="text-sm text-[var(--color-text-secondary)] whitespace-pre-line p-4 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)]">
									{scryfallCard.oracle_text || 'No oracle text available'}
								</div>
							</div>

							<!-- Type Line -->
							<div>
								<h3 class="text-lg font-bold text-[var(--color-text-primary)] mb-2">Type</h3>
								<p class="text-sm text-[var(--color-text-secondary)]">{scryfallCard.type_line}</p>
							</div>

							<!-- Mana Cost & CMC -->
							{#if scryfallCard.mana_cost}
								<div>
									<h3 class="text-lg font-bold text-[var(--color-text-primary)] mb-2">Mana Cost</h3>
									<div class="flex items-center gap-2">
										<span class="text-sm text-[var(--color-text-secondary)]">{scryfallCard.mana_cost}</span>
										<span class="text-xs text-[var(--color-text-tertiary)]">(CMC: {scryfallCard.cmc})</span>
									</div>
								</div>
							{/if}

							<!-- Pricing -->
							<div>
								<h3 class="text-lg font-bold text-[var(--color-text-primary)] mb-2">Pricing (USD)</h3>
								<div class="grid grid-cols-2 gap-2 text-sm">
									<div class="flex justify-between p-2 bg-[var(--color-bg-secondary)] rounded">
										<span class="text-[var(--color-text-secondary)]">Normal:</span>
										<span class="font-semibold text-[var(--color-text-primary)]">
											{formatPrice(scryfallCard.prices?.usd ? parseFloat(scryfallCard.prices.usd) : undefined)}
										</span>
									</div>
									<div class="flex justify-between p-2 bg-[var(--color-bg-secondary)] rounded">
										<span class="text-[var(--color-text-secondary)]">Foil:</span>
										<span class="font-semibold text-[var(--color-text-primary)]">
											{formatPrice(scryfallCard.prices?.usd_foil ? parseFloat(scryfallCard.prices.usd_foil) : undefined)}
										</span>
									</div>
								</div>
							</div>

							<!-- Format Legality -->
							<div>
								<h3 class="text-lg font-bold text-[var(--color-text-primary)] mb-2">Format Legality</h3>
								<div class="grid grid-cols-2 gap-2 text-sm">
									{#each Object.entries(scryfallCard.legalities).filter(([format]) => ['commander', 'standard', 'modern', 'legacy', 'vintage', 'pioneer'].includes(format)) as [format, legality]}
										<div class="flex justify-between p-2 bg-[var(--color-bg-secondary)] rounded">
											<span class="text-[var(--color-text-secondary)] capitalize">{format}:</span>
											<span class="font-semibold {getLegalityColor(legality)}">
												{formatLegality(legality)}
											</span>
										</div>
									{/each}
								</div>
							</div>

							<!-- Rulings -->
							{#if rulings.length > 0}
								<div>
									<h3 class="text-lg font-bold text-[var(--color-text-primary)] mb-2">Rulings</h3>
									<div class="space-y-2 max-h-64 overflow-y-auto">
										{#each rulings as ruling}
											<div class="p-3 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)]">
												<p class="text-sm text-[var(--color-text-secondary)]">{ruling.comment}</p>
												<p class="text-xs text-[var(--color-text-tertiary)] mt-1">{ruling.published_at}</p>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="text-center py-12 text-[var(--color-text-secondary)]">
						Unable to load card details
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center">
				<div class="text-sm text-[var(--color-text-tertiary)]">
					{#if scryfallCard}
						{scryfallCard.set_name} ({scryfallCard.set.toUpperCase()}) #{scryfallCard.collector_number}
					{/if}
				</div>
				<div class="flex gap-3">
					<a
						href="https://scryfall.com/search?q={encodeURIComponent(card.name)}"
						target="_blank"
						rel="noopener noreferrer"
						class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
						View on Scryfall
					</a>
					<button
						onclick={onClose}
						class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
