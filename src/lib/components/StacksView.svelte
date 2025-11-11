<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { CardCategory } from '$lib/types/card';
	import { isGameChanger } from '$lib/utils/game-changers';
	import { isCardBanned } from '$lib/utils/deck-validation';
	import VendorIcon from './VendorIcon.svelte';
	import CornerBadge from './CornerBadge.svelte';

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

	// Get card image URL (prefer normal, fallback to small, then large)
	function getCardImageUrl(card: Card): string {
		return card.imageUrls?.normal || card.imageUrls?.small || card.imageUrls?.large || '';
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
			{@const imageUrl = getCardImageUrl(card)}
			{@const isBanned = isCardBanned(card)}
			{@const isGC = isGameChanger(card.name)}
			{@const stackIndex = cardIndex}
			{@const shouldMoveDown = hoveredStackIndex !== null && stackIndex > hoveredStackIndex}

			<!-- Render one card per unique card (no copies) -->
			<div
				class="stacks-card"
				class:stacks-card-pushed={shouldMoveDown}
				style="--stack-index: {stackIndex}"
				draggable={isEditing && category !== CardCategory.Commander}
				ondragstart={(e) => handleCardDragStart(e, card)}
				ondragend={handleCardDragEnd}
				onmouseenter={() => handleCardMouseEnter(stackIndex, card)}
				onmouseleave={handleCardMouseLeave}
				onclick={() => handleCardClick(card)}
				role="button"
				tabindex="0"
			>
				<!-- Card Image Container -->
				<div class="stacks-card-image-container">
					{#if imageUrl}
						<img
							src={imageUrl}
							alt={card.name}
							class="stacks-card-image {isEditing && category !== CardCategory.Commander ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}"
							loading="lazy"
						/>
					{:else}
						<!-- Fallback if no image -->
						<div class="stacks-card-placeholder">
							<span class="text-xs text-[var(--color-text-tertiary)] text-center p-2">
								{card.name}
							</span>
						</div>
					{/if}

					<!-- Corner Badge: Prioritize Quantity over GC -->
					{#if card.quantity > 1}
						<CornerBadge
							text="{card.quantity}"
							size="normal"
							color="rgb(156, 163, 175)"
							textColor="rgb(31, 41, 55)"
							title="Quantity: {card.quantity}"
						/>
					{:else if isGC}
						<CornerBadge
							text="GC"
							size="normal"
							color="rgb(245, 158, 11)"
							textColor="rgb(120, 53, 15)"
							title="Game Changer - This card affects your deck's bracket level"
						/>
					{/if}

					<!-- Right-side Badges -->
					<div class="stacks-badges">
						<!-- Banned Badge -->
						{#if isBanned}
							<span class="badge badge-banned" title="Banned in Commander">
								<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
									<path
										d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
									/>
									<path
										d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"
									/>
								</svg>
							</span>
						{/if}
					</div>
				</div>

				<!-- Pricing Display - Below Card Image -->
				{#if card.prices && (card.prices.cardkingdom !== undefined || card.prices.tcgplayer !== undefined)}
					<div class="stacks-pricing">
						{#if card.prices.cardkingdom !== undefined}
							<div class="vendor-price">
								<VendorIcon vendor="cardkingdom" size={12} />
								<span>${card.prices.cardkingdom.toFixed(2)}</span>
							</div>
						{/if}
						{#if card.prices.tcgplayer !== undefined}
							<div class="vendor-price">
								<VendorIcon vendor="tcgplayer" size={12} />
								<span>${card.prices.tcgplayer.toFixed(2)}</span>
							</div>
						{/if}
					</div>
				{/if}
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
		margin-bottom: 0.5rem; /* Small gap between stacks in column layout */
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

	.stacks-card-image-container {
		position: relative;
		width: 100%;
		aspect-ratio: 5 / 7;
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.stacks-card-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.stacks-card-placeholder {
		width: 100%;
		height: 100%;
		background: var(--color-surface);
		border: 2px dashed var(--color-border);
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		backdrop-filter: blur(4px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.badge-banned {
		background: rgba(220, 38, 38, 0.9);
		color: white;
		border: 1px solid rgba(220, 38, 38, 1);
	}

	.badge-game-changer {
		background: rgba(245, 158, 11, 0.9);
		color: white;
		border: 1px solid rgba(245, 158, 11, 1);
	}

	.badge-quantity {
		background: rgba(0, 0, 0, 0.85);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
		font-weight: 700;
	}

	.stacks-badges {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-end;
		z-index: 10;
	}

	.stacks-pricing {
		display: flex;
		justify-content: space-around;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.25rem;
		margin-top: 0.125rem;
	}

	.vendor-price {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: white;
	}

	.vendor-price span {
		white-space: nowrap;
	}

	.vendor-price :global(svg) {
		color: white;
	}
</style>
