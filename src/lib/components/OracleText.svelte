<script lang="ts">
	/**
	 * Renders oracle text with inline mana symbols
	 * Parses {W}, {U}, {B}, {R}, {G}, {T}, {X}, etc. and replaces with Mana Font icons
	 */

	let {
		text
	}: {
		text: string;
	} = $props();

	// Parse oracle text and split into text and symbol parts
	interface TextPart {
		type: 'text' | 'symbol';
		content: string;
	}

	function parseOracleText(oracleText: string): TextPart[] {
		const parts: TextPart[] = [];
		const regex = /{([^}]+)}/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(oracleText)) !== null) {
			// Add text before the symbol
			if (match.index > lastIndex) {
				parts.push({
					type: 'text',
					content: oracleText.substring(lastIndex, match.index)
				});
			}

			// Add the symbol
			parts.push({
				type: 'symbol',
				content: match[1]
			});

			lastIndex = match.index + match[0].length;
		}

		// Add remaining text
		if (lastIndex < oracleText.length) {
			parts.push({
				type: 'text',
				content: oracleText.substring(lastIndex)
			});
		}

		return parts;
	}

	// Convert symbol to Mana Font class and determine if it's a cost symbol
	function getSymbolInfo(symbol: string): { class: string; isCost: boolean } {
		const sym = symbol.toLowerCase();

		// Special ability symbol mappings
		const abilityMap: Record<string, string> = {
			't': 'tap',
			'q': 'untap',
			'e': 'energy',
			's': 'snow',
			'chaos': 'chaos',
			'a': 'acorn',
			'pw': 'planeswalker'
		};

		// Check if it's an ability symbol
		if (abilityMap[sym]) {
			return { class: `ms-${abilityMap[sym]}`, isCost: false };
		}

		// Handle hybrid and phyrexian mana
		if (sym.includes('/')) {
			return { class: `ms-${sym.replace('/', '')}`, isCost: true };
		}

		// Handle split mana (2/w, 2/u, etc.)
		if (/^\d+\/[wubrg]$/.test(sym)) {
			return { class: `ms-${sym.replace('/', '')}`, isCost: true };
		}

		// Standard mana symbols: w, u, b, r, g, c, x, 0-20, etc.
		return { class: `ms-${sym}`, isCost: true };
	}

	const parts = $derived(parseOracleText(text));
</script>

<div class="oracle-text">
	{#each parts as part}
		{#if part.type === 'text'}
			<span>{part.content}</span>
		{:else}
			{@const symbolInfo = getSymbolInfo(part.content)}
			<i class="ms {symbolInfo.isCost ? 'ms-cost ms-shadow' : 'ability-symbol'} {symbolInfo.class}" title={part.content}></i>
		{/if}
	{/each}
</div>

<style>
	.oracle-text {
		display: inline;
		white-space: pre-line;
	}

	.oracle-text :global(.ms) {
		display: inline-block;
		vertical-align: middle;
		margin: 0 1px;
	}

	.oracle-text :global(.ability-symbol) {
		font-size: 1.2em;
		line-height: 1;
	}
</style>
