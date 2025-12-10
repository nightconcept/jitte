/**
 * Cube text view helpers
 * Utilities for grouping and displaying Cube cards in 8-column text view with subcategorization
 */

import type { Card, ManaColor } from '$lib/types/card';

/**
 * Card type subcategories for mono-color and colorless columns
 */
export enum CubeCardType {
	Creature = 'creature',
	Planeswalker = 'planeswalker',
	Instant = 'instant',
	Sorcery = 'sorcery',
	Artifact = 'artifact',
	Enchantment = 'enchantment',
	Land = 'land',
	Other = 'other'
}

/**
 * Display order for type-based subcategories
 */
export const TYPE_SUBCATEGORY_ORDER: CubeCardType[] = [
	CubeCardType.Creature,
	CubeCardType.Planeswalker,
	CubeCardType.Instant,
	CubeCardType.Sorcery,
	CubeCardType.Artifact,
	CubeCardType.Enchantment,
	CubeCardType.Land,
	CubeCardType.Other
];

/**
 * Display labels for type subcategories
 */
export const TYPE_SUBCATEGORY_LABELS: Record<CubeCardType, string> = {
	[CubeCardType.Creature]: 'Creatures',
	[CubeCardType.Planeswalker]: 'Planeswalkers',
	[CubeCardType.Instant]: 'Instants',
	[CubeCardType.Sorcery]: 'Sorceries',
	[CubeCardType.Artifact]: 'Artifacts',
	[CubeCardType.Enchantment]: 'Enchantments',
	[CubeCardType.Land]: 'Lands',
	[CubeCardType.Other]: 'Other'
};

/**
 * Two-color guild combinations in display order
 */
// Two-color guild combinations (in WUBRG sorted order to match getColorCombinationKey)
export const TWO_COLOR_GUILDS = [
	'WU', // Azorius
	'UB', // Dimir
	'BR', // Rakdos
	'RG', // Gruul
	'WG', // Selesnya - was GW
	'WB', // Orzhov
	'UR', // Izzet
	'BG', // Golgari
	'WR', // Boros - was RW
	'UG' // Simic - was GU
];

/**
 * Three-color combinations in WUBRG sorted order
 * 5 Shards (allied colors): WUG (Bant), WUB (Esper), UBR (Grixis), BRG (Jund), WRG (Naya)
 * 5 Wedges (enemy colors): WBG (Abzan), WUR (Jeskai), UBG (Sultai), WBR (Mardu), URG (Temur)
 */
export const THREE_COLOR_COMBINATIONS = [
	'WUG', // Bant (shard)
	'WUB', // Esper (shard)
	'UBR', // Grixis (shard)
	'BRG', // Jund (shard)
	'WRG', // Naya (shard)
	'WBG', // Abzan (wedge)
	'WUR', // Jeskai (wedge)
	'UBG', // Sultai (wedge)
	'WBR', // Mardu (wedge)
	'URG' // Temur (wedge)
];

/**
 * Four-color combinations (in WUBRG sorted order to match getColorCombinationKey)
 */
export const FOUR_COLOR_COMBINATIONS = [
	'WUBR', // Yore (no Green)
	'UBRG', // Glint (no White)
	'WBRG', // Dune (no Blue) - was BRGW, now WUBRG sorted
	'WURG', // Ink (no Black) - was RGWU, now WUBRG sorted
	'WUBG' // Witch (no Red) - was GWUB, now WUBRG sorted
];

/**
 * Five-color combination
 */
export const FIVE_COLOR = 'WUBRG';

/**
 * Guild names for two-color combinations
 */
export const GUILD_NAMES: Record<string, string> = {
	WU: 'Azorius',
	UB: 'Dimir',
	BR: 'Rakdos',
	RG: 'Gruul',
	WG: 'Selesnya', // Was GW, now WUBRG sorted
	WB: 'Orzhov',
	UR: 'Izzet',
	BG: 'Golgari',
	WR: 'Boros', // Was RW, now WUBRG sorted
	UG: 'Simic' // Was GU, now WUBRG sorted
};

/**
 * Three-color names (keys in WUBRG sorted order)
 */
export const THREE_COLOR_NAMES: Record<string, string> = {
	// Shards (allied colors)
	WUG: 'Bant',
	WUB: 'Esper',
	UBR: 'Grixis',
	BRG: 'Jund',
	WRG: 'Naya',
	// Wedges (enemy colors)
	WBG: 'Abzan',
	WUR: 'Jeskai',
	UBG: 'Sultai',
	WBR: 'Mardu',
	URG: 'Temur'
};

/**
 * Four-color combination names (keys in WUBRG sorted order)
 */
export const FOUR_COLOR_NAMES: Record<string, string> = {
	WUBR: 'Yore',   // No Green
	UBRG: 'Glint',  // No White
	WBRG: 'Dune',   // No Blue
	WURG: 'Ink',    // No Black
	WUBG: 'Witch'   // No Red
};

/**
 * Subcategorized cards for a color/type grouping
 */
export interface SubcategorizedCards {
	[subcategory: string]: Card[];
}

/**
 * Determine the card type for a card
 */
export function determineCardType(card: Card): CubeCardType {
	const types = card.types?.map((t) => t.toLowerCase()) || [];

	if (types.includes('creature')) return CubeCardType.Creature;
	if (types.includes('planeswalker')) return CubeCardType.Planeswalker;
	if (types.includes('instant')) return CubeCardType.Instant;
	if (types.includes('sorcery')) return CubeCardType.Sorcery;
	if (types.includes('artifact')) return CubeCardType.Artifact;
	if (types.includes('enchantment')) return CubeCardType.Enchantment;
	if (types.includes('land')) return CubeCardType.Land;

	return CubeCardType.Other;
}

/**
 * Group cards by type (for mono-color and colorless columns)
 */
export function groupCardsByType(cards: Card[]): SubcategorizedCards {
	const grouped: SubcategorizedCards = {};

	// Initialize all type categories
	for (const type of TYPE_SUBCATEGORY_ORDER) {
		grouped[type] = [];
	}

	// Group cards by type
	for (const card of cards) {
		const type = determineCardType(card);
		grouped[type].push(card);
	}

	return grouped;
}

/**
 * Get sorted color combination key for a card's color identity
 * Returns a string like "WU", "BRG", "WUBRG", etc.
 */
export function getColorCombinationKey(colors: ManaColor[]): string {
	// Sort colors in WUBRG order
	const colorOrder: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];
	const sortedColors = [...colors]
		.filter((c) => c !== 'C') // Remove colorless
		.sort((a, b) => colorOrder.indexOf(a) - colorOrder.indexOf(b));

	return sortedColors.join('');
}

/**
 * Get display label for a color combination
 */
export function getColorCombinationLabel(combination: string): string {
	// Two-color guilds
	if (combination.length === 2 && GUILD_NAMES[combination]) {
		return GUILD_NAMES[combination];
	}

	// Three-color combinations
	if (combination.length === 3 && THREE_COLOR_NAMES[combination]) {
		return THREE_COLOR_NAMES[combination];
	}

	// Four-color combinations
	if (combination.length === 4 && FOUR_COLOR_NAMES[combination]) {
		return FOUR_COLOR_NAMES[combination];
	}

	// Five-color
	if (combination === FIVE_COLOR) {
		return 'Five-Color';
	}

	// Fallback: just show the color combination
	return combination;
}

/**
 * Mapping of color combinations to hybrid mana icons
 * Only 2-color guilds have hybrid icons
 */
const COLOR_COMBINATION_ICONS: Record<string, string> = {
	// Two-color guilds (have hybrid mana icons)
	'WU': 'ms-wu',
	'UB': 'ms-ub',
	'BR': 'ms-br',
	'RG': 'ms-rg',
	'GW': 'ms-gw',
	'WB': 'ms-wb',
	'UR': 'ms-ur',
	'BG': 'ms-bg',
	'RW': 'ms-rw',
	'GU': 'ms-gu'
	// 3-color, 4-color, and 5-color don't have specific icons
};

/**
 * Get mana icon class for a color combination
 * Returns empty string for combinations without icons (3+ colors)
 */
export function getColorCombinationIcon(combination: string): string {
	return COLOR_COMBINATION_ICONS[combination] || '';
}

/**
 * Get display order for multicolored subcategories
 */
export function getMulticolorSubcategoryOrder(): string[] {
	return [
		...TWO_COLOR_GUILDS,
		...THREE_COLOR_COMBINATIONS,
		...FOUR_COLOR_COMBINATIONS,
		FIVE_COLOR
	];
}

/**
 * Group multicolored cards by color combination
 */
export function groupMulticoloredCardsByColorCombination(cards: Card[]): SubcategorizedCards {
	const grouped: SubcategorizedCards = {};

	// Initialize all color combination categories
	for (const combo of getMulticolorSubcategoryOrder()) {
		grouped[combo] = [];
	}

	// Group cards by color combination
	for (const card of cards) {
		const colors = card.customColorIdentity || card.colorIdentity || [];
		const combination = getColorCombinationKey(colors);

		if (combination.length >= 2) {
			// Only multicolored cards
			if (!grouped[combination]) {
				grouped[combination] = [];
			}
			grouped[combination].push(card);
		}
	}

	return grouped;
}

/**
 * Sort cards within a subcategory
 */
export function sortCardsInSubcategory(
	cards: Card[],
	sortMode: 'name' | 'mana_value'
): Card[] {
	if (sortMode === 'name') {
		return [...cards].sort((a, b) => a.name.localeCompare(b.name));
	} else {
		return [...cards].sort((a, b) => (a.cmc || 0) - (b.cmc || 0));
	}
}

/**
 * Get count of cards in a subcategory
 */
export function getSubcategoryCount(cards: Card[]): number {
	return cards.reduce((sum, card) => sum + card.quantity, 0);
}

/**
 * Group cards by CMC (converted mana cost)
 * Returns a record where keys are CMC values (as strings) and values are arrays of cards
 */
export function groupCardsByCmc(cards: Card[]): Record<string, Card[]> {
	const grouped: Record<string, Card[]> = {};

	for (const card of cards) {
		const cmc = card.customCmc ?? card.cmc ?? 0;
		const cmcKey = cmc.toString();

		if (!grouped[cmcKey]) {
			grouped[cmcKey] = [];
		}

		grouped[cmcKey].push(card);
	}

	return grouped;
}

/**
 * Get sorted CMC keys from a CMC-grouped object
 * Returns CMC values as strings in ascending numeric order (0, 1, 2, ...)
 */
export function getSortedCmcKeys(grouped: Record<string, Card[]>): string[] {
	return Object.keys(grouped).sort((a, b) => {
		const numA = parseFloat(a);
		const numB = parseFloat(b);
		return numA - numB;
	});
}

/**
 * Sort cards alphabetically by name
 */
export function sortCardsAlphabetically(cards: Card[]): Card[] {
	return [...cards].sort((a, b) => a.name.localeCompare(b.name));
}
