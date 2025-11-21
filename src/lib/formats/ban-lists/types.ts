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
	format?: DeckFormat; // Optional for now
	lastUpdated: string;
	source?: string; // Official ban list URL
	banned: BanListEntry[] | string[]; // Support both detailed and simple lists
	restricted?: BanListEntry[] | string[]; // Vintage restricted list
	suspended?: BanListEntry[] | string[]; // Historic suspended list
}
