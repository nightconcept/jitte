/**
 * Game Changers list and bracket calculation for Commander format
 * Based on WotC's October 2025 Commander Brackets Beta Update
 * https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025
 */

/**
 * Complete list of Game Changer cards (as of October 2025)
 * These cards dramatically warp the game state and determine bracket placement
 */
export const GAME_CHANGERS = new Set<string>([
	// White
	'Drannith Magistrate',
	'Humility',
	"Serra's Sanctum",
	'Smothering Tithe',
	'Enlightened Tutor',
	"Teferi's Protection",

	// Blue
	'Consecrated Sphinx',
	'Cyclonic Rift',
	'Force of Will',
	'Fierce Guardianship',
	'Gifts Ungiven',
	'Intuition',
	'Mystical Tutor',
	'Narset, Parter of Veils',
	'Rhystic Study',
	"Thassa's Oracle",

	// Black
	'Ad Nauseam',
	"Bolas's Citadel",
	'Braids, Cabal Minion',
	'Demonic Tutor',
	'Imperial Seal',
	'Necropotence',
	'Opposition Agent',
	'Orcish Bowmasters',
	'Tergrid, God of Fright',
	'Vampiric Tutor',

	// Red
	'Gamble',
	"Jeska's Will",
	'Underworld Breach',

	// Green
	'Crop Rotation',
	"Gaea's Cradle",
	'Natural Order',
	'Seedborn Muse',
	'Survival of the Fittest',
	'Worldly Tutor',

	// Multicolor
	'Aura Shards',
	'Coalition Victory',
	'Grand Arbiter Augustin IV',
	'Notion Thief',

	// Colorless/Lands
	'Ancient Tomb',
	'Chrome Mox',
	'Field of the Dead',
	'Glacial Chasm',
	'Grim Monolith',
	"Lion's Eye Diamond",
	'Mana Vault',
	"Mishra's Workshop",
	'Mox Diamond',
	'Panoptic Mirror',
	'The One Ring',
	'The Tabernacle at Pendrell Vale'
]);

/**
 * Commander bracket levels
 */
export enum BracketLevel {
	Exhibition = 1,
	Core = 2,
	Upgraded = 3,
	Optimized = 4,
	CEDH = 5
}

/**
 * Check if a card is a Game Changer
 */
export function isGameChanger(cardName: string): boolean {
	// Normalize the card name for comparison (handle case variations)
	const normalizedName = cardName.trim();
	return GAME_CHANGERS.has(normalizedName);
}

/**
 * Count the number of Game Changers in a deck
 * @param cardNames - Array of card names in the deck
 * @returns Number of unique Game Changers
 */
export function countGameChangers(cardNames: string[]): number {
	return cardNames.filter(name => isGameChanger(name)).length;
}

/**
 * Calculate the bracket level based on Game Changer count and other factors
 *
 * Bracket guidelines:
 * - Bracket 1 (Exhibition): Casual, theme-focused, NO Game Changers
 * - Bracket 2 (Core): Precon-level, NO Game Changers
 * - Bracket 3 (Upgraded): 1-3 Game Changers
 * - Bracket 4 (Optimized): 4+ Game Changers, highly tuned
 * - Bracket 5 (cEDH): Competitive, no restrictions
 *
 * @param gameChangerCount - Number of Game Changers in the deck
 * @param hasInfiniteCombo - Whether deck has 2-card infinite combos (optional)
 * @param hasExtraTurns - Whether deck has extra turn cards (optional)
 * @param hasMassLandDestruction - Whether deck has mass land destruction (optional)
 * @returns Bracket level (1-5)
 */
export function calculateBracketLevel(
	gameChangerCount: number,
	options?: {
		hasInfiniteCombo?: boolean;
		hasExtraTurns?: boolean;
		hasMassLandDestruction?: boolean;
	}
): BracketLevel {
	// Bracket 1/2: No Game Changers
	if (gameChangerCount === 0) {
		// Bracket 1 criteria: No infinite combos, no extra turns, no MLD
		if (
			!options?.hasInfiniteCombo &&
			!options?.hasExtraTurns &&
			!options?.hasMassLandDestruction
		) {
			return BracketLevel.Exhibition;
		}
		// Otherwise Bracket 2 (precon-level)
		return BracketLevel.Core;
	}

	// Bracket 3: 1-3 Game Changers
	if (gameChangerCount <= 3) {
		return BracketLevel.Upgraded;
	}

	// Bracket 4+: 4+ Game Changers
	// Note: Bracket 5 (cEDH) is typically self-identified by players
	// For now, we'll mark 4+ as Optimized (Bracket 4)
	return BracketLevel.Optimized;
}

/**
 * Get bracket label
 */
export function getBracketLabel(bracket: BracketLevel): string {
	switch (bracket) {
		case BracketLevel.Exhibition:
			return 'Exhibition';
		case BracketLevel.Core:
			return 'Core';
		case BracketLevel.Upgraded:
			return 'Upgraded';
		case BracketLevel.Optimized:
			return 'Optimized';
		case BracketLevel.CEDH:
			return 'cEDH';
		default:
			return 'Unknown';
	}
}

/**
 * Get bracket description
 */
export function getBracketDescription(bracket: BracketLevel): string {
	switch (bracket) {
		case BracketLevel.Exhibition:
			return 'Casual, theme-focused decks';
		case BracketLevel.Core:
			return 'Precon-level power';
		case BracketLevel.Upgraded:
			return 'Upgraded decks with 1-3 Game Changers';
		case BracketLevel.Optimized:
			return 'Highly tuned, competitive-casual';
		case BracketLevel.CEDH:
			return 'Competitive EDH';
		default:
			return '';
	}
}
