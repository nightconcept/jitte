/**
 * Migration Runner
 *
 * Orchestrates storage migrations, ensuring they run in order and
 * tracking which migrations have completed.
 */

import type {
	Migration,
	MigrationEntry,
	MigrationProgress,
	MigrationProgressCallback,
	MigrationResult,
	MigrationStatus,
	SchemaVersion,
	StoredMigrationRecord
} from './types';
import { v1ToV2Migration } from './v1-to-v2';
import { localStorageCleanupMigration } from './localstorage-cleanup';

// Re-export types for external use
export type { MigrationProgressCallback, MigrationProgress, MigrationStatus, MigrationResult } from './types';

// Current target schema version
export const CURRENT_SCHEMA_VERSION: SchemaVersion = '2.0';

// IndexedDB store for migration records
const MIGRATION_DB_NAME = 'jitte-migrations';
const MIGRATION_DB_VERSION = 1;
const MIGRATION_STORE = 'completed-migrations';

/**
 * Migration Registry
 * Add new migrations here in order
 */
const migrations: MigrationEntry[] = [
	{
		migration: v1ToV2Migration,
		order: 1
	},
	{
		migration: localStorageCleanupMigration,
		order: 2
	}
];

/**
 * Register a migration
 */
export function registerMigration(migration: Migration, order: number): void {
	migrations.push({ migration, order });
	// Sort by order
	migrations.sort((a, b) => a.order - b.order);
}

/**
 * Get the migrations database
 */
async function getMigrationDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(MIGRATION_DB_NAME, MIGRATION_DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(MIGRATION_STORE)) {
				db.createObjectStore(MIGRATION_STORE, { keyPath: 'id' });
			}
		};
	});
}

/**
 * Get completed migrations from database
 */
async function getCompletedMigrations(): Promise<StoredMigrationRecord[]> {
	const db = await getMigrationDb();
	const tx = db.transaction([MIGRATION_STORE], 'readonly');
	const store = tx.objectStore(MIGRATION_STORE);

	return new Promise((resolve, reject) => {
		const request = store.getAll();
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Record a completed migration
 */
async function recordMigration(
	migrationId: string,
	result: MigrationResult,
	version: SchemaVersion
): Promise<void> {
	const db = await getMigrationDb();
	const tx = db.transaction([MIGRATION_STORE], 'readwrite');
	const store = tx.objectStore(MIGRATION_STORE);

	const record: StoredMigrationRecord = {
		id: migrationId,
		completedAt: Date.now(),
		result,
		resultingVersion: version
	};

	await new Promise<void>((resolve, reject) => {
		const request = store.put(record);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

/**
 * Check current migration status
 */
export async function getMigrationStatus(): Promise<MigrationStatus> {
	const completed = await getCompletedMigrations();
	const completedIds = new Set(completed.map((m) => m.id));

	// Determine current version from completed migrations
	let currentVersion: SchemaVersion = '1.0';
	if (completed.length > 0) {
		// Get the most recent migration's resulting version
		const sorted = [...completed].sort((a, b) => b.completedAt - a.completedAt);
		currentVersion = sorted[0].resultingVersion;
	}

	// Find pending migrations
	const pendingMigrations: string[] = [];
	for (const entry of migrations) {
		if (!completedIds.has(entry.migration.id)) {
			const canMigrate = await entry.migration.canMigrate();
			if (canMigrate) {
				pendingMigrations.push(entry.migration.id);
			}
		}
	}

	const lastMigration = completed.length > 0
		? Math.max(...completed.map((m) => m.completedAt))
		: undefined;

	return {
		currentVersion,
		needsMigration: pendingMigrations.length > 0,
		pendingMigrations,
		completedMigrations: Array.from(completedIds),
		lastMigrationAt: lastMigration
	};
}

/**
 * Run all pending migrations
 */
export async function runMigrations(
	onProgress?: MigrationProgressCallback
): Promise<MigrationResult> {
	const startTime = Date.now();
	const warnings: string[] = [];
	let totalMigrated = 0;

	const status = await getMigrationStatus();

	if (!status.needsMigration) {
		return {
			success: true,
			itemsMigrated: 0,
			durationMs: Date.now() - startTime
		};
	}

	const completed = await getCompletedMigrations();
	const completedIds = new Set(completed.map((m) => m.id));

	// Run migrations in order
	for (let i = 0; i < migrations.length; i++) {
		const entry = migrations[i];

		// Skip already completed
		if (completedIds.has(entry.migration.id)) {
			continue;
		}

		// Check if can migrate
		const canMigrate = await entry.migration.canMigrate();
		if (!canMigrate) {
			continue;
		}

		// Report overall progress
		const overallProgress: MigrationProgress = {
			step: `Running migration: ${entry.migration.description}`,
			percentage: Math.round((i / migrations.length) * 100),
			currentItem: entry.migration.id
		};
		onProgress?.(overallProgress);

		console.log(`[Migration] Starting: ${entry.migration.id} - ${entry.migration.description}`);

		// Run the migration
		const result = await entry.migration.migrate((progress) => {
			// Wrap progress to include overall context
			onProgress?.({
				...progress,
				step: `${entry.migration.description}: ${progress.step}`
			});
		});

		if (!result.success) {
			console.error(`[Migration] Failed: ${entry.migration.id}`, result.error);
			return {
				success: false,
				error: `Migration ${entry.migration.id} failed: ${result.error}`,
				warnings,
				durationMs: Date.now() - startTime
			};
		}

		// Validate the migration
		const isValid = await entry.migration.validate();
		if (!isValid) {
			console.error(`[Migration] Validation failed: ${entry.migration.id}`);
			return {
				success: false,
				error: `Migration ${entry.migration.id} validation failed`,
				warnings,
				durationMs: Date.now() - startTime
			};
		}

		// Record completion
		await recordMigration(entry.migration.id, result, entry.migration.toVersion);

		totalMigrated += result.itemsMigrated ?? 0;
		if (result.warnings) {
			warnings.push(...result.warnings);
		}

		console.log(`[Migration] Completed: ${entry.migration.id}`);
	}

	return {
		success: true,
		itemsMigrated: totalMigrated,
		warnings: warnings.length > 0 ? warnings : undefined,
		durationMs: Date.now() - startTime
	};
}

/**
 * Check if any migrations are needed
 */
export async function needsMigration(): Promise<boolean> {
	const status = await getMigrationStatus();
	return status.needsMigration;
}

/**
 * Get a specific migration by ID
 */
export function getMigration(id: string): Migration | undefined {
	const entry = migrations.find((m) => m.migration.id === id);
	return entry?.migration;
}

/**
 * Get all registered migrations
 */
export function getAllMigrations(): Migration[] {
	return migrations.map((m) => m.migration);
}

/**
 * Clear migration history (for testing only)
 */
export async function clearMigrationHistory(): Promise<void> {
	const db = await getMigrationDb();
	const tx = db.transaction([MIGRATION_STORE], 'readwrite');
	const store = tx.objectStore(MIGRATION_STORE);

	await new Promise<void>((resolve, reject) => {
		const request = store.clear();
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}
