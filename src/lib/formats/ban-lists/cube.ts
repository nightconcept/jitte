/**
 * Cube format ban list
 * Cubes typically don't have ban lists since they're custom environments
 * This is an empty ban list
 */

import type { FormatBanList } from './types';
import { DeckFormat } from '../format-registry';

export const cubeBanList: FormatBanList = {
	format: DeckFormat.Cube,
	banned: [],
	lastUpdated: '2024-01-01',
	source: 'N/A - No ban list for Cube format'
};
