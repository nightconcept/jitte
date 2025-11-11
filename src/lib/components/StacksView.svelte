<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { CardCategory } from '$lib/types/card';
	import CardDisplay from './CardDisplay.svelte';

	let {
		cards,
		category,
		categoryLabel,
		categoryIcon,
		isEditing = false,
		onCardClick = undefined,
		onCardHover = undefined,
		onDragStart = undefined,
		onDragEnd = undefined
	}: {
		cards: Card[];
		category: CardCategory;
		categoryLabel: string;
		categoryIcon: string;
		isEditing?: boolean;
		onCardClick?: (card: Card) => void;
		onCardHover?: (card: Card | null) => void;
		onDragStart?: (event: DragEvent, card: Card, category: CardCategory) => void;
		onDragEnd?: () => void;
	} = $props();

	function handleCardClick(card: Card) {
		onCardClick?.(card);
	}

	function handleCardDragStart(event: DragEvent, card: Card) {
		if (!isEditing || category === CardCategory.Commander) return;
		onDragStart?.(event, card, category);
	}

	function handleCardDragEnd() {
		onDragEnd?.();
	}

	// Calculate total quantity for this category
	const totalQuantity = $derived(cards.reduce((sum, card) => sum + card.quantity, 0));

	// Calculate minimum height needed for the stack based on number of cards
	// Each card adds 38px offset (increased for readability), plus the base card height
	// Card width is ~200px at 1024px+, which gives ~280px height (5:7 aspect ratio)
	// Add 30px for pricing display + 30px buffer to show hovered card pricing fully
	// while heavily clipping pushed-down cards (minimal visibility)
	// Now showing one card per unique card instead of multiple copies
	const stackHeight = $derived(cards.length * 38 + 280 + 30 + 30);

	// Track which card is being hovered (by stack index)
	let hoveredStackIndex = $state<number | null>(null);

	function handleCardMouseEnter(stackIndex: number, card: Card) {
		hoveredStackIndex = stackIndex;
		onCardHover?.(card);
	}

	function handleCardMouseLeave() {
		hoveredStackIndex = null;
		onCardHover?.(null);
	}
</script>

<div class="stacks-category">
	<!-- Category Header -->
	<div class="stacks-category-header">
		{#if categoryIcon}
			<i class="ms {categoryIcon} text-xl text-[var(--color-text-primary)]"></i>
		{/if}
		<h3 class="text-base font-bold text-[var(--color-brand-primary)]">
			{categoryLabel}
		</h3>
		<span class="text-xs text-[var(--color-text-tertiary)]">
			({totalQuantity})
		</span>
	</div>

	<!-- Card Stack -->
	<div class="stacks-container" style="min-height: {stackHeight}px;">
		{#each cards as card, cardIndex}
			{@const stackIndex = cardIndex}
			{@const shouldMoveDown = hoveredStackIndex !== null && stackIndex > hoveredStackIndex}

			<!-- Render one card per unique card (no copies) -->
			<div
				class="stacks-card"
				class:stacks-card-pushed={shouldMoveDown}
				style="--stack-index: {stackIndex}"
			>
				<CardDisplay
					{card}
					{category}
					{isEditing}
					pricingPosition="below"
					pricingSize="sm"
					badgeSize="normal"
					onClick={handleCardClick}
					onHover={(c) => c ? handleCardMouseEnter(stackIndex, c) : handleCardMouseLeave()}
					onDragStart={handleCardDragStart}
					onDragEnd={handleCardDragEnd}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	.stacks-category {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		break-inside: avoid;
		page-break-inside: avoid; /* Older browser support */
		margin-bottom: 0.125rem; /* Small gap between stacks in column layout */
	}

	.stacks-category-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: var(--color-surface);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}

	.stacks-container {
		position: relative;
		overflow: hidden;
	}

	.stacks-card {
		position: absolute;
		top: calc(var(--stack-index) * 38px);
		left: 0;
		width: 100%;
		transition: top 0.25s ease;
		z-index: var(--stack-index);
	}

	/* Cards above the hovered card move down to fully reveal it including pricing */
	.stacks-card-pushed {
		top: calc(var(--stack-index) * 38px + 340px);
		transition: top 0.35s ease 0.05s;
	}
</style>
