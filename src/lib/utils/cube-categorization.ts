/**
 * Cube card categorization utilities
 * Categorizes cards by color for Cube format
 */

import type { Card } from '$lib/types/card';
import { CubeCardCategory, type CubeCategorizedCards, getEffectiveColorIdentity } from '$lib/types/card';

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
		lands: []
	};

	for (const card of cards) {
		const category = determineCubeCategory(card);
		categorized[category].push(card);
	}

	return categorized;
}

/**
 * Determine the cube category for a card based on color identity
 * Respects custom color identity overrides (customColorIdentity)
 */
export function determineCubeCategory(card: Card): CubeCardCategory {
	// Lands always go to lands category
	if (card.types?.some((t) => t.toLowerCase() === 'land')) {
		return CubeCardCategory.Lands;
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
 * Get the display order for cube categories (WUBRG order)
 */
export function getCubeCategoryDisplayOrder(): CubeCardCategory[] {
	return [
		CubeCardCategory.White,
		CubeCardCategory.Blue,
		CubeCardCategory.Black,
		CubeCardCategory.Red,
		CubeCardCategory.Green,
		CubeCardCategory.Colorless,
		CubeCardCategory.Multicolored,
		CubeCardCategory.Lands
	];
}

/**
 * Get a human-readable label for a cube category
 */
export function getCubeCategoryLabel(category: CubeCardCategory): string {
	const labels: Record<CubeCardCategory, string> = {
		[CubeCardCategory.White]: 'White',
		[CubeCardCategory.Blue]: 'Blue',
		[CubeCardCategory.Black]: 'Black',
		[CubeCardCategory.Red]: 'Red',
		[CubeCardCategory.Green]: 'Green',
		[CubeCardCategory.Colorless]: 'Colorless',
		[CubeCardCategory.Multicolored]: 'Multicolored',
		[CubeCardCategory.Lands]: 'Lands'
	};
	return labels[category];
}

/**
 * Get Mana Font icon class for cube categories
 */
export function getCubeCategoryIcon(category: CubeCardCategory): string {
	const icons: Record<CubeCardCategory, string> = {
		[CubeCardCategory.White]: 'ms-w',
		[CubeCardCategory.Blue]: 'ms-u',
		[CubeCardCategory.Black]: 'ms-b',
		[CubeCardCategory.Red]: 'ms-r',
		[CubeCardCategory.Green]: 'ms-g',
		[CubeCardCategory.Colorless]: 'ms-c',
		[CubeCardCategory.Multicolored]: 'ms-multiple',
		[CubeCardCategory.Lands]: 'ms-land'
	};
	return icons[category];
}
