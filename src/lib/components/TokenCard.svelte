<script lang="ts">
	import type { Card } from '$lib/types/card';
	import type { TokenInfo } from '$lib/utils/token-detector';
	import CardDetailModal from './CardDetailModal.svelte';

	let {
		tokenInfo,
		onCardHover = undefined
	}: {
		tokenInfo: TokenInfo;
		onCardHover?: ((card: Card | null) => void) | undefined;
	} = $props();

	let { token, createdBy, suggestedQuantity } = $derived(tokenInfo);

	let detailModalCard = $state<Card | null>(null);
</script>

<div
	class="relative flex items-center justify-between hover:bg-gray-800/30 rounded transition-colors py-1.5 px-2 cursor-pointer"
	onmouseenter={() => onCardHover?.(token)}
	onclick={() => { detailModalCard = token; }}
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detailModalCard = token; } }}
	role="button"
	tabindex="0"
>
	<div class="flex items-center gap-2 flex-1 min-w-0">
		<!-- Token Name -->
		<span class="text-gray-300 text-sm truncate">
			{token.name}
		</span>

		<!-- Power/Toughness for creature tokens -->
		{#if token.cardFaces && token.cardFaces.length > 0 && token.cardFaces[0].power && token.cardFaces[0].toughness}
			<span class="text-gray-500 text-xs flex-shrink-0">
				({token.cardFaces[0].power}/{token.cardFaces[0].toughness})
			</span>
		{/if}
	</div>

	<!-- Created by info (tooltip on hover) -->
	<div class="flex-shrink-0 text-xs text-gray-500" title={`Created by: ${createdBy.join(', ')}`}>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	</div>
</div>

<!-- Card Detail Modal -->
{#if detailModalCard}
	<CardDetailModal
		card={detailModalCard}
		isOpen={detailModalCard !== null}
		onClose={() => detailModalCard = null}
	/>
{/if}
