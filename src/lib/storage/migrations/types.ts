/**
 * Migration System Types
 *
 * Defines the interface for storage migrations. Each migration handles
 * converting data from one schema version to another.
 *
 * Migration naming convention: v{from}-to-v{to}.ts
 * Example: v1-to-v2.ts
 */

/**
 * Schema version identifier
 */
export type SchemaVersion = '1.0' | '2.0';

/**
 * Result of a migration operation
 */
export interface MigrationResult {
	/** Whether the migration succeeded */
	success: boolean;

	/** Error message if failed */
	error?: string;

	/** Number of items migrated */
	itemsMigrated?: number;

	/** Warnings encountered during migration */
	warnings?: string[];

	/** Time taken in milliseconds */
	durationMs?: number;
}

/**
 * Migration progress callback
 */
export type MigrationProgressCallback = (progress: MigrationProgress) => void;

/**
 * Migration progress information
 */
export interface MigrationProgress {
	/** Current step being executed */
	step: string;

	/** Progress percentage (0-100) */
	percentage: number;

	/** Current item being processed */
	currentItem?: string;

	/** Total items to process */
	totalItems?: number;

	/** Items processed so far */
	processedItems?: number;
}

/**
 * Migration interface
 * All migrations must implement this interface
 */
export interface Migration {
	/** Unique identifier for this migration */
	id: string;

	/** Human-readable description */
	description: string;

	/** Source schema version */
	fromVersion: SchemaVersion;

	/** Target schema version */
	toVersion: SchemaVersion;

	/**
	 * Check if this migration can run
	 * (e.g., old data exists, not already migrated)
	 */
	canMigrate(): Promise<boolean>;

	/**
	 * Execute the migration
	 * @param onProgress - Optional progress callback
	 */
	migrate(onProgress?: MigrationProgressCallback): Promise<MigrationResult>;

	/**
	 * Validate that migration completed successfully
	 */
	validate(): Promise<boolean>;
}

/**
 * Migration registry entry
 */
export interface MigrationEntry {
	/** Migration instance */
	migration: Migration;

	/** Order in which to run (lower = earlier) */
	order: number;
}

/**
 * Overall migration status for the app
 */
export interface MigrationStatus {
	/** Current data schema version */
	currentVersion: SchemaVersion;

	/** Whether migrations are needed */
	needsMigration: boolean;

	/** List of migrations that need to run */
	pendingMigrations: string[];

	/** List of migrations that have completed */
	completedMigrations: string[];

	/** Last migration timestamp */
	lastMigrationAt?: number;
}

/**
 * Migration metadata stored in IndexedDB
 */
export interface StoredMigrationRecord {
	/** Migration ID */
	id: string;

	/** When the migration ran */
	completedAt: number;

	/** Result of the migration */
	result: MigrationResult;

	/** Schema version after migration */
	resultingVersion: SchemaVersion;
}

/**
 * Context passed to migrations
 */
export interface MigrationContext {
	/** Report progress */
	reportProgress: MigrationProgressCallback;

	/** Log a warning */
	logWarning: (message: string) => void;

	/** Log info */
	logInfo: (message: string) => void;
}

/**
 * Old format deck data (v1.0 - full card objects)
 * Used for migration from old localStorage/FileSystem format
 */
export interface LegacyDeckData {
	manifest: {
		name: string;
		format?: string;
		currentBranch: string;
		currentVersion: string;
		branches: Array<{
			name: string;
			versions: Array<{
				version: string;
				branch: string;
				commitMessage: string;
				timestamp: string;
			}>;
			currentVersion: string;
			createdAt: string;
			updatedAt: string;
		}>;
		createdAt: string;
		updatedAt: string;
		appVersion?: string;
	};
	maybeboard: {
		categories: Array<{
			id: string;
			name: string;
			cards: Array<Record<string, unknown>>;
		}>;
		defaultCategoryId: string;
	};
	versions: Record<string, Record<string, string>>;
	stashes?: Record<string, string>;
}

/**
 * Legacy card data (v1.0 - full card object stored in version files)
 */
export interface LegacyCard {
	name: string;
	quantity: number;
	setCode?: string;
	collectorNumber?: string;
	scryfallId?: string;
	oracleId?: string;
	cmc?: number;
	manaCost?: string;
	colorIdentity?: string[];
	types?: string[];
	subtypes?: string[];
	oracleText?: string;
	price?: number;
	prices?: Record<string, number>;
	imageUrls?: Record<string, string>;
	// Cube overrides
	customCmc?: number;
	customColorIdentity?: string[];
	customCategory?: string;
}

/**
 * Type guard for legacy card
 */
export function isLegacyCard(card: unknown): card is LegacyCard {
	if (!card || typeof card !== 'object') return false;
	const c = card as Record<string, unknown>;
	return typeof c.name === 'string' && typeof c.quantity === 'number';
}
