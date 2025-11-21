/**
 * Brawl format ban list
 * Source: https://magic.wizards.com/en/banned-restricted
 * Last updated: 2025-11-21
 */

import type { FormatBanList } from './types';

export const brawlBanList: FormatBanList = {
	lastUpdated: '2025-11-21',
	source: 'https://magic.wizards.com/en/banned-restricted',
	banned: [
		{ cardName: 'Agent of Treachery', bannedDate: '2019-07-12' },
		{ cardName: 'Ancient Tomb', bannedDate: '2018-12-07' },
		{ cardName: 'Chalice of the Void', bannedDate: '2018-03-16' },
		{ cardName: 'Channel', bannedDate: '2017-11-17' },
		{ cardName: 'Chrome Mox', bannedDate: '2020-08-07' },
		{ cardName: 'Demonic Tutor', bannedDate: '2023-08-04' },
		{ cardName: 'Disruptor Flute', bannedDate: '2024-06-14' },
		{ cardName: 'Drannith Magistrate', bannedDate: '2020-04-24' },
		{ cardName: 'Field of the Dead', bannedDate: '2019-07-12' },
		{ cardName: 'Gideon\'s Intervention', bannedDate: '2017-04-28' },
		{ cardName: 'Iona, Shield of Emeria', bannedDate: '2015-05-22' },
		{ cardName: 'Lutri, the Spellchaser', bannedDate: '2020-04-24' },
		{ cardName: 'Mana Drain', bannedDate: '2022-07-08' },
		{ cardName: 'Meddling Mage', bannedDate: '2020-08-07' },
		{ cardName: 'Natural Order', bannedDate: '2016-06-10' },
		{ cardName: 'Nexus of Fate', bannedDate: '2024-08-02' },
		{ cardName: 'Oko, Thief of Crowns', bannedDate: '2019-10-04' },
		{ cardName: 'Phyrexian Revoker', bannedDate: '2022-06-10' },
		{ cardName: 'Pithing Needle', bannedDate: '2022-07-08' },
		{ cardName: 'Runed Halo', bannedDate: '2020-07-03' },
		{ cardName: 'Sorcerous Spyglass', bannedDate: '2024-11-15' },
		{ cardName: 'Strip Mine', bannedDate: '2014-06-16' },
		{ cardName: 'Tainted Pact', bannedDate: '2001-10-01' },
		{ cardName: 'Ugin, the Spirit Dragon', bannedDate: '2020-07-03' }
	]
};

// Simple export for FORMAT_METADATA embedding
export const brawlBanned: string[] = brawlBanList.banned.map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
