<script lang="ts">
	import type { Deck } from '$lib/types/deck';
	import { isGameChanger, getBracketDescription, type BracketLevel } from '$lib/utils/game-changers';
	import BaseTooltip from './BaseTooltip.svelte';
	import { type Snippet } from 'svelte';

	let { deck, bracketLevel, gameChangers, children }: {
		deck: Deck;
		bracketLevel: BracketLevel;
		gameChangers: string[];
		children?: Snippet;
	} = $props();
</script>

<BaseTooltip
	trigger="hover"
	position="below"
	positioning="fixed"
	closeDelay={300}
	maxWidth="400px"
	className="bracket-tooltip-content"
>
	{#snippet children()}
		{@render children?.()}
	{/snippet}

	{#snippet content()}
		<!-- Bracket Description -->
		<div class="mb-2 pb-2 bracket-section">
			<div class="font-semibold bracket-title mb-1">
				Bracket {bracketLevel}
			</div>
			<div class="text-xs bracket-description">
				{getBracketDescription(bracketLevel)}
			</div>
		</div>

		<!-- Game Changers List -->
		{#if gameChangers.length > 0}
			<div class="mb-2">
				<div class="font-semibold text-amber-500 mb-1 text-xs flex items-center gap-1">
					<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
						<path d="M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm3.854 1.146a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 1 1-.708-.708l1.5-1.5a.5.5 0 0 1 .708 0zm-7.708 0a.5.5 0 0 1 .708 0l1.5 1.5a.5.5 0 1 1-.708.708l-1.5-1.5a.5.5 0 0 1 0-.708zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
					</svg>
					Game Changers ({gameChangers.length})
				</div>
				<div class="space-y-0.5 max-h-40 overflow-y-auto game-changer-list">
					{#each gameChangers as card}
						<div class="text-xs pl-2">• {card}</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="text-xs bracket-secondary">
				No Game Changers detected
			</div>
		{/if}

		<!-- Criteria Info -->
		<div class="mt-2 pt-2 criteria-section text-xs">
			<div class="font-semibold bracket-description mb-1">Bracket Criteria:</div>
			{#if bracketLevel === 1}
				<div class="text-green-400">✓ No Game Changers</div>
				<div class="text-green-400">✓ No 2-card infinite combos</div>
				<div class="text-green-400">✓ No extra turn cards</div>
				<div class="text-green-400">✓ No mass land destruction</div>
			{:else if bracketLevel === 2}
				<div class="text-green-400">✓ No Game Changers</div>
				<div class="bracket-secondary">• Precon-level power</div>
				<div class="bracket-secondary">• Minimal optimization</div>
			{:else if bracketLevel === 3}
				<div class="text-amber-400">! 1-3 Game Changers</div>
				<div class="bracket-secondary">• Upgraded precon or focused casual</div>
				<div class="bracket-secondary">• Some tutors and fast mana</div>
			{:else if bracketLevel === 4}
				<div class="text-orange-400 font-semibold mb-1">! 4+ Game Changers detected</div>
				<div class="bracket-secondary">• Multiple fast mana sources</div>
				<div class="bracket-secondary">• Powerful tutors (Demonic, Vampiric, etc.)</div>
				<div class="bracket-secondary">• Strong card advantage engines</div>
				<div class="bracket-secondary">• Efficient 2-card combos</div>
				<div class="bracket-secondary">• Free interaction (Force of Will, etc.)</div>
				<div class="bracket-secondary">• Optimized mana base</div>
			{:else if bracketLevel === 5}
				<div class="text-red-400 font-semibold">! Competitive EDH (cEDH)</div>
				<div class="bracket-secondary">• No restrictions on power level</div>
				<div class="bracket-secondary">• Turn 3-4 wins expected</div>
				<div class="bracket-secondary">• Maximum optimization</div>
			{/if}
		</div>
	{/snippet}
</BaseTooltip>

<style>
	/* Bracket-specific styling */
	.bracket-tooltip-content {
		padding: 12px 16px;
		min-width: 280px;
		z-index: 9999;
	}

	/* Theme-aware text colors */
	:global(.bracket-tooltip-content) .bracket-title {
		color: var(--color-text-primary);
	}

	:global(.bracket-tooltip-content) .bracket-description {
		color: var(--color-text-secondary);
	}

	:global(.bracket-tooltip-content) .bracket-secondary {
		color: var(--color-text-tertiary);
	}

	:global(.bracket-tooltip-content) .bracket-section {
		border-bottom: 1px solid var(--color-border);
	}

	:global(.bracket-tooltip-content) .criteria-section {
		border-top: 1px solid var(--color-border);
	}

	:global(.bracket-tooltip-content) .game-changer-list {
		color: var(--color-text-primary);
	}
</style>
