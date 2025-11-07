/**
 * Version control related type definitions
 */

/**
 * Semantic version structure
 */
export interface SemanticVersion {
	major: number;
	minor: number;
	patch: number;
}

/**
 * Version metadata for a single deck snapshot
 */
export interface VersionMetadata {
	/** Semantic version string (e.g., "1.2.3") */
	version: string;

	/** Branch this version belongs to */
	branch: string;

	/** Commit message describing the changes */
	commitMessage: string;

	/** ISO timestamp of when this version was created */
	timestamp: string;

	/** Optional author information */
	author?: string;

	/** Optional tags for this version */
	tags?: string[];
}

/**
 * Complete version history metadata for a branch
 */
export interface BranchMetadata {
	/** Branch name */
	name: string;

	/** Array of version metadata entries */
	versions: VersionMetadata[];

	/** Current/latest version on this branch */
	currentVersion: string;

	/** Parent branch (if this was forked from another) */
	parentBranch?: string;

	/** Version from which this branch was forked */
	forkedFromVersion?: string;

	/** ISO timestamp of branch creation */
	createdAt: string;

	/** ISO timestamp of last update */
	updatedAt: string;
}

/**
 * Diff between two versions
 */
export interface VersionDiff {
	/** Cards added in the new version */
	added: DiffCard[];

	/** Cards removed in the new version */
	removed: DiffCard[];

	/** Cards with quantity changes */
	modified: DiffCard[];

	/** Total number of changes */
	totalChanges: number;

	/** Suggested version bump type */
	suggestedBump: 'major' | 'minor' | 'patch';
}

/**
 * Card with diff information
 */
export interface DiffCard {
	name: string;
	setCode?: string;
	oldQuantity?: number;
	newQuantity?: number;
	quantityDelta?: number;
	price?: number;
}

/**
 * Thresholds for auto-suggesting version bumps
 */
export interface SemverThresholds {
	/** Max changes for patch bump (default: 2) */
	patch: number;

	/** Max changes for minor bump (default: 10) */
	minor: number;

	/** Changes above minor threshold are major */
}

/**
 * Stash entry for unsaved changes
 */
export interface Stash {
	/** Branch this stash belongs to */
	branch: string;

	/** Serialized deck content */
	content: string;

	/** ISO timestamp of when stash was created */
	timestamp: string;

	/** Last saved version before stash */
	lastSavedVersion: string;
}
