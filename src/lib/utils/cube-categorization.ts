/**
 * Cube card categorization utilities
 * Categorizes cards by color for Cube format
 */

import type { Card, ManaColor } from '$lib/types/card';
import { CubeCardCategory, type CubeCategorizedCards, getEffectiveColorIdentity, getEffectiveCategory } from '$lib/types/card';

/**
 * Fetchland mapping by card name
 * Maps fetchland names to their respective guild categories
 */
const FETCHLAND_GUILDS: Record<string, CubeCardCategory> = {
	// Allied fetchlands
	'Flooded Strand': CubeCardCategory.LandAzorius, // WU
	'Polluted Delta': CubeCardCategory.LandDimir, // UB
	'Bloodstained Mire': CubeCardCategory.LandRakdos, // BR
	'Wooded Foothills': CubeCardCategory.LandGruul, // RG
	'Windswept Heath': CubeCardCategory.LandSelesnya, // GW
	// Enemy fetchlands
	'Marsh Flats': CubeCardCategory.LandOrzhov, // WB
	'Scalding Tarn': CubeCardCategory.LandIzzet, // UR
	'Verdant Catacombs': CubeCardCategory.LandGolgari, // BG
	'Arid Mesa': CubeCardCategory.LandBoros, // RW
	'Misty Rainforest': CubeCardCategory.LandSimic // GU
};

/**
 * Determine land category based on color identity or fetchland status
 * Uses color symbols to categorize into guilds, shards, wedges, or utility
 */
function determineLandCategory(card: Card): CubeCardCategory {
	// Check if it's a fetchland first
	if (FETCHLAND_GUILDS[card.name]) {
		return FETCHLAND_GUILDS[card.name];
	}

	// Get effective color identity
	const colors = getEffectiveColorIdentity(card);
	const colorCount = colors.length;

	// Generic lands (colorless, no color identity, or 5-color)
	if (colorCount === 0 || colorCount === 5) {
		return CubeCardCategory.LandGeneric;
	}

	// 4-color lands
	if (colorCount === 4) {
		return CubeCardCategory.LandFourColor;
	}

	// Sort colors for consistent matching (WUBRG order)
	const sortedColors = sortColors(colors);
	const colorKey = sortedColors.join('');

	// 3-color lands (shards and wedges)
	if (colorCount === 3) {
		const shardWedgeMap: Record<string, CubeCardCategory> = {
			// Shards (allied)
			'WUB': CubeCardCategory.LandEsper,
			'UBR': CubeCardCategory.LandGrixis,
			'BRG': CubeCardCategory.LandJund,
			'RGW': CubeCardCategory.LandNaya,
			'GWU': CubeCardCategory.LandBant,
			// Wedges (enemy)
			'WBG': CubeCardCategory.LandAbzan,
			'URW': CubeCardCategory.LandJeskai,
			'BGU': CubeCardCategory.LandSultai,
			'RWB': CubeCardCategory.LandMardu,
			'GUR': CubeCardCategory.LandTemur
		};
		return shardWedgeMap[colorKey] || CubeCardCategory.LandGeneric;
	}

	// 2-color lands (guilds)
	if (colorCount === 2) {
		const guildMap: Record<string, CubeCardCategory> = {
			'WU': CubeCardCategory.LandAzorius,
			'UB': CubeCardCategory.LandDimir,
			'BR': CubeCardCategory.LandRakdos,
			'RG': CubeCardCategory.LandGruul,
			'GW': CubeCardCategory.LandSelesnya,
			'WB': CubeCardCategory.LandOrzhov,
			'UR': CubeCardCategory.LandIzzet,
			'BG': CubeCardCategory.LandGolgari,
			'RW': CubeCardCategory.LandBoros,
			'GU': CubeCardCategory.LandSimic
		};
		return guildMap[colorKey] || CubeCardCategory.LandGeneric;
	}

	// Single color lands go to generic
	return CubeCardCategory.LandGeneric;
}

/**
 * Sort colors in WUBRG order
 */
function sortColors(colors: ManaColor[]): ManaColor[] {
	const order: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];
	return colors.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/**
 * Categorize cube cards by color
 */
export function categorizeCube(cards: Card[]): CubeCategorizedCards {
	const categorized: CubeCategorizedCards = {
		white: [],
		blue: [],
		black: [],
		red: [],
		green: [],
		colorless: [],
		multicolored: [],
		// Land subcategories
		'land-azorius': [],
		'land-dimir': [],
		'land-rakdos': [],
		'land-gruul': [],
		'land-selesnya': [],
		'land-orzhov': [],
		'land-izzet': [],
		'land-golgari': [],
		'land-boros': [],
		'land-simic': [],
		'land-esper': [],
		'land-grixis': [],
		'land-jund': [],
		'land-naya': [],
		'land-bant': [],
		'land-abzan': [],
		'land-jeskai': [],
		'land-sultai': [],
		'land-mardu': [],
		'land-temur': [],
		'land-fourcolor': [],
		'land-generic': []
	};

	for (const card of cards) {
		const category = determineCubeCategory(card);
		categorized[category].push(card);
	}

	return categorized;
}

/**
 * Determine the cube category for a card based on color identity
 * Respects custom category overrides (customCategory) and custom color identity overrides (customColorIdentity)
 */
export function determineCubeCategory(card: Card): CubeCardCategory {
	// Check for custom category override first
	const customCategory = getEffectiveCategory(card);
	if (customCategory !== null) {
		return customCategory;
	}

	// Lands use guild/shard/utility categorization
	if (card.types?.some((t) => t.toLowerCase() === 'land')) {
		return determineLandCategory(card);
	}

	// Get effective color identity (respects custom overrides)
	const colors = getEffectiveColorIdentity(card);

	// No colors = colorless
	if (colors.length === 0) {
		return CubeCardCategory.Colorless;
	}

	// Multiple colors = multicolored
	if (colors.length > 1) {
		return CubeCardCategory.Multicolored;
	}

	// Single color
	const color = colors[0];
	switch (color) {
		case 'W':
			return CubeCardCategory.White;
		case 'U':
			return CubeCardCategory.Blue;
		case 'B':
			return CubeCardCategory.Black;
		case 'R':
			return CubeCardCategory.Red;
		case 'G':
			return CubeCardCategory.Green;
		default:
			return CubeCardCategory.Colorless;
	}
}

/**
 * Virtual "Lands" category used for display purposes only
 * This is not a real CubeCardCategory enum value
 */
export const CUBE_LANDS_DISPLAY_CATEGORY = 'lands' as const;

/**
 * Get the display order for cube categories (WUBRG order + single Lands column)
 * Note: Returns 8 display categories. "lands" is a virtual category that aggregates all land subcategories.
 */
export function getCubeCategoryDisplayOrder(): string[] {
	return [
		CubeCardCategory.White,
		CubeCardCategory.Blue,
		CubeCardCategory.Black,
		CubeCardCategory.Red,
		CubeCardCategory.Green,
		CubeCardCategory.Colorless,
		CubeCardCategory.Multicolored,
		CUBE_LANDS_DISPLAY_CATEGORY // Virtual category that aggregates all land subcategories
	];
}

/**
 * Get the order of land subcategories for display within the Lands column
 */
export function getLandSubcategoryDisplayOrder(): CubeCardCategory[] {
	return [
		// Guilds
		CubeCardCategory.LandAzorius,
		CubeCardCategory.LandDimir,
		CubeCardCategory.LandRakdos,
		CubeCardCategory.LandGruul,
		CubeCardCategory.LandSelesnya,
		CubeCardCategory.LandOrzhov,
		CubeCardCategory.LandIzzet,
		CubeCardCategory.LandGolgari,
		CubeCardCategory.LandBoros,
		CubeCardCategory.LandSimic,
		// Shards
		CubeCardCategory.LandEsper,
		CubeCardCategory.LandGrixis,
		CubeCardCategory.LandJund,
		CubeCardCategory.LandNaya,
		CubeCardCategory.LandBant,
		// Wedges
		CubeCardCategory.LandAbzan,
		CubeCardCategory.LandJeskai,
		CubeCardCategory.LandSultai,
		CubeCardCategory.LandMardu,
		CubeCardCategory.LandTemur,
		// 4-color and generic
		CubeCardCategory.LandFourColor,
		CubeCardCategory.LandGeneric
	];
}

/**
 * Get all cube categories including land subcategories (for serialization/storage)
 */
export function getAllCubeCategories(): string[] {
	return [
		CubeCardCategory.White,
		CubeCardCategory.Blue,
		CubeCardCategory.Black,
		CubeCardCategory.Red,
		CubeCardCategory.Green,
		CubeCardCategory.Colorless,
		CubeCardCategory.Multicolored,
		...getLandSubcategoryDisplayOrder()
	];
}

/**
 * Get a human-readable label for a cube category
 */
export function getCubeCategoryLabel(category: CubeCardCategory | string): string {
	// Handle virtual lands category
	if (category === CUBE_LANDS_DISPLAY_CATEGORY) {
		return 'Lands';
	}

	const labels: Record<CubeCardCategory, string> = {
		[CubeCardCategory.White]: 'White',
		[CubeCardCategory.Blue]: 'Blue',
		[CubeCardCategory.Black]: 'Black',
		[CubeCardCategory.Red]: 'Red',
		[CubeCardCategory.Green]: 'Green',
		[CubeCardCategory.Colorless]: 'Colorless',
		[CubeCardCategory.Multicolored]: 'Multicolored',
		// Land subcategories - Guilds
		[CubeCardCategory.LandAzorius]: 'Azorius',
		[CubeCardCategory.LandDimir]: 'Dimir',
		[CubeCardCategory.LandRakdos]: 'Rakdos',
		[CubeCardCategory.LandGruul]: 'Gruul',
		[CubeCardCategory.LandSelesnya]: 'Selesnya',
		[CubeCardCategory.LandOrzhov]: 'Orzhov',
		[CubeCardCategory.LandIzzet]: 'Izzet',
		[CubeCardCategory.LandGolgari]: 'Golgari',
		[CubeCardCategory.LandBoros]: 'Boros',
		[CubeCardCategory.LandSimic]: 'Simic',
		// Land subcategories - Shards
		[CubeCardCategory.LandEsper]: 'Esper',
		[CubeCardCategory.LandGrixis]: 'Grixis',
		[CubeCardCategory.LandJund]: 'Jund',
		[CubeCardCategory.LandNaya]: 'Naya',
		[CubeCardCategory.LandBant]: 'Bant',
		// Land subcategories - Wedges
		[CubeCardCategory.LandAbzan]: 'Abzan',
		[CubeCardCategory.LandJeskai]: 'Jeskai',
		[CubeCardCategory.LandSultai]: 'Sultai',
		[CubeCardCategory.LandMardu]: 'Mardu',
		[CubeCardCategory.LandTemur]: 'Temur',
		// Land subcategories - 4-color and generic
		[CubeCardCategory.LandFourColor]: '4-Color',
		[CubeCardCategory.LandGeneric]: 'Other'
	};
	return labels[category as CubeCardCategory] || category;
}

/**
 * Get all land category IDs
 */
export function getLandCategories(): CubeCardCategory[] {
	return [
		CubeCardCategory.LandAzorius,
		CubeCardCategory.LandDimir,
		CubeCardCategory.LandRakdos,
		CubeCardCategory.LandGruul,
		CubeCardCategory.LandSelesnya,
		CubeCardCategory.LandOrzhov,
		CubeCardCategory.LandIzzet,
		CubeCardCategory.LandGolgari,
		CubeCardCategory.LandBoros,
		CubeCardCategory.LandSimic,
		CubeCardCategory.LandEsper,
		CubeCardCategory.LandGrixis,
		CubeCardCategory.LandJund,
		CubeCardCategory.LandNaya,
		CubeCardCategory.LandBant,
		CubeCardCategory.LandAbzan,
		CubeCardCategory.LandJeskai,
		CubeCardCategory.LandSultai,
		CubeCardCategory.LandMardu,
		CubeCardCategory.LandTemur,
		CubeCardCategory.LandFourColor,
		CubeCardCategory.LandGeneric
	];
}

/**
 * Check if a category is a land category
 */
export function isLandCategory(category: string): boolean {
	return category.startsWith('land-');
}

/**
 * Migrate old land categories to new land subcategories
 * Handles: 'lands', 'land-fivecolor', 'land-utility'
 * Call this when loading a cube deck to ensure lands are properly categorized
 */
export function migrateLandsCategory(cards: Record<string, Card[]>): Record<string, Card[]> {
	const oldCategories = ['lands', 'land-fivecolor', 'land-utility'];
	let needsMigration = false;

	// Check if any old categories exist
	for (const oldCat of oldCategories) {
		if (cards[oldCat] && cards[oldCat].length > 0) {
			needsMigration = true;
			break;
		}
	}

	if (!needsMigration) {
		return cards;
	}

	// Initialize all new land categories if they don't exist
	const landCategories = getLandCategories();
	for (const cat of landCategories) {
		if (!cards[cat]) {
			cards[cat] = [];
		}
	}

	// Re-categorize cards from each old category
	for (const oldCat of oldCategories) {
		if (cards[oldCat] && cards[oldCat].length > 0) {
			const landsToMigrate = [...cards[oldCat]];
			for (const card of landsToMigrate) {
				const newCategory = determineLandCategory(card);
				cards[newCategory].push(card);
			}
			// Remove the old category
			delete cards[oldCat];
		}
	}

	return cards;
}

/**
 * Get all land cards from a CardsByCategory, grouped by subcategory
 * Returns cards organized by their land subcategory for display
 */
export function getLandCardsBySubcategory(cards: Record<string, Card[]>): Record<string, Card[]> {
	const result: Record<string, Card[]> = {};

	for (const subcategory of getLandSubcategoryDisplayOrder()) {
		const subcategoryCards = cards[subcategory] || [];
		if (subcategoryCards.length > 0) {
			result[subcategory] = subcategoryCards;
		}
	}

	return result;
}

/**
 * Get all land cards from a CardsByCategory as a flat array
 */
export function getAllLandCards(cards: Record<string, Card[]>): Card[] {
	const allLands: Card[] = [];

	for (const subcategory of getLandSubcategoryDisplayOrder()) {
		const subcategoryCards = cards[subcategory] || [];
		allLands.push(...subcategoryCards);
	}

	return allLands;
}

/**
 * Get Mana Font icon class for cube categories
 */
export function getCubeCategoryIcon(category: CubeCardCategory | string): string {
	// Handle virtual lands category
	if (category === CUBE_LANDS_DISPLAY_CATEGORY) {
		return 'ms-land';
	}

	const icons: Record<CubeCardCategory, string> = {
		[CubeCardCategory.White]: 'ms-w',
		[CubeCardCategory.Blue]: 'ms-u',
		[CubeCardCategory.Black]: 'ms-b',
		[CubeCardCategory.Red]: 'ms-r',
		[CubeCardCategory.Green]: 'ms-g',
		[CubeCardCategory.Colorless]: 'ms-c',
		[CubeCardCategory.Multicolored]: 'ms-multiple',
		// Land subcategories - Guilds
		[CubeCardCategory.LandAzorius]: 'ms-wu',
		[CubeCardCategory.LandDimir]: 'ms-ub',
		[CubeCardCategory.LandRakdos]: 'ms-br',
		[CubeCardCategory.LandGruul]: 'ms-rg',
		[CubeCardCategory.LandSelesnya]: 'ms-gw',
		[CubeCardCategory.LandOrzhov]: 'ms-wb',
		[CubeCardCategory.LandIzzet]: 'ms-ur',
		[CubeCardCategory.LandGolgari]: 'ms-bg',
		[CubeCardCategory.LandBoros]: 'ms-rw',
		[CubeCardCategory.LandSimic]: 'ms-gu',
		// Land subcategories - Shards/Wedges/Other (use generic land icon)
		[CubeCardCategory.LandEsper]: 'ms-land',
		[CubeCardCategory.LandGrixis]: 'ms-land',
		[CubeCardCategory.LandJund]: 'ms-land',
		[CubeCardCategory.LandNaya]: 'ms-land',
		[CubeCardCategory.LandBant]: 'ms-land',
		[CubeCardCategory.LandAbzan]: 'ms-land',
		[CubeCardCategory.LandJeskai]: 'ms-land',
		[CubeCardCategory.LandSultai]: 'ms-land',
		[CubeCardCategory.LandMardu]: 'ms-land',
		[CubeCardCategory.LandTemur]: 'ms-land',
		[CubeCardCategory.LandFourColor]: 'ms-land',
		[CubeCardCategory.LandGeneric]: 'ms-land'
	};
	return icons[category as CubeCardCategory] || 'ms-land';
}
