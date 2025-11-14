<script lang="ts">
	import { deckStore } from '$lib/stores/deck-store';
	import ManaBar from './ManaBar.svelte';
	import DrawProbability from './DrawProbability.svelte';
	import { enrichStatisticsWithCombos } from '$lib/utils/deck-statistics';
	import type { DetectedCombo } from '$lib/types/deck';

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

	let showManaCurve = $state(true);
	let showManaCharts = $state(true);
	let showTypeBreakdown = $state(true);
	let showCombos = $state(true);

	// Prepare chart data
	let manaCurveData = $derived(statistics?.manaCurve || {});
	let colorDistData = $derived(statistics?.colorDistribution || {});
	let manaProductionData = $derived(statistics?.manaProduction || {});
	let typeDistData = $derived(statistics?.typeDistribution || {});

	// Get max value for mana curve chart scaling
	let maxCurveValue = $derived(
		Math.max(
			...Object.values(manaCurveData).map((data) => (data.permanents || 0) + (data.spells || 0)),
			1
		)
	);

	// Combo detection state (local to component - don't update store)
	let isLoadingCombos = $state(false);
	let combosError = $state<string | undefined>(undefined);
	let detectedCombos = $state<DetectedCombo[]>([]);
	let twoCardComboCount = $derived(detectedCombos.filter(c => c.isTwoCard).length);

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

	// Force reload combos (bypass cache)
	async function reloadCombos() {
		if (!deck || !statistics) {
			return;
		}

		try {
			// Clear cache for this deck
			const { clearComboCache } = await import('$lib/api/combo-service');
			clearComboCache();

			// Reset state
			detectedCombos = [];
			combosError = undefined;
			isLoadingCombos = true;

			// Call enrichStatisticsWithCombos directly with useCache=false
			const enrichedStats = await enrichStatisticsWithCombos(deck, statistics, false);

			// Update global store with enriched statistics (includes updated bracket level)
			deckStore.updateStatistics(enrichedStats);

			// Store combos in local component state
			detectedCombos = enrichedStats.combos ?? [];
			combosError = enrichedStats.combosError;
		} catch (error) {
			console.error('Failed to reload combos:', error);
			combosError = error instanceof Error ? error.message : 'Unknown error';
		} finally {
			isLoadingCombos = false;
		}
	}
</script>

<section class="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] relative z-10">
	<div class="px-6 py-6 space-y-6">
		<div>
			<h2 class="text-lg font-bold text-[var(--color-text-primary)]">Statistics</h2>
			<p class="text-sm text-[var(--color-text-secondary)] mt-1">
				Deck insights and mana distribution
			</p>
		</div>

		<div class="grid grid-cols-4 gap-6">
			<!-- Mana Cost & Production Charts -->
			<div class="col-span-4">
				<div class="flex items-center justify-between mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
					<span>Mana Cost & Production</span>
					<button
						class="p-1 rounded hover:bg-[var(--color-surface)] transition-colors"
						onclick={() => (showManaCharts = !showManaCharts)}
						aria-expanded={showManaCharts}
						aria-controls="mana-charts"
						aria-label="Toggle mana charts"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4 transition-transform {showManaCharts ? '' : '-rotate-90'}"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>

				{#if showManaCharts}
					<div class="space-y-6" id="mana-charts">
						<ManaBar title="Cost" data={colorDistData} filterMinimum={0.1} />
						<ManaBar title="Production" data={manaProductionData} filterMinimum={1} excludeColorless={true} />
					</div>
				{/if}
			</div>

			<!-- Mana Curve -->
			<div class="col-span-4">
				<div class="flex items-center justify-between mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
					<span>Mana Curve</span>
					<button
						class="p-1 rounded hover:bg-[var(--color-surface)] transition-colors"
						onclick={() => (showManaCurve = !showManaCurve)}
						aria-expanded={showManaCurve}
						aria-controls="mana-curve"
						aria-label="Toggle mana curve"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4 transition-transform {showManaCurve ? '' : '-rotate-90'}"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>

				{#if showManaCurve}
					<div class="space-y-3" id="mana-curve">
						<!-- Vertical bar chart with axes -->
						<div class="flex gap-3">
							<!-- Y-axis label -->
							<div class="flex items-center justify-center" style="width: 16px; height: 200px;">
								<span class="text-xs text-[var(--color-text-tertiary)] font-medium whitespace-nowrap" style="transform: rotate(-90deg); transform-origin: center;">
									Quantity
								</span>
							</div>

							<!-- Y-axis scale -->
							<div class="flex flex-col-reverse justify-between text-xs text-[var(--color-text-tertiary)] text-right pr-2" style="height: 200px;">
								{#each Array.from({ length: Math.ceil(maxCurveValue / 5) + 1 }, (_, i) => i * 5) as tick}
									<span class="leading-none">{tick}</span>
								{/each}
							</div>

							<!-- Chart area -->
							<div class="flex-1">
								<div class="relative" style="height: 200px;">
									<!-- Gridlines -->
									<div class="absolute inset-0 flex flex-col-reverse justify-between pointer-events-none">
										{#each Array.from({ length: Math.ceil(maxCurveValue / 5) + 1 }) as _}
											<div class="w-full border-t border-[var(--color-border)] opacity-30"></div>
										{/each}
									</div>

									<!-- Bars -->
									<div class="absolute inset-0 flex items-end justify-around gap-1 px-2 group/chart pointer-events-none">
										{#each Object.entries(manaCurveData).sort(([a], [b]) => Number(a) - Number(b)) as [cmc, data]}
											{@const total = data.permanents + data.spells}
											{@const totalHeightPx = maxCurveValue > 0 ? (total / maxCurveValue) * 200 : 0}
											{@const permanentsHeightPx = total > 0 ? (data.permanents / total) * totalHeightPx : 0}
											{@const spellsHeightPx = total > 0 ? (data.spells / total) * totalHeightPx : 0}

											<div class="flex-1 max-w-16 pointer-events-none">
												<!-- Stacked bar -->
												<div class="w-full flex flex-col-reverse pointer-events-none" style="height: {totalHeightPx}px;">
													<!-- Permanents (bottom) -->
													{#if data.permanents > 0}
														<div
															class="w-full bg-[var(--color-accent-green)] border-2 border-transparent hover:border-[var(--color-text-primary)] cursor-help relative group bar-segment pointer-events-auto group-hover/chart:opacity-40 hover:!opacity-100 rounded-b"
															style="height: {permanentsHeightPx}px; transition: opacity 300ms ease-in-out, border-color 200ms;"
														>
															<!-- Custom tooltip -->
															<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
																CMC {cmc}: {data.permanents} permanent{data.permanents !== 1 ? 's' : ''}
															</div>
														</div>
													{/if}
													<!-- Spells (top) -->
													{#if data.spells > 0}
														<div
															class="w-full bg-[var(--color-accent-red)] rounded-t border-2 border-transparent hover:border-[var(--color-text-primary)] cursor-help relative group bar-segment pointer-events-auto group-hover/chart:opacity-40 hover:!opacity-100"
															style="height: {spellsHeightPx}px; transition: opacity 300ms ease-in-out, border-color 200ms;"
														>
															<!-- Custom tooltip -->
															<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
																CMC {cmc}: {data.spells} spell{data.spells !== 1 ? 's' : ''}
															</div>
														</div>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>

								<!-- CMC labels below chart -->
								<div class="flex justify-around gap-1 px-2 mt-1">
									{#each Object.keys(manaCurveData).sort((a, b) => Number(a) - Number(b)) as cmc}
										<div class="flex-1 max-w-16 text-center">
											<span class="text-xs text-[var(--color-text-tertiary)] font-medium">{cmc}{cmc === '7' ? '+' : ''}</span>
										</div>
									{/each}
								</div>
							</div>
						</div>

						<!-- X-axis label -->
						<div class="text-center text-xs text-[var(--color-text-tertiary)] font-medium">
							Mana Value (CMC)
						</div>

						<!-- Legend -->
						<div class="flex justify-center gap-4 text-xs">
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 bg-[var(--color-accent-green)] rounded"></div>
							<span class="text-[var(--color-text-secondary)]">Permanents</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 bg-[var(--color-accent-red)] rounded"></div>
							<span class="text-[var(--color-text-secondary)]">Spells</span>
						</div>
						</div>

						<!-- Statistics text -->
						<div class="pt-2 border-t border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] leading-relaxed">
							<p>
								The average mana value of your main deck is <strong class="text-[var(--color-text-primary)]">{statistics?.averageCmcWithLands?.toFixed(2) || '0.00'}</strong> with lands and <strong class="text-[var(--color-text-primary)]">{statistics?.averageCmc?.toFixed(2) || '0.00'}</strong> without lands.
							</p>
							<p class="mt-1">
								The median mana value of your main deck is <strong class="text-[var(--color-text-primary)]">{statistics?.medianCmcWithLands || 0}</strong> with lands and <strong class="text-[var(--color-text-primary)]">{statistics?.medianCmc || 0}</strong> without lands.
							</p>
							<p class="mt-1">
								This deck's total mana value is <strong class="text-[var(--color-text-primary)]">{statistics?.totalManaValue || 0}</strong>.
							</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Draw Probability Calculator -->
			<div class="col-span-4">
				<div class="flex items-center justify-between mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
					<span>Draw Probability</span>
					<button
						class="p-1 rounded hover:bg-[var(--color-surface)] transition-colors"
						onclick={() => (showTypeBreakdown = !showTypeBreakdown)}
						aria-expanded={showTypeBreakdown}
						aria-controls="draw-probability"
						aria-label="Toggle draw probability"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4 transition-transform {showTypeBreakdown ? '' : '-rotate-90'}"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>

				{#if showTypeBreakdown}
					<div id="draw-probability">
						<DrawProbability
							typeDistribution={typeDistData}
							totalCards={statistics?.totalCards || 0}
						/>
					</div>
				{/if}
			</div>

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
					<div class="flex items-center gap-2">
						{#if showCombos && (detectedCombos.length > 0 || combosError)}
							<button
								class="px-2 py-1 text-xs rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
								onclick={reloadCombos}
								title="Clear cache and reload combos (check console for debug logs)"
							>
								🔄 Reload
							</button>
						{/if}
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
														<span class="text-sm font-semibold text-[var(--color-text-primary)]">
															{cardName}
														</span>
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
														{result}
													</span>
												{/each}
											</div>
										</div>

										<!-- Combo description -->
										{#if combo.description}
											<div>
												<p class="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide font-semibold mb-1">How it works</p>
												<p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">{combo.description}</p>
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
		</div>
	</div>
</section>
