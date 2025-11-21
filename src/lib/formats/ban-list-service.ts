/**
 * Ban list service for checking card legality across formats
 */

import { FORMAT_METADATA, type DeckFormat } from './format-registry';
import type { Card } from '$lib/types/card';

export class BanListService {
	/**
	 * Check if a card is banned in a specific format
	 */
	static isCardBanned(card: Card, format: DeckFormat): boolean {
		const banList = FORMAT_METADATA[format].banList;
		const cardName = card.name.toLowerCase();

		return banList.banned.some((name: string) => name.toLowerCase() === cardName);
	}

	/**
	 * Check if a card is restricted in a specific format (Vintage)
	 */
	static isCardRestricted(card: Card, format: DeckFormat): boolean {
		const banList = FORMAT_METADATA[format].banList;
		const cardName = card.name.toLowerCase();

		return banList.restricted?.some((name: string) => name.toLowerCase() === cardName) ?? false;
	}

	/**
	 * Check if a card is suspended in a specific format (Historic)
	 */
	static isCardSuspended(card: Card, format: DeckFormat): boolean {
		const banList = FORMAT_METADATA[format].banList;
		const cardName = card.name.toLowerCase();

		return banList.suspended?.some((name: string) => name.toLowerCase() === cardName) ?? false;
	}

	/**
	 * Get ban list metadata for a format
	 */
	static getBanListInfo(format: DeckFormat) {
		const metadata = FORMAT_METADATA[format];
		return {
			lastUpdated: metadata.banListLastUpdated,
			bannedCount: metadata.banList.banned.length,
			restrictedCount: metadata.banList.restricted?.length ?? 0,
			suspendedCount: metadata.banList.suspended?.length ?? 0
		};
	}

	/**
	 * Get all banned cards for a format
	 */
	static getBannedCards(format: DeckFormat): string[] {
		return FORMAT_METADATA[format].banList.banned;
	}

	/**
	 * Get all restricted cards for a format (Vintage)
	 */
	static getRestrictedCards(format: DeckFormat): string[] {
		return FORMAT_METADATA[format].banList.restricted ?? [];
	}

	/**
	 * Get all suspended cards for a format (Historic)
	 */
	static getSuspendedCards(format: DeckFormat): string[] {
		return FORMAT_METADATA[format].banList.suspended ?? [];
	}
}
