<script lang="ts">
	import { deckStore } from '$lib/stores/deck-store';
	import ComboText from './ComboText.svelte';
	import { enrichStatisticsWithCombos } from '$lib/utils/deck-statistics';
	import type { DetectedCombo } from '$lib/types/deck';
	import type { Card } from '$lib/types/card';
	import { CardService } from '$lib/api/card-service';
	import { scryfallToCard } from '$lib/utils/card-converter';

	// Props
	let {
		onCardHover = undefined
	}: {
		onCardHover?: ((card: Card | null) => void) | undefined;
	} = $props();

	// Store subscription using Svelte 5 runes pattern
	let deckStoreState = $state($deckStore);

	$effect(() => {
		const unsubscribe = deckStore.subscribe((value) => {
			deckStoreState = value;
		});
		return unsubscribe;
	});

	let statistics = $derived(deckStoreState?.statistics);
	let deck = $derived(deckStoreState?.deck);

	// Combo detection state
	let isLoadingCombos = $state(false);
	let combosError = $state<string | undefined>(undefined);
	let detectedCombos = $state<DetectedCombo[]>([]);
	let twoCardComboCount = $derived(detectedCombos.filter(c => c.isTwoCard).length);
	let showCombos = $state(true);

	async function loadCombos() {
		if (!deck || !statistics || isLoadingCombos || detectedCombos.length > 0) {
			return;
		}

		try {
			isLoadingCombos = true;
			combosError = undefined;

			const enrichedStats = await enrichStatisticsWithCombos(deck, statistics);

			// Update global store with enriched statistics (includes updated bracket level)
			deckStore.updateStatistics(enrichedStats);

			// Store combos in local component state
			detectedCombos = enrichedStats.combos ?? [];
			combosError = enrichedStats.combosError;
		} catch (error) {
			console.error('Failed to load combos:', error);
			combosError = error instanceof Error ? error.message : 'Unknown error';
		} finally {
			isLoadingCombos = false;
		}
	}

	// Auto-load combos on mount (after a short delay to avoid blocking initial render)
	let hasAttemptedLoad = $state(false);

	$effect(() => {
		if (deck && statistics && !hasAttemptedLoad && !isLoadingCombos) {
			// Delay combo loading to not block initial page render
			const timer = setTimeout(() => {
				hasAttemptedLoad = true;
				loadCombos();
			}, 500);
			return () => clearTimeout(timer);
		}
	});

	// Toggle combos section
	function toggleCombos() {
		showCombos = !showCombos;
	}

	// Card service instance for fetching cards
	const cardService = new CardService();

	// Handle hovering over a card name in combos
	async function handleComboCardHover(cardName: string) {
		if (!onCardHover) return;

		try {
			const scryfallCard = await cardService.getCardByName(cardName);
			if (scryfallCard) {
				const card = scryfallToCard(scryfallCard);
				onCardHover(card);
			}
		} catch (error) {
			console.error('Error fetching card for hover:', error);
		}
	}
</script>

<!-- Detected Combos -->
<div class="col-span-4">
	<div class="flex items-center justify-between mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
		<span>
			Detected Combos
			{#if twoCardComboCount > 0}
				<span class="ml-2 px-2 py-0.5 text-xs font-medium bg-[var(--color-accent-red)] text-white rounded">
					{twoCardComboCount} 2-card combo{twoCardComboCount !== 1 ? 's' : ''}
				</span>
			{/if}
		</span>
		<button
			class="p-1 rounded hover:bg-[var(--color-surface)] transition-colors"
			onclick={toggleCombos}
			aria-expanded={showCombos}
			aria-controls="detected-combos"
			aria-label="Toggle combos"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4 transition-transform {showCombos ? '' : '-rotate-90'}"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	</div>

	{#if showCombos}
		<div id="detected-combos" class="space-y-3">
			{#if isLoadingCombos}
				<div class="text-center py-8 text-sm text-[var(--color-text-secondary)]">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-blue)]"></div>
					<p class="mt-3 font-semibold">Detecting combos via Commander Spellbook...</p>
					<p class="mt-2 text-xs text-[var(--color-text-tertiary)]">
						Searching all non-basic cards in your deck. This may take 5-15 seconds.
					</p>
				</div>
			{:else if combosError}
				<div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 text-sm">
					<p class="text-[var(--color-accent-red)] font-semibold">Error detecting combos</p>
					<p class="text-[var(--color-text-secondary)] mt-1">{combosError}</p>
					<button
						onclick={loadCombos}
						class="mt-3 px-3 py-1.5 bg-[var(--color-accent-blue)] text-white rounded text-xs hover:opacity-90 transition-opacity"
					>
						Retry
					</button>
				</div>
			{:else if detectedCombos.length === 0}
				<div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 text-sm text-center text-[var(--color-text-secondary)]">
					<p>No combos detected in this deck.</p>
					<p class="text-xs mt-2 text-[var(--color-text-tertiary)]">
						Powered by <a href="https://commanderspellbook.com/" target="_blank" rel="noopener noreferrer" class="text-[var(--color-accent-blue)] hover:underline">Commander Spellbook</a>
					</p>
				</div>
			{:else}
				<!-- Combo List -->
				<div class="space-y-2">
					{#each detectedCombos as combo (combo.id)}
						<div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
							<!-- Combo header -->
							<div class="flex items-start justify-between gap-3 mb-2">
								<div class="flex-1">
									<div class="flex flex-wrap items-center gap-2 mb-1">
										{#each combo.cardNames as cardName, index}
											<button
												class="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent-blue)] cursor-pointer transition-colors border-b border-dashed border-transparent hover:border-[var(--color-accent-blue)]"
												onmouseenter={() => handleComboCardHover(cardName)}
												type="button"
											>
												{cardName}
											</button>
											{#if index < combo.cardNames.length - 1}
												<span class="text-[var(--color-text-tertiary)]">+</span>
											{/if}
										{/each}
									</div>
								</div>
								<div class="flex gap-1.5">
									{#if combo.isTwoCard}
										<span class="px-2 py-0.5 text-xs font-medium bg-[var(--color-accent-red)] text-white rounded" title="2-card combo - pushes deck to Bracket 4">
											⚡ 2-card
										</span>
									{/if}
									{#if combo.speed === 'early'}
										<span class="px-2 py-0.5 text-xs font-medium bg-[var(--color-accent-yellow)] text-[var(--color-bg-primary)] rounded" title="Fast combo - can win early game">
											⚡ Fast
										</span>
									{/if}
									<a
										href="https://commanderspellbook.com/combo/{combo.id}"
										target="_blank"
										rel="noopener noreferrer"
										class="px-2 py-0.5 text-xs font-medium bg-[var(--color-accent-blue)] text-white rounded hover:opacity-90 transition-opacity"
										title="View full combo details on Commander Spellbook"
									>
										View →
									</a>
								</div>
							</div>

							<!-- Combo results -->
							<div class="mb-2">
								<p class="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide font-semibold mb-1">Results</p>
								<div class="flex flex-wrap gap-1.5">
									{#each combo.results as result}
										<span class="px-2 py-1 text-xs bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] rounded border border-[var(--color-border)]">
											<ComboText text={result} />
										</span>
									{/each}
								</div>
							</div>

							<!-- Combo description -->
							{#if combo.description}
								<div>
									<p class="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide font-semibold mb-1">How it works</p>
									<p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
										<ComboText text={combo.description} />
									</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Footer attribution -->
				<p class="text-xs text-center text-[var(--color-text-tertiary)] pt-2">
					Combo data from <a href="https://commanderspellbook.com/" target="_blank" rel="noopener noreferrer" class="text-[var(--color-accent-blue)] hover:underline">Commander Spellbook</a>
				</p>
			{/if}
		</div>
	{/if}
</div>
