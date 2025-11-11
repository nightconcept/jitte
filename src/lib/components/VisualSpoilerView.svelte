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
</script>

<div class="mb-6">
	<!-- Category Header -->
	<div class="flex items-center gap-3 mb-3">
		{#if categoryIcon}
			<i class="ms {categoryIcon} text-xl text-[var(--color-text-primary)]"></i>
		{/if}
		<h3 class="text-lg font-bold text-[var(--color-brand-primary)]">
			{categoryLabel}
		</h3>
		<span class="text-sm text-[var(--color-text-tertiary)]">
			({cards.reduce((sum, card) => sum + card.quantity, 0)})
		</span>
	</div>

	<!-- Card Grid -->
	<div class="visual-spoiler-grid">
		{#each cards as card}
			<CardDisplay
				{card}
				{category}
				{isEditing}
				pricingPosition="below"
				pricingSize="sm"
				badgeSize="normal"
				onClick={handleCardClick}
				onHover={(c) => onCardHover?.(c)}
				onDragStart={handleCardDragStart}
				onDragEnd={handleCardDragEnd}
			/>
		{/each}
	</div>
</div>

<style>
	.visual-spoiler-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.75rem;
	}

	@media (min-width: 640px) {
		.visual-spoiler-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.visual-spoiler-grid {
			grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
			gap: 1rem;
		}
	}

	@media (min-width: 1536px) {
		.visual-spoiler-grid {
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		}
	}
</style>
