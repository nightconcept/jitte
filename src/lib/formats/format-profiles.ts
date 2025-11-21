/**
 * Format profiles - reusable base templates for deck formats
 */

export type FormatFamily = 'constructed' | 'commander-like' | 'limited' | 'custom';

export type CategorizationSystem = 'type-based' | 'color-based' | 'custom';

export type CommanderType = 'legendary-creature' | 'planeswalker' | 'any-legendary';

export interface DeckSizeRules {
	min?: number;
	max?: number;
	exact?: number;
}

export interface CopyRules {
	isSingleton: boolean;
	maxCopies: number | null; // null = unlimited
	hasBasicLandException: boolean;
}

export interface SideboardRules {
	allowed: boolean;
	size?: number;
}

export interface CommanderRules {
	required: boolean;
	minCount: number;
	maxCount: number;
	type: CommanderType;
	partnerSupport?: boolean;
	hasSignatureSpell?: boolean; // Oathbreaker
}

export interface CategorizationRules {
	system: CategorizationSystem;
	allowsCustomCategories: boolean;
}

export interface FormatProfile {
	family: FormatFamily;
	deckSize: DeckSizeRules;
	copyRules: CopyRules;
	sideboard: SideboardRules;
	commanderRules: CommanderRules | null;
	tracksColorIdentity: boolean;
	categorization: CategorizationRules;
	hasBanList?: boolean;
	hasRestrictedList?: boolean;
}

/**
 * 60-Card Constructed Profile
 * Used by: Standard, Modern, Pioneer, Legacy, Vintage, Pauper, Historic, Alchemy
 */
export const CONSTRUCTED_60_PROFILE: FormatProfile = {
	family: 'constructed',
	deckSize: { min: 60 },
	copyRules: {
		isSingleton: false,
		maxCopies: 4,
		hasBasicLandException: true
	},
	sideboard: { allowed: true, size: 15 },
	commanderRules: null,
	tracksColorIdentity: true,
	categorization: {
		system: 'type-based',
		allowsCustomCategories: true
	},
	hasBanList: true
};

/**
 * EDH-Like (100-Card Commander) Profile
 * Used by: Commander, Oathbreaker (modified), Brawl (modified), PreDH
 */
export const EDH_PROFILE: FormatProfile = {
	family: 'commander-like',
	deckSize: { exact: 100 },
	copyRules: {
		isSingleton: true,
		maxCopies: 1,
		hasBasicLandException: true
	},
	sideboard: { allowed: false },
	commanderRules: {
		required: true,
		minCount: 1,
		maxCount: 2, // Partner support
		type: 'legendary-creature',
		partnerSupport: true
	},
	tracksColorIdentity: true,
	categorization: {
		system: 'type-based',
		allowsCustomCategories: true
	},
	hasBanList: true
};

/**
 * Cube (Unlimited Custom) Profile
 * Used by: Cube
 */
export const CUBE_PROFILE: FormatProfile = {
	family: 'limited',
	deckSize: {}, // No restrictions
	copyRules: {
		isSingleton: false,
		maxCopies: null, // Unlimited
		hasBasicLandException: true
	},
	sideboard: { allowed: false },
	commanderRules: null,
	tracksColorIdentity: false,
	categorization: {
		system: 'color-based',
		allowsCustomCategories: true
	},
	hasBanList: false
};

/**
 * Custom/Minimal Profile (Maximum Flexibility)
 * Used by: Formats that don't fit other profiles, experimental formats, house rules
 */
export const CUSTOM_PROFILE: FormatProfile = {
	family: 'custom',
	deckSize: {}, // No restrictions
	copyRules: {
		isSingleton: false,
		maxCopies: null, // No limit
		hasBasicLandException: true
	},
	sideboard: { allowed: false },
	commanderRules: null,
	tracksColorIdentity: false,
	categorization: {
		system: 'type-based',
		allowsCustomCategories: true
	},
	hasBanList: false
};
