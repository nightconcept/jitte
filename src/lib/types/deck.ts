/**
 * Deck type definitions
 */

import type {
	CategorizedCards,
	CubeCategorizedCards,
	ValidationWarning,
	CardsByCategory,
	CategorySchema,
	CategoryDefinition,
	ManaColor
} from './card';
import type { Maybeboard } from './maybeboard';
import type { BranchMetadata, Stash } from './version';
import { DeckFormat } from '$lib/formats/format-registry';

/**
 * Categorization mode for deck organization
 */
export type CategorizationMode = 'default' | 'custom';

/**
 * Base deck structure shared by all formats
 */
export interface BaseDeck {
	/** Deck name */
	name: string;

	/** Cards organized by category (generic) */
	cards: CardsByCategory;

	/** Total card count */
	cardCount: number;

	/** Format identifier */
	format: DeckFormat;

	/** Current branch name */
	currentBranch: string;

	/** Current version string */
	currentVersion: string;

	/** ISO timestamp of deck creation */
	createdAt: string;

	/** ISO timestamp of last update */
	updatedAt: string;

	/** Categorization mode: 'default' uses format rules, 'custom' uses user-defined categories */
	categorizationMode: CategorizationMode;

	/** User-defined custom categories (only used when categorizationMode is 'custom') */
	customCategories?: CategoryDefinition[];
}

/**
 * Commander-specific deck structure
 */
export interface CommanderDeck extends BaseDeck {
	format: DeckFormat.Commander;
	colorIdentity: ManaColor[];
}

/**
 * Cube-specific deck structure
 */
export interface CubeDeck extends BaseDeck {
	format: DeckFormat.Cube;
}

/**
 * Standard-specific deck structure
 */
export interface StandardDeck extends BaseDeck {
	format: DeckFormat.Standard;
	colorIdentity: ManaColor[];
}

/**
 * Modern-specific deck structure
 */
export interface ModernDeck extends BaseDeck {
	format: DeckFormat.Modern;
	colorIdentity: ManaColor[];
}

/**
 * Pioneer-specific deck structure
 */
export interface PioneerDeck extends BaseDeck {
	format: DeckFormat.Pioneer;
	colorIdentity: ManaColor[];
}

/**
 * Legacy-specific deck structure
 */
export interface LegacyDeck extends BaseDeck {
	format: DeckFormat.Legacy;
	colorIdentity: ManaColor[];
}

/**
 * Vintage-specific deck structure
 */
export interface VintageDeck extends BaseDeck {
	format: DeckFormat.Vintage;
	colorIdentity: ManaColor[];
}

/**
 * Oathbreaker-specific deck structure
 */
export interface OathbreakerDeck extends BaseDeck {
	format: DeckFormat.Oathbreaker;
	colorIdentity: ManaColor[];
}

/**
 * PreDH-specific deck structure
 */
export interface PreDHDeck extends BaseDeck {
	format: DeckFormat.PreDH;
	colorIdentity: ManaColor[];
}

/**
 * Pauper-specific deck structure
 */
export interface PauperDeck extends BaseDeck {
	format: DeckFormat.Pauper;
	colorIdentity: ManaColor[];
}

/**
 * Historic-specific deck structure
 */
export interface HistoricDeck extends BaseDeck {
	format: DeckFormat.Historic;
	colorIdentity: ManaColor[];
}

/**
 * Brawl-specific deck structure
 */
export interface BrawlDeck extends BaseDeck {
	format: DeckFormat.Brawl;
	colorIdentity: ManaColor[];
}

/**
 * Alchemy-specific deck structure
 */
export interface AlchemyDeck extends BaseDeck {
	format: DeckFormat.Alchemy;
	colorIdentity: ManaColor[];
}

/**
 * Main deck type (discriminated union)
 * TypeScript will automatically narrow the type based on the format field
 */
export type Deck =
	| CommanderDeck
	| CubeDeck
	| StandardDeck
	| ModernDeck
	| PioneerDeck
	| LegacyDeck
	| VintageDeck
	| OathbreakerDeck
	| PreDHDeck
	| PauperDeck
	| HistoricDeck
	| BrawlDeck
	| AlchemyDeck;

/**
 * Deprecated deck interface (for backward compatibility during migration)
 * @deprecated Use specific deck types (CommanderDeck, CubeDeck, etc.) instead
 */
export interface DeprecatedDeck {
	/** Deck name */
	name: string;

	/** Cards organized by category (format-specific) */
	cards: CategorizedCards | CubeCategorizedCards;

	/** Total card count (should be 100 for Commander) */
	cardCount: number;

	/** Format (Commander, Standard, Modern, etc.) */
	format: DeckFormat;

	/** Color identity of the deck */
	colorIdentity: string[];

	/** Current branch name */
	currentBranch: string;

	/** Current version string */
	currentVersion: string;

	/** ISO timestamp of deck creation */
	createdAt: string;

	/** ISO timestamp of last update */
	updatedAt: string;
}

/**
 * Complete deck manifest (saved in zip file)
 */
export interface DeckManifest {
	/** Deck metadata */
	name: string;
	format: DeckFormat;
	createdAt: string;
	updatedAt: string;

	/** Categorization settings */
	categorizationMode?: CategorizationMode;
	customCategories?: CategoryDefinition[];

	/** Current working state */
	currentBranch: string;
	currentVersion: string;

	/** All branches in this deck */
	branches: BranchMetadata[];

	/** Stashes for each branch */
	stashes: Record<string, Stash>;

	/** App version that created this deck */
	appVersion: string;

	/** Versioning scheme preference ('semantic' or 'date') */
	versioningScheme?: 'semantic' | 'date';
}

/**
 * Detected combo information (from Commander Spellbook API)
 */
export interface DetectedCombo {
	/** Combo ID from Commander Spellbook */
	id: string;

	/** Names of cards involved in the combo */
	cardNames: string[];

	/** What the combo produces (e.g., "Infinite mana", "Win the game") */
	results: string[];

	/** Description of how to execute the combo */
	description?: string;

	/** Combo speed classification */
	speed: 'early' | 'mid' | 'late';

	/** Whether this creates an infinite loop */
	isInfinite: boolean;

	/** Whether this is a 2-card combo */
	isTwoCard: boolean;

	/** EDHREC popularity (deck count) */
	popularity?: number;

	/** Combined price of combo pieces */
	totalPrice?: number;
}

/**
 * Deck statistics
 */
export interface DeckStatistics {
	/** Total cards */
	totalCards: number;

	/** Mana curve (CMC distribution) split by permanents vs spells */
	manaCurve: Record<number, { permanents: number; spells: number }>;

	/** Color distribution (mana cost requirements) */
	colorDistribution: Record<string, number>;

	/** Mana production by color */
	manaProduction: Record<string, number>;

	/** Type distribution */
	typeDistribution: Record<string, number>;

	/** Average CMC (without lands) */
	averageCmc: number;

	/** Average CMC (with lands) */
	averageCmcWithLands: number;

	/** Median CMC (without lands) */
	medianCmc: number;

	/** Median CMC (with lands) */
	medianCmcWithLands: number;

	/** Total mana value of all cards */
	totalManaValue: number;

	/** Land count */
	landCount: number;

	/** Non-land count */
	nonLandCount: number;

	/** Total deck price (USD) */
	totalPrice: number;

	/** Validation warnings */
	warnings: ValidationWarning[];

	/** Number of Game Changer cards in the deck */
	gameChangerCount: number;

	/** Commander bracket level (1-5) */
	bracketLevel: number;

	/** Detected combos (optional, loaded asynchronously) */
	combos?: DetectedCombo[];

	/** Number of 2-card infinite combos detected */
	twoCardComboCount?: number;

	/** Number of early-game (fast) combos detected */
	earlyGameComboCount?: number;

	/** Number of late-game combos detected */
	lateGameComboCount?: number;

	/** Whether deck has mass land denial cards */
	hasMassLandDenial?: boolean;

	/** Whether deck has extra turn cards */
	hasExtraTurns?: boolean;

	/** Whether deck has chaining extra turn cards */
	hasChainingExtraTurns?: boolean;

	/** Whether combo detection is in progress */
	combosLoading?: boolean;

	/** Error message if combo detection failed */
	combosError?: string;
}

/**
 * Pricing enrichment status
 */
export type PricingStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Working deck state (in memory during editing)
 */
export interface WorkingDeck {
	/** The deck being edited */
	deck: Deck;

	/** Maybeboard (shared across versions) */
	maybeboard: Maybeboard;

	/** Current statistics */
	statistics: DeckStatistics;

	/** Is currently in edit mode */
	isEditing: boolean;

	/** Has unsaved changes */
	hasUnsavedChanges: boolean;

	/** Snapshot of deck when edit mode was activated (for diff calculation) */
	initialDeckState?: Deck;

	/** Timestamp of last auto-stash */
	lastStashAt?: string;

	/** Pricing enrichment status (lazy loading) */
	pricingStatus: PricingStatus;
}

/**
 * Branch structure
 */
export interface Branch {
	/** Branch name */
	name: string;

	/** Versions on this branch */
	versions: string[];

	/** Current version */
	currentVersion: string;

	/** Parent branch if forked */
	parentBranch?: string;

	/** Version from which this was forked */
	forkedFromVersion?: string;

	/** Creation timestamp */
	createdAt: string;

	/** Last update timestamp */
	updatedAt: string;
}

/**
 * Options for creating a new branch
 */
export interface CreateBranchOptions {
	/** Name for the new branch */
	name: string;

	/** Branch to fork from (defaults to current) */
	sourceBranch?: string;

	/** Version to fork from (defaults to latest) */
	sourceVersion?: string;

	/** Start from scratch instead of forking */
	fromScratch?: boolean;
}

/**
 * Result of deck validation
 */
export interface DeckValidationResult {
	/** Is deck valid for Commander format */
	isValid: boolean;

	/** Array of warnings */
	warnings: ValidationWarning[];

	/** Commander card count (should be 1-2) */
	commanderCount: number;

	/** Main deck size (should be 99 or 98) */
	mainDeckSize: number;

	/** Color identity matches commander */
	colorIdentityValid: boolean;
}

/**
 * Type guard utilities for discriminated union
 */

/**
 * Check if a deck is a Commander deck
 */
export function isCommanderDeck(deck: Deck): deck is CommanderDeck {
	return deck.format === DeckFormat.Commander;
}

/**
 * Check if a deck is a Cube deck
 */
export function isCubeDeck(deck: Deck): deck is CubeDeck {
	return deck.format === DeckFormat.Cube;
}

/**
 * Check if a deck is a Standard deck
 */
export function isStandardDeck(deck: Deck): deck is StandardDeck {
	return deck.format === DeckFormat.Standard;
}

/**
 * Check if a deck is a Modern deck
 */
export function isModernDeck(deck: Deck): deck is ModernDeck {
	return deck.format === DeckFormat.Modern;
}

/**
 * Check if a deck is a Pioneer deck
 */
export function isPioneerDeck(deck: Deck): deck is PioneerDeck {
	return deck.format === DeckFormat.Pioneer;
}

/**
 * Check if a deck is a Legacy deck
 */
export function isLegacyDeck(deck: Deck): deck is LegacyDeck {
	return deck.format === DeckFormat.Legacy;
}

/**
 * Check if a deck is a Vintage deck
 */
export function isVintageDeck(deck: Deck): deck is VintageDeck {
	return deck.format === DeckFormat.Vintage;
}

/**
 * Check if a deck is an Oathbreaker deck
 */
export function isOathbreakerDeck(deck: Deck): deck is OathbreakerDeck {
	return deck.format === DeckFormat.Oathbreaker;
}

/**
 * Check if a deck is a PreDH deck
 */
export function isPreDHDeck(deck: Deck): deck is PreDHDeck {
	return deck.format === DeckFormat.PreDH;
}

/**
 * Check if a deck is a Pauper deck
 */
export function isPauperDeck(deck: Deck): deck is PauperDeck {
	return deck.format === DeckFormat.Pauper;
}

/**
 * Check if a deck is a Historic deck
 */
export function isHistoricDeck(deck: Deck): deck is HistoricDeck {
	return deck.format === DeckFormat.Historic;
}

/**
 * Check if a deck is a Brawl deck
 */
export function isBrawlDeck(deck: Deck): deck is BrawlDeck {
	return deck.format === DeckFormat.Brawl;
}

/**
 * Check if a deck is an Alchemy deck
 */
export function isAlchemyDeck(deck: Deck): deck is AlchemyDeck {
	return deck.format === DeckFormat.Alchemy;
}
