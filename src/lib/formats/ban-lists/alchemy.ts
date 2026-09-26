/**
 * Alchemy format ban list
 * Source: https://magic.wizards.com/en/banned-restricted
 * Last updated: 2026-09-26
 */

import type { FormatBanList } from './types';

export const alchemyBanList: FormatBanList = {
	lastUpdated: '2026-09-26',
	source: 'https://magic.wizards.com/en/banned-restricted',
	banned: [
		{ cardName: 'Sewer-veillance Cam', bannedDate: '2026-03-06' }
	]
};

// Simple export for FORMAT_METADATA embedding
export const alchemyBanned: string[] = alchemyBanList.banned.map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
