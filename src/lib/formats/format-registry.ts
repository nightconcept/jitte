/**
 * Format registry for Magic: The Gathering deck formats
 */

export enum DeckFormat {
	Commander = 'commander',
	Standard = 'standard',
	Modern = 'modern'
}

export interface FormatMetadata {
	id: DeckFormat;
	displayName: string;
	description: string;
	banListLastUpdated: string; // ISO date
	icon?: string; // Optional icon class
}

export const FORMAT_METADATA: Record<DeckFormat, FormatMetadata> = {
	[DeckFormat.Commander]: {
		id: DeckFormat.Commander,
		displayName: 'Commander / EDH',
		description: '100-card singleton with legendary commander',
		banListLastUpdated: '2024-09-23'
	},
	[DeckFormat.Standard]: {
		id: DeckFormat.Standard,
		displayName: 'Standard',
		description: 'Latest sets, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-11-14' // Standard currently has no bans
	},
	[DeckFormat.Modern]: {
		id: DeckFormat.Modern,
		displayName: 'Modern',
		description: 'Modern-legal sets, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-08-26' // Last Modern ban list update
	}
};
