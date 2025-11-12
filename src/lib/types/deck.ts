/**
 * Deck type definitions
 */

import type { CategorizedCards, ValidationWarning } from './card';
import type { Maybeboard } from './maybeboard';
import type { BranchMetadata, Stash } from './version';

/**
 * Main deck structure
 */
export interface Deck {
	/** Deck name */
	name: string;

	/** Cards organized by category */
	cards: CategorizedCards;

	/** Total card count (should be 100 for Commander) */
	cardCount: number;

	/** Format (always "commander" for this app) */
	format: 'commander';

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
	format: 'commander';
	createdAt: string;
	updatedAt: string;

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
