<script lang="ts">
	/**
	 * Renders oracle text with inline mana symbols and keyword tooltips
	 * Parses {W}, {U}, {B}, {R}, {G}, {T}, {X}, etc. and replaces with Mana Font icons
	 * Detects keywords (flying, trample, etc.) and adds tooltips with definitions
	 */

	import { detectKeywords, type KeywordDefinition } from '$lib/utils/keyword-detection';
	import BaseTooltip from './BaseTooltip.svelte';

	let {
		text
	}: {
		text: string;
	} = $props();

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
			{@const kw = part.keywordDef}
			<BaseTooltip
				trigger="click"
				position="above"
				positioning="absolute"
				closeDelay={1000}
				maxWidth="300px"
				ariaLabel="Show definition for {kw.name}"
			>
				{#snippet children()}
					<span class="keyword-text">{part.content}</span>
				{/snippet}

				{#snippet content()}
					<strong>{kw.name}</strong>: {kw.definition}
				{/snippet}
			</BaseTooltip>
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
</style>
