/**
 * Format registry for Magic: The Gathering deck formats
 */

import type {
	FormatFamily,
	DeckSizeRules,
	CopyRules,
	SideboardRules,
	CommanderRules,
	CategorizationRules
} from './format-profiles';
import { commanderBanned } from './ban-lists/commander';
import { standardBanned } from './ban-lists/standard';
import { modernBanned } from './ban-lists/modern';
import { cubeBanned } from './ban-lists/cube';
import { pioneerBanned } from './ban-lists/pioneer';
import { legacyBanned } from './ban-lists/legacy';
import { vintageBanned, vintageRestricted } from './ban-lists/vintage';
import { oathbreakerBanned } from './ban-lists/oathbreaker';
import { predhBanned } from './ban-lists/predh';
import { pauperBanned } from './ban-lists/pauper';
import { historicBanned, historicSuspended } from './ban-lists/historic';
import { brawlBanned } from './ban-lists/brawl';
import { alchemyBanned } from './ban-lists/alchemy';

export enum DeckFormat {
	Commander = 'commander',
	Standard = 'standard',
	Pioneer = 'pioneer',
	Modern = 'modern',
	Legacy = 'legacy',
	Vintage = 'vintage',
	Oathbreaker = 'oathbreaker',
	PreDH = 'predh',
	Pauper = 'pauper',
	Historic = 'historic',
	Brawl = 'brawl',
	Alchemy = 'alchemy',
	Cube = 'cube'
}

export interface FormatMetadata {
	id: DeckFormat;
	displayName: string;
	description: string;
	banListLastUpdated: string; // ISO date
	icon?: string; // Optional icon class

	// Format classification
	family: FormatFamily;

	// Deck construction rules
	deckSize: DeckSizeRules;
	copyRules: CopyRules;
	sideboard: SideboardRules;

	// Commander/Leader requirements
	commanderRules: CommanderRules | null;

	// Color identity tracking
	tracksColorIdentity: boolean;

	// Categorization system
	categorization: CategorizationRules;

	// Ban/Restricted lists
	hasBanList: boolean;
	hasRestrictedList?: boolean;
	banList: {
		banned: string[];
		restricted?: string[]; // Vintage
		suspended?: string[]; // Historic
	};

	// UI configuration
	ui: {
		deckNamePlaceholder: string;
		deckNamePattern?: string; // e.g., "{commander} - {theme}"
		bulkEditSubtitle: string;
		bulkEditPlaceholder: string;
		cardPreviewCollapsedByDefault: boolean;
		maybeboardCollapsedByDefault: boolean;
		showBracketLevel?: boolean; // Commander only
	};
}

export const FORMAT_METADATA: Record<DeckFormat, FormatMetadata> = {
	[DeckFormat.Commander]: {
		id: DeckFormat.Commander,
		displayName: 'Commander / EDH',
		description: '100-card singleton with legendary commander',
		banListLastUpdated: '2024-09-23',

		// Format classification
		family: 'commander-like',

		// Deck construction rules
		deckSize: { exact: 100 },
		copyRules: {
			isSingleton: true,
			maxCopies: 1,
			hasBasicLandException: true
		},
		sideboard: { allowed: false },

		// Commander requirements
		commanderRules: {
			required: true,
			minCount: 1,
			maxCount: 2, // Partner support
			type: 'legendary-creature',
			partnerSupport: true
		},

		// Color identity
		tracksColorIdentity: true,

		// Categorization
		categorization: {
			system: 'type-based',
			allowsCustomCategories: true
		},

		// Ban lists
		hasBanList: true,
		banList: {
			banned: commanderBanned
		},

		// UI
		ui: {
			deckNamePlaceholder: 'My Awesome Commander Deck',
			bulkEditSubtitle: 'Edit the 99 cards in plaintext format. Commander is not included and will be preserved.',
			bulkEditPlaceholder: '1 Lightning Bolt\n1 Sol Ring (2XM) 97\n2x Counterspell\n1 Command Tower\n\n(Commander not shown here)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false,
			showBracketLevel: true
		}
	},
	[DeckFormat.Standard]: {
		id: DeckFormat.Standard,
		displayName: 'Standard',
		description: 'Latest sets, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-11-14',

		// Format classification
		family: 'constructed',

		// Deck construction rules
		deckSize: { min: 60 },
		copyRules: {
			isSingleton: false,
			maxCopies: 4,
			hasBasicLandException: true
		},
		sideboard: { allowed: true, size: 15 },

		// No commander
		commanderRules: null,

		// Color identity
		tracksColorIdentity: true,

		// Categorization
		categorization: {
			system: 'type-based',
			allowsCustomCategories: true
		},

		// Ban lists
		hasBanList: true,
		banList: {
			banned: standardBanned
		},

		// UI
		ui: {
			deckNamePlaceholder: 'My Standard Deck',
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
		banListLastUpdated: '2024-08-26',

		// Format classification
		family: 'constructed',

		// Deck construction rules
		deckSize: { min: 60 },
		copyRules: {
			isSingleton: false,
			maxCopies: 4,
			hasBasicLandException: true
		},
		sideboard: { allowed: true, size: 15 },

		// No commander
		commanderRules: null,

		// Color identity
		tracksColorIdentity: true,

		// Categorization
		categorization: {
			system: 'type-based',
			allowsCustomCategories: true
		},

		// Ban lists
		hasBanList: true,
		banList: {
			banned: modernBanned
		},

		// UI
		ui: {
			deckNamePlaceholder: 'My Modern Deck',
			bulkEditSubtitle: 'Edit your decklist in plaintext format. Modern requires 60+ cards.',
			bulkEditPlaceholder: '4 Lightning Bolt\n4 Counterspell\n4 Serum Visions\n20 Mountain\n20 Island\n\n(60+ cards required, up to 4 copies)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Pioneer]: {
		id: DeckFormat.Pioneer,
		displayName: 'Pioneer',
		description: 'Return to Ravnica onwards, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-11-14',
		family: 'constructed',
		deckSize: { min: 60 },
		copyRules: { isSingleton: false, maxCopies: 4, hasBasicLandException: true },
		sideboard: { allowed: true, size: 15 },
		commanderRules: null,
		tracksColorIdentity: true,
		categorization: { system: 'type-based', allowsCustomCategories: true },
		hasBanList: true,
		banList: { banned: pioneerBanned },
		ui: {
			deckNamePlaceholder: 'My Pioneer Deck',
			bulkEditSubtitle: 'Edit your decklist in plaintext format. Pioneer requires 60+ cards.',
			bulkEditPlaceholder: '4 Lightning Bolt\n4 Thoughtseize\n4 Fatal Push\n20 Mountain\n20 Swamp\n\n(60+ cards required, up to 4 copies)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Legacy]: {
		id: DeckFormat.Legacy,
		displayName: 'Legacy',
		description: 'All sets except Un-sets, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-11-14',
		family: 'constructed',
		deckSize: { min: 60 },
		copyRules: { isSingleton: false, maxCopies: 4, hasBasicLandException: true },
		sideboard: { allowed: true, size: 15 },
		commanderRules: null,
		tracksColorIdentity: true,
		categorization: { system: 'type-based', allowsCustomCategories: true },
		hasBanList: true,
		banList: { banned: legacyBanned },
		ui: {
			deckNamePlaceholder: 'My Legacy Deck',
			bulkEditSubtitle: 'Edit your decklist in plaintext format. Legacy requires 60+ cards.',
			bulkEditPlaceholder: '4 Brainstorm\n4 Force of Will\n4 Daze\n20 Island\n20 Volcanic Island\n\n(60+ cards required, up to 4 copies)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Vintage]: {
		id: DeckFormat.Vintage,
		displayName: 'Vintage',
		description: 'All sets, restricted list, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-11-14',
		family: 'constructed',
		deckSize: { min: 60 },
		copyRules: { isSingleton: false, maxCopies: 4, hasBasicLandException: true },
		sideboard: { allowed: true, size: 15 },
		commanderRules: null,
		tracksColorIdentity: true,
		categorization: { system: 'type-based', allowsCustomCategories: true },
		hasBanList: true,
		hasRestrictedList: true,
		banList: { banned: vintageBanned, restricted: vintageRestricted },
		ui: {
			deckNamePlaceholder: 'My Vintage Deck',
			bulkEditSubtitle: 'Edit your decklist in plaintext format. Vintage requires 60+ cards.',
			bulkEditPlaceholder: '1 Black Lotus\n1 Ancestral Recall\n4 Force of Will\n20 Island\n20 Underground Sea\n\n(60+ cards required, up to 4 copies, restricted list applies)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Oathbreaker]: {
		id: DeckFormat.Oathbreaker,
		displayName: 'Oathbreaker',
		description: '60-card singleton with Planeswalker and Signature Spell',
		banListLastUpdated: '2024-11-14',
		family: 'commander-like',
		deckSize: { exact: 60 },
		copyRules: { isSingleton: true, maxCopies: 1, hasBasicLandException: true },
		sideboard: { allowed: false },
		commanderRules: {
			required: true,
			minCount: 1,
			maxCount: 1,
			type: 'planeswalker',
			hasSignatureSpell: true
		},
		tracksColorIdentity: true,
		categorization: { system: 'type-based', allowsCustomCategories: true },
		hasBanList: true,
		banList: { banned: oathbreakerBanned },
		ui: {
			deckNamePlaceholder: 'My Oathbreaker Deck',
			bulkEditSubtitle: 'Edit the 58 cards in plaintext format. Oathbreaker and Signature Spell not included.',
			bulkEditPlaceholder: '1 Lightning Bolt\n1 Sol Ring\n1 Counterspell\n1 Command Tower\n\n(Oathbreaker and Signature Spell not shown here)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.PreDH]: {
		id: DeckFormat.PreDH,
		displayName: 'PreDH',
		description: 'Preconstructed Commander decks only',
		banListLastUpdated: '2024-11-14',
		family: 'commander-like',
		deckSize: { exact: 100 },
		copyRules: { isSingleton: true, maxCopies: 1, hasBasicLandException: true },
		sideboard: { allowed: false },
		commanderRules: {
			required: true,
			minCount: 1,
			maxCount: 2,
			type: 'legendary-creature',
			partnerSupport: true
		},
		tracksColorIdentity: true,
		categorization: { system: 'type-based', allowsCustomCategories: true },
		hasBanList: true,
		banList: { banned: predhBanned },
		ui: {
			deckNamePlaceholder: 'My PreDH Deck',
			bulkEditSubtitle: 'Edit the 99 cards in plaintext format. Commander is not included and will be preserved.',
			bulkEditPlaceholder: '1 Sol Ring\n1 Command Tower\n1 Lightning Greaves\n1 Arcane Signet\n\n(Commander not shown here)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Pauper]: {
		id: DeckFormat.Pauper,
		displayName: 'Pauper',
		description: 'Common cards only, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-11-14',
		family: 'constructed',
		deckSize: { min: 60 },
		copyRules: { isSingleton: false, maxCopies: 4, hasBasicLandException: true },
		sideboard: { allowed: true, size: 15 },
		commanderRules: null,
		tracksColorIdentity: true,
		categorization: { system: 'type-based', allowsCustomCategories: true },
		hasBanList: true,
		banList: { banned: pauperBanned },
		ui: {
			deckNamePlaceholder: 'My Pauper Deck',
			bulkEditSubtitle: 'Edit your decklist in plaintext format. Pauper requires 60+ cards (commons only).',
			bulkEditPlaceholder: '4 Lightning Bolt\n4 Counterspell\n4 Preordain\n20 Mountain\n20 Island\n\n(60+ cards required, commons only, up to 4 copies)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Historic]: {
		id: DeckFormat.Historic,
		displayName: 'Historic',
		description: 'Arena-legal cards, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-11-14',
		family: 'constructed',
		deckSize: { min: 60 },
		copyRules: { isSingleton: false, maxCopies: 4, hasBasicLandException: true },
		sideboard: { allowed: true, size: 15 },
		commanderRules: null,
		tracksColorIdentity: true,
		categorization: { system: 'type-based', allowsCustomCategories: true },
		hasBanList: true,
		banList: { banned: historicBanned, suspended: historicSuspended },
		ui: {
			deckNamePlaceholder: 'My Historic Deck',
			bulkEditSubtitle: 'Edit your decklist in plaintext format. Historic requires 60+ cards.',
			bulkEditPlaceholder: '4 Lightning Bolt\n4 Thoughtseize\n4 Brainstorm\n20 Mountain\n20 Swamp\n\n(60+ cards required, up to 4 copies)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Brawl]: {
		id: DeckFormat.Brawl,
		displayName: 'Brawl',
		description: '60-card singleton with legendary Commander, Standard-legal',
		banListLastUpdated: '2024-11-14',
		family: 'commander-like',
		deckSize: { exact: 60 },
		copyRules: { isSingleton: true, maxCopies: 1, hasBasicLandException: true },
		sideboard: { allowed: false },
		commanderRules: {
			required: true,
			minCount: 1,
			maxCount: 1,
			type: 'legendary-creature'
		},
		tracksColorIdentity: true,
		categorization: { system: 'type-based', allowsCustomCategories: true },
		hasBanList: true,
		banList: { banned: brawlBanned },
		ui: {
			deckNamePlaceholder: 'My Brawl Deck',
			bulkEditSubtitle: 'Edit the 59 cards in plaintext format. Commander is not included and will be preserved.',
			bulkEditPlaceholder: '1 Opt\n1 Shock\n1 Essence Scatter\n1 Command Tower\n\n(Commander not shown here)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Alchemy]: {
		id: DeckFormat.Alchemy,
		displayName: 'Alchemy',
		description: 'Arena digital-only format, 60+ cards, up to 4 copies',
		banListLastUpdated: '2024-11-14',
		family: 'constructed',
		deckSize: { min: 60 },
		copyRules: { isSingleton: false, maxCopies: 4, hasBasicLandException: true },
		sideboard: { allowed: true, size: 15 },
		commanderRules: null,
		tracksColorIdentity: true,
		categorization: { system: 'type-based', allowsCustomCategories: true },
		hasBanList: true,
		banList: { banned: alchemyBanned },
		ui: {
			deckNamePlaceholder: 'My Alchemy Deck',
			bulkEditSubtitle: 'Edit your decklist in plaintext format. Alchemy requires 60+ cards.',
			bulkEditPlaceholder: '4 Shock\n4 Opt\n4 Negate\n20 Mountain\n20 Island\n\n(60+ cards required, up to 4 copies)',
			cardPreviewCollapsedByDefault: false,
			maybeboardCollapsedByDefault: false
		}
	},
	[DeckFormat.Cube]: {
		id: DeckFormat.Cube,
		displayName: 'Cube',
		description: 'Custom draft environment with curated cards',
		banListLastUpdated: '2024-01-01',
		family: 'limited',
		deckSize: {},
		copyRules: { isSingleton: false, maxCopies: null, hasBasicLandException: true },
		sideboard: { allowed: false },
		commanderRules: null,
		tracksColorIdentity: false,
		categorization: { system: 'color-based', allowsCustomCategories: true },
		hasBanList: false,
		banList: { banned: cubeBanned },
		ui: {
			deckNamePlaceholder: 'My Draft Cube',
			bulkEditSubtitle: 'Edit your cube cards in plaintext format. Add any cards for your custom draft environment.',
			bulkEditPlaceholder: '1 Black Lotus\n1 Ancestral Recall\n1 Time Walk\n1 Mox Sapphire\n1 Sol Ring\n\n(Add any cards for your cube)',
			cardPreviewCollapsedByDefault: true,
			maybeboardCollapsedByDefault: true
		}
	}
};
