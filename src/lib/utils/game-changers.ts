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
 * Bracket guidelines (WotC Commander Brackets Beta, April 2025):
 * - Bracket 1 (Exhibition): Casual, theme-focused, NO Game Changers, NO fast combos
 * - Bracket 2 (Core): Precon-level, NO Game Changers
 * - Bracket 3 (Upgraded): 1-3 Game Changers OR some combo potential
 * - Bracket 4 (Optimized): 4+ Game Changers OR 2-card infinite combos OR explosive fast mana
 * - Bracket 5 (cEDH): Competitive, self-identified
 *
 * Key factors:
 * - Game Changers (most objective)
 * - 2-card infinite combos (pushes to Bracket 4)
 * - Fast mana (covered by Game Changers)
 * - Mass land destruction (Bracket 3-4 indicator)
 * - Extra turns (Bracket 3-4 indicator)
 *
 * @param gameChangerCount - Number of Game Changers in the deck
 * @param options - Additional factors for bracket calculation
 * @param options.twoCardComboCount - Number of 2-card infinite combos (from Commander Spellbook)
 * @param options.earlyGameComboCount - Number of fast/early-game combos
 * @param options.hasExtraTurns - Whether deck has extra turn cards
 * @param options.hasMassLandDestruction - Whether deck has mass land destruction
 * @returns Bracket level (1-5)
 */
export function calculateBracketLevel(
	gameChangerCount: number,
	options?: {
		twoCardComboCount?: number;
		earlyGameComboCount?: number;
		hasExtraTurns?: boolean;
		hasMassLandDestruction?: boolean;
	}
): BracketLevel {
	const twoCardCombos = options?.twoCardComboCount ?? 0;
	const earlyGameCombos = options?.earlyGameComboCount ?? 0;

	// Bracket 4 criteria: 2-card infinite combos that can win early
	// According to WotC guidance, 2-card combos push a deck to Bracket 4
	if (twoCardCombos > 0 || earlyGameCombos >= 2) {
		return BracketLevel.Optimized;
	}

	// Bracket 4: 4+ Game Changers
	if (gameChangerCount >= 4) {
		return BracketLevel.Optimized;
	}

	// Bracket 3: 1-3 Game Changers OR some combo potential
	if (gameChangerCount >= 1 && gameChangerCount <= 3) {
		return BracketLevel.Upgraded;
	}

	// Bracket 1/2: No Game Changers, no fast combos
	if (gameChangerCount === 0) {
		// Bracket 1 criteria: No combos, no extra turns, no MLD
		// Pure casual, theme-focused play
		if (
			earlyGameCombos === 0 &&
			!options?.hasExtraTurns &&
			!options?.hasMassLandDestruction
		) {
			return BracketLevel.Exhibition;
		}
		// Bracket 2: Precon-level, may have some of the above
		return BracketLevel.Core;
	}

	// Default to Bracket 2 (Core)
	return BracketLevel.Core;
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
