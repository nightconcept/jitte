/**
 * EDHREC Parser
 *
 * Parses EDHREC page HTML to extract structured data from __NEXT_DATA__ JSON blocks.
 * EDHREC uses Next.js which embeds all page data in a <script id="__NEXT_DATA__"> tag.
 */

import type {
	EDHRECCommanderData,
	EDHRECSaltScore,
	EDHRECCardRecommendation
} from '$lib/types/edhrec';
import { EDHRECError } from '$lib/types/edhrec';

export class EDHRECParser {
	/**
	 * Extract and parse __NEXT_DATA__ JSON from HTML
	 */
	private parseNextData(html: string): unknown {
		// Match the __NEXT_DATA__ script tag
		const match = html.match(
			/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s
		);

		if (!match || !match[1]) {
			throw new EDHRECError('Could not find __NEXT_DATA__ in page HTML');
		}

		try {
			return JSON.parse(match[1]);
		} catch (error) {
			throw new EDHRECError(
				'Failed to parse __NEXT_DATA__ JSON',
				undefined,
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Parse commander page data
	 */
	parseCommanderData(html: string): EDHRECCommanderData {
		const nextData = this.parseNextData(html) as Record<string, unknown>;

		// Navigate to the data structure
		const props = nextData.props as Record<string, unknown> | undefined;
		const pageProps = props?.pageProps as Record<string, unknown> | undefined;
		const data = pageProps?.data as Record<string, unknown> | undefined;
		const container = data?.container as Record<string, unknown> | undefined;
		const jsonDict = container?.json_dict as Record<string, unknown> | undefined;

		if (!jsonDict) {
			throw new EDHRECError('Unexpected EDHREC page structure - could not find json_dict');
		}

		// Extract commander info
		const commanderInfo = jsonDict.commander as Record<string, unknown> | undefined;

		// Extract card lists
		const cardlists = (jsonDict.cardlists as Array<Record<string, unknown>>) || [];

		return {
			commander: (commanderInfo?.name as string) || '',
			sanitized: (commanderInfo?.sanitized as string) || '',
			cardlists: cardlists.map((list) => ({
				header: (list.header as string) || '',
				cards: this.parseCardViews(list.cardviews as Array<Record<string, unknown>> | undefined)
			})),
			totalDecks: (jsonDict.num_decks as number) || 0
		};
	}

	/**
	 * Parse card views (recommendations)
	 */
	private parseCardViews(
		cardviews: Array<Record<string, unknown>> | undefined
	): EDHRECCardRecommendation[] {
		if (!cardviews || !Array.isArray(cardviews)) {
			return [];
		}

		return cardviews.map((card) => {
			// EDHREC data structure (new format):
			// synergy: 0.02 (decimal, 0.02 = 2%)
			// inclusion: 111 (number of decks using this card)
			// num_decks: 111 (same as inclusion)
			// potential_decks: 27014 (total decks for this commander)

			const synergy = (card.synergy as number) || 0;
			const inclusion = (card.inclusion as number) || (card.num_decks as number) || 0;
			const potentialDecks = (card.potential_decks as number) || 1;

			// Calculate synergy and inclusion as percentages
			const synergyScore = Math.round(synergy * 100);
			const inclusionRate = Math.round((inclusion / potentialDecks) * 100);

			// Build label in the old format for compatibility
			const label = `${inclusionRate}% of ${inclusion.toLocaleString()} decks`;

			return {
				name: (card.name as string) || '',
				sanitized: (card.sanitized as string) || '',
				synergyScore,
				inclusionRate,
				deckCount: inclusion,
				label,
				url: `https://edhrec.com/cards/${card.sanitized as string}`
			};
		});
	}

	/**
	 * Parse salt scores from top salt page
	 */
	parseSaltScores(html: string): EDHRECSaltScore[] {
		const nextData = this.parseNextData(html) as Record<string, unknown>;

		// Navigate to card list
		const props = nextData.props as Record<string, unknown> | undefined;
		const pageProps = props?.pageProps as Record<string, unknown> | undefined;
		const data = pageProps?.data as Record<string, unknown> | undefined;
		const container = data?.container as Record<string, unknown> | undefined;
		const jsonDict = container?.json_dict as Record<string, unknown> | undefined;
		const cardlists = jsonDict?.cardlists as Array<Record<string, unknown>> | undefined;

		if (!cardlists || cardlists.length === 0) {
			throw new EDHRECError('Could not find salt score card list');
		}

		const saltList = cardlists[0];
		const cardviews = (saltList.cardviews as Array<Record<string, unknown>>) || [];

		return cardviews.map((card, index) => ({
			cardName: (card.name as string) || '',
			saltScore: this.parseSaltScore((card.label as string) || ''),
			deckCount: this.parseDeckCount((card.label as string) || ''),
			rank: index + 1
		}));
	}

	/**
	 * Parse individual card page for salt score
	 */
	parseCardSaltScore(html: string): EDHRECSaltScore | null {
		try {
			const nextData = this.parseNextData(html) as Record<string, unknown>;

			// Navigate to card data
			const props = nextData.props as Record<string, unknown> | undefined;
			const pageProps = props?.pageProps as Record<string, unknown> | undefined;
			const data = pageProps?.data as Record<string, unknown> | undefined;
			const container = data?.container as Record<string, unknown> | undefined;
			const jsonDict = container?.json_dict as Record<string, unknown> | undefined;

			if (!jsonDict) return null;

			// Look for salt score in card metadata
			const cardInfo = jsonDict.card as Record<string, unknown> | undefined;
			const saltScore = cardInfo?.salt as number | undefined;

			if (saltScore === undefined) return null;

			return {
				cardName: (cardInfo?.name as string) || '',
				saltScore: saltScore,
				deckCount: (cardInfo?.num_decks as number) || 0
			};
		} catch {
			return null;
		}
	}

	/**
	 * Parse percentage from string like "14%" or "14% of 2345 decks"
	 */
	private parsePercentage(str: string): number {
		const match = str.match(/(\d+(?:\.\d+)?)%/);
		return match ? parseFloat(match[1]) : 0;
	}

	/**
	 * Parse deck count from string like "14% of 2345 decks" or "2,345 decks"
	 */
	private parseDeckCount(str: string): number {
		// Try "X decks" format
		const match = str.match(/(\d[\d,]*)\s+decks?/);
		if (match) {
			return parseInt(match[1].replace(/,/g, ''), 10);
		}

		// Try "X of Y decks" format
		const match2 = str.match(/of\s+(\d[\d,]*)\s+decks?/);
		if (match2) {
			return parseInt(match2[1].replace(/,/g, ''), 10);
		}

		return 0;
	}

	/**
	 * Parse salt score from string like "Salt Score: 2.73"
	 */
	private parseSaltScore(str: string): number {
		const match = str.match(/Salt Score:\s*([\d.]+)/);
		return match ? parseFloat(match[1]) : 0;
	}

	/**
	 * Sanitize card name to URL slug (matches EDHREC's format)
	 * EDHREC handles possessives by removing apostrophes but keeping the 's' attached
	 * Example: "Sevinne's Reclamation" → "sevinnes-reclamation" not "sevinne-s-reclamation"
	 * For modal/double-faced cards, only uses the front face name
	 * Example: "Peter Parker // Amazing Spider-Man" → "peter-parker"
	 * Handles accented characters by converting to base forms
	 * Example: "Araña, Heart of the Spider" → "arana-heart-of-the-spider"
	 */
	static sanitizeName(name: string): string {
		// For modal/double-faced cards, only use the front face
		const frontFace = name.split('//')[0].trim();

		return frontFace
			.toLowerCase()
			// Normalize Unicode characters and remove diacritical marks
			// NFD = Normalization Form Canonical Decomposition
			// This converts "ñ" to "n" + combining tilde, then we strip the combining marks
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents, tildes, etc.)
			.replace(/'/g, '') // Remove apostrophes first (keeps possessive 's' attached)
			.replace(/[^a-z0-9]+/g, '-') // Then replace other non-alphanumeric with hyphens
			.replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
	}
}
