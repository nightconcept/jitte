<script lang="ts">
	import { deckStore } from '$lib/stores/deck-store';

	$: statistics = $deckStore?.statistics;

	// Collapsible sections
	let collapsed = true;
	let showManaCurve = true;
	let showColorDistribution = true;
	let showTypeBreakdown = true;

	// Prepare chart data
	$: manaCurveData = statistics?.manaCurve || {};
	$: colorDistData = statistics?.colorDistribution || {};
	$: typeDistData = statistics?.typeDistribution || {};

	// Get max value for mana curve chart scaling
	$: maxCurveValue = Math.max(...Object.values(manaCurveData), 1);

	// Color mappings
	const manaColorMap: Record<string, string> = {
		W: '#f0f0d8',
		U: '#0e68ab',
		B: '#150b00',
		R: '#d3202a',
		G: '#00733e',
		C: '#cac5c0'
	};
</script>

<div class="bg-[var(--color-bg-secondary)]">
	<!-- Collapsible Header -->
	<button
		on:click={() => (collapsed = !collapsed)}
		class="w-full flex items-center justify-between px-6 py-3 hover:bg-[var(--color-surface)] transition-colors"
	>
		<div class="flex items-center gap-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4 text-[var(--color-text-tertiary)] transition-transform {collapsed ? '-rotate-90' : ''}"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
			<h2 class="text-lg font-bold text-[var(--color-text-primary)]">Statistics</h2>
		</div>
	</button>

	{#if !collapsed}
	<div class="p-6 grid grid-cols-4 gap-6 max-h-96 overflow-y-auto">
		<!-- Summary Stats -->
		<div class="col-span-4 grid grid-cols-4 gap-3 mb-2">
			<div class="bg-[var(--color-surface)] rounded p-3">
				<div class="text-xs text-[var(--color-text-tertiary)] mb-1">Total Cards</div>
				<div class="text-2xl font-bold text-[var(--color-text-primary)]">
					{statistics?.totalCards || 0}
				</div>
			</div>
			<div class="bg-[var(--color-surface)] rounded p-3">
				<div class="text-xs text-[var(--color-text-tertiary)] mb-1">Avg CMC</div>
				<div class="text-2xl font-bold text-[var(--color-text-primary)]">
					{statistics?.averageCmc?.toFixed(2) || '0.00'}
				</div>
			</div>
			<div class="bg-[var(--color-surface)] rounded p-3">
				<div class="text-xs text-[var(--color-text-tertiary)] mb-1">Lands</div>
				<div class="text-2xl font-bold text-[var(--color-text-primary)]">
					{statistics?.landCount || 0}
				</div>
			</div>
			<div class="bg-[var(--color-surface)] rounded p-3">
				<div class="text-xs text-[var(--color-text-tertiary)] mb-1">Non-Lands</div>
				<div class="text-2xl font-bold text-[var(--color-text-primary)]">
					{statistics?.nonLandCount || 0}
				</div>
			</div>
		</div>

		<!-- Mana Curve -->
		<div class="col-span-2">
			<button
				on:click={() => (showManaCurve = !showManaCurve)}
				class="w-full flex items-center justify-between mb-3 text-sm font-semibold text-[var(--color-text-primary)]"
			>
				<span>Mana Curve</span>
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

			{#if showManaCurve}
				<div class="space-y-2">
					{#each Object.entries(manaCurveData).sort(([a], [b]) => Number(a) - Number(b)) as [cmc, count]}
						<div class="flex items-center gap-2">
							<span class="text-xs text-[var(--color-text-tertiary)] w-6">{cmc}</span>
							<div class="flex-1 bg-[var(--color-surface)] rounded h-6 relative overflow-hidden">
								<div
									class="absolute inset-y-0 left-0 bg-[var(--color-brand-primary)] transition-all"
									style="width: {(count / maxCurveValue) * 100}%"
								></div>
								<span class="absolute inset-0 flex items-center justify-center text-xs font-medium text-[var(--color-text-primary)]">
									{count}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Color Distribution -->
		<div class="col-span-1">
			<button
				on:click={() => (showColorDistribution = !showColorDistribution)}
				class="w-full flex items-center justify-between mb-3 text-sm font-semibold text-[var(--color-text-primary)]"
			>
				<span>Colors</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 transition-transform {showColorDistribution ? '' : '-rotate-90'}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{#if showColorDistribution}
				<div class="space-y-2">
					{#each Object.entries(colorDistData) as [color, count]}
						<div class="flex items-center gap-2">
							<div
								class="w-4 h-4 rounded-full"
								style="background-color: {manaColorMap[color] || '#ccc'}"
							></div>
							<span class="text-xs text-[var(--color-text-secondary)] flex-1">{color}</span>
							<span class="text-xs font-medium text-[var(--color-text-primary)]">{count}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Type Breakdown -->
		<div class="col-span-1">
			<button
				on:click={() => (showTypeBreakdown = !showTypeBreakdown)}
				class="w-full flex items-center justify-between mb-3 text-sm font-semibold text-[var(--color-text-primary)]"
			>
				<span>Types</span>
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

			{#if showTypeBreakdown}
				<div class="space-y-2">
					{#each Object.entries(typeDistData) as [type, count]}
						<div class="flex items-center justify-between">
							<span class="text-xs text-[var(--color-text-secondary)]">{type}</span>
							<span class="text-xs font-medium text-[var(--color-text-primary)]">{count}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
	{/if}
</div>
