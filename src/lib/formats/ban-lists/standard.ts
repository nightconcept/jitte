/**
 * Standard format ban list
 * Source: https://magic.wizards.com/en/banned-restricted
 * Last updated: 2024-11-14
 */

import { DeckFormat } from '../format-registry';
import type { FormatBanList } from './types';

export const standardBanList: FormatBanList = {
	format: DeckFormat.Standard,
	lastUpdated: '2024-11-14',
	source: 'https://magic.wizards.com/en/banned-restricted',
	banned: [
		// Standard currently has no banned cards as of November 2024
		// When cards are banned, add them here with dates
	]
};
