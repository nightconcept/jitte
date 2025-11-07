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
}

/**
 * Deck statistics
 */
export interface DeckStatistics {
	/** Total cards */
	totalCards: number;

	/** Mana curve (CMC distribution) */
	manaCurve: Record<number, number>;

	/** Color distribution */
	colorDistribution: Record<string, number>;

	/** Type distribution */
	typeDistribution: Record<string, number>;

	/** Average CMC */
	averageCmc: number;

	/** Land count */
	landCount: number;

	/** Non-land count */
	nonLandCount: number;

	/** Total deck price (USD) */
	totalPrice: number;

	/** Validation warnings */
	warnings: ValidationWarning[];
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
