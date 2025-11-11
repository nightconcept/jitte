<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { CardCategory } from '$lib/types/card';
	import { isGameChanger } from '$lib/utils/game-changers';
	import { isCardBanned } from '$lib/utils/deck-validation';
	import VendorIcon from './VendorIcon.svelte';

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
			{@const imageUrl = getCardImageUrl(card)}
			{@const isBanned = isCardBanned(card)}
			{@const isGC = isGameChanger(card.name)}

			<!-- Render card multiple times if quantity > 1 -->
			{#each Array(card.quantity) as _, index}
				<div
					class="visual-spoiler-card-container group relative"
					draggable={isEditing && category !== CardCategory.Commander}
					ondragstart={(e) => handleCardDragStart(e, card)}
					ondragend={handleCardDragEnd}
					onmouseenter={() => onCardHover?.(card)}
					onmouseleave={() => onCardHover?.(null)}
					onclick={() => handleCardClick(card)}
					role="button"
					tabindex="0"
				>
					{#if imageUrl}
						<img
							src={imageUrl}
							alt={card.name}
							class="visual-spoiler-card-image {isEditing && category !== CardCategory.Commander ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}"
							loading="lazy"
						/>
					{:else}
						<!-- Fallback if no image -->
						<div class="visual-spoiler-card-placeholder">
							<span class="text-xs text-[var(--color-text-tertiary)] text-center p-2">
								{card.name}
							</span>
						</div>
					{/if}

					<!-- Badges Overlay -->
					<div class="absolute top-1 right-1 flex flex-col gap-1 items-end">
						<!-- Banned Badge -->
						{#if isBanned}
							<span
								class="badge badge-banned"
								title="Banned in Commander"
							>
								<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
									<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
									<path d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/>
								</svg>
							</span>
						{/if}

						<!-- Game Changer Badge -->
						{#if isGC}
							<span
								class="badge badge-game-changer"
								title="Game Changer - This card affects your deck's bracket level"
							>
								<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
									<path d="M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm3.854 1.146a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 1 1-.708-.708l1.5-1.5a.5.5 0 0 1 .708 0zm-7.708 0a.5.5 0 0 1 .708 0l1.5 1.5a.5.5 0 1 1-.708.708l-1.5-1.5a.5.5 0 0 1 0-.708zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
								</svg>
								GC
							</span>
						{/if}
					</div>

					<!-- Quantity Badge (if quantity > 1, show on first instance) -->
					{#if card.quantity > 1 && index === 0}
						<div class="absolute bottom-1 left-1">
							<span class="badge badge-quantity">
								×{card.quantity}
							</span>
						</div>
					{/if}

					<!-- Pricing Display (show only once per card, not for each quantity) -->
					{#if index === 0 && card.prices && (card.prices.cardkingdom !== undefined || card.prices.tcgplayer !== undefined)}
						<div class="visual-spoiler-pricing">
							{#if card.prices.cardkingdom !== undefined}
								<div class="vendor-price">
									<VendorIcon vendor="cardkingdom" size={11} />
									<span>${card.prices.cardkingdom.toFixed(2)}</span>
								</div>
							{/if}
							{#if card.prices.tcgplayer !== undefined}
								<div class="vendor-price">
									<VendorIcon vendor="tcgplayer" size={11} />
									<span>${card.prices.tcgplayer.toFixed(2)}</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
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

	.visual-spoiler-card-container {
		position: relative;
		aspect-ratio: 5 / 7;
		overflow: hidden;
		border-radius: 0.5rem;
	}

	.visual-spoiler-card-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 0.5rem;
	}

	.visual-spoiler-card-placeholder {
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

	.visual-spoiler-pricing {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-around;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(4px);
		border-bottom-left-radius: 0.5rem;
		border-bottom-right-radius: 0.5rem;
		z-index: 5;
	}

	.vendor-price {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.625rem;
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
