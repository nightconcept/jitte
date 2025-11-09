<script lang="ts">
	/**
	 * Renders mana symbols from a mana cost string using Mana Font
	 * Converts "{2}{U}{U}" into visual mana symbols
	 * https://mana.andrewgioia.com/
	 */

	let {
		cost,
		size = 'md'
	}: {
		cost: string;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const sizeClasses = {
		sm: 'ms ms-cost ms-shadow text-sm',   // Small: 14px
		md: 'ms ms-cost ms-shadow text-base',  // Medium: 16px
		lg: 'ms ms-cost ms-shadow text-xl'     // Large: 20px
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

	// Convert mana symbol to Mana Font class
	function getManaClass(symbol: string): string {
		const sym = symbol.toLowerCase();

		// Handle hybrid and phyrexian mana
		// e.g., {W/U} becomes ms-wu, {W/P} becomes ms-wp
		if (sym.includes('/')) {
			return `ms-${sym.replace('/', '')}`;
		}

		// Handle split mana (2/w, 2/u, etc.)
		if (/^\d+\/[wubrg]$/.test(sym)) {
			return `ms-${sym.replace('/', '')}`;
		}

		// Standard symbols: w, u, b, r, g, c, x, 0-20, etc.
		return `ms-${sym}`;
	}

	const symbols = $derived(parseManaCost(cost));
	const sizeClass = $derived(sizeClasses[size]);
</script>

<div class="inline-flex items-center gap-0.5">
	{#each symbols as symbol}
		<i class="{sizeClass} {getManaClass(symbol)}" title={symbol}></i>
	{/each}
</div>
