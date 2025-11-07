<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { deckStore } from '$lib/stores/deck-store';

	export let hoveredCard: Card | null = null;

	$: deck = $deckStore?.deck;
	$: statistics = $deckStore?.statistics;
	$: commander = deck?.cards.commander?.[0];

	// Use hovered card if available, otherwise default to commander
	$: displayCard = hoveredCard || commander;
	$: imageUrl = displayCard?.imageUrls?.normal || displayCard?.imageUrls?.large;
</script>

<aside class="w-80 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] p-4 flex flex-col sticky top-[121px] self-start max-h-[calc(100vh-121px)] overflow-y-auto">
	<!-- Card Image -->
	<div class="flex-shrink-0 mb-4">
		{#if imageUrl}
			<img
				src={imageUrl}
				alt={displayCard?.name || 'Card preview'}
				class="w-full rounded-lg shadow-lg"
			/>
		{:else if displayCard}
			<div class="w-full aspect-[5/7] bg-[var(--color-surface)] rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)]">
				<div class="text-center">
					<div class="text-sm font-medium">{displayCard.name}</div>
					<div class="text-xs mt-1">Image not available</div>
				</div>
			</div>
		{:else}
			<div class="w-full aspect-[5/7] bg-[var(--color-surface)] rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)]">
				<div class="text-center text-sm">No card selected</div>
			</div>
		{/if}
	</div>

	<!-- Card Details -->
	{#if displayCard}
		<div class="mb-4 text-sm">
			<h3 class="font-bold text-[var(--color-text-primary)] mb-2">{displayCard.name}</h3>
			<div class="text-[var(--color-text-secondary)] space-y-1">
				{#if displayCard.manaCost}
					<div><span class="text-[var(--color-text-tertiary)]">Cost:</span> {displayCard.manaCost}</div>
				{/if}
				{#if displayCard.types && displayCard.types.length > 0}
					<div><span class="text-[var(--color-text-tertiary)]">Type:</span> {displayCard.types.join(' ')}</div>
				{/if}
				{#if displayCard.oracleText}
					<div class="pt-2 text-xs border-t border-[var(--color-border)] mt-2">
						{displayCard.oracleText}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Total Deck Price -->
	<div class="mt-auto pt-4 border-t border-[var(--color-border)]">
		<div class="flex justify-between items-center text-sm">
			<span class="text-[var(--color-text-tertiary)]">Total Deck Price:</span>
			<span class="font-bold text-[var(--color-accent-green)]">
				${statistics?.totalPrice?.toFixed(2) || '0.00'}
			</span>
		</div>
	</div>
</aside>
