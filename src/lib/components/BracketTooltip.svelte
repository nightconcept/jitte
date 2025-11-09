<script lang="ts">
	import type { Deck } from '$lib/types/deck';
	import { isGameChanger, getBracketDescription, type BracketLevel } from '$lib/utils/game-changers';

	let { deck, bracketLevel, gameChangers }: {
		deck: Deck;
		bracketLevel: BracketLevel;
		gameChangers: string[];
	} = $props();

	let isVisible = $state(false);
	let triggerElement = $state<HTMLDivElement | null>(null);
	let tooltipPosition = $state({ top: 0, left: 0 });
	let hideTimeout: number | null = null;

	function updatePosition() {
		if (triggerElement) {
			const rect = triggerElement.getBoundingClientRect();
			tooltipPosition = {
				top: rect.bottom + 8, // 8px below the trigger
				left: rect.left + rect.width / 2 // centered horizontally
			};
		}
	}

	function handleMouseEnter() {
		// Clear any pending hide timeout
		if (hideTimeout !== null) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}
		isVisible = true;
		updatePosition();
	}

	function handleMouseLeave() {
		// Delay hiding by 300ms
		hideTimeout = window.setTimeout(() => {
			isVisible = false;
			hideTimeout = null;
		}, 300);
	}
</script>

<div
	bind:this={triggerElement}
	class="relative inline-flex"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="tooltip"
>
	<!-- Trigger content (slot) -->
	<slot />

	<!-- Tooltip content -->
	{#if isVisible}
		<!-- Invisible padding area for easier hover -->
		<div
			class="fixed z-[9999]"
			style="top: {tooltipPosition.top - 16}px; left: {tooltipPosition.left}px; transform: translateX(-50%); padding: 16px;"
			onmouseenter={handleMouseEnter}
			onmouseleave={handleMouseLeave}
		>
			<div
				class="px-4 py-3 text-sm bg-gray-900 text-white border border-gray-700 rounded-lg shadow-xl min-w-[280px] max-w-[400px]"
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
			<div class="mt-2 pt-2 border-t border-gray-700 text-xs">
				<div class="font-semibold text-gray-300 mb-1">Bracket Criteria:</div>
				{#if bracketLevel === 1}
					<div class="text-green-400">✓ No Game Changers</div>
					<div class="text-green-400">✓ No 2-card infinite combos</div>
					<div class="text-green-400">✓ No extra turn cards</div>
					<div class="text-green-400">✓ No mass land destruction</div>
				{:else if bracketLevel === 2}
					<div class="text-green-400">✓ No Game Changers</div>
					<div class="text-gray-400">• Precon-level power</div>
					<div class="text-gray-400">• Minimal optimization</div>
				{:else if bracketLevel === 3}
					<div class="text-amber-400">! 1-3 Game Changers</div>
					<div class="text-gray-400">• Upgraded precon or focused casual</div>
					<div class="text-gray-400">• Some tutors and fast mana</div>
				{:else if bracketLevel === 4}
					<div class="text-orange-400 font-semibold mb-1">! 4+ Game Changers detected</div>
					<div class="text-gray-400">• Multiple fast mana sources</div>
					<div class="text-gray-400">• Powerful tutors (Demonic, Vampiric, etc.)</div>
					<div class="text-gray-400">• Strong card advantage engines</div>
					<div class="text-gray-400">• Efficient 2-card combos</div>
					<div class="text-gray-400">• Free interaction (Force of Will, etc.)</div>
					<div class="text-gray-400">• Optimized mana base</div>
				{:else if bracketLevel === 5}
					<div class="text-red-400 font-semibold">! Competitive EDH (cEDH)</div>
					<div class="text-gray-400">• No restrictions on power level</div>
					<div class="text-gray-400">• Turn 3-4 wins expected</div>
					<div class="text-gray-400">• Maximum optimization</div>
				{/if}
			</div>
			</div>
		</div>
	{/if}
</div>
