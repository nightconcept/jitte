/**
 * Modern format ban list
 * Source: https://magic.wizards.com/en/banned-restricted
 * Last updated: 2024-08-26
 */

import { DeckFormat } from '../format-registry';
import type { FormatBanList } from './types';

export const modernBanList: FormatBanList = {
	format: DeckFormat.Modern,
	lastUpdated: '2024-08-26',
	source: 'https://magic.wizards.com/en/banned-restricted',
	banned: [
		{ cardName: 'Ancient Den', bannedDate: '2011-01-01' },
		{ cardName: "Arcum's Astrolabe", bannedDate: '2020-08-03' },
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
		{ cardName: 'Faithless Looting', bannedDate: '2019-08-26' },
		{ cardName: 'Field of the Dead', bannedDate: '2024-08-26' },
		{ cardName: 'Gitaxian Probe', bannedDate: '2017-01-16' },
		{ cardName: 'Glimpse of Nature', bannedDate: '2011-01-01' },
		{ cardName: 'Golgari Grave-Troll', bannedDate: '2015-01-19' },
		{ cardName: 'Great Furnace', bannedDate: '2011-01-01' },
		{ cardName: "Green Sun's Zenith", bannedDate: '2011-01-01' },
		{ cardName: 'Hogaak, Arisen Necropolis', bannedDate: '2019-08-26' },
		{ cardName: 'Hypergenesis', bannedDate: '2011-01-01' },
		{ cardName: 'Mystic Sanctuary', bannedDate: '2021-02-15' },
		{ cardName: 'Oko, Thief of Crowns', bannedDate: '2020-01-13' },
		{ cardName: 'Once Upon a Time', bannedDate: '2020-01-13' },
		{ cardName: 'Ponder', bannedDate: '2011-01-01' },
		{ cardName: 'Preordain', bannedDate: '2011-01-01' },
		{ cardName: 'Punishing Fire', bannedDate: '2011-09-20' },
		{ cardName: 'Rite of Flame', bannedDate: '2011-01-01' },
		{ cardName: 'Seat of the Synod', bannedDate: '2011-01-01' },
		{ cardName: 'Seething Song', bannedDate: '2013-01-28' },
		{ cardName: 'Sensei\'s Divining Top', bannedDate: '2017-04-24' },
		{ cardName: 'Simian Spirit Guide', bannedDate: '2021-02-15' },
		{ cardName: 'Skullclamp', bannedDate: '2011-01-01' },
		{ cardName: 'Splinter Twin', bannedDate: '2016-01-18' },
		{ cardName: 'Summer Bloom', bannedDate: '2016-01-18' },
		{ cardName: "Tibalt's Trickery", bannedDate: '2024-08-26' },
		{ cardName: 'Tree of Tales', bannedDate: '2011-01-01' },
		{ cardName: 'Treasure Cruise', bannedDate: '2015-01-19' },
		{ cardName: "Umezawa's Jitte", bannedDate: '2011-01-01' },
		{ cardName: 'Uro, Titan of Nature\'s Wrath', bannedDate: '2021-02-15' },
		{ cardName: 'Vault of Whispers', bannedDate: '2011-01-01' },
		{ cardName: 'The One Ring', bannedDate: '2024-08-26' }
	]
};
