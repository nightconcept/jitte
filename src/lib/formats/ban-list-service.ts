/**
 * Ban list service for checking card legality across formats
 */

import { BAN_LISTS } from './ban-lists';
import type { DeckFormat } from './format-registry';
import type { Card } from '$lib/types/card';

export class BanListService {
	/**
	 * Check if a card is banned in a specific format
	 */
	static isCardBanned(card: Card, format: DeckFormat): boolean {
		const banList = BAN_LISTS[format];
		const cardName = card.name.toLowerCase();

		return banList.banned.some((entry) => entry.cardName.toLowerCase() === cardName);
	}

	/**
	 * Get ban list metadata for a format
	 */
	static getBanListInfo(format: DeckFormat) {
		const banList = BAN_LISTS[format];
		return {
			lastUpdated: banList.lastUpdated,
			source: banList.source,
			bannedCount: banList.banned.length
		};
	}

	/**
	 * Get all banned cards for a format
	 */
	static getBannedCards(format: DeckFormat) {
		return BAN_LISTS[format].banned;
	}
}
