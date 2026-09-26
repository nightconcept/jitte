/**
 * Brawl format ban list
 * Source: https://magic.wizards.com/en/banned-restricted
 * Last updated: 2026-09-26
 */

import type { FormatBanList } from './types';

export const brawlBanList: FormatBanList = {
	lastUpdated: '2026-09-26',
	source: 'https://magic.wizards.com/en/banned-restricted',
	banned: [
		{ cardName: 'Agent of Treachery', bannedDate: '2019-07-12' },
		{ cardName: 'Ancient Tomb', bannedDate: '2018-12-07' },
		{ cardName: 'Chalice of the Void', bannedDate: '2018-03-16' },
		{ cardName: 'Channel', bannedDate: '2017-11-17' },
		{ cardName: 'Chrome Mox', bannedDate: '2020-08-07' },
		{ cardName: 'Deadly Rollick', bannedDate: '2023-08-04' },
		{ cardName: 'Deflecting Swat', bannedDate: '2023-08-04' },
		{ cardName: 'Demonic Tutor', bannedDate: '2023-08-04' },
		{ cardName: 'Disruptor Flute', bannedDate: '2024-06-14' },
		{ cardName: 'Drannith Magistrate', bannedDate: '2020-04-24' },
		{ cardName: 'Eye of Ugin', bannedDate: '2015-05-22' },
		{ cardName: 'Field of the Dead', bannedDate: '2019-07-12' },
		{ cardName: 'Fierce Guardianship', bannedDate: '2023-08-04' },
		{ cardName: 'Flawless Maneuver', bannedDate: '2026-10-02' },
		{ cardName: 'Force of Will', bannedDate: '2023-01-13' },
		{ cardName: 'Gideon\'s Intervention', bannedDate: '2017-04-28' },
		{ cardName: 'Iona, Shield of Emeria', bannedDate: '2015-05-22' },
		{ cardName: 'Lutri, the Spellchaser', bannedDate: '2020-04-24' },
		{ cardName: 'Mana Drain', bannedDate: '2022-07-08' },
		{ cardName: 'Meddling Mage', bannedDate: '2020-08-07' },
		{ cardName: 'Nadu, Winged Wisdom', bannedDate: '2024-06-14' },
		{ cardName: 'Natural Order', bannedDate: '2016-06-10' },
		{ cardName: 'Nexus of Fate', bannedDate: '2024-08-02' },
		{ cardName: 'Obscuring Haze', bannedDate: '2023-08-04' },
		{ cardName: 'Oko, Thief of Crowns', bannedDate: '2019-10-04' },
		{ cardName: 'Phyrexian Revoker', bannedDate: '2022-06-10' },
		{ cardName: 'Pithing Needle', bannedDate: '2022-07-08' },
		{ cardName: 'Runed Halo', bannedDate: '2020-07-03' },
		{ cardName: 'Sorcerous Spyglass', bannedDate: '2024-11-15' },
		{ cardName: 'Sorin, Imperious Bloodlord', bannedDate: '2025-01-24' },
		{ cardName: 'Strip Mine', bannedDate: '2014-06-16' },
		{ cardName: 'Subtlety', bannedDate: '2021-06-18' },
		{ cardName: 'Tainted Pact', bannedDate: '2001-10-01' },
		{ cardName: 'Temporal Manipulation', bannedDate: '2018-12-07' },
		{ cardName: 'Time Warp', bannedDate: '2026-06-26' },
		{ cardName: 'Ugin, the Spirit Dragon', bannedDate: '2020-07-03' },
		{ cardName: 'Ugin\'s Labyrinth', bannedDate: '2024-06-14' },
		{ cardName: 'Wash Away', bannedDate: '2021-11-19' }
	]
};

// Simple export for FORMAT_METADATA embedding
export const brawlBanned: string[] = brawlBanList.banned.map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
