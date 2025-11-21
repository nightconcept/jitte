/**
 * Pre-EDH format ban list
 * Source: https://www.predhcommander.com/home
 * Last updated: 2025-11-21
 */

import type { FormatBanList } from './types';

export const predhBanList: FormatBanList = {
	lastUpdated: '2025-11-21',
	source: 'https://www.predhcommander.com/home',
	banned: [
		{ cardName: 'Amulet of Quoz', bannedDate: '1995-06-03' },
		{ cardName: 'Ancestral Recall', bannedDate: '2014-06-16' },
		{ cardName: 'Balance', bannedDate: '2016-06-10' },
		{ cardName: 'Biorhythm', bannedDate: '2005-07-29' },
		{ cardName: 'Black Lotus', bannedDate: '2014-06-16' },
		{ cardName: 'Bronze Tablet', bannedDate: '1995-04-01' },
		{ cardName: 'Channel', bannedDate: '2017-11-17' },
		{ cardName: 'Chaos Orb', bannedDate: '1993-12-01' },
		{ cardName: 'Cleanse', bannedDate: '2009-09-07' },
		{ cardName: 'Contract from Below', bannedDate: '1994-06-21' },
		{ cardName: 'Crusade', bannedDate: '2010-09-03' },
		{ cardName: 'Darkpact', bannedDate: '1994-06-21' },
		{ cardName: 'Demonic Attorney', bannedDate: '1994-06-21' },
		{ cardName: 'Emrakul, the Aeons Torn', bannedDate: '2022-07-08' },
		{ cardName: 'Erayo, Soratami Ascendant // Erayo\'s Essence', bannedDate: '2005-06-03' },
		{ cardName: 'Falling Star', bannedDate: '1994-06-01' },
		{ cardName: 'Fastbond', bannedDate: '2014-06-16' },
		{ cardName: 'Flash', bannedDate: '2018-03-16' },
		{ cardName: 'Imprison', bannedDate: '1994-06-01' },
		{ cardName: 'Invoke Prejudice', bannedDate: '1994-06-01' },
		{ cardName: 'Iona, Shield of Emeria', bannedDate: '2015-05-22' },
		{ cardName: 'Jeweled Bird', bannedDate: '1995-07-01' },
		{ cardName: 'Jihad', bannedDate: '1993-12-17' },
		{ cardName: 'Karakas', bannedDate: '2018-12-07' },
		{ cardName: 'Library of Alexandria', bannedDate: '2014-06-16' },
		{ cardName: 'Limited Resources', bannedDate: '1998-06-15' },
		{ cardName: 'Mana Crypt', bannedDate: '2020-08-07' },
		{ cardName: 'Mox Emerald', bannedDate: '2014-06-16' },
		{ cardName: 'Mox Jet', bannedDate: '2014-06-16' },
		{ cardName: 'Mox Pearl', bannedDate: '2014-06-16' },
		{ cardName: 'Mox Ruby', bannedDate: '2014-06-16' },
		{ cardName: 'Mox Sapphire', bannedDate: '2014-06-16' },
		{ cardName: 'Pradesh Gypsies', bannedDate: '1999-04-21' },
		{ cardName: 'Primeval Titan', bannedDate: '2017-11-17' },
		{ cardName: 'Rebirth', bannedDate: '1995-04-01' },
		{ cardName: 'Recurring Nightmare', bannedDate: '2015-05-06' },
		{ cardName: 'Rofellos, Llanowar Emissary', bannedDate: '2014-06-16' },
		{ cardName: 'Shahrazad', bannedDate: '1993-12-17' },
		{ cardName: 'Stone-Throwing Devils', bannedDate: '1993-12-17' },
		{ cardName: 'Sundering Titan', bannedDate: '2020-08-07' },
		{ cardName: 'Tempest Efreet', bannedDate: '1995-04-01' },
		{ cardName: 'Time Vault', bannedDate: '2014-06-16' },
		{ cardName: 'Time Walk', bannedDate: '2014-06-16' },
		{ cardName: 'Timmerian Fiends', bannedDate: '1995-10-01' },
		{ cardName: 'Tinker', bannedDate: '1999-02-15' },
		{ cardName: 'Tolarian Academy', bannedDate: '2014-06-16' },
		{ cardName: 'Trade Secrets', bannedDate: '2011-06-17' },
		{ cardName: 'Upheaval', bannedDate: '2021-06-18' },
		{ cardName: 'Yawgmoth\'s Bargain', bannedDate: '2014-06-16' }
	]
};

// Simple export for FORMAT_METADATA embedding
export const predhBanned: string[] = predhBanList.banned.map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
