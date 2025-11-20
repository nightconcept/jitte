/**
 * Format registry for Magic: The Gathering deck formats
 */

export enum DeckFormat {
	Commander = 'commander',
	Standard = 'standard',
	Modern = 'modern',
	Cube = 'cube'
}

export interface FormatMetadata {
	id: DeckFormat;
	displayName: string;
	description: string;
	banListLastUpdated: string; // ISO date
	icon?: string; // Optional icon class
	ui: {
		bulkEditSubtitle: string;
		bulkEditPlaceholder: string;
		cardPreviewCollapsedByDefault: boolean;
		maybeboardCollapsedByDefault: boolean;
	};
}

export const FORMAT_METADATA: Record<DeckFormat, FormatMetadata> = {
	[DeckFormat.Commander]: {
		id: DeckFormat.Commander,
		displayName: 'Commander / EDH',
		description: '100-card singleton with legendary commander',
		banListLastUpdated: '2024-09-23',
		ui: {
			bulkEditSubtitle: 'Edit the 99 cards in plaintext format. Commander is not included and will be preserved.',
			bulkEditPlaceholder: '1 Lightning Bolt\n1 Sol Ring (2XM) 97\n2x Counterspell\n1 Command Tower\n\n(Commander not shown here)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Standard]: {
		id: DeckFormat.Standard,
		displayName: 'Standard',
		description: 'Latest sets, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-11-14', // Standard currently has no bans
		ui: {
			bulkEditSubtitle: 'Edit your decklist in plaintext format. Standard requires 60+ cards.',
			bulkEditPlaceholder: '4 Lightning Bolt\n4 Counterspell\n4 Opt\n20 Mountain\n20 Island\n\n(60+ cards required, up to 4 copies)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Modern]: {
		id: DeckFormat.Modern,
		displayName: 'Modern',
		description: 'Modern-legal sets, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-08-26', // Last Modern ban list update
		ui: {
			bulkEditSubtitle: 'Edit your decklist in plaintext format. Modern requires 60+ cards.',
			bulkEditPlaceholder: '4 Lightning Bolt\n4 Counterspell\n4 Serum Visions\n20 Mountain\n20 Island\n\n(60+ cards required, up to 4 copies)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Cube]: {
		id: DeckFormat.Cube,
		displayName: 'Cube',
		description: 'Custom draft environment with curated cards',
		banListLastUpdated: '2024-01-01', // No ban list for Cube
		ui: {
			bulkEditSubtitle: 'Edit your cube cards in plaintext format. Add any cards for your custom draft environment.',
			bulkEditPlaceholder: '1 Black Lotus\n1 Ancestral Recall\n1 Time Walk\n1 Mox Sapphire\n1 Sol Ring\n\n(Add any cards for your cube)',
			cardPreviewCollapsedByDefault: true,
			maybeboardCollapsedByDefault: true
		}
	}
};
