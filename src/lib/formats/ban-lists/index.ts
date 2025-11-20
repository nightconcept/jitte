/**
 * Ban list index - exports all format ban lists
 */

export * from './types';
export * from './commander';
export * from './standard';
export * from './modern';
export * from './cube';

import { commanderBanList } from './commander';
import { standardBanList } from './standard';
import { modernBanList } from './modern';
import { cubeBanList } from './cube';
import type { FormatBanList } from './types';
import { DeckFormat } from '../format-registry';

export const BAN_LISTS: Record<DeckFormat, FormatBanList> = {
	[DeckFormat.Commander]: commanderBanList,
	[DeckFormat.Standard]: standardBanList,
	[DeckFormat.Modern]: modernBanList,
	[DeckFormat.Cube]: cubeBanList
};
