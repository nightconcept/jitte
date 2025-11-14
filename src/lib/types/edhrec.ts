/**
 * EDHREC API Type Definitions
 *
 * Types for interacting with EDHREC data (unofficial API via web scraping)
 * EDHREC does not provide an official API, so we parse their Next.js page data.
 */

/**
 * Salt score data for a single card
 * Salt scores range from 0-4, based on annual user surveys
 * Higher scores = more frustrating/unfun for opponents
 */
export interface EDHRECSaltScore {
	cardName: string;
	saltScore: number; // 0-4 scale
	deckCount: number; // Number of decks using this card
	rank?: number; // Position in top 100 saltiest cards
}

/**
 * Card recommendation from EDHREC
 * Includes synergy and inclusion statistics
 */
export interface EDHRECCardRecommendation {
	name: string;
	sanitized: string; // URL-safe slug
	synergyScore: number; // Percentage (0-100)
	inclusionRate: number; // Percentage (0-100)
	deckCount: number;
	label: string; // Original label from EDHREC (e.g. "14% of 2345 decks")
	url: string; // Link to card page on EDHREC
	category?: string; // "High Synergy Cards", "New Cards", etc.
}

/**
 * Commander page data from EDHREC
 * Contains all recommendation lists and metadata
 */
export interface EDHRECCommanderData {
	commander: string;
	sanitized: string; // URL-safe slug
	cardlists: {
		header: string; // "High Synergy Cards", "New Cards", "Top Cards", etc.
		cards: EDHRECCardRecommendation[];
	}[];
	totalDecks: number; // Number of decks in database for this commander
}

/**
 * Cache entry for localStorage
 * Includes timestamp and TTL for expiration
 */
export interface EDHRECCacheEntry {
	timestamp: number; // When cached (Date.now())
	ttl: number; // Time to live in milliseconds
	data: EDHRECSaltScore | EDHRECSaltScore[] | EDHRECCommanderData;
}

/**
 * Deck salt score summary
 */
export interface DeckSaltScore {
	totalSalt: number; // Sum of all salt scores in the deck
	averageSalt: number; // Average salt score (for reference)
	topSaltyCards: Array<{ name: string; saltScore: number }>;
	totalCardsWithScores: number;
}

/**
 * EDHREC API error
 */
export class EDHRECError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
		public cause?: Error
	) {
		super(message);
		this.name = 'EDHRECError';
	}
}
