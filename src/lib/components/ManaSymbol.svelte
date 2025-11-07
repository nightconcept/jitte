<script lang="ts">
	/**
	 * Renders mana symbols from a mana cost string
	 * Converts "{2}{U}{U}" into visual mana symbols using proper MTG styling
	 */

	export let cost: string;
	export let size: 'sm' | 'md' | 'lg' = 'md';

	const sizeMap = {
		sm: 'w-4 h-4 text-[9px]',
		md: 'w-5 h-5 text-[10px]',
		lg: 'w-6 h-6 text-xs'
	};

	// Parse mana cost into individual symbols
	function parseManaCost(costStr: string): string[] {
		const symbols: string[] = [];
		const regex = /{([^}]+)}/g;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(costStr)) !== null) {
			symbols.push(match[1]);
		}

		return symbols;
	}

	// Get proper MTG mana symbol styling
	function getManaStyle(symbol: string): { bg: string; text: string; shadow: string } {
		const sym = symbol.toUpperCase();

		// Colored mana with proper MTG colors and shadows
		if (sym === 'W') return { bg: '#f0f0d8', text: '#000', shadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' };
		if (sym === 'U') return { bg: '#0e68ab', text: '#fff', shadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' };
		if (sym === 'B') return { bg: '#150b00', text: '#fff', shadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' };
		if (sym === 'R') return { bg: '#d3202a', text: '#fff', shadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' };
		if (sym === 'G') return { bg: '#00733e', text: '#fff', shadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' };

		// Generic/colorless mana
		if (/^\d+$/.test(sym) || sym === 'C' || sym === 'X') {
			return { bg: '#cac5c0', text: '#000', shadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' };
		}

		// Hybrid and other special symbols (simplified)
		return { bg: '#f0e68c', text: '#000', shadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' };
	}

	$: symbols = parseManaCost(cost);
</script>

<div class="flex items-center gap-0.5">
	{#each symbols as symbol}
		{@const style = getManaStyle(symbol)}
		<span
			class="inline-flex items-center justify-center rounded-full font-bold {sizeMap[size]}"
			style="background-color: {style.bg}; color: {style.text}; box-shadow: {style.shadow}"
			title={symbol}
		>
			{symbol}
		</span>
	{/each}
</div>
