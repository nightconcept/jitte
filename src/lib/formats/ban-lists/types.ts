/**
 * Ban list types for Magic: The Gathering formats
 */

import type { DeckFormat } from '../format-registry';

export interface BanListEntry {
	cardName: string;
	oracleId?: string;
	bannedDate: string; // ISO date
	reason?: string;
}

export interface FormatBanList {
	format: DeckFormat;
	lastUpdated: string;
	source: string; // Official ban list URL
	banned: BanListEntry[];
}
