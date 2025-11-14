/**
 * Commander format ban list
 * Source: https://mtgcommander.net/index.php/banned-list/
 * Last updated: 2024-09-23
 */

import { DeckFormat } from '../format-registry';
import type { FormatBanList } from './types';

export const commanderBanList: FormatBanList = {
	format: DeckFormat.Commander,
	lastUpdated: '2024-09-23',
	source: 'https://mtgcommander.net/index.php/banned-list/',
	banned: [
		{ cardName: 'Ancestral Recall', bannedDate: '2011-09-20' },
		{ cardName: 'Balance', bannedDate: '2011-09-20' },
		{ cardName: 'Biorhythm', bannedDate: '2011-09-20' },
		{ cardName: 'Black Lotus', bannedDate: '2011-09-20' },
		{ cardName: 'Braids, Cabal Minion', bannedDate: '2011-09-20' },
		{ cardName: 'Chaos Orb', bannedDate: '2011-09-20' },
		{ cardName: 'Coalition Victory', bannedDate: '2011-09-20' },
		{ cardName: 'Channel', bannedDate: '2011-09-20' },
		{ cardName: 'Dockside Extortionist', bannedDate: '2024-09-23' },
		{ cardName: 'Emrakul, the Aeons Torn', bannedDate: '2011-09-20' },
		{ cardName: 'Erayo, Soratami Ascendant', bannedDate: '2011-09-20' },
		{ cardName: 'Falling Star', bannedDate: '2011-09-20' },
		{ cardName: 'Fastbond', bannedDate: '2011-09-20' },
		{ cardName: 'Flash', bannedDate: '2020-02-24' },
		{ cardName: 'Gifts Ungiven', bannedDate: '2011-09-20' },
		{ cardName: 'Golos, Tireless Pilgrim', bannedDate: '2021-09-27' },
		{ cardName: 'Griselbrand', bannedDate: '2012-09-20' },
		{ cardName: 'Hullbreacher', bannedDate: '2021-04-16' },
		{ cardName: 'Iona, Shield of Emeria', bannedDate: '2019-07-08' },
		{ cardName: 'Jeweled Lotus', bannedDate: '2024-09-23' },
		{ cardName: 'Karakas', bannedDate: '2011-09-20' },
		{ cardName: 'Leovold, Emissary of Trest', bannedDate: '2017-04-24' },
		{ cardName: 'Library of Alexandria', bannedDate: '2011-09-20' },
		{ cardName: 'Limited Resources', bannedDate: '2011-09-20' },
		{ cardName: 'Lutri, the Spellchaser', bannedDate: '2020-04-17' },
		{ cardName: 'Mana Crypt', bannedDate: '2024-09-23' },
		{ cardName: 'Mox Emerald', bannedDate: '2011-09-20' },
		{ cardName: 'Mox Jet', bannedDate: '2011-09-20' },
		{ cardName: 'Mox Pearl', bannedDate: '2011-09-20' },
		{ cardName: 'Mox Ruby', bannedDate: '2011-09-20' },
		{ cardName: 'Mox Sapphire', bannedDate: '2011-09-20' },
		{ cardName: 'Nadu, Winged Wisdom', bannedDate: '2024-09-23' },
		{ cardName: 'Panoptic Mirror', bannedDate: '2011-09-20' },
		{ cardName: 'Paradox Engine', bannedDate: '2019-07-08' },
		{ cardName: 'Primeval Titan', bannedDate: '2012-09-20' },
		{ cardName: 'Prophet of Kruphix', bannedDate: '2014-02-01' },
		{ cardName: 'Recurring Nightmare', bannedDate: '2011-09-20' },
		{ cardName: 'Rofellos, Llanowar Emissary', bannedDate: '2011-09-20' },
		{ cardName: 'Shahrazad', bannedDate: '2011-09-20' },
		{ cardName: 'Sundering Titan', bannedDate: '2011-09-20' },
		{ cardName: 'Sway of the Stars', bannedDate: '2011-09-20' },
		{ cardName: 'Sylvan Primordial', bannedDate: '2014-02-01' },
		{ cardName: 'Time Vault', bannedDate: '2011-09-20' },
		{ cardName: 'Time Walk', bannedDate: '2011-09-20' },
		{ cardName: 'Tinker', bannedDate: '2011-09-20' },
		{ cardName: 'Tolarian Academy', bannedDate: '2011-09-20' },
		{ cardName: 'Trade Secrets', bannedDate: '2011-09-20' },
		{ cardName: 'Upheaval', bannedDate: '2011-09-20' },
		{ cardName: 'Worldfire', bannedDate: '2012-09-20' },
		{ cardName: "Yawgmoth's Bargain", bannedDate: '2011-09-20' }
	]
};
