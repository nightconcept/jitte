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

	/** Custom CMC override (primarily for Cube format) */
	customCmc?: number;

	/** Custom color identity override (primarily for Cube format) */
	customColorIdentity?: ManaColor[];

	/** Custom category override (primarily for Cube format) */
	customCategory?: CubeCardCategory;

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
 * Card categories for deck organization (Commander format)
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
 * Card categories for Cube format (organized by color)
 */
export enum CubeCardCategory {
	White = 'white',
	Blue = 'blue',
	Black = 'black',
	Red = 'red',
	Green = 'green',
	Colorless = 'colorless',
	Multicolored = 'multicolored',
	// Land subcategories - Guilds (2-color)
	LandAzorius = 'land-azorius', // WU
	LandDimir = 'land-dimir', // UB
	LandRakdos = 'land-rakdos', // BR
	LandGruul = 'land-gruul', // RG
	LandSelesnya = 'land-selesnya', // GW
	LandOrzhov = 'land-orzhov', // WB
	LandIzzet = 'land-izzet', // UR
	LandGolgari = 'land-golgari', // BG
	LandBoros = 'land-boros', // RW
	LandSimic = 'land-simic', // GU
	// Land subcategories - Shards (3-color allied)
	LandEsper = 'land-esper', // WUB
	LandGrixis = 'land-grixis', // UBR
	LandJund = 'land-jund', // BRG
	LandNaya = 'land-naya', // RGW
	LandBant = 'land-bant', // GWU
	// Land subcategories - Wedges (3-color enemy)
	LandAbzan = 'land-abzan', // WBG
	LandJeskai = 'land-jeskai', // URW
	LandSultai = 'land-sultai', // BGU
	LandMardu = 'land-mardu', // RWB
	LandTemur = 'land-temur', // GUR
	// Land subcategories - 4-color and generic
	LandFourColor = 'land-fourcolor',
	// Generic lands (5-color, colorless, mono-color, utility)
	LandGeneric = 'land-generic'
}

/**
 * Represents cards grouped by category (Commander format)
 * Extends CardsByCategory for compatibility
 */
export interface CategorizedCards extends CardsByCategory {
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
 * Represents cards grouped by color category (Cube format)
 * Extends CardsByCategory for compatibility
 */
export interface CubeCategorizedCards extends CardsByCategory {
	[CubeCardCategory.White]: Card[];
	[CubeCardCategory.Blue]: Card[];
	[CubeCardCategory.Black]: Card[];
	[CubeCardCategory.Red]: Card[];
	[CubeCardCategory.Green]: Card[];
	[CubeCardCategory.Colorless]: Card[];
	[CubeCardCategory.Multicolored]: Card[];
	// Land subcategories
	[CubeCardCategory.LandAzorius]: Card[];
	[CubeCardCategory.LandDimir]: Card[];
	[CubeCardCategory.LandRakdos]: Card[];
	[CubeCardCategory.LandGruul]: Card[];
	[CubeCardCategory.LandSelesnya]: Card[];
	[CubeCardCategory.LandOrzhov]: Card[];
	[CubeCardCategory.LandIzzet]: Card[];
	[CubeCardCategory.LandGolgari]: Card[];
	[CubeCardCategory.LandBoros]: Card[];
	[CubeCardCategory.LandSimic]: Card[];
	[CubeCardCategory.LandEsper]: Card[];
	[CubeCardCategory.LandGrixis]: Card[];
	[CubeCardCategory.LandJund]: Card[];
	[CubeCardCategory.LandNaya]: Card[];
	[CubeCardCategory.LandBant]: Card[];
	[CubeCardCategory.LandAbzan]: Card[];
	[CubeCardCategory.LandJeskai]: Card[];
	[CubeCardCategory.LandSultai]: Card[];
	[CubeCardCategory.LandMardu]: Card[];
	[CubeCardCategory.LandTemur]: Card[];
	[CubeCardCategory.LandFourColor]: Card[];
	[CubeCardCategory.LandGeneric]: Card[];
}

/**
 * Generic card storage by category (format-agnostic)
 * Uses string keys to support any format's category system
 */
export interface CardsByCategory {
	[categoryId: string]: Card[];
}

/**
 * Special category ID for uncategorized cards (used in custom categorization mode)
 */
export const UNCATEGORIZED_CATEGORY_ID = 'uncategorized';

/**
 * Metadata definition for a single card category
 */
export interface CategoryDefinition {
	/** Unique identifier for this category (e.g., "commander", "white", "ramp") */
	id: string;

	/** Display name for this category (e.g., "Commander", "White", "Ramp Package") */
	label: string;

	/** Optional icon class for display (e.g., "ms-creature", "ms-w") */
	icon?: string;

	/** Display order (lower numbers appear first) */
	order: number;

	/** Whether this category must contain at least one card */
	isRequired?: boolean;

	/** Whether multiple copies of the same card are allowed in this category */
	allowMultiple?: boolean;

	/** Maximum number of cards allowed in this category */
	maxCards?: number;

	/** Minimum number of cards required in this category */
	minCards?: number;
}

/**
 * Complete category schema for a format
 * Defines all available categories and their rules
 */
export interface CategorySchema {
	/** All category definitions for this format */
	categories: CategoryDefinition[];

	/** Default category ID for cards that don't fit other categories */
	defaultCategoryId?: string;
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

/**
 * Get the effective CMC for a card, respecting custom overrides
 * @param card - The card to get CMC for
 * @returns The custom CMC if set, otherwise the base CMC, or 0 if neither is set
 */
export function getEffectiveCmc(card: Card): number {
	return card.customCmc !== undefined ? card.customCmc : (card.cmc ?? 0);
}

/**
 * Get the effective color identity for a card, respecting custom overrides
 * @param card - The card to get color identity for
 * @returns The custom color identity if set, otherwise the base color identity, or empty array if neither is set
 */
export function getEffectiveColorIdentity(card: Card): ManaColor[] {
	return card.customColorIdentity !== undefined ? card.customColorIdentity : (card.colorIdentity ?? []);
}

/**
 * Get the effective category for a card (Cube format), respecting custom overrides
 * @param card - The card to get category for
 * @returns The custom category if set, otherwise null (will use default categorization)
 */
export function getEffectiveCategory(card: Card): CubeCardCategory | null {
	return card.customCategory ?? null;
}
