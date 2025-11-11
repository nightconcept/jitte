<script lang="ts">
	import { deckStore } from '$lib/stores/deck-store';
	import ManaBar from './ManaBar.svelte';
	import DrawProbability from './DrawProbability.svelte';

	$: statistics = $deckStore?.statistics;

	let showManaCurve = true;
	let showManaCharts = true;
	let showTypeBreakdown = true;

	// Prepare chart data
	$: manaCurveData = statistics?.manaCurve || {};
	$: colorDistData = statistics?.colorDistribution || {};
	$: manaProductionData = statistics?.manaProduction || {};
	$: typeDistData = statistics?.typeDistribution || {};

	// Get max value for mana curve chart scaling
	$: maxCurveValue = Math.max(
		...Object.values(manaCurveData).map((data) => (data.permanents || 0) + (data.spells || 0)),
		1
	);
</script>

<section class="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
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
						on:click={() => (showManaCharts = !showManaCharts)}
						aria-expanded={showManaCharts}
						aria-controls="mana-charts"
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
						on:click={() => (showManaCurve = !showManaCurve)}
						aria-expanded={showManaCurve}
						aria-controls="mana-curve"
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
						on:click={() => (showTypeBreakdown = !showTypeBreakdown)}
						aria-expanded={showTypeBreakdown}
						aria-controls="draw-probability"
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
		</div>
	</div>
</section>
