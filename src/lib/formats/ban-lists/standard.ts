/**
 * Standard format ban list
 * Source: https://magic.wizards.com/en/banned-restricted
 * Last updated: 2025-11-21
 */

import { DeckFormat } from '../format-registry';
import type { FormatBanList } from './types';

export const standardBanList: FormatBanList = {
	format: DeckFormat.Standard,
	lastUpdated: '2025-11-21',
	source: 'https://magic.wizards.com/en/banned-restricted',
	banned: [
		{ cardName: 'Abuelo's Awakening', bannedDate: '2023-11-17' },
		{ cardName: 'Cori-Steel Cutter', bannedDate: '2025-04-11' },
		{ cardName: 'Heartfire Hero', bannedDate: '2024-08-02' },
		{ cardName: 'Hopeless Nightmare', bannedDate: '2023-09-08' },
		{ cardName: 'Monstrous Rage', bannedDate: '2023-09-08' },
		{ cardName: 'Proft's Eidetic Memory', bannedDate: '2024-02-09' },
		{ cardName: 'Screaming Nemesis', bannedDate: '2024-09-27' },
		{ cardName: 'This Town Ain't Big Enough', bannedDate: '2024-04-19' },
		{ cardName: 'Up the Beanstalk', bannedDate: '2023-09-08' },
		{ cardName: 'Vivi Ornitier', bannedDate: '2025-06-13' }
	]
};

// Simple export for FORMAT_METADATA embedding
export const standardBanned: string[] = standardBanList.banned.map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
