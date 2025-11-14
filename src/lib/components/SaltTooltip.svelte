<script lang="ts">
	import type { DeckSaltScore } from '$lib/types/edhrec';
	import BaseTooltip from './BaseTooltip.svelte';
	import { type Snippet } from 'svelte';

	let {
		saltScore,
		loading = false,
		children
	}: {
		saltScore: DeckSaltScore | null;
		loading?: boolean;
		children?: Snippet;
	} = $props();
</script>

<BaseTooltip
	trigger="hover"
	position="below"
	positioning="fixed"
	closeDelay={300}
	maxWidth="400px"
	className="salt-tooltip-content"
>
	{#snippet children()}
		{@render children?.()}
	{/snippet}

	{#snippet content()}
		<!-- Salt Score Explanation -->
		<div class="mb-2 pb-2 salt-section">
			<div class="font-semibold salt-title mb-1">EDHREC Salt Score</div>
			<div class="text-xs salt-description">
				Salt scores measure how frustrating or unfun cards are to play against, based on annual
				community surveys. Scores range from 0-4:
			</div>
			<div class="text-xs salt-description mt-1 space-y-0.5">
				<div>• <strong>0-1:</strong> Fun to play against</div>
				<div>• <strong>1-2:</strong> Slightly annoying</div>
				<div>• <strong>2-3:</strong> Moderately frustrating</div>
				<div>• <strong>3-4:</strong> Very unfun, ruins games</div>
			</div>
			<div class="text-xs salt-secondary mt-2 italic">
				Note: Salt scores reflect community sentiment about frustration, not deck power or quality.
			</div>
		</div>

		{#if saltScore && saltScore.totalCardsWithScores > 0}
			<!-- Deck Stats -->
			<div class="mb-2 pb-2 salt-section">
				<div class="font-semibold salt-description mb-1 text-xs">Deck Summary:</div>
				<div class="text-xs space-y-0.5">
					<div class="flex justify-between">
						<span class="salt-secondary">Total Salt:</span>
						<span class="salt-title">{saltScore.totalSalt.toFixed(2)}</span>
					</div>
					<div class="flex justify-between">
						<span class="salt-secondary">Average Salt:</span>
						<span class="salt-title">{saltScore.averageSalt.toFixed(2)}</span>
					</div>
					<div class="flex justify-between">
						<span class="salt-secondary">Cards with scores:</span>
						<span class="salt-title">{saltScore.totalCardsWithScores}</span>
					</div>
				</div>
			</div>

			<!-- Attribution -->
			<div class="text-xs salt-secondary">
				Data from <a
					href="https://edhrec.com/top/salt"
					target="_blank"
					rel="noopener noreferrer"
					class="text-[var(--color-accent-blue)] hover:underline">EDHREC Salt Scores</a
				>
			</div>
		{:else if loading}
			<div class="text-xs salt-secondary">Calculating salt scores...</div>
		{:else}
			<div class="text-xs salt-secondary">No salt scores found for cards in this deck.</div>
		{/if}
	{/snippet}
</BaseTooltip>

<style>
	/* Salt-specific styling */
	:global(.salt-tooltip-content) {
		padding: 12px 16px;
		min-width: 300px;
		z-index: 9999 !important;
	}

	/* Theme-aware text colors */
	:global(.salt-tooltip-content) .salt-title {
		color: var(--color-text-primary);
	}

	:global(.salt-tooltip-content) .salt-description {
		color: var(--color-text-secondary);
	}

	:global(.salt-tooltip-content) .salt-secondary {
		color: var(--color-text-tertiary);
	}

	:global(.salt-tooltip-content) .salt-section {
		border-bottom: 1px solid var(--color-border);
	}
</style>
