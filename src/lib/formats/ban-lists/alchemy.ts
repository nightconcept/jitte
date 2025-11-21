/**
 * Alchemy format ban list
 * Source: https://magic.wizards.com/en/banned-restricted
 * Last updated: 2025-11-21
 */

import type { FormatBanList } from './types';

export const alchemyBanList: FormatBanList = {
	lastUpdated: '2025-11-21',
	source: 'https://magic.wizards.com/en/banned-restricted',
	banned: [

	]
};

// Simple export for FORMAT_METADATA embedding
export const alchemyBanned: string[] = alchemyBanList.banned.map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
