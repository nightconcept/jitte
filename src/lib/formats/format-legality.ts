/**
 * Format Legality Configuration
 *
 * Metadata for Magic: The Gathering format legality (from Scryfall).
 * This is separate from DeckFormat - these are card legality formats.
 */

export interface FormatLegalityMetadata {
	/** Internal format key (matches Scryfall API) */
	key: string;
	/** Display name for UI */
	displayName: string;
	/** Order for display (lower = earlier) */
	order: number;
}

/**
 * Supported formats for legality display.
 * These match Scryfall's legality API fields.
 */
export const SUPPORTED_FORMATS: FormatLegalityMetadata[] = [
	{ key: 'standard', displayName: 'Standard', order: 1 },
	{ key: 'pioneer', displayName: 'Pioneer', order: 2 },
	{ key: 'modern', displayName: 'Modern', order: 3 },
	{ key: 'legacy', displayName: 'Legacy', order: 4 },
	{ key: 'vintage', displayName: 'Vintage', order: 5 },
	{ key: 'commander', displayName: 'Commander', order: 6 },
	{ key: 'oathbreaker', displayName: 'Oathbreaker', order: 7 },
	{ key: 'predh', displayName: 'PreDH', order: 8 },
	{ key: 'pauper', displayName: 'Pauper', order: 9 },
	{ key: 'historic', displayName: 'Historic', order: 10 },
	{ key: 'brawl', displayName: 'Brawl', order: 11 },
	{ key: 'alchemy', displayName: 'Alchemy', order: 12 }
];

/**
 * Get format order (for sorting)
 */
export const FORMAT_ORDER = SUPPORTED_FORMATS.map(f => f.key);

/**
 * Get format display names map
 */
export const FORMAT_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
	SUPPORTED_FORMATS.map(f => [f.key, f.displayName])
);

/**
 * Legality status types from Scryfall
 */
export type LegalityStatus = 'legal' | 'not_legal' | 'restricted' | 'banned';

/**
 * Get icon and styling for a legality status
 */
export function getLegalityIcon(legality: LegalityStatus): {
	icon: string;
	color: string;
	title: string;
} {
	switch (legality) {
		case 'legal':
			return { icon: '✓', color: 'legal-icon', title: 'Legal' };
		case 'banned':
			return { icon: '✕', color: 'banned-icon', title: 'Banned' };
		case 'restricted':
			return { icon: '1', color: 'restricted-icon', title: 'Restricted: 1 copy only' };
		case 'not_legal':
			return { icon: '−', color: 'not-legal-icon', title: 'Not Legal' };
		default:
			return { icon: '−', color: 'not-legal-icon', title: 'Not Legal' };
	}
}
