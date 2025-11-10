<script lang="ts">
	import { type Snippet } from 'svelte';

	interface Props {
		title: string;
		data: Record<string, number>;
		filterMinimum?: number;
		excludeColorless?: boolean;
		children?: Snippet;
	}

	let { title, data, filterMinimum = 0.5, excludeColorless = false, children }: Props = $props();

	// Mana color mappings (exact colors used by mana symbols)
	const manaColors: Record<string, string> = {
		W: '#f0f0d8',
		U: '#0e68ab',
		B: '#150b00',
		R: '#d3202a',
		G: '#00733e',
		C: '#cac5c0'
	};

	// Filter to only include colors above minimum threshold
	let filteredData = $derived(
		Object.entries(data)
			.filter(([color, value]) => {
				// Filter out colorless if requested
				if (excludeColorless && color === 'C') return false;
				// Filter by minimum threshold
				return value >= filterMinimum;
			})
			.sort(([a], [b]) => {
				// Sort by WUBRG order
				const order = ['W', 'U', 'B', 'R', 'G', 'C'];
				return order.indexOf(a) - order.indexOf(b);
			})
	);

	// Calculate total for percentage calculation
	let total = $derived(filteredData.reduce((sum, [_, value]) => sum + value, 0));

	// Calculate percentages for each color
	let segments = $derived(
		filteredData.map(([color, value], index) => ({
			color,
			value,
			percentage: total > 0 ? (value / total) * 100 : 0,
			bgColor: manaColors[color] || '#ccc',
			isFirst: index === 0,
			isLast: index === filteredData.length - 1
		}))
	);
</script>

<div class="w-full">
	<div class="flex items-center justify-between mb-2">
		<span class="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
			{title}
		</span>
		{#if children}
			{@render children()}
		{/if}
	</div>

	<div class="relative h-12 w-full bg-[var(--color-surface)] rounded-lg overflow-hidden">
		<div class="absolute inset-0 flex">
			{#each segments as segment}
				<div
					class="relative flex items-center justify-center transition-all segment group"
					class:segment-first={segment.isFirst}
					class:segment-last={segment.isLast}
					class:segment-middle={!segment.isFirst && !segment.isLast}
					style="width: {segment.percentage}%; background-color: {segment.bgColor};"
					title="{segment.color}: {segment.value.toFixed(segment.value % 1 === 0 ? 0 : 1)} pips"
				>
					{#if segment.percentage > 5}
						<!-- Only show symbol if segment is wide enough -->
						<div class="flex items-center justify-center z-10">
							<i
								class="ms ms-{segment.color.toLowerCase()} ms-cost text-6xl"
								style="text-shadow: 0 2px 4px rgba(0,0,0,0.3);"
							></i>
						</div>
					{/if}

					<!-- Tooltip on hover -->
					<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
						{segment.color}: {segment.value.toFixed(segment.value % 1 === 0 ? 0 : 1)} pips
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.segment {
		position: relative;
	}

	.segment i.ms {
		/* Remove any default background/styling from mana symbols */
		background: none !important;
		box-shadow: none;
	}

	/* First segment: straight left edge, diagonal right edge (/) */
	.segment-first {
		clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
		margin-right: -8px;
		padding-right: 8px;
		z-index: 3;
		border-top-left-radius: 0.5rem;
		border-bottom-left-radius: 0.5rem;
	}

	/* Middle segments: diagonal on both edges (/) */
	.segment-middle {
		clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
		margin-left: -8px;
		margin-right: -8px;
		padding-left: 8px;
		padding-right: 8px;
		z-index: 2;
	}

	/* Last segment: diagonal left edge, straight right edge (/) */
	.segment-last {
		clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%);
		margin-left: -8px;
		padding-left: 8px;
		z-index: 1;
		border-top-right-radius: 0.5rem;
		border-bottom-right-radius: 0.5rem;
	}

	/* Single segment (first and last): no diagonal cuts */
	.segment-first.segment-last {
		clip-path: none;
		margin: 0;
		padding: 0;
		border-radius: 0.5rem;
	}
</style>
