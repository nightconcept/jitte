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
 * Mass Land Denial (MLD) cards
 * Cards that destroy or prevent untapping of 3+ lands or all lands
 * These cards push decks to Bracket 4
 */
export const MASS_LAND_DENIAL = new Set<string>([
	// Mass land destruction
	'Armageddon',
	'Ravages of War',
	'Decree of Annihilation',
	'Worldfire',
	'Jokulhaups',
	'Obliterate',
	'Apocalypse',
	'Sunder',
	'Ruination',
	'Catastrophe',
	'Cataclysm',
	'Boil',
	'Acid Rain',
	'Flashfires',
	'Epicenter',
	'Devastation',
	'Fall of the Thran',
	'Keldon Firebombers',
	'Wildfire',
	'Burning of Xinye',
	'Destructive Force',
	'Limited Resources',
	'Natural Balance',
	'Balance',
	'Restore Balance',
	'Boom // Bust',
	'Thoughts of Ruin',
	'Impending Disaster',
	'Decree of Annihilation',
	'Destructive Flow',

	// Mass land denial (preventing untap)
	'Winter Orb',
	'Static Orb',
	'Stasis',
	'Rising Waters',
	'Mana Breach',
	'Overburden',
	'Hokori, Dust Drinker',
	'Mana Vortex',
	'Tangle Wire',
	'Smoke',
	'Embargo',
	'Root Maze',
	'Frozen Aether',
	'Kismet',
	'Loxodon Gatekeeper',
	'Urabrask the Hidden',
	'Aura of Silence',
	'Blind Obedience',
	'Thalia, Heretic Cathar',
	'Archon of Emeria',
	'Damping Sphere'
]);

/**
 * Extra Turn cards
 * Cards that grant additional turns
 * Any extra turn card prevents Bracket 1
 */
export const EXTRA_TURNS = new Set<string>([
	// Single extra turns
	'Time Warp',
	'Temporal Manipulation',
	'Walk the Aeons',
	'Capture of Jingzhou',
	'Temporal Mastery',
	'Part the Waterveil',
	"Alrund's Epiphany",
	"Karn's Temporal Sundering",
	'Temporal Trespass',
	'Savor the Moment',
	'Stitch in Time',
	'Notorious Throng',
	'Temporal Extortion',
	'Warrior\'s Oath',
	'Final Fortune',
	'Last Chance',
	'Chance for Glory',
	'Glorious End',
	'Seize the Day',
	'World at War',
	'Fury of the Horde',
	'Incite Rebellion',
	'Relentless Assault',
	'Savage Beating',
	'Waves of Aggression',
	'Second Sunrise',
	'Faith\'s Reward',
	'Open the Vaults',

	// Creatures that grant extra turns
	'Medomai the Ageless',
	'Lighthouse Chronologist',
	'Sage of Hours',
	'Magosi, the Waterveil',

	// Artifacts/other
	'Time Sieve',
	'Ugin\'s Nexus',
	'Emrakul, the Promised End'
]);

/**
 * Chaining Extra Turn cards
 * Cards that enable taking multiple consecutive extra turns
 * These push decks to Bracket 4
 */
export const CHAINING_EXTRA_TURNS = new Set<string>([
	// Cards that inherently give multiple turns
	'Time Stretch',
	'Expropriate',
	'Temporal Extortion',

	// Cards that can chain indefinitely
	'Nexus of Fate', // Shuffles back into library
	'Beacon of Tomorrows', // Shuffles back into library

	// Multiple combat steps (can chain with combat-based cards)
	'Aggravated Assault',
	'Sword of Feast and Famine',
	'Nature\'s Will',
	'Bear Umbra',
	'Grand Warlord Radha',
	'Savage Ventmaw',
	'Hellkite Charger',
	'Combat Celebrant',
	'Port Razer',
	'Moraug, Fury of Akoum',
	'Karlach, Fury of Avernus',
	'Najeela, the Blade-Blossom',
	'Delina, Wild Mage',
	'Isshin, Two Heavens as One'
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
 * Check if a card is a Mass Land Denial card
 */
export function isMassLandDenial(cardName: string): boolean {
	const normalizedName = cardName.trim();
	return MASS_LAND_DENIAL.has(normalizedName);
}

/**
 * Check if a deck contains any Mass Land Denial cards
 * @param cardNames - Array of card names in the deck
 * @returns True if deck has any MLD cards
 */
export function hasMassLandDenial(cardNames: string[]): boolean {
	return cardNames.some(name => isMassLandDenial(name));
}

/**
 * Check if a card grants extra turns
 */
export function isExtraTurnCard(cardName: string): boolean {
	const normalizedName = cardName.trim();
	return EXTRA_TURNS.has(normalizedName);
}

/**
 * Check if a deck contains any extra turn cards
 * @param cardNames - Array of card names in the deck
 * @returns True if deck has any extra turn cards
 */
export function hasExtraTurns(cardNames: string[]): boolean {
	return cardNames.some(name => isExtraTurnCard(name));
}

/**
 * Check if a card enables chaining extra turns
 */
export function isChainingExtraTurnCard(cardName: string): boolean {
	const normalizedName = cardName.trim();
	return CHAINING_EXTRA_TURNS.has(normalizedName);
}

/**
 * Check if a deck contains cards that enable chaining extra turns
 * @param cardNames - Array of card names in the deck
 * @returns True if deck has chaining extra turn potential
 */
export function hasChainingExtraTurns(cardNames: string[]): boolean {
	return cardNames.some(name => isChainingExtraTurnCard(name));
}

/**
 * Calculate the bracket level based on Game Changer count and other factors
 *
 * Bracket guidelines (WotC Commander Brackets, February 2025):
 * - Bracket 1 (Exhibition): No mass land denial, no extra turns, no 2-card infinite combos, no game changers, few tutors
 * - Bracket 2 (Core): No mass land denial, no chaining extra turns, no 2-card infinite combos, no game changers, few tutors
 * - Bracket 3 (Upgraded): No mass land denial, no chaining extra turns, late-game 2-card infinite combos OK, up to 3 game changers
 * - Bracket 4 (Optimized): No restrictions except banned list (4+ game changers, early combos, MLD, chaining turns all allowed)
 * - Bracket 5 (cEDH): No restrictions except banned list
 *
 * Key differentiators:
 * - Mass land denial: Pushes to Bracket 4
 * - Extra turns: Any extra turns → Bracket 2+; Chaining extra turns → Bracket 4+
 * - 2-card infinite combos: Late-game only → Bracket 3; Early-game → Bracket 4
 * - Game Changers: 0 → Bracket 1/2; 1-3 → Bracket 3; 4+ → Bracket 4
 * - Tutors: "Few" for Brackets 1-2 (subjective, not enforced)
 *
 * @param gameChangerCount - Number of Game Changers in the deck
 * @param options - Additional factors for bracket calculation
 * @param options.twoCardComboCount - Number of 2-card infinite combos (from Commander Spellbook)
 * @param options.earlyGameComboCount - Number of fast/early-game combos (win before turn 7)
 * @param options.lateGameComboCount - Number of late-game combos (win turn 7+)
 * @param options.hasExtraTurns - Whether deck has any extra turn cards
 * @param options.hasChainingExtraTurns - Whether deck chains multiple extra turns
 * @param options.hasMassLandDestruction - Whether deck has mass land destruction
 * @returns Bracket level (1-5)
 */
export function calculateBracketLevel(
	gameChangerCount: number,
	options?: {
		twoCardComboCount?: number;
		earlyGameComboCount?: number;
		lateGameComboCount?: number;
		hasExtraTurns?: boolean;
		hasChainingExtraTurns?: boolean;
		hasMassLandDestruction?: boolean;
	}
): BracketLevel {
	const earlyGameCombos = options?.earlyGameComboCount ?? 0;
	const lateGameCombos = options?.lateGameComboCount ?? 0;
	const hasMLD = options?.hasMassLandDestruction ?? false;
	const hasChainingTurns = options?.hasChainingExtraTurns ?? false;
	const hasExtraTurns = options?.hasExtraTurns ?? false;

	// Bracket 4 criteria (any of these pushes to Bracket 4):
	// - Mass land denial
	// - Chaining extra turns
	// - Early-game 2-card infinite combos
	// - 4+ Game Changers
	if (hasMLD || hasChainingTurns || earlyGameCombos > 0 || gameChangerCount >= 4) {
		return BracketLevel.Optimized;
	}

	// Bracket 3 criteria:
	// - 1-3 Game Changers
	// - Late-game 2-card infinite combos (without MLD or chaining turns)
	if (gameChangerCount >= 1 && gameChangerCount <= 3) {
		return BracketLevel.Upgraded;
	}
	if (lateGameCombos > 0) {
		return BracketLevel.Upgraded;
	}

	// Bracket 1/2: No Game Changers
	if (gameChangerCount === 0) {
		// Bracket 1 (Exhibition): No extra turns, no 2-card combos, no MLD
		// Pure casual, theme-focused play
		if (!hasExtraTurns && earlyGameCombos === 0 && lateGameCombos === 0 && !hasMLD) {
			return BracketLevel.Exhibition;
		}
		// Bracket 2 (Core): Precon-level
		// Allows single extra turns (not chaining), but no combos, no MLD
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
			return 'No extra turns, combos, MLD, or Game Changers';
		case BracketLevel.Core:
			return 'No combos, MLD, or Game Changers';
		case BracketLevel.Upgraded:
			return 'Up to 3 Game Changers, late-game combos OK';
		case BracketLevel.Optimized:
			return '4+ Game Changers, early combos, MLD, or chaining turns';
		case BracketLevel.CEDH:
			return 'Competitive EDH';
		default:
			return '';
	}
}
