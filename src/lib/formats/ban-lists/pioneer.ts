/**
 * Pioneer format ban list
 * Source: https://magic.wizards.com/en/banned-restricted
 * Last updated: 2025-11-21
 */

import type { FormatBanList } from './types';

export const pioneerBanList: FormatBanList = {
	lastUpdated: '2025-11-21',
	source: 'https://magic.wizards.com/en/banned-restricted',
	banned: [
		{ cardName: 'Amalia Benavides Aguirre', bannedDate: '2023-11-17' },
		{ cardName: 'Balustrade Spy', bannedDate: '2024-01-12' },
		{ cardName: 'Bloodstained Mire', bannedDate: '2024-06-14' },
		{ cardName: 'Expressive Iteration', bannedDate: '2025-04-11' },
		{ cardName: 'Felidar Guardian', bannedDate: '2017-01-20' },
		{ cardName: 'Field of the Dead', bannedDate: '2019-07-12' },
		{ cardName: 'Flooded Strand', bannedDate: '2024-06-14' },
		{ cardName: 'Geological Appraiser', bannedDate: '2023-11-17' },
		{ cardName: 'Heartfire Hero', bannedDate: '2024-08-02' },
		{ cardName: 'Inverter of Truth', bannedDate: '2016-01-22' },
		{ cardName: 'Jegantha, the Wellspring', bannedDate: '2020-04-24' },
		{ cardName: 'Karn, the Great Creator', bannedDate: '2024-01-12' },
		{ cardName: 'Kethis, the Hidden Hand', bannedDate: '2019-07-12' },
		{ cardName: 'Leyline of Abundance', bannedDate: '2019-07-12' },
		{ cardName: 'Lurrus of the Dream-Den', bannedDate: '2020-04-24' },
		{ cardName: 'Nexus of Fate', bannedDate: '2024-08-02' },
		{ cardName: 'Oko, Thief of Crowns', bannedDate: '2019-10-04' },
		{ cardName: 'Once Upon a Time', bannedDate: '2019-10-04' },
		{ cardName: 'Polluted Delta', bannedDate: '2024-06-14' },
		{ cardName: 'Sorin, Imperious Bloodlord', bannedDate: '2025-01-24' },
		{ cardName: 'Teferi, Time Raveler', bannedDate: '2024-01-12' },
		{ cardName: 'Undercity Informer', bannedDate: '2013-02-01' },
		{ cardName: 'Underworld Breach', bannedDate: '2020-01-24' },
		{ cardName: 'Uro, Titan of Nature\'s Wrath', bannedDate: '2020-01-24' },
		{ cardName: 'Veil of Summer', bannedDate: '2019-07-12' },
		{ cardName: 'Walking Ballista', bannedDate: '2020-08-07' },
		{ cardName: 'Wilderness Reclamation', bannedDate: '2024-09-27' },
		{ cardName: 'Windswept Heath', bannedDate: '2024-06-14' },
		{ cardName: 'Winota, Joiner of Forces', bannedDate: '2020-04-24' },
		{ cardName: 'Wooded Foothills', bannedDate: '2024-06-14' }
	]
};

// Simple export for FORMAT_METADATA embedding
export const pioneerBanned: string[] = pioneerBanList.banned.map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
