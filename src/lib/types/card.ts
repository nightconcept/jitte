/**
 * Card-related type definitions
 */

/**
 * Represents a single Magic card in a deck
 */
export interface Card {
	/** Card name (e.g., "Lightning Bolt") */
	name: string;

	/** Quantity of this card in the deck */
	quantity: number;

	/** Optional set code (e.g., "2XM", "M21") */
	setCode?: string;

	/** Optional collector number within the set */
	collectorNumber?: string;

	/** Scryfall ID for this specific printing */
	scryfallId?: string;

	/** Card types (e.g., ["Creature", "Legendary"]) */
	types?: string[];

	/** Card subtypes (e.g., ["Human", "Wizard"]) */
	subtypes?: string[];

	/** Converted mana cost */
	cmc?: number;

	/** Mana cost string (e.g., "{2}{U}{U}") */
	manaCost?: string;

	/** Color identity for Commander validation */
	colorIdentity?: ManaColor[];

	/** Oracle text */
	oracleText?: string;

	/** Image URLs for different sizes */
	imageUrls?: {
		small?: string;
		normal?: string;
		large?: string;
		png?: string;
		artCrop?: string;
		borderCrop?: string;
	};

	/** Pricing information (USD non-foil) */
	price?: number;

	/** Timestamp of last price update */
	priceUpdatedAt?: number;
}

/**
 * MTG mana colors
 */
export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

/**
 * Card categories for deck organization
 */
export enum CardCategory {
	Commander = 'commander',
	Companion = 'companion',
	Planeswalker = 'planeswalker',
	Creature = 'creature',
	Instant = 'instant',
	Sorcery = 'sorcery',
	Artifact = 'artifact',
	Enchantment = 'enchantment',
	Land = 'land',
	Other = 'other'
}

/**
 * Represents cards grouped by category
 */
export interface CategorizedCards {
	[CardCategory.Commander]: Card[];
	[CardCategory.Companion]: Card[];
	[CardCategory.Planeswalker]: Card[];
	[CardCategory.Creature]: Card[];
	[CardCategory.Instant]: Card[];
	[CardCategory.Sorcery]: Card[];
	[CardCategory.Artifact]: Card[];
	[CardCategory.Enchantment]: Card[];
	[CardCategory.Land]: Card[];
	[CardCategory.Other]: Card[];
}

/**
 * Validation warning types
 */
export enum ValidationWarningType {
	Banned = 'banned',
	ColorIdentity = 'color_identity',
	DeckSize = 'deck_size',
	Duplicate = 'duplicate',
	InvalidCommander = 'invalid_commander'
}

/**
 * Card validation warning
 */
export interface ValidationWarning {
	type: ValidationWarningType;
	message: string;
	cardName?: string;
	severity: 'error' | 'warning' | 'info';
}
