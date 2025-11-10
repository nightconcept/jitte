/**
 * Card-related type definitions
 */

/**
 * Represents one face of a double-faced card
 */
export interface CardFace {
	/** Face name */
	name: string;

	/** Mana cost for this face */
	manaCost?: string;

	/** Type line for this face */
	typeLine?: string;

	/** Oracle text for this face */
	oracleText?: string;

	/** Image URLs for this face */
	imageUrls?: {
		small?: string;
		normal?: string;
		large?: string;
		png?: string;
		artCrop?: string;
		borderCrop?: string;
	};

	/** Colors for this face */
	colors?: string[];

	/** Power (for creatures) */
	power?: string;

	/** Toughness (for creatures) */
	toughness?: string;

	/** Loyalty (for planeswalkers) */
	loyalty?: string;
}

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

	/** Oracle ID (unique across all printings of this card) */
	oracleId?: string;

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

	/** Keywords from Scryfall (includes partner abilities) */
	keywords?: string[];

	/** Image URLs for different sizes */
	imageUrls?: {
		small?: string;
		normal?: string;
		large?: string;
		png?: string;
		artCrop?: string;
		borderCrop?: string;
	};

	/** Card layout type (e.g., "normal", "transform", "modal_dfc", "flip") */
	layout?: string;

	/** Array of card faces for double-faced cards */
	cardFaces?: CardFace[];

	/** Pricing information (USD non-foil) - legacy single price field */
	price?: number;

	/** Vendor-specific pricing (USD non-foil) */
	prices?: {
		cardkingdom?: number;
		tcgplayer?: number;
		manapool?: number;
	};

	/** Timestamp of last price update */
	priceUpdatedAt?: number;

	/** Whether this card is a Game Changer (affects bracket level) */
	isGameChanger?: boolean;

	/** Format legalities from Scryfall */
	legalities?: {
		commander?: 'legal' | 'not_legal' | 'restricted' | 'banned';
		[format: string]: string | undefined;
	};
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
