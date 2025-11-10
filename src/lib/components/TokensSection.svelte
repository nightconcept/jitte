<script lang="ts">
	import type { Card } from '$lib/types/card';
	import type { TokenInfo } from '$lib/utils/token-detector';
	import TokenCard from './TokenCard.svelte';

	let {
		tokens,
		onCardHover = undefined
	}: {
		tokens: TokenInfo[];
		onCardHover?: ((card: Card | null) => void) | undefined;
	} = $props();

	// Collapsed by default
	let expanded = $state(false);

	// Get total count of tokens
	let tokenCount = $derived(tokens.length);
	let totalQuantity = $derived(
		tokens.reduce((sum, t) => sum + t.suggestedQuantity, 0)
	);
</script>

{#if tokens.length > 0}
	<div class="tokens-section border-t-2 border-dashed border-gray-600 mt-6">
		<!-- Header (clickable to expand/collapse) -->
		<button
			class="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800/50 transition-colors rounded"
			onclick={() => expanded = !expanded}
		>
			<div class="flex items-center gap-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 text-gray-500 transition-transform {expanded ? '' : '-rotate-90'}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>

				<!-- Sparkles icon to indicate tokens/extras -->
				<svg class="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 16 16">
					<path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828l.645-1.937zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.734 1.734 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.734 1.734 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.734 1.734 0 0 0 3.407 2.31l.387-1.162zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L10.863.1z"/>
				</svg>

				<span class="font-semibold text-gray-400 uppercase tracking-wide text-sm">
					Tokens & Extras
				</span>

				<span class="text-sm text-gray-500">
					({tokenCount} type{tokenCount !== 1 ? 's' : ''}, ~{totalQuantity} total)
				</span>
			</div>

			<!-- Info tooltip -->
			<span class="text-xs text-gray-500" title="Tokens created by cards in your deck">
				Auto-detected
			</span>
		</button>

		<!-- Token List -->
		{#if expanded}
			<div class="token-list pl-4 pr-2 pb-2 bg-gray-900/30 rounded-b">
				<div class="responsive-card-grid">
					{#each tokens as tokenInfo}
						<TokenCard {tokenInfo} {onCardHover} />
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.tokens-section {
		opacity: 0.85;
		transition: opacity 0.2s;
	}

	.tokens-section:hover {
		opacity: 1;
	}

	.responsive-card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		column-gap: 1rem;
		margin-top: 0.5rem;
	}

	/* At larger screens (1920px), aim for approximately 4 columns */
	@media (min-width: 1536px) {
		.responsive-card-grid {
			grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		}
	}

	/* At smaller screens, allow fewer columns */
	@media (max-width: 1024px) {
		.responsive-card-grid {
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		}
	}

	@media (max-width: 768px) {
		.responsive-card-grid {
			grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		}
	}
</style>
