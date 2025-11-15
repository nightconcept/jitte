/**
 * Storage Migration Utilities
 * Handles migration from zip-based storage to folder-based storage
 */

import type { StorageResult } from './types';
import { StorageErrorCode, StorageProvider } from './types';
import { FileSystemProvider } from './filesystem-provider';
import { FileSystemFolderProvider } from './filesystem-folder-provider';
import type { DeckListEntry } from './types';

export interface MigrationProgress {
	total: number;
	completed: number;
	currentDeck?: string;
	errors: Array<{ deckName: string; error: string }>;
}

export interface MigrationResult {
	success: boolean;
	migratedCount: number;
	failedCount: number;
	errors: Array<{ deckName: string; error: string }>;
}

/**
 * Migrate all decks from zip-based storage to folder-based storage
 *
 * @param sourceHandle - Directory handle containing .zip files
 * @param targetHandle - Directory handle for folder-based storage (can be same as source)
 * @param onProgress - Optional callback for progress updates
 * @returns Migration result
 */
export async function migrateZipToFolders(
	sourceHandle: FileSystemDirectoryHandle,
	targetHandle: FileSystemDirectoryHandle,
	onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
	const errors: Array<{ deckName: string; error: string }> = [];
	let migratedCount = 0;
	let failedCount = 0;

	try {
		// Create source provider (zip-based)
		const sourceProvider = new FileSystemProvider();
		const sourceInitResult = await sourceProvider.initializeWithHandle(sourceHandle);

		if (!sourceInitResult.success) {
			return {
				success: false,
				migratedCount: 0,
				failedCount: 0,
				errors: [{ deckName: 'init', error: 'Failed to initialize source provider' }]
			};
		}

		// Create target provider (folder-based)
		const targetProvider = new FileSystemFolderProvider();
		const targetInitResult = await targetProvider.initializeWithHandle(targetHandle);

		if (!targetInitResult.success) {
			return {
				success: false,
				migratedCount: 0,
				failedCount: 0,
				errors: [{ deckName: 'init', error: 'Failed to initialize target provider' }]
			};
		}

		// List all decks from source
		const listResult = await sourceProvider.listDecks();

		if (!listResult.success || !listResult.data) {
			return {
				success: false,
				migratedCount: 0,
				failedCount: 0,
				errors: [{ deckName: 'list', error: 'Failed to list source decks' }]
			};
		}

		const decks = listResult.data;
		const total = decks.length;

		// Migrate each deck
		for (let i = 0; i < decks.length; i++) {
			const deck = decks[i];

			// Update progress
			if (onProgress) {
				onProgress({
					total,
					completed: i,
					currentDeck: deck.name,
					errors
				});
			}

			try {
				// Load from zip
				const loadResult = await sourceProvider.loadDeck(deck.name);

				if (!loadResult.success || !loadResult.data) {
					errors.push({
						deckName: deck.name,
						error: loadResult.error || 'Failed to load deck'
					});
					failedCount++;
					continue;
				}

				// Save as folder
				const saveResult = await targetProvider.saveDeck(deck.name, loadResult.data);

				if (!saveResult.success) {
					errors.push({
						deckName: deck.name,
						error: saveResult.error || 'Failed to save deck'
					});
					failedCount++;
					continue;
				}

				migratedCount++;

				// Delete old zip file (only if source and target are different, or if migration succeeded)
				if (sourceHandle !== targetHandle) {
					await sourceProvider.deleteDeck(deck.name);
				}
			} catch (error) {
				errors.push({
					deckName: deck.name,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
				failedCount++;
			}
		}

		// Final progress update
		if (onProgress) {
			onProgress({
				total,
				completed: total,
				errors
			});
		}

		return {
			success: errors.length === 0,
			migratedCount,
			failedCount,
			errors
		};
	} catch (error) {
		return {
			success: false,
			migratedCount,
			failedCount,
			errors: [
				...errors,
				{
					deckName: 'migration',
					error: error instanceof Error ? error.message : 'Unknown migration error'
				}
			]
		};
	}
}

/**
 * Detect if a directory contains old zip-based decks
 *
 * @param dirHandle - Directory handle to check
 * @returns True if old zip files are found
 */
export async function hasLegacyZipDecks(
	dirHandle: FileSystemDirectoryHandle
): Promise<boolean> {
	try {
		for await (const entry of dirHandle.values()) {
			if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
				return true;
			}
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Detect if a directory contains new folder-based decks
 *
 * @param dirHandle - Directory handle to check
 * @returns True if folder-based decks are found
 */
export async function hasFolderBasedDecks(
	dirHandle: FileSystemDirectoryHandle
): Promise<boolean> {
	try {
		for await (const entry of dirHandle.values()) {
			if (entry.kind === 'directory') {
				// Check if directory has manifest.json
				try {
					const subDirHandle = entry as FileSystemDirectoryHandle;
					await subDirHandle.getFileHandle('manifest.json');
					return true;
				} catch {
					// Not a deck folder, continue
					continue;
				}
			}
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Get migration recommendation based on directory contents
 *
 * @param dirHandle - Directory handle to check
 * @returns Recommendation
 */
export async function getMigrationRecommendation(
	dirHandle: FileSystemDirectoryHandle
): Promise<{
	shouldMigrate: boolean;
	hasZipDecks: boolean;
	hasFolderDecks: boolean;
	message: string;
}> {
	const hasZip = await hasLegacyZipDecks(dirHandle);
	const hasFolder = await hasFolderBasedDecks(dirHandle);

	if (hasZip && !hasFolder) {
		return {
			shouldMigrate: true,
			hasZipDecks: true,
			hasFolderDecks: false,
			message: 'Legacy zip-based decks detected. Migration recommended for better performance and developer experience.'
		};
	}

	if (hasZip && hasFolder) {
		return {
			shouldMigrate: true,
			hasZipDecks: true,
			hasFolderDecks: true,
			message: 'Mixed storage detected. Migration recommended to consolidate to folder-based storage.'
		};
	}

	if (!hasZip && hasFolder) {
		return {
			shouldMigrate: false,
			hasZipDecks: false,
			hasFolderDecks: true,
			message: 'Already using folder-based storage. No migration needed.'
		};
	}

	return {
		shouldMigrate: false,
		hasZipDecks: false,
		hasFolderDecks: false,
		message: 'No decks found.'
	};
}

/**
 * Delete all legacy zip files after successful migration
 *
 * @param dirHandle - Directory handle
 * @param confirm - Confirmation flag (safety check)
 * @returns Result
 */
export async function cleanupLegacyZipFiles(
	dirHandle: FileSystemDirectoryHandle,
	confirm: boolean = false
): Promise<StorageResult<number>> {
	if (!confirm) {
		return {
			success: false,
			error: 'Cleanup must be confirmed',
			errorCode: StorageErrorCode.InvalidData
		};
	}

	try {
		let deletedCount = 0;

		// Collect all .zip files
		const zipFiles: string[] = [];
		for await (const entry of dirHandle.values()) {
			if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
				zipFiles.push(entry.name);
			}
		}

		// Delete each .zip file
		for (const filename of zipFiles) {
			try {
				await dirHandle.removeEntry(filename);
				deletedCount++;
			} catch (error) {
				console.error(`Failed to delete ${filename}:`, error);
			}
		}

		return {
			success: true,
			data: deletedCount
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to cleanup legacy files',
			errorCode: StorageErrorCode.Unknown
		};
	}
}
