/**
 * EDHREC Salt Scores - 2025 Edition
 *
 * Source: https://edhrec.com/top/salt
 * © EDHREC.com - Used with attribution under fair use
 * Data fetched: 2025-11-14
 *
 * Salt scores are community-driven ratings indicating how frustrating
 * cards are to play against, measured on a 0-4 scale:
 * - 0: Not salty at all, fun to play against
 * - 1: Slightly annoying
 * - 2: Moderately frustrating
 * - 3: Very frustrating
 * - 4: Extremely unfun, ruins games
 *
 * Scores are updated annually based on EDHREC's community survey.
 * To update this file, run: npx tsx scripts/fetch-salt-scores.ts
 */

export interface SaltScoreData {
	rank: number;
	name: string;
	score: number;
	deckCount: number;
}

/**
 * Top 100 saltiest cards from EDHREC
 * Sorted by salt score (highest first)
 */
export const SALT_SCORES: readonly SaltScoreData[] = Object.freeze([
	{ rank: 1, name: "Stasis", score: 3.06, deckCount: 14232 },
	{ rank: 2, name: "Winter Orb", score: 2.96, deckCount: 41078 },
	{ rank: 3, name: "Vivi Ornitier", score: 2.81, deckCount: 30605 },
	{ rank: 4, name: "Tergrid, God of Fright", score: 2.8, deckCount: 70666 },
	{ rank: 5, name: "Rhystic Study", score: 2.73, deckCount: 891617 },
	{ rank: 6, name: "The Tabernacle at Pendrell Vale", score: 2.68, deckCount: 10524 },
	{ rank: 7, name: "Armageddon", score: 2.67, deckCount: 30369 },
	{ rank: 8, name: "Static Orb", score: 2.62, deckCount: 21995 },
	{ rank: 9, name: "Vorinclex, Voice of Hunger", score: 2.61, deckCount: 74873 },
	{ rank: 10, name: "Thassa's Oracle", score: 2.59, deckCount: 235928 },
	{ rank: 11, name: "Grand Arbiter Augustin IV", score: 2.58, deckCount: 58326 },
	{ rank: 12, name: "Smothering Tithe", score: 2.58, deckCount: 748992 },
	{ rank: 13, name: "Jin-Gitaxias, Core Augur", score: 2.57, deckCount: 76701 },
	{ rank: 14, name: "The One Ring", score: 2.55, deckCount: 628225 },
	{ rank: 15, name: "Humility", score: 2.51, deckCount: 7417 },
	{ rank: 16, name: "Drannith Magistrate", score: 2.46, deckCount: 165184 },
	{ rank: 17, name: "Expropriate", score: 2.45, deckCount: 50702 },
	{ rank: 18, name: "Sunder", score: 2.44, deckCount: 6072 },
	{ rank: 19, name: "Obliterate", score: 2.42, deckCount: 11299 },
	{ rank: 20, name: "Devastation", score: 2.41, deckCount: 2556 },
	{ rank: 21, name: "Ravages of War", score: 2.39, deckCount: 7758 },
	{ rank: 22, name: "Cyclonic Rift", score: 2.36, deckCount: 852883 },
	{ rank: 23, name: "Jokulhaups", score: 2.36, deckCount: 8522 },
	{ rank: 24, name: "Apocalypse", score: 2.34, deckCount: 2420 },
	{ rank: 25, name: "Opposition Agent", score: 2.32, deckCount: 208064 },
	{ rank: 26, name: "Urza, Lord High Artificer", score: 2.31, deckCount: 117007 },
	{ rank: 27, name: "Fierce Guardianship", score: 2.3, deckCount: 641827 },
	{ rank: 28, name: "Hokori, Dust Drinker", score: 2.27, deckCount: 4826 },
	{ rank: 29, name: "Back to Basics", score: 2.23, deckCount: 26247 },
	{ rank: 30, name: "Nether Void", score: 2.23, deckCount: 3191 },
	{ rank: 31, name: "Jin-Gitaxias, Progress Tyrant", score: 2.22, deckCount: 77868 },
	{ rank: 32, name: "Braids, Cabal Minion", score: 2.21, deckCount: 13284 },
	{ rank: 33, name: "Worldfire", score: 2.2, deckCount: 12728 },
	{ rank: 34, name: "Toxrill, the Corrosive", score: 2.19, deckCount: 48762 },
	{ rank: 35, name: "Aura Shards", score: 2.18, deckCount: 118017 },
	{ rank: 36, name: "Gaea's Cradle", score: 2.17, deckCount: 197313 },
	{ rank: 37, name: "Kinnan, Bonder Prodigy", score: 2.15, deckCount: 68044 },
	{ rank: 38, name: "Yuriko, the Tiger's Shadow", score: 2.15, deckCount: 20319 },
	{ rank: 39, name: "Teferi's Protection", score: 2.13, deckCount: 584041 },
	{ rank: 40, name: "Blood Moon", score: 2.13, deckCount: 94763 },
	{ rank: 41, name: "Farewell", score: 2.13, deckCount: 436338 },
	{ rank: 42, name: "Rising Waters", score: 2.11, deckCount: 2806 },
	{ rank: 43, name: "Decree of Annihilation", score: 2.1, deckCount: 7639 },
	{ rank: 44, name: "Winter Moon", score: 2.08, deckCount: 42037 },
	{ rank: 45, name: "Smokestack", score: 2.08, deckCount: 12537 },
	{ rank: 46, name: "Orcish Bowmasters", score: 2.07, deckCount: 323224 },
	{ rank: 47, name: "Tectonic Break", score: 2.05, deckCount: 3458 },
	{ rank: 48, name: "Edgar Markov", score: 2.05, deckCount: 611 },
	{ rank: 49, name: "Sen Triplets", score: 2.04, deckCount: 4399 },
	{ rank: 50, name: "Warp World", score: 2.04, deckCount: 15297 },
	{ rank: 51, name: "Sheoldred, the Apocalypse", score: 2.03, deckCount: 194773 },
	{ rank: 52, name: "Emrakul, the Promised End", score: 2.03, deckCount: 66608 },
	{ rank: 53, name: "Scrambleverse", score: 2.02, deckCount: 9750 },
	{ rank: 54, name: "Thieves' Auction", score: 2.02, deckCount: 9642 },
	{ rank: 55, name: "Force of Will", score: 2.01, deckCount: 370265 },
	{ rank: 56, name: "Narset, Parter of Veils", score: 2.01, deckCount: 138257 },
	{ rank: 57, name: "Glacial Chasm", score: 1.99, deckCount: 56981 },
	{ rank: 58, name: "Ruination", score: 1.99, deckCount: 13813 },
	{ rank: 59, name: "Mindslaver", score: 1.98, deckCount: 23613 },
	{ rank: 60, name: "Epicenter", score: 1.97, deckCount: 3430 },
	{ rank: 61, name: "The Ur-Dragon", score: 1.97, deckCount: 8173 },
	{ rank: 62, name: "Notion Thief", score: 1.96, deckCount: 106035 },
	{ rank: 63, name: "Void Winnower", score: 1.96, deckCount: 78789 },
	{ rank: 64, name: "Jodah, the Unifier", score: 1.94, deckCount: 18975 },
	{ rank: 65, name: "Storm, Force of Nature", score: 1.91, deckCount: 1523 },
	{ rank: 66, name: "Wake of Destruction", score: 1.91, deckCount: 2823 },
	{ rank: 67, name: "Force of Negation", score: 1.91, deckCount: 297815 },
	{ rank: 68, name: "Deadpool, Trading Card", score: 1.9, deckCount: 19642 },
	{ rank: 69, name: "Mana Drain", score: 1.89, deckCount: 527764 },
	{ rank: 70, name: "Blightsteel Colossus", score: 1.88, deckCount: 102614 },
	{ rank: 71, name: "Dictate of Erebos", score: 1.88, deckCount: 115566 },
	{ rank: 72, name: "Boil", score: 1.87, deckCount: 3870 },
	{ rank: 73, name: "Winota, Joiner of Forces", score: 1.85, deckCount: 14105 },
	{ rank: 74, name: "Mana Breach", score: 1.84, deckCount: 9522 },
	{ rank: 75, name: "Global Ruin", score: 1.84, deckCount: 1197 },
	{ rank: 76, name: "Catastrophe", score: 1.83, deckCount: 7120 },
	{ rank: 77, name: "Emrakul, the World Anew", score: 1.83, deckCount: 47381 },
	{ rank: 78, name: "Acid Rain", score: 1.83, deckCount: 1005 },
	{ rank: 79, name: "Time Stretch", score: 1.83, deckCount: 43008 },
	{ rank: 80, name: "Grave Pact", score: 1.82, deckCount: 174296 },
	{ rank: 81, name: "Impending Disaster", score: 1.82, deckCount: 6967 },
	{ rank: 82, name: "Ulamog, the Defiler", score: 1.82, deckCount: 68362 },
	{ rank: 83, name: "Demonic Consultation", score: 1.82, deckCount: 133849 },
	{ rank: 84, name: "Underworld Breach", score: 1.81, deckCount: 220366 },
	{ rank: 85, name: "Consecrated Sphinx", score: 1.8, deckCount: 160160 },
	{ rank: 86, name: "Divine Intervention", score: 1.79, deckCount: 2151 },
	{ rank: 87, name: "Thoughts of Ruin", score: 1.79, deckCount: 2956 },
	{ rank: 88, name: "Miirym, Sentinel Wyrm", score: 1.78, deckCount: 59154 },
	{ rank: 89, name: "Vorinclex, Monstrous Raider", score: 1.78, deckCount: 99717 },
	{ rank: 90, name: "Ad Nauseam", score: 1.78, deckCount: 90433 },
	{ rank: 91, name: "Seedborn Muse", score: 1.77, deckCount: 273078 },
	{ rank: 92, name: "Cataclysm", score: 1.76, deckCount: 6477 },
	{ rank: 93, name: "Elesh Norn, Mother of Machines", score: 1.76, deckCount: 114827 },
	{ rank: 94, name: "Boiling Seas", score: 1.76, deckCount: 1374 },
	{ rank: 95, name: "Magus of the Moon", score: 1.75, deckCount: 44144 },
	{ rank: 96, name: "Elesh Norn, Grand Cenobite", score: 1.74, deckCount: 145317 },
	{ rank: 97, name: "Sway of the Stars", score: 1.74, deckCount: 1433 },
	{ rank: 98, name: "Hullbreaker Horror", score: 1.74, deckCount: 279264 },
	{ rank: 99, name: "Necropotence", score: 1.73, deckCount: 195636 },
	{ rank: 100, name: "Atraxa, Praetors' Voice", score: 1.72, deckCount: 16853 }
] as const);

/**
 * Year of this salt score dataset
 */
export const SALT_SCORES_YEAR = 2025;

/**
 * Date when this data was last updated
 */
export const SALT_SCORES_UPDATED = '2025-11-14';

/**
 * Number of cards in this dataset
 */
export const SALT_SCORES_COUNT = 100;

/**
 * Quick lookup map for fast card name -> salt score queries
 * Card names are normalized to lowercase for case-insensitive matching
 */
export const SALT_SCORES_MAP = new Map<string, SaltScoreData>(
	SALT_SCORES.map(score => [score.name.toLowerCase(), score])
);

/**
 * Get salt score for a card by name (case-insensitive)
 */
export function getSaltScore(cardName: string): SaltScoreData | undefined {
	return SALT_SCORES_MAP.get(cardName.toLowerCase());
}

/**
 * Check if a card has a salt score
 */
export function hasSaltScore(cardName: string): boolean {
	return SALT_SCORES_MAP.has(cardName.toLowerCase());
}

/**
 * Get all cards with salt score >= threshold
 */
export function getCardsBySaltThreshold(threshold: number): readonly SaltScoreData[] {
	return SALT_SCORES.filter(s => s.score >= threshold);
}

/**
 * Get top N saltiest cards
 */
export function getTopSaltiest(count: number): readonly SaltScoreData[] {
	return SALT_SCORES.slice(0, count);
}
