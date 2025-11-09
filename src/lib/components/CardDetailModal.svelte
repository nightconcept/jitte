<script lang="ts">
	import type { Card } from '$lib/types/card';
	import type { ScryfallCard } from '$lib/types/scryfall';
	import { cardService } from '$lib/api/card-service';
	import { onMount } from 'svelte';
	import ManaSymbol from './ManaSymbol.svelte';
	import OracleText from './OracleText.svelte';

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

	function getLegalityIcon(legality: string): { icon: string; color: string; title: string } {
		switch (legality) {
			case 'legal':
				return { icon: '✓', color: 'text-green-600', title: 'Legal' };
			case 'banned':
				return { icon: '✕', color: 'text-red-600', title: 'Banned' };
			case 'restricted':
				return { icon: 'R', color: 'text-yellow-600', title: 'Restricted' };
			case 'not_legal':
				return { icon: '○', color: 'text-gray-400', title: 'Not Legal' };
			default:
				return { icon: '○', color: 'text-gray-400', title: 'Not Legal' };
		}
	}

	// Format order and display names
	const formatOrder = [
		'alchemy',
		'brawl',
		'commander',
		'duel',
		'gladiator',
		'historic',
		'legacy',
		'modern',
		'oathbreaker',
		'oldschool',
		'pauper',
		'paupercommander',
		'penny',
		'pioneer',
		'predh',
		'premodern',
		'standard',
		'standardbrawl',
		'timeless',
		'vintage'
	];

	const formatDisplayNames: Record<string, string> = {
		alchemy: 'Alchemy',
		brawl: 'Brawl',
		commander: 'Commander',
		duel: 'Duel',
		gladiator: 'Gladiator',
		historic: 'Historic',
		legacy: 'Legacy',
		modern: 'Modern',
		oathbreaker: 'Oathbreaker',
		oldschool: 'Oldschool',
		pauper: 'Pauper',
		paupercommander: 'Pauper EDH',
		penny: 'Penny',
		pioneer: 'Pioneer',
		predh: 'PreDH',
		premodern: 'Premodern',
		standard: 'Standard',
		standardbrawl: 'Standard Brawl',
		timeless: 'Timeless',
		vintage: 'Vintage'
	};
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
	>
		<!-- Modal Content -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[var(--color-border)] animate-scale-in"
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
						<div class="flex flex-col gap-4">
							<!-- Card Name & Mana Cost -->
							<div class="flex items-center justify-between gap-3">
								<h3 class="text-xl font-bold text-[var(--color-text-primary)]">{scryfallCard.name}</h3>
								{#if scryfallCard.mana_cost}
									<ManaSymbol cost={scryfallCard.mana_cost} size="lg" />
								{/if}
							</div>

							<!-- Type Line -->
							<p class="text-base font-semibold text-[var(--color-text-primary)]">{scryfallCard.type_line}</p>

							<!-- Oracle Text -->
							{#if scryfallCard.oracle_text}
								<div class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
									<OracleText text={scryfallCard.oracle_text} />
								</div>
							{/if}

							<!-- Power/Toughness -->
							{#if scryfallCard.power && scryfallCard.toughness}
								<div class="text-lg font-bold text-[var(--color-text-primary)]">
									{scryfallCard.power} / {scryfallCard.toughness}
								</div>
							{/if}

							<!-- Set Information -->
							<div class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
								<i class="ss ss-{scryfallCard.set.toLowerCase()} ss-{scryfallCard.rarity} ss-grad ss-2x" title={`${scryfallCard.set_name} - ${scryfallCard.rarity}`}></i>
								<span>{scryfallCard.set_name} ({scryfallCard.set.toUpperCase()}) #{scryfallCard.collector_number}</span>
							</div>

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
								<div class="flex items-center gap-2 mb-2">
									<h3 class="text-lg font-bold text-[var(--color-text-primary)]">Format Legality</h3>

									<!-- Legend Tooltip -->
									<div class="relative inline-block legend-container">
										<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-text-tertiary)] text-[var(--color-surface)] text-xs font-bold cursor-help">
											?
										</span>

										<!-- Tooltip -->
										<div class="legend-tooltip absolute left-0 top-6 z-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-3 min-w-max opacity-0 pointer-events-none transition-opacity">
											<div class="flex flex-col gap-2 text-xs">
												<div class="flex items-center gap-2">
													<span class="font-bold text-green-600 w-4">✓</span>
													<span class="text-[var(--color-text-secondary)]">Legal</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="font-bold text-red-600 w-4">✕</span>
													<span class="text-[var(--color-text-secondary)]">Banned</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="font-bold text-yellow-600 w-4">R</span>
													<span class="text-[var(--color-text-secondary)]">Restricted</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="font-bold text-gray-400 w-4">○</span>
													<span class="text-[var(--color-text-secondary)]">Not Legal</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div class="grid grid-cols-3 gap-1 text-xs">
									{#each formatOrder.filter(format => scryfallCard.legalities[format]) as format}
										{@const legality = scryfallCard.legalities[format]}
										{@const legalityInfo = getLegalityIcon(legality)}
										<div class="flex items-center gap-1 px-2 py-0.5 bg-[var(--color-bg-secondary)] rounded" title={legalityInfo.title}>
											<span class="font-bold {legalityInfo.color} flex-shrink-0">
												{legalityInfo.icon}
											</span>
											<span class="text-[var(--color-text-secondary)] truncate">{formatDisplayNames[format] || format}</span>
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
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end items-center">
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

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scale-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-fade-in {
		animation: fade-in 150ms ease-out;
	}

	.animate-scale-in {
		animation: scale-in 150ms ease-out;
	}

	/* Legend tooltip hover */
	.legend-container:hover .legend-tooltip {
		opacity: 1;
		pointer-events: auto;
	}
</style>
