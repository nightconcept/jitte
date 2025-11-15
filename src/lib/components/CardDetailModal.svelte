<script lang="ts">
	import type { Card } from '$lib/types/card';
	import type { ScryfallCard } from '$lib/types/scryfall';
	import { cardService } from '$lib/api/card-service';
	import { edhrecService } from '$lib/api/edhrec-service';
	import type { EDHRECCardRecommendation } from '$lib/types/edhrec';
	import CardPreview from './CardPreview.svelte';
	import CardPreviewInfo from './CardPreviewInfo.svelte';
	import OracleText from './OracleText.svelte';

	let {
		card,
		isOpen = false,
		onClose = () => {},
		isCommander = false,
		commanderName = ''
	}: {
		card: Card;
		isOpen: boolean;
		onClose: () => void;
		isCommander?: boolean;
		commanderName?: string;
	} = $props();

	let scryfallCard = $state<ScryfallCard | null>(null);
	let loading = $state(true);
	let rulings = $state<Array<{ published_at: string; comment: string }>>([]);
	let edhrecData = $state<EDHRECCardRecommendation | null>(null);
	let loadingEdhrecData = $state(false);

	// Create a merged card with full face data for CardPreview
	let cardWithFaces = $derived.by(() => {
		if (!scryfallCard) return card;

		// Merge the original card with cardFaces data from Scryfall
		const merged: Card = { ...card };

		// Add card faces if available
		if (scryfallCard.card_faces && scryfallCard.card_faces.length > 1) {
			merged.cardFaces = scryfallCard.card_faces.map(face => ({
				name: face.name,
				manaCost: face.mana_cost,
				typeLine: face.type_line,
				oracleText: face.oracle_text,
				imageUrls: face.image_uris ? {
					small: face.image_uris.small,
					normal: face.image_uris.normal,
					large: face.image_uris.large,
					png: face.image_uris.png,
					artCrop: face.image_uris.art_crop,
					borderCrop: face.image_uris.border_crop
				} : undefined,
				colors: face.colors,
				power: face.power,
				toughness: face.toughness,
				loyalty: face.loyalty
			}));
			merged.layout = scryfallCard.layout;
		}

		return merged;
	});

	// Fetch full Scryfall data when modal opens
	$effect(() => {
		if (isOpen && card) {
			loadCardDetails();
		}
	});

	// Handle Escape key to close modal
	$effect(() => {
		if (!isOpen) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose();
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	async function loadCardDetails() {
		loading = true;
		loadingEdhrecData = false;
		edhrecData = null;

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

		// Fetch EDHREC data for Commander decks (in parallel, don't block loading)
		if (isCommander && commanderName && card.name !== commanderName) {
			loadEdhrecData();
		}
	}

	async function loadEdhrecData() {
		console.log('[CardDetailModal] Loading EDHREC data for card:', card.name, 'commander:', commanderName);
		loadingEdhrecData = true;
		try {
			const recommendations = await edhrecService.getCommanderRecommendations(commanderName);
			console.log('[CardDetailModal] Got recommendations with', recommendations.cardlists.length, 'categories');

			// Find this card in the recommendations
			for (const cardlist of recommendations.cardlists) {
				const foundCard = cardlist.cards.find(c =>
					c.name.toLowerCase() === card.name.toLowerCase()
				);
				if (foundCard) {
					edhrecData = {
						...foundCard,
						category: cardlist.header
					};
					console.log('[CardDetailModal] Found EDHREC data for', card.name, ':', edhrecData);
					break;
				}
			}

			if (!edhrecData) {
				console.log('[CardDetailModal] No EDHREC data found for card:', card.name);
			}
		} catch (error) {
			console.error('[CardDetailModal] Error loading EDHREC data:', error);
		} finally {
			loadingEdhrecData = false;
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
				return { icon: '✓', color: 'legal-icon', title: 'Legal' };
			case 'banned':
				return { icon: '✕', color: 'banned-icon', title: 'Banned' };
			case 'restricted':
				return { icon: '1', color: 'restricted-icon', title: 'Restricted: 1 copy only' };
			case 'not_legal':
				return { icon: '−', color: 'not-legal-icon', title: 'Not Legal' };
			default:
				return { icon: '−', color: 'not-legal-icon', title: 'Not Legal' };
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
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onClose();
			}
		}}
		role="presentation"
	>
		<!-- Modal Content -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[var(--color-border)] animate-scale-in"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="0"
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
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start min-h-[calc(90vh-16rem)]">
						<!-- Left Column: Card Image with Flip Functionality -->
						<div class="flex flex-col items-center sticky top-0 self-start h-[calc(90vh-16rem)]">
							<div class="card-preview-wrapper w-full max-w-sm flex flex-col">
								<CardPreview
									hoveredCard={cardWithFaces}
									showPricing={false}
									className="w-full bg-transparent border-none flex flex-col static h-auto scale-card-preview"
								/>
							</div>

					<!-- EDHREC Stats (Commander only) -->
					{#if isCommander && commanderName && card.name !== commanderName && (loadingEdhrecData || edhrecData)}
						<div class="w-full max-w-sm mt-3">
							<div class="flex items-center gap-1.5 mb-1.5">
								{#if edhrecData}
									<a
										href={edhrecData.url}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm font-bold text-[var(--color-brand-primary)] hover:underline"
									>
										EDHREC
									</a>
								{:else}
									<h3 class="text-sm font-bold text-[var(--color-text-primary)]">EDHREC</h3>
								{/if}
								<span class="text-xs text-[var(--color-text-tertiary)]">for {commanderName}</span>
							</div>

							{#if loadingEdhrecData}
								<div class="flex items-center justify-center py-3">
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-brand-primary)]"></div>
								</div>
							{:else if edhrecData}
								<div class="p-2 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)]">
									<div class="grid grid-cols-2 gap-2 text-xs">
										<div>
											<span class="text-[var(--color-text-secondary)] block mb-0.5 text-[0.65rem]">Synergy</span>
											<span class="text-base font-bold text-[var(--color-brand-primary)]">{edhrecData.synergyScore}%</span>
										</div>
										<div>
											<span class="text-[var(--color-text-secondary)] block mb-0.5 text-[0.65rem]">Usage</span>
											<span class="text-[0.65rem] font-semibold text-[var(--color-text-primary)]">{edhrecData.inclusionRate}% of {edhrecData.deckCount.toLocaleString()} decks</span>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}
						</div>

						<!-- Right Column: Details -->
						<div class="flex flex-col gap-4">
							<!-- Card Info (Name, Type, Oracle Text, etc.) -->
							<CardPreviewInfo card={card} scryfallCard={scryfallCard} />

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
													<span class="w-5 legal-icon">✓</span>
													<span class="text-[var(--color-text-secondary)]">Legal</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-5 banned-icon">✕</span>
													<span class="text-[var(--color-text-secondary)]">Banned</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-5 restricted-icon">1</span>
													<span class="text-[var(--color-text-secondary)]">Restricted: 1 copy only</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-5 not-legal-icon">−</span>
													<span class="text-[var(--color-text-secondary)]">Not Legal</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div class="grid grid-cols-3 gap-1 text-sm">
									{#each formatOrder.filter((format) => scryfallCard?.legalities?.[format as keyof typeof scryfallCard.legalities]) as format}
										{@const legality = scryfallCard?.legalities?.[format as keyof typeof scryfallCard.legalities]}
										{@const legalityInfo = legality ? getLegalityIcon(legality) : { icon: '?', color: 'text-gray-500', title: 'Unknown' }}
										<div class="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-bg-secondary)] rounded" title={legalityInfo.title}>
											<span class="flex-shrink-0 {legalityInfo.color}">
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
									<div class="space-y-2">
										{#each rulings as ruling}
											<div class="p-3 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)]">
												<p class="text-sm text-[var(--color-text-secondary)]">
													<OracleText text={ruling.comment} />
												</p>
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

	/* Card preview wrapper - fill parent height */
	.card-preview-wrapper {
		width: 100%;
		height: 100%;
		max-width: 24rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
	}

	/* Scale the card preview to fill available space */
	.card-preview-wrapper :global(.scale-card-preview) {
		width: 100% !important;
		height: 100% !important;
		display: flex !important;
		flex-direction: column !important;
		align-items: center !important;
		padding: 0 !important;
	}

	/* Perspective container: provide explicit dimensions */
	.card-preview-wrapper :global(.perspective-container) {
		position: relative;
		width: 100%;
		height: calc(100% - 4rem); /* Reserve space for flip button */
		flex-shrink: 0;
	}

	/* Flip card: use absolute positioning with max constraints + aspect-ratio */
	.card-preview-wrapper :global(.flip-card) {
		position: absolute;
		inset: 0;
		margin: auto;
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		aspect-ratio: 5 / 7;
	}

	.card-preview-wrapper :global(.card-face) {
		position: absolute !important;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.card-preview-wrapper :global(.card-face img) {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	/* Ensure flip button is visible with proper spacing */
	.card-preview-wrapper :global(aside > button) {
		flex-shrink: 0;
		margin-top: 1rem;
		position: relative;
	}

	/* Legend tooltip hover */
	.legend-container:hover .legend-tooltip {
		opacity: 1;
		pointer-events: auto;
	}

	/* Green circle with white checkmark for legal */
	:global(.legal-icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5em;
		height: 1.5em;
		background-color: #22c55e;
		color: white;
		border-radius: 50%;
		font-weight: bold;
		font-size: 0.75em;
	}

	/* Red circle with white X for banned */
	:global(.banned-icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5em;
		height: 1.5em;
		background-color: #ef4444;
		color: white;
		border-radius: 50%;
		font-weight: bold;
		font-size: 0.75em;
	}

	/* Blue circle with white 1 for restricted */
	:global(.restricted-icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5em;
		height: 1.5em;
		background-color: #3b82f6;
		color: white;
		border-radius: 50%;
		font-weight: bold;
		font-size: 0.75em;
	}

	/* Grey circle with white minus for not legal */
	:global(.not-legal-icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5em;
		height: 1.5em;
		background-color: #9ca3af;
		color: white;
		border-radius: 50%;
		font-weight: bold;
		font-size: 0.75em;
	}
</style>
