<script lang="ts">
	/**
	 * Renders oracle text with inline mana symbols and keyword tooltips
	 * Parses {W}, {U}, {B}, {R}, {G}, {T}, {X}, etc. and replaces with Mana Font icons
	 * Detects keywords (flying, trample, etc.) and adds tooltips with definitions
	 */

	import { detectKeywords, type KeywordDefinition } from '$lib/utils/keyword-detection';

	let {
		text
	}: {
		text: string;
	} = $props();

	// Track which keyword tooltip is currently open
	let openKeywordIndex = $state<number | null>(null);
	let closeTimeout: number | null = null;

	function toggleKeyword(index: number) {
		if (openKeywordIndex === index) {
			// Close if clicking the same keyword
			openKeywordIndex = null;
		} else {
			// Open new keyword tooltip
			openKeywordIndex = index;
		}
		// Clear any pending close timeout
		if (closeTimeout !== null) {
			clearTimeout(closeTimeout);
			closeTimeout = null;
		}
	}

	function handleKeywordMouseLeave() {
		// Close after 1 second delay on mouse leave
		if (closeTimeout !== null) {
			clearTimeout(closeTimeout);
		}
		closeTimeout = window.setTimeout(() => {
			openKeywordIndex = null;
			closeTimeout = null;
		}, 1000);
	}

	function handleTooltipMouseEnter() {
		// Cancel close timeout if mouse re-enters
		if (closeTimeout !== null) {
			clearTimeout(closeTimeout);
			closeTimeout = null;
		}
	}

	// Parse oracle text and split into text, symbol, and keyword parts
	interface TextPart {
		type: 'text' | 'symbol' | 'keyword';
		content: string;
		keywordDef?: KeywordDefinition;
	}

	function parseOracleText(oracleText: string): TextPart[] {
		const parts: TextPart[] = [];

		// Step 1: Extract mana symbols first
		const symbolRegex = /{([^}]+)}/g;
		const segments: Array<{type: 'symbol' | 'text', content: string, index: number}> = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = symbolRegex.exec(oracleText)) !== null) {
			// Add text before the symbol
			if (match.index > lastIndex) {
				segments.push({
					type: 'text',
					content: oracleText.substring(lastIndex, match.index),
					index: lastIndex
				});
			}

			// Add the symbol
			segments.push({
				type: 'symbol',
				content: match[1],
				index: match.index
			});

			lastIndex = match.index + match[0].length;
		}

		// Add remaining text
		if (lastIndex < oracleText.length) {
			segments.push({
				type: 'text',
				content: oracleText.substring(lastIndex),
				index: lastIndex
			});
		}

		// Step 2: Process text segments for keywords
		for (const segment of segments) {
			if (segment.type === 'symbol') {
				parts.push({
					type: 'symbol',
					content: segment.content
				});
			} else {
				// Detect keywords in this text segment
				const keywords = detectKeywords(segment.content);

				if (keywords.length === 0) {
					// No keywords, add as plain text
					parts.push({
						type: 'text',
						content: segment.content
					});
				} else {
					// Split text segment by keywords
					let textLastIndex = 0;
					for (const kw of keywords) {
						// Add text before keyword
						if (kw.startIndex > textLastIndex) {
							parts.push({
								type: 'text',
								content: segment.content.substring(textLastIndex, kw.startIndex)
							});
						}

						// Add keyword
						parts.push({
							type: 'keyword',
							content: segment.content.substring(kw.startIndex, kw.endIndex),
							keywordDef: kw.definition
						});

						textLastIndex = kw.endIndex;
					}

					// Add remaining text after last keyword
					if (textLastIndex < segment.content.length) {
						parts.push({
							type: 'text',
							content: segment.content.substring(textLastIndex)
						});
					}
				}
			}
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
	{#each parts as part, index}
		{#if part.type === 'text'}
			<span>{part.content}</span>
		{:else if part.type === 'symbol'}
			{@const symbolInfo = getSymbolInfo(part.content)}
			<i class="ms {symbolInfo.isCost ? 'ms-cost ms-shadow' : 'ability-symbol'} {symbolInfo.class}" title={part.content}></i>
		{:else if part.type === 'keyword' && part.keywordDef}
			<span class="keyword-wrapper" onmouseleave={handleKeywordMouseLeave} role="group">
				<span
					class="keyword-text"
					onclick={() => toggleKeyword(index)}
					role="button"
					tabindex="0"
					aria-label="Show definition for {part.keywordDef.name}"
					aria-expanded={openKeywordIndex === index}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							toggleKeyword(index);
						}
					}}
				>
					{part.content}
				</span>
				{#if openKeywordIndex === index}
					<span
						class="keyword-tooltip"
						role="button"
						tabindex="0"
						aria-label="Close tooltip"
						onmouseenter={handleTooltipMouseEnter}
						onmouseleave={handleKeywordMouseLeave}
						onclick={() => toggleKeyword(index)}
						onkeydown={(e) => {
							if (e.key === 'Escape' || e.key === 'Enter') {
								e.preventDefault();
								toggleKeyword(index);
							}
						}}
					>
						<strong>{part.keywordDef.name}</strong>: {part.keywordDef.definition}
						<span class="tooltip-arrow"></span>
					</span>
				{/if}
			</span>
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

	/* Tap symbol - grey background with black arrow like physical cards */
	.oracle-text :global(.ms-tap) {
		background-color: #bbb;
		color: #000;
		border-radius: 50%;
		padding: 0.15em;
		font-size: 1em;
	}

	.oracle-text :global(.ms-untap) {
		background-color: #bbb;
		color: #000;
		border-radius: 50%;
		padding: 0.15em;
		font-size: 1em;
	}

	/* Keyword wrapper - relative positioning for tooltip */
	.oracle-text :global(.keyword-wrapper) {
		position: relative;
		display: inline;
	}

	/* Keyword text styling - clickable with dashed underline */
	.oracle-text :global(.keyword-text) {
		cursor: pointer;
		color: var(--color-text-primary);
		border-bottom: 1px dashed var(--color-text-tertiary);
		user-select: none;
	}

	.oracle-text :global(.keyword-text:hover) {
		color: var(--color-brand-primary);
		border-bottom-color: var(--color-brand-primary);
	}

	/* Keyword tooltip */
	.oracle-text :global(.keyword-tooltip) {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 50;
		padding: 8px 12px;
		max-width: 300px;
		width: max-content;
		font-size: 0.875rem;
		line-height: 1.4;
		color: var(--color-text-primary);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		white-space: normal;
		pointer-events: auto;
		cursor: pointer;
	}

	/* Tooltip arrow */
	.oracle-text :global(.tooltip-arrow) {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-top: 6px solid var(--color-border);
	}

	.oracle-text :global(.tooltip-arrow::after) {
		content: '';
		position: absolute;
		top: -7px;
		left: -5px;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-top: 5px solid var(--color-surface);
	}
</style>
