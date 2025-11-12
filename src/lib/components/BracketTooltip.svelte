<script lang="ts">
	import type { Deck } from '$lib/types/deck';
	import { isGameChanger, getBracketDescription, type BracketLevel } from '$lib/utils/game-changers';
	import BaseTooltip from './BaseTooltip.svelte';
	import { type Snippet } from 'svelte';

	let {
		deck,
		bracketLevel,
		gameChangers,
		twoCardComboCount = 0,
		earlyGameComboCount = 0,
		lateGameComboCount = 0,
		hasMassLandDenial = false,
		hasExtraTurns = false,
		hasChainingExtraTurns = false,
		children
	}: {
		deck: Deck;
		bracketLevel: BracketLevel;
		gameChangers: string[];
		twoCardComboCount?: number;
		earlyGameComboCount?: number;
		lateGameComboCount?: number;
		hasMassLandDenial?: boolean;
		hasExtraTurns?: boolean;
		hasChainingExtraTurns?: boolean;
		children?: Snippet;
	} = $props();
</script>

<BaseTooltip
	trigger="hover"
	position="below"
	positioning="fixed"
	closeDelay={300}
	maxWidth="400px"
	offsetY={-55}
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
				<!-- Exhibition: No MLD, no extra turns, no combos, no Game Changers -->
				<div class="{hasMassLandDenial ? 'text-red-400' : 'text-green-400'}">
					{hasMassLandDenial ? '✗' : '✓'} No mass land denial
				</div>
				<div class="{hasExtraTurns ? 'text-red-400' : 'text-green-400'}">
					{hasExtraTurns ? '✗' : '✓'} No extra turns
				</div>
				<div class="{twoCardComboCount > 0 ? 'text-red-400' : 'text-green-400'}">
					{twoCardComboCount > 0 ? '✗' : '✓'} No 2-card infinite combos
				</div>
				<div class="{gameChangers.length > 0 ? 'text-red-400' : 'text-green-400'}">
					{gameChangers.length > 0 ? '✗' : '✓'} No Game Changers
				</div>
			{:else if bracketLevel === 2}
				<!-- Core: No MLD, no chaining extra turns, no combos, no Game Changers -->
				<div class="{hasMassLandDenial ? 'text-red-400' : 'text-green-400'}">
					{hasMassLandDenial ? '✗' : '✓'} No mass land denial
				</div>
				<div class="{hasChainingExtraTurns ? 'text-red-400' : 'text-green-400'}">
					{hasChainingExtraTurns ? '✗' : '✓'} No chaining extra turns
				</div>
				<div class="{twoCardComboCount > 0 ? 'text-red-400' : 'text-green-400'}">
					{twoCardComboCount > 0 ? '✗' : '✓'} No 2-card infinite combos
				</div>
				<div class="{gameChangers.length > 0 ? 'text-red-400' : 'text-green-400'}">
					{gameChangers.length > 0 ? '✗' : '✓'} No Game Changers
				</div>
			{:else if bracketLevel === 3}
				<!-- Upgraded: No MLD, no chaining turns, late-game combos OK, up to 3 Game Changers -->
				<div class="{hasMassLandDenial ? 'text-red-400' : 'text-green-400'}">
					{hasMassLandDenial ? '✗' : '✓'} No mass land denial
				</div>
				<div class="{hasChainingExtraTurns ? 'text-red-400' : 'text-green-400'}">
					{hasChainingExtraTurns ? '✗' : '✓'} No chaining extra turns
				</div>
				<div class="{lateGameComboCount > 0 ? 'text-amber-400' : 'text-green-400'}">
					{lateGameComboCount > 0 ? '✓' : '○'} Late-game combos OK {lateGameComboCount > 0 ? `(${lateGameComboCount})` : ''}
				</div>
				<div class="{gameChangers.length > 0 && gameChangers.length <= 3 ? 'text-amber-400' : gameChangers.length > 3 ? 'text-red-400' : 'text-green-400'}">
					{gameChangers.length > 3 ? '✗' : gameChangers.length > 0 ? '✓' : '○'} Up to 3 Game Changers {gameChangers.length > 0 ? `(${gameChangers.length})` : ''}
				</div>
			{:else if bracketLevel === 4}
				<!-- Optimized: Any of these push to Bracket 4 -->
				<div class="font-semibold bracket-description mb-1">Triggers (any applies):</div>
				<div class="{hasMassLandDenial ? 'text-orange-400 font-semibold' : 'bracket-secondary'}">
					{hasMassLandDenial ? '! Mass land denial detected' : '○ Mass land denial'}
				</div>
				<div class="{hasChainingExtraTurns ? 'text-orange-400 font-semibold' : 'bracket-secondary'}">
					{hasChainingExtraTurns ? '! Chaining extra turns detected' : '○ Chaining extra turns'}
				</div>
				<div class="{earlyGameComboCount > 0 ? 'text-orange-400 font-semibold' : 'bracket-secondary'}">
					{earlyGameComboCount > 0 ? `! ${earlyGameComboCount} early-game ${earlyGameComboCount === 1 ? 'combo' : 'combos'} detected` : '○ Early-game 2-card combos'}
				</div>
				<div class="{gameChangers.length >= 4 ? 'text-orange-400 font-semibold' : 'bracket-secondary'}">
					{gameChangers.length >= 4 ? `! ${gameChangers.length} Game Changers detected` : '○ 4+ Game Changers'}
				</div>
			{:else if bracketLevel === 5}
				<!-- cEDH: No restrictions -->
				<div class="text-red-400 font-semibold">! Competitive EDH (cEDH)</div>
				<div class="bracket-secondary">• No restrictions except banned list</div>
				<div class="bracket-secondary">• Turn 3-4 wins expected</div>
				<div class="bracket-secondary">• Maximum optimization</div>
			{/if}
		</div>
	{/snippet}
</BaseTooltip>

<style>
	/* Bracket-specific styling */
	:global(.bracket-tooltip-content) {
		padding: 12px 16px;
		min-width: 280px;
		z-index: 9999 !important;
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
