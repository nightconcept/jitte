<script lang="ts">
	import type { Deck } from '$lib/types/deck';
	import { isGameChanger, getBracketDescription, type BracketLevel } from '$lib/utils/game-changers';

	export let deck: Deck;
	export let bracketLevel: BracketLevel;
	export let gameChangers: string[];

	let isVisible = false;
</script>

<div
	class="relative inline-flex"
	on:mouseenter={() => {
		console.log('Bracket tooltip mouseenter');
		isVisible = true;
	}}
	on:mouseleave={() => {
		console.log('Bracket tooltip mouseleave');
		isVisible = false;
	}}
	role="tooltip"
>
	<!-- Trigger content (slot) -->
	<slot />

	<!-- Tooltip content -->
	{#if isVisible}
		<!-- Debug: tooltip is visible -->
		<div class="fixed top-2 right-2 bg-red-500 text-white p-2 text-xs z-[9999]">
			Tooltip Active! isVisible={isVisible}
		</div>
		<div
			class="absolute z-[100] px-4 py-3 text-sm bg-gray-900 text-white border border-gray-700 rounded-lg shadow-xl pointer-events-none top-full left-1/2 -translate-x-1/2 mt-2 min-w-[280px] max-w-[400px]"
		>
			<!-- Bracket Description -->
			<div class="mb-2 pb-2 border-b border-gray-700">
				<div class="font-semibold text-white mb-1">
					Bracket {bracketLevel}
				</div>
				<div class="text-xs text-gray-300">
					{getBracketDescription(bracketLevel)}
				</div>
			</div>

			<!-- Game Changers List -->
			{#if gameChangers.length > 0}
				<div class="mb-2">
					<div class="font-semibold text-amber-500 mb-1 text-xs flex items-center gap-1">
						<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
							<path d="M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm3.854 1.146a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 1 1-.708-.708l1.5-1.5a.5.5 0 0 1 .708 0zm-7.708 0a.5.5 0 0 1 .708 0l1.5 1.5a.5.5 0 1 1-.708.708l-1.5-1.5a.5.5 0 0 1 0-.708zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
						</svg>
						Game Changers ({gameChangers.length})
					</div>
					<div class="space-y-0.5 max-h-40 overflow-y-auto text-white">
						{#each gameChangers as card}
							<div class="text-xs pl-2">• {card}</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="text-xs text-gray-400">
					No Game Changers detected
				</div>
			{/if}

			<!-- Criteria Info -->
			<div class="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
				{#if bracketLevel === 1}
					<div class="text-green-400">✓ No Game Changers</div>
					<div class="text-green-400">✓ No 2-card infinite combos</div>
					<div class="text-green-400">✓ No extra turn cards</div>
					<div class="text-green-400">✓ No mass land destruction</div>
				{:else if bracketLevel === 2}
					<div class="text-green-400">✓ No Game Changers</div>
					<div class="text-gray-300">Precon-level power</div>
				{:else if bracketLevel === 3}
					<div class="text-amber-400">! 1-3 Game Changers</div>
					<div class="text-gray-300">Upgraded deck</div>
				{:else if bracketLevel === 4}
					<div class="text-orange-400">! 4+ Game Changers</div>
					<div class="text-gray-300">Highly tuned</div>
				{:else if bracketLevel === 5}
					<div class="text-red-400">! Competitive EDH</div>
					<div class="text-gray-300">No restrictions</div>
				{/if}
			</div>

			<!-- Arrow -->
			<div
				class="absolute w-0 h-0 border-4 border-transparent border-b-gray-900 bottom-full left-1/2 -translate-x-1/2"
			></div>
		</div>
	{/if}
</div>
