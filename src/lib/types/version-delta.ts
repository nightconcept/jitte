/**
 * Version Delta Types
 *
 * Supports delta-based version storage where only changes between versions
 * are stored, with periodic base snapshots for reconstruction efficiency.
 *
 * Strategy:
 * - Base snapshot created on: branch creation, every 10 versions
 * - All other versions stored as deltas from previous version
 * - To reconstruct: load nearest base, apply deltas sequentially
 */

import type { CardReference, CardReferenceIdentifier, CardReferencesByCategory } from './card-reference';

/**
 * Current schema version for version storage
 */
export const VERSION_STORAGE_SCHEMA = '2.0' as const;

/**
 * Number of versions between automatic base snapshots
 */
export const BASE_SNAPSHOT_INTERVAL = 10;

/**
 * Full snapshot of a deck version (base)
 * Created on branch creation and every BASE_SNAPSHOT_INTERVAL versions
 */
export interface VersionBase {
	schemaVersion: typeof VERSION_STORAGE_SCHEMA;

	/** Semantic version string (e.g., "1.0.0") */
	version: string;

	/** Full card state at this version */
	cards: CardReferencesByCategory;
}

/**
 * Delta between two consecutive versions
 * Stores only the changes from the previous version
 */
export interface VersionDelta {
	schemaVersion: typeof VERSION_STORAGE_SCHEMA;

	/** The base version this delta chain starts from (e.g., "1.0.0") */
	baseVersion: string;

	/** The version this delta represents (e.g., "1.5.0") */
	version: string;

	/** The immediate predecessor version (e.g., "1.4.0") */
	previousVersion: string;

	/** Cards added in this version */
	added: CardReference[];

	/** Cards removed in this version (identified by printing) */
	removed: CardReferenceIdentifier[];

	/** Cards with modified properties (quantity, custom overrides) */
	modified: CardModification[];

	/** Cards that moved between categories */
	categoryChanges?: CategoryChange[];
}

/**
 * Modification to an existing card
 */
export interface CardModification {
	/** Which card was modified */
	card: CardReferenceIdentifier;

	/** The changes applied (partial update) */
	changes: Partial<Omit<CardReference, 'scryfallId' | 'setCode' | 'collectorNumber'>>;
}

/**
 * Card moved between categories
 */
export interface CategoryChange {
	/** Which card moved */
	card: CardReferenceIdentifier;

	/** Original category */
	fromCategory: string;

	/** New category */
	toCategory: string;
}

/**
 * Metadata for a version (stored separately from content)
 */
export interface VersionMeta {
	/** Semantic version string */
	version: string;

	/** Branch this version belongs to */
	branch: string;

	/** User-provided commit message */
	commitMessage: string;

	/** ISO timestamp of when version was created */
	timestamp: string;

	/** Whether this version is a base snapshot */
	isBase: boolean;

	/** If not a base, which base version this derives from */
	baseVersion?: string;

	/** Number of deltas from base (for reconstruction cost estimation) */
	deltaDepth?: number;
}

/**
 * Union type for version content (either base or delta)
 */
export type VersionContent = VersionBase | VersionDelta;

/**
 * Type guard to check if version content is a base snapshot
 */
export function isVersionBase(content: VersionContent): content is VersionBase {
	return 'cards' in content && !('previousVersion' in content);
}

/**
 * Type guard to check if version content is a delta
 */
export function isVersionDelta(content: VersionContent): content is VersionDelta {
	return 'previousVersion' in content && 'added' in content;
}

/**
 * Result of version reconstruction
 */
export interface ReconstructedVersion {
	/** The reconstructed card state */
	cards: CardReferencesByCategory;

	/** Metadata about the reconstruction */
	meta: {
		/** Version that was reconstructed */
		version: string;

		/** Base version used */
		baseVersion: string;

		/** Number of deltas applied */
		deltasApplied: number;

		/** Time taken to reconstruct (ms) */
		reconstructionTimeMs: number;
	};
}

/**
 * Branch base tracking for efficient reconstruction
 */
export interface BranchBaseInfo {
	/** Branch name */
	branch: string;

	/** List of base versions in this branch, in order */
	bases: string[];

	/** Map of version -> nearest base for quick lookup */
	versionToBase: Record<string, string>;
}

/**
 * Delta calculation result
 */
export interface DeltaCalculationResult {
	/** The calculated delta */
	delta: VersionDelta;

	/** Whether a new base should be created instead */
	shouldCreateBase: boolean;

	/** Reason for base creation recommendation */
	baseReason?: 'interval' | 'branch_creation' | 'major_change';

	/** Statistics about the delta */
	stats: {
		addedCount: number;
		removedCount: number;
		modifiedCount: number;
		categoryChangesCount: number;
		/** Estimated size savings vs full snapshot (bytes) */
		estimatedSavings: number;
	};
}
