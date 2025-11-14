<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { deckStore } from '$lib/stores/deck-store';
	import VendorIcon from './VendorIcon.svelte';
	import GameChangerBadge from './GameChangerBadge.svelte';
	import { isGameChanger } from '$lib/utils/game-changers';

	let {
		hoveredCard = null,
		showPricing = true,
		className = ''
	}: {
		hoveredCard: Card | null;
		showPricing?: boolean;
		className?: string;
	} = $props();

	// Store subscription using Svelte 5 runes pattern
	let deckStoreState = $state($deckStore);

	$effect(() => {
		const unsubscribe = deckStore.subscribe(value => {
			deckStoreState = value;
		});
		return unsubscribe;
	});

	// Derived values
	let deck = $derived(deckStoreState?.deck);
	let commander = $derived(deck?.cards.commander?.[0]);

	// Use hovered card if available, otherwise default to commander
	let displayCard = $derived(hoveredCard || commander);

	// Track which face is currently displayed (0 = front, 1 = back)
	let currentFaceIndex = $state(0);

	// Check if card has multiple faces
	let isDoubleFaced = $derived(
		displayCard?.cardFaces && displayCard.cardFaces.length > 1
	);

	// Debug logging for double-faced cards
	$effect(() => {
		if (displayCard) {
			if (displayCard.layout && (displayCard.layout === 'modal_dfc' || displayCard.layout === 'transform')) {
				console.log('[CardPreview] Double-faced card detected:', {
					name: displayCard.name,
					layout: displayCard.layout,
					hasCardFaces: !!displayCard.cardFaces,
					cardFacesCount: displayCard.cardFaces?.length || 0,
					isDoubleFaced,
					willShowFlipButton: isDoubleFaced
				});

				if (!displayCard.cardFaces || displayCard.cardFaces.length < 2) {
					console.warn('[CardPreview] ⚠️ MISSING DATA: This card needs cardFaces data. Re-add from search to enable flip functionality.');
				}
			}
		}
	});

	// Get image URL based on current face
	let imageUrl = $derived.by(() => {
		if (!displayCard) return null;

		// If card has card faces, use the current face's image
		if (isDoubleFaced && displayCard.cardFaces) {
			const face = displayCard.cardFaces[currentFaceIndex];
			return face?.imageUrls?.normal || face?.imageUrls?.large;
		}

		// Otherwise use the card's main image URLs
		return displayCard.imageUrls?.normal || displayCard.imageUrls?.large;
	});

	// Reset to front face when card changes
	$effect(() => {
		if (displayCard) {
			currentFaceIndex = 0;
		}
	});

	function toggleFace() {
		if (isDoubleFaced) {
			// Toggle between front (0) and back (1) face
			currentFaceIndex = currentFaceIndex === 0 ? 1 : 0;
		}
	}
</script>

<aside class="{className || 'w-80 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] p-4 flex flex-col sticky top-[64px] self-start h-[calc(100vh-64px)]'}">
	<!-- Card Image -->
	<div class="flex-shrink-0 mb-2 perspective-container">
		<div class="flip-card" class:is-flipped={currentFaceIndex === 1}>
			<!-- Front Face -->
			<div class="card-face card-face--front">
				{#if isDoubleFaced && displayCard?.cardFaces?.[0]?.imageUrls}
					<div class="relative overflow-hidden rounded-lg">
						<img
							src={displayCard.cardFaces[0].imageUrls.normal || displayCard.cardFaces[0].imageUrls.large}
							alt={displayCard.cardFaces[0].name || displayCard?.name || 'Card front'}
							class="w-full rounded-lg shadow-lg"
						/>
						{#if displayCard && isGameChanger(displayCard.name)}
							<GameChangerBadge position="left" />
						{/if}
					</div>
				{:else if imageUrl}
					<div class="relative overflow-hidden rounded-lg">
						<img
							src={imageUrl}
							alt={displayCard?.name || 'Card preview'}
							class="w-full rounded-lg shadow-lg"
						/>
						{#if displayCard && isGameChanger(displayCard.name)}
							<GameChangerBadge position="left" />
						{/if}
					</div>
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

			<!-- Back Face -->
			<div class="card-face card-face--back">
				{#if isDoubleFaced && displayCard?.cardFaces?.[1]?.imageUrls}
					<div class="relative overflow-hidden rounded-lg">
						<img
							src={displayCard.cardFaces[1].imageUrls.normal || displayCard.cardFaces[1].imageUrls.large}
							alt={displayCard.cardFaces[1].name || 'Card back'}
							class="w-full rounded-lg shadow-lg"
						/>
						{#if displayCard && isGameChanger(displayCard.name)}
							<GameChangerBadge position="left" />
						{/if}
					</div>
				{:else}
					<div class="w-full aspect-[5/7] bg-[var(--color-surface)] rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)]">
						<div class="text-center text-sm">No back face</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Flip button for double-faced cards -->
	{#if isDoubleFaced}
		<button
			type="button"
			onclick={toggleFace}
			class="w-full mb-4 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded py-2 px-3 transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium"
			aria-label="Flip to {currentFaceIndex === 0 ? 'back' : 'front'} face"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M17 3l4 4-4 4" />
				<path d="M3 11v-1a4 4 0 0 1 4-4h14" />
				<path d="M7 21l-4-4 4-4" />
				<path d="M21 13v1a4 4 0 0 1-4 4H3" />
			</svg>
			<span>Turn Over</span>
		</button>
	{/if}

	<!-- Vendor Pricing (Non-Foil) -->
	{#if showPricing && displayCard?.prices}
		<div class="pt-4 border-t border-[var(--color-border)]">
			<div class="text-xs font-semibold text-[var(--color-text-primary)] mb-3">Prices</div>
			<div class="space-y-2">
				{#if displayCard.prices.cardkingdom !== undefined}
					<div class="flex items-center justify-between text-sm">
						<div class="flex items-center gap-2">
							<VendorIcon vendor="cardkingdom" size={14} />
							<span class="text-[var(--color-text-primary)]">Card Kingdom</span>
						</div>
						<span class="font-medium text-[var(--color-accent-green)]">
							${displayCard.prices.cardkingdom.toFixed(2)}
						</span>
					</div>
				{/if}
				{#if displayCard.prices.tcgplayer !== undefined}
					<div class="flex items-center justify-between text-sm">
						<div class="flex items-center gap-2">
							<VendorIcon vendor="tcgplayer" size={15} />
							<span class="text-[var(--color-text-primary)]">TCGplayer</span>
						</div>
						<span class="font-medium text-[var(--color-accent-green)]">
							${displayCard.prices.tcgplayer.toFixed(2)}
						</span>
					</div>
				{/if}
				{#if displayCard.prices.manapool !== undefined}
					<div class="flex items-center justify-between text-sm">
						<div class="flex items-center gap-2">
							<VendorIcon vendor="manapool" size={15} />
							<span class="text-[var(--color-text-primary)]">Mana Pool</span>
						</div>
						<span class="font-medium text-[var(--color-accent-green)]">
							${displayCard.prices.manapool.toFixed(2)}
						</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</aside>

<style>
	.perspective-container {
		perspective: 1000px;
		width: 100%;
	}

	.flip-card {
		width: 100%;
		transform-style: preserve-3d;
		transition: transform 0.4s ease-in-out;
		position: relative;
		/* Maintain aspect ratio even with absolute children */
		aspect-ratio: 5 / 7;
	}

	.flip-card.is-flipped {
		transform: rotateY(180deg);
	}

	.card-face {
		width: 100%;
		height: 100%;
		backface-visibility: hidden;
		position: absolute;
		top: 0;
		left: 0;
	}

	/* Front face is at 0 degrees - no rotation needed */

	.card-face--back {
		/* Back face is pre-rotated 180 degrees */
		transform: rotateY(180deg);
	}
</style>
