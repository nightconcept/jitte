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
	import { cardService } from '$lib/api/card-service';
	import { deckStore } from '$lib/stores/deck-store';

	let {
		card,
		category,
		isEditing = false,
		showPricing = true,
		pricingPosition = 'overlay',
		pricingSize = 'xs',
		badgeSize = 'normal',
		showFlipButtonOnHover = false,
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
		showFlipButtonOnHover?: boolean;
		onClick?: (card: Card) => void;
		onHover?: (card: Card | null) => void;
		onDragStart?: (event: DragEvent, card: Card, category: CardCategory) => void;
		onDragEnd?: () => void;
		class?: string;
		style?: string;
	} = $props();

	// Track which face is currently displayed (0 = front, 1 = back)
	let currentFaceIndex = $state(0);

	// Track if we've already enriched this card (by name+category)
	const enrichedCardsCache = new Set<string>();

	// Enrich card with Scryfall data if it's a double-faced card missing cardFaces or missing back face images
	$effect(() => {
		const cacheKey = `${card.name}|${category}`;
		const isMissingCardFaces = !card.cardFaces || card.cardFaces.length < 2;
		const isMissingBackFaceImages = card.cardFaces &&
			card.cardFaces.length >= 2 &&
			card.cardFaces[1] &&
			(!card.cardFaces[1].imageUrls ||
			 (!card.cardFaces[1].imageUrls.normal &&
			  !card.cardFaces[1].imageUrls.large &&
			  !card.cardFaces[1].imageUrls.small));

		const needsEnrichment = card &&
			card.layout &&
			(card.layout === 'modal_dfc' || card.layout === 'transform') &&
			(isMissingCardFaces || isMissingBackFaceImages) &&
			!enrichedCardsCache.has(cacheKey);

		if (needsEnrichment) {
			enrichedCardsCache.add(cacheKey);

			cardService.getCardByName(card.name).then(scryfallCard => {
				if (scryfallCard && scryfallCard.card_faces && scryfallCard.card_faces.length > 1) {
					const cardFaces = scryfallCard.card_faces.map(face => ({
						name: face.name,
						manaCost: face.mana_cost,
						typeLine: face.type_line,
						oracleText: face.oracle_text,
						imageUrls: {
							small: face.image_uris?.small,
							normal: face.image_uris?.normal,
							large: face.image_uris?.large,
							png: face.image_uris?.png,
							artCrop: face.image_uris?.art_crop,
							borderCrop: face.image_uris?.border_crop
						},
						colors: face.colors,
						power: face.power,
						toughness: face.toughness,
						loyalty: face.loyalty
					}));

					// Update the card in the deck store with the enriched data
					deckStore.enrichCard(card.name, category, { cardFaces });
				}
			}).catch(error => {
				console.error('[CardDisplay] Error enriching card:', card.name, error);
			});
		}
	});

	// Check if card has multiple faces
	const isDoubleFaced = $derived(
		card?.cardFaces && card.cardFaces.length > 1
	);

	// Get card image URL based on current face
	function getCardImageUrl(c: Card): string {
		// If card has card faces, use the current face's image
		if (isDoubleFaced && c.cardFaces) {
			const face = c.cardFaces[currentFaceIndex];
			return face?.imageUrls?.normal || face?.imageUrls?.large || face?.imageUrls?.small || '';
		}

		// Otherwise use the card's main image URLs
		return c.imageUrls?.normal || c.imageUrls?.small || c.imageUrls?.large || '';
	}

	const imageUrl = $derived(getCardImageUrl(card));
	const isBanned = $derived(isCardBanned(card));
	const isGC = $derived(isGameChanger(card.name));
	const isDraggable = $derived(isEditing && category !== CardCategory.Commander);

	// Reset to front face when card changes
	$effect(() => {
		if (card) {
			currentFaceIndex = 0;
		}
	});

	function toggleFace(event: MouseEvent) {
		// Stop propagation to prevent triggering card click
		event.stopPropagation();
		if (isDoubleFaced) {
			currentFaceIndex = currentFaceIndex === 0 ? 1 : 0;
		}
	}

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
	<div class="card-image-container perspective-container">
		<div class="flip-card" class:is-flipped={currentFaceIndex === 1}>
			<!-- Front Face -->
			<div class="card-face card-face--front">
				{#if isDoubleFaced && card.cardFaces?.[0]?.imageUrls}
					<img
						src={card.cardFaces[0].imageUrls.normal || card.cardFaces[0].imageUrls.large || card.cardFaces[0].imageUrls.small || ''}
						alt={card.cardFaces[0].name || card.name}
						class="card-image {isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}"
						loading="lazy"
					/>
				{:else if imageUrl}
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
			</div>

			<!-- Back Face -->
			<div class="card-face card-face--back">
				{#if isDoubleFaced && card.cardFaces?.[1]?.imageUrls}
					<img
						src={card.cardFaces[1].imageUrls.normal || card.cardFaces[1].imageUrls.large || card.cardFaces[1].imageUrls.small || ''}
						alt={card.cardFaces[1].name || 'Card back'}
						class="card-image {isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}"
						loading="lazy"
					/>
				{:else}
					<div class="card-placeholder">
						<span class="text-xs text-[var(--color-text-tertiary)] text-center p-2">
							No back face
						</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Flip Button - Outside flip-card container to avoid duplication -->
		{#if isDoubleFaced}
			<button
				type="button"
				onclick={toggleFace}
				class="flip-button"
				class:flip-button-hover-only={showFlipButtonOnHover}
				aria-label="Flip to {currentFaceIndex === 0 ? 'back' : 'front'} face"
				title="Flip card"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M17 3l4 4-4 4" />
					<path d="M3 11v-1a4 4 0 0 1 4-4h14" />
					<path d="M7 21l-4-4 4-4" />
					<path d="M21 13v1a4 4 0 0 1-4 4H3" />
				</svg>
			</button>
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
		overflow: visible; /* Changed from hidden to allow flip button to be visible */
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	/* 3D Flip Animation Styles */
	.perspective-container {
		perspective: 1000px;
	}

	.flip-card {
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		transition: transform 0.4s ease-in-out;
		position: relative;
	}

	.flip-card.is-flipped {
		transform: rotateY(180deg);
	}

	.card-face {
		width: 100%;
		height: 100%;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		position: absolute;
		top: 0;
		left: 0;
	}

	.card-face--front {
		/* Front face is at 0 degrees */
	}

	.card-face--back {
		/* Back face is pre-rotated 180 degrees */
		transform: rotateY(180deg);
	}

	.card-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 0.5rem;
	}

	/* Flip Button - positioned on the card face, top-left below title */
	.flip-button {
		position: absolute;
		top: 3.5rem; /* Below the card title area (~15% from top for standard MTG card) */
		left: 0.5rem;
		z-index: 15;
		background: rgba(0, 0, 0, 0.9);
		backdrop-filter: blur(8px);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 0.5rem;
		padding: 0.375rem 0.625rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		transition: all 0.2s ease;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	}

	.flip-button:hover {
		background: rgba(0, 0, 0, 1);
		border-color: rgba(255, 255, 255, 0.5);
		transform: scale(1.1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
	}

	.flip-button:active {
		transform: scale(0.95);
	}

	.flip-button svg {
		color: white;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
	}

	/* Hide flip button by default when hover-only mode is enabled */
	.flip-button-hover-only {
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s ease;
	}

	/* Show flip button on hover when hover-only mode is enabled */
	.card-display-container:hover .flip-button-hover-only {
		opacity: 1;
		pointer-events: auto;
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
