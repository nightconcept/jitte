<script lang="ts">
	/**
	 * Unified card display component for Visual Stack and Visual Spoiler views
	 * Displays card image with badges, pricing, and interaction handlers
	 */
	import type { Card } from '$lib/types/card';
	import { CardCategory } from '$lib/types/card';
	import { isGameChanger } from '$lib/utils/game-changers';
	import { isCardBanned } from '$lib/utils/deck-validation';
	import VendorIcon from './VendorIcon.svelte';
	import CornerBadge from './CornerBadge.svelte';

	let {
		card,
		category,
		isEditing = false,
		showPricing = true,
		pricingPosition = 'overlay',
		pricingSize = 'xs',
		badgeSize = 'normal',
		onClick = undefined,
		onHover = undefined,
		onDragStart = undefined,
		onDragEnd = undefined,
		class: className = '',
		style = ''
	}: {
		card: Card;
		category: CardCategory;
		isEditing?: boolean;
		showPricing?: boolean;
		pricingPosition?: 'below' | 'overlay';
		pricingSize?: 'sm' | 'xs';
		badgeSize?: 'small' | 'normal' | 'large';
		onClick?: (card: Card) => void;
		onHover?: (card: Card | null) => void;
		onDragStart?: (event: DragEvent, card: Card, category: CardCategory) => void;
		onDragEnd?: () => void;
		class?: string;
		style?: string;
	} = $props();

	// Get card image URL (prefer normal, fallback to small, then large)
	function getCardImageUrl(card: Card): string {
		return card.imageUrls?.normal || card.imageUrls?.small || card.imageUrls?.large || '';
	}

	const imageUrl = $derived(getCardImageUrl(card));
	const isBanned = $derived(isCardBanned(card));
	const isGC = $derived(isGameChanger(card.name));
	const isDraggable = $derived(isEditing && category !== CardCategory.Commander);

	function handleDragStart(event: DragEvent) {
		if (!isDraggable) return;
		onDragStart?.(event, card, category);
	}

	function handleDragEnd() {
		onDragEnd?.();
	}

	function handleClick() {
		onClick?.(card);
	}

	function handleMouseEnter() {
		onHover?.(card);
	}

	function handleMouseLeave() {
		onHover?.(null);
	}

	// Pricing CSS class based on size
	const pricingFontClass = $derived(pricingSize === 'sm' ? 'text-xs' : 'text-[0.625rem]');
</script>

<div
	class="card-display-container {className}"
	{style}
	draggable={isDraggable}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onclick={handleClick}
	role="button"
	tabindex="0"
>
	<!-- Card Image Container -->
	<div class="card-image-container">
		{#if imageUrl}
			<img
				src={imageUrl}
				alt={card.name}
				class="card-image {isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}"
				loading="lazy"
			/>
		{:else}
			<!-- Fallback if no image -->
			<div class="card-placeholder">
				<span class="text-xs text-[var(--color-text-tertiary)] text-center p-2">
					{card.name}
				</span>
			</div>
		{/if}

		<!-- Corner Badge: Prioritize Quantity over GC -->
		{#if card.quantity > 1}
			<CornerBadge
				text={String(card.quantity)}
				size={badgeSize}
				color="rgb(156, 163, 175)"
				textColor="rgb(31, 41, 55)"
				title="Quantity: {card.quantity}"
			/>
		{:else if isGC}
			<CornerBadge
				text="GC"
				size={badgeSize}
				color="rgb(245, 158, 11)"
				textColor="rgb(120, 53, 15)"
				title="Game Changer - This card affects your deck's bracket level"
			/>
		{/if}

		<!-- Right-side Badges -->
		<div class="right-badges">
			<!-- Banned Badge -->
			{#if isBanned}
				<span class="badge badge-banned" title="Banned in Commander">
					<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
						<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
						<path
							d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"
						/>
					</svg>
				</span>
			{/if}
		</div>

		<!-- Pricing Display - Overlay (for grid view) -->
		{#if showPricing && pricingPosition === 'overlay' && card.prices && (card.prices.cardkingdom !== undefined || card.prices.tcgplayer !== undefined)}
			<div class="pricing-overlay">
				{#if card.prices.cardkingdom !== undefined}
					<div class="vendor-price {pricingFontClass}">
						<VendorIcon vendor="cardkingdom" size={11} />
						<span>${card.prices.cardkingdom.toFixed(2)}</span>
					</div>
				{/if}
				{#if card.prices.tcgplayer !== undefined}
					<div class="vendor-price {pricingFontClass}">
						<VendorIcon vendor="tcgplayer" size={11} />
						<span>${card.prices.tcgplayer.toFixed(2)}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Pricing Display - Below (for stacks view) -->
	{#if showPricing && pricingPosition === 'below' && card.prices && (card.prices.cardkingdom !== undefined || card.prices.tcgplayer !== undefined)}
		<div class="pricing-below">
			{#if card.prices.cardkingdom !== undefined}
				<div class="vendor-price {pricingFontClass}">
					<VendorIcon vendor="cardkingdom" size={12} />
					<span>${card.prices.cardkingdom.toFixed(2)}</span>
				</div>
			{/if}
			{#if card.prices.tcgplayer !== undefined}
				<div class="vendor-price {pricingFontClass}">
					<VendorIcon vendor="tcgplayer" size={12} />
					<span>${card.prices.tcgplayer.toFixed(2)}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.card-display-container {
		position: relative;
	}

	.card-image-container {
		position: relative;
		width: 100%;
		aspect-ratio: 5 / 7;
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.card-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 0.5rem;
	}

	.card-placeholder {
		width: 100%;
		height: 100%;
		background: var(--color-surface);
		border: 2px dashed var(--color-border);
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.right-badges {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-end;
		z-index: 10;
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

	/* Pricing - Overlay positioning (for grid view) */
	.pricing-overlay {
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

	/* Pricing - Below positioning (for stacks view) */
	.pricing-below {
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
		font-weight: 700;
		color: white;
		white-space: nowrap;
	}

	.vendor-price :global(svg) {
		color: white;
	}
</style>
