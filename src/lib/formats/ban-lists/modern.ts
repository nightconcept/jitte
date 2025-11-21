/**
 * Modern format ban list
 * Source: https://magic.wizards.com/en/banned-restricted
 * Last updated: 2025-11-21
 */

import type { FormatBanList } from './types';

export const modernBanList: FormatBanList = {
	lastUpdated: '2025-11-21',
	source: 'https://magic.wizards.com/en/banned-restricted',
	banned: [
		{ cardName: 'Amped Raptor', bannedDate: '2024-06-14' },
		{ cardName: 'Ancient Den', bannedDate: '2011-01-01' },
		{ cardName: 'Arcum\'s Astrolabe', bannedDate: '2019-06-14' },
		{ cardName: 'Birthing Pod', bannedDate: '2014-01-18' },
		{ cardName: 'Blazing Shoal', bannedDate: '2011-01-01' },
		{ cardName: 'Bridge from Below', bannedDate: '2019-07-08' },
		{ cardName: 'Chrome Mox', bannedDate: '2011-01-01' },
		{ cardName: 'Cloudpost', bannedDate: '2011-01-01' },
		{ cardName: 'Dark Depths', bannedDate: '2011-01-01' },
		{ cardName: 'Deathrite Shaman', bannedDate: '2014-02-03' },
		{ cardName: 'Dig Through Time', bannedDate: '2015-01-19' },
		{ cardName: 'Dread Return', bannedDate: '2011-01-01' },
		{ cardName: 'Eye of Ugin', bannedDate: '2016-04-04' },
		{ cardName: 'Field of the Dead', bannedDate: '2024-08-26' },
		{ cardName: 'Fury', bannedDate: '2021-06-18' },
		{ cardName: 'Gitaxian Probe', bannedDate: '2017-01-16' },
		{ cardName: 'Glimpse of Nature', bannedDate: '2011-01-01' },
		{ cardName: 'Golgari Grave-Troll', bannedDate: '2015-01-19' },
		{ cardName: 'Great Furnace', bannedDate: '2011-01-01' },
		{ cardName: 'Grief', bannedDate: '2021-06-18' },
		{ cardName: 'Hogaak, Arisen Necropolis', bannedDate: '2019-08-26' },
		{ cardName: 'Hypergenesis', bannedDate: '2011-01-01' },
		{ cardName: 'Jegantha, the Wellspring', bannedDate: '2020-04-24' },
		{ cardName: 'Krark-Clan Ironworks', bannedDate: '2004-06-04' },
		{ cardName: 'Lurrus of the Dream-Den', bannedDate: '2020-04-24' },
		{ cardName: 'Mental Misstep', bannedDate: '2011-05-13' },
		{ cardName: 'Mycosynth Lattice', bannedDate: '2018-06-08' },
		{ cardName: 'Mystic Sanctuary', bannedDate: '2021-02-15' },
		{ cardName: 'Nadu, Winged Wisdom', bannedDate: '2024-06-14' },
		{ cardName: 'Oko, Thief of Crowns', bannedDate: '2020-01-13' },
		{ cardName: 'Once Upon a Time', bannedDate: '2020-01-13' },
		{ cardName: 'Ponder', bannedDate: '2011-01-01' },
		{ cardName: 'Punishing Fire', bannedDate: '2011-09-20' },
		{ cardName: 'Rite of Flame', bannedDate: '2011-01-01' },
		{ cardName: 'Seat of the Synod', bannedDate: '2011-01-01' },
		{ cardName: 'Second Sunrise', bannedDate: '2003-10-02' },
		{ cardName: 'Seething Song', bannedDate: '2013-01-28' },
		{ cardName: 'Sensei\'s Divining Top', bannedDate: '2022-07-08' },
		{ cardName: 'Simian Spirit Guide', bannedDate: '2021-02-15' },
		{ cardName: 'Skullclamp', bannedDate: '2011-01-01' },
		{ cardName: 'Summer Bloom', bannedDate: '2016-01-18' },
		{ cardName: 'The One Ring', bannedDate: '2024-08-26' },
		{ cardName: 'Tibalt\'s Trickery', bannedDate: '2021-02-05' },
		{ cardName: 'Treasure Cruise', bannedDate: '2015-01-19' },
		{ cardName: 'Tree of Tales', bannedDate: '2011-01-01' },
		{ cardName: 'Umezawa\'s Jitte', bannedDate: '2005-02-04' },
		{ cardName: 'Underworld Breach', bannedDate: '2020-01-24' },
		{ cardName: 'Up the Beanstalk', bannedDate: '2023-09-08' },
		{ cardName: 'Uro, Titan of Nature\'s Wrath', bannedDate: '2020-01-24' },
		{ cardName: 'Vault of Whispers', bannedDate: '2011-01-01' },
		{ cardName: 'Violent Outburst', bannedDate: '2009-04-30' },
		{ cardName: 'Yorion, Sky Nomad', bannedDate: '2020-04-24' }
	]
};

// Simple export for FORMAT_METADATA embedding
export const modernBanned: string[] = modernBanList.banned.map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
