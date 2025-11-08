<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { deckStore } from '$lib/stores/deck-store';
	import VendorIcon from './VendorIcon.svelte';

	export let hoveredCard: Card | null = null;

	$: deck = $deckStore?.deck;
	$: commander = deck?.cards.commander?.[0];

	// Use hovered card if available, otherwise default to commander
	$: displayCard = hoveredCard || commander;
	$: imageUrl = displayCard?.imageUrls?.normal || displayCard?.imageUrls?.large;
</script>

<aside class="w-80 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] p-4 flex flex-col sticky top-[121px] self-start h-[calc(100vh-121px)]">
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

	<!-- Vendor Pricing (Non-Foil) -->
	{#if displayCard?.prices}
		<div class="pt-4 border-t border-[var(--color-border)]">
			<div class="text-xs font-semibold text-[var(--color-text-primary)] mb-3">Non-Foil Prices</div>
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
