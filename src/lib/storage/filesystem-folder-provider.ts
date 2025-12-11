/**
 * File System Folder-based Storage Provider
 * Saves decks as plain folder structures instead of zip files
 */

import { getDeckFilename, getDeckFolderName, extractDeckName } from '$lib/utils/filename';
import type { DeckArchive } from '$lib/utils/zip';
import type { DeckListEntry, IStorageProvider, StorageCapabilities, StorageResult } from './types';
import { StorageErrorCode, StorageProvider } from './types';
import type { CardReferencesByCategory } from '$lib/types/card-reference';
import type { VersionBase, VersionDelta, VersionContent } from '$lib/types/version-delta';
import { isVersionBase, isVersionDelta } from '$lib/types/version-delta';

/**
 * FileSystem Folder implementation of IStorageProvider
 * Stores decks as folders with JSON files instead of zip archives
 */
export class FileSystemFolderProvider implements IStorageProvider {
	readonly type = StorageProvider.FolderStorage;

	private directoryHandle: FileSystemDirectoryHandle | null = null;
	private directoryPath: string | null = null;

	getCapabilities(): StorageCapabilities {
		return {
			canStoreFiles: true,
			canCreateDirectories: true,
			canListFiles: true,
			requiresPermission: true,
			maxSize: undefined // No inherent limit (depends on disk space)
		};
	}

	/**
	 * Initialize with user-selected directory
	 */
	async initialize(): Promise<StorageResult<void>> {
		try {
			// Check if FileSystem API is supported
			if (!('showDirectoryPicker' in window)) {
				return {
					success: false,
					error: 'File System Access API not supported in this browser',
					errorCode: StorageErrorCode.NotSupported
				};
			}

			// Request directory access from user
			const handle = await window.showDirectoryPicker({
				mode: 'readwrite',
				startIn: 'documents'
			});

			this.directoryHandle = handle;
			this.directoryPath = handle.name;

			return {
				success: true
			};
		} catch (error) {
			if (error instanceof DOMException) {
				if (error.name === 'AbortError') {
					return {
						success: false,
						error: 'User cancelled directory selection',
						errorCode: StorageErrorCode.PermissionDenied
					};
				}

				if (error.name === 'NotAllowedError') {
					return {
						success: false,
						error: 'Permission denied to access directory',
						errorCode: StorageErrorCode.PermissionDenied
					};
				}
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to initialize storage',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Initialize with existing directory handle (e.g., from persisted state)
	 */
	async initializeWithHandle(handle: FileSystemDirectoryHandle): Promise<StorageResult<void>> {
		try {
			// Verify we still have permission
			const permission = await handle.queryPermission({ mode: 'readwrite' });

			if (permission === 'denied') {
				return {
					success: false,
					error: 'Permission denied to access directory',
					errorCode: StorageErrorCode.PermissionDenied
				};
			}

			// Request permission if prompt state
			if (permission === 'prompt') {
				const newPermission = await handle.requestPermission({ mode: 'readwrite' });

				if (newPermission === 'denied') {
					return {
						success: false,
						error: 'Permission denied to access directory',
						errorCode: StorageErrorCode.PermissionDenied
					};
				}
			}

			this.directoryHandle = handle;
			this.directoryPath = handle.name;

			return {
				success: true
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to initialize with handle',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	isInitialized(): boolean {
		return this.directoryHandle !== null;
	}

	/**
	 * Get current directory handle (for persistence)
	 */
	getDirectoryHandle(): FileSystemDirectoryHandle | null {
		return this.directoryHandle;
	}

	/**
	 * Get directory path/name
	 */
	getDirectoryPath(): string | null {
		return this.directoryPath;
	}

	/**
	 * Save a deck as a folder structure
	 */
	async saveDeck(deckName: string, archive: DeckArchive): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {

			// Get or create deck folder
			const deckFolderName = getDeckFolderName(deckName);
			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName, {
				create: true
			});

			// Save manifest.json
			await this.writeJsonFile(deckFolderHandle, 'manifest.json', archive.manifest);

			// Save maybeboard files
			const maybeboardHandle = await deckFolderHandle.getDirectoryHandle('maybeboards', {
				create: true
			});

			// Save maybeboard metadata
			await this.writeJsonFile(maybeboardHandle, 'metadata.json', {
				defaultCategoryId: archive.maybeboard.defaultCategoryId
			});

			// Save each maybeboard category
			for (const category of archive.maybeboard.categories) {
				await this.writeJsonFile(maybeboardHandle, `${category.id}.json`, category);
			}

			// Save version files in branches/ folder
			const branchesHandle = await deckFolderHandle.getDirectoryHandle('branches', {
				create: true
			});

			for (const [branchName, versions] of Object.entries(archive.versions)) {
				const branchHandle = await branchesHandle.getDirectoryHandle(branchName, {
					create: true
				});

				for (const [versionFile, content] of Object.entries(versions)) {
					await this.writeTextFile(branchHandle, versionFile, content);
				}
			}

			// Save stashes if present
			if (archive.stashes) {
				for (const [branchName, stashContent] of Object.entries(archive.stashes)) {
					const branchHandle = await branchesHandle.getDirectoryHandle(branchName, {
						create: true
					});
					await this.writeTextFile(branchHandle, 'stash.txt', stashContent);
				}
			}

			return {
				success: true
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotAllowedError') {
				return {
					success: false,
					error: 'Permission denied to write files',
					errorCode: StorageErrorCode.PermissionDenied
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to save deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Migrate a deck from old .zip format to new folder format
	 */
	private async migrateOldDeck(deckName: string): Promise<StorageResult<DeckArchive>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			// Old format used .zip extension
			const zipFileName = getDeckFilename(deckName);
			console.log(`[FileSystemFolderProvider] Looking for old format .zip file: "${zipFileName}"`);

			// Try to get the .zip file
			let fileHandle: FileSystemFileHandle;
			try {
				fileHandle = await this.directoryHandle.getFileHandle(zipFileName);
			} catch (error) {
				// .zip file not found either
				console.log(`[FileSystemFolderProvider] .zip file not found for "${deckName}"`);
				return {
					success: false,
					error: `Deck "${deckName}" not found in old format`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			console.log(`[FileSystemFolderProvider] Found old format .zip file for "${deckName}", migrating...`);

			// Read the .zip file
			console.log(`[FileSystemFolderProvider] Reading .zip file...`);
			const file = await fileHandle.getFile();
			console.log(`[FileSystemFolderProvider] File size: ${file.size} bytes`);
			const arrayBuffer = await file.arrayBuffer();
			const blob = new Blob([arrayBuffer], { type: 'application/zip' });
			console.log(`[FileSystemFolderProvider] Created blob (${blob.size} bytes)`);

			// Decompress the archive
			console.log(`[FileSystemFolderProvider] Decompressing archive...`);
			const { decompressDeckArchive } = await import('$lib/utils/zip');
			const archive = await decompressDeckArchive(blob);
			console.log(`[FileSystemFolderProvider] Decompression successful, manifest:`, archive.manifest);

			// Save in new folder format (strip .zip extension from name)
			const cleanDeckName = extractDeckName(deckName);
			console.log(`[FileSystemFolderProvider] Saving in new folder format as "${cleanDeckName}"...`);
			const saveResult = await this.saveDeck(cleanDeckName, archive);
			if (!saveResult.success) {
				console.error(`[FileSystemFolderProvider] Save failed:`, saveResult.error);
				throw new Error(`Failed to save migrated deck: ${saveResult.error}`);
			}
			console.log(`[FileSystemFolderProvider] Save successful`);

			// Delete the old .zip file
			console.log(`[FileSystemFolderProvider] Deleting old .zip file...`);
			await this.directoryHandle.removeEntry(zipFileName);
			console.log(`[FileSystemFolderProvider] Migration complete for "${deckName}", old .zip file removed`);

			return {
				success: true,
				data: archive
			};
		} catch (error) {
			console.error(`[FileSystemFolderProvider] Migration failed for "${deckName}":`, error);
			if (error instanceof Error) {
				console.error(`[FileSystemFolderProvider] Error stack:`, error.stack);
			}
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Migration failed',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Load a deck from folder structure
	 */
	async loadDeck(deckName: string): Promise<StorageResult<DeckArchive>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			// Try to get deck folder
			let deckFolderHandle: FileSystemDirectoryHandle;
			try {
				deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName);
			} catch (error) {
				// Folder not found, try to migrate from old .zip format
				console.log(`[FileSystemFolderProvider] Deck folder "${deckFolderName}" not found, checking for old .zip format...`);
				const migrationResult = await this.migrateOldDeck(deckName);
				if (migrationResult.success && migrationResult.data) {
					console.log(`[FileSystemFolderProvider] Successfully migrated "${deckName}" to new format`);
					return migrationResult;
				}

				return {
					success: false,
					error: `Deck "${deckName}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			// Read manifest.json
			const manifest = await this.readJsonFile(deckFolderHandle, 'manifest.json');

			// Read maybeboard
			const maybeboardHandle = await deckFolderHandle.getDirectoryHandle('maybeboards');
			const maybeboardMetadata = await this.readJsonFile(maybeboardHandle, 'metadata.json');

			// Read maybeboard categories
			const categories = [];
			for await (const entry of maybeboardHandle.values()) {
				if (entry.kind === 'file' && entry.name.endsWith('.json') && entry.name !== 'metadata.json') {
					const category = await this.readJsonFile(maybeboardHandle, entry.name);
					categories.push(category);
				}
			}

			const maybeboard = {
				categories,
				defaultCategoryId: maybeboardMetadata.defaultCategoryId
			};

			// Read version files from branches/
			const branchesHandle = await deckFolderHandle.getDirectoryHandle('branches');
			const versions: Record<string, Record<string, string>> = {};
			const stashes: Record<string, string> = {};

			for await (const branchEntry of branchesHandle.values()) {
				if (branchEntry.kind === 'directory') {
					const branchName = branchEntry.name;
					const branchHandle = branchEntry as FileSystemDirectoryHandle;

					versions[branchName] = {};

					for await (const fileEntry of branchHandle.values()) {
						if (fileEntry.kind === 'file') {
							const fileName = fileEntry.name;
							const content = await this.readTextFile(branchHandle, fileName);

							if (fileName === 'stash.txt') {
								stashes[branchName] = content;
							} else if (fileName.startsWith('v') && (fileName.endsWith('.json') || fileName.endsWith('.txt'))) {
								versions[branchName][fileName] = content;
							}
						}
					}
				}
			}

			// Create archive structure
			const archive: DeckArchive = {
				manifest,
				maybeboard,
				versions,
				stashes: Object.keys(stashes).length > 0 ? stashes : undefined
			};

			return {
				success: true,
				data: archive
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				return {
					success: false,
					error: `Deck "${deckName}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to load deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Delete a deck folder
	 */
	async deleteDeck(deckName: string): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			// Remove the deck folder recursively
			await this.directoryHandle.removeEntry(deckFolderName, { recursive: true });

			return {
				success: true
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				return {
					success: false,
					error: `Deck "${deckName}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to delete deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Rename a deck folder
	 */
	async renameDeck(oldName: string, newName: string): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			// Strip .zip extension from both names for comparison
			const cleanOldName = extractDeckName(oldName);
			const cleanNewName = extractDeckName(newName);

			// If they're the same after cleaning, nothing to do
			if (cleanOldName === cleanNewName) {
				console.log(`[FileSystemFolderProvider] Rename skipped: "${oldName}" and "${newName}" are the same after normalization`);
				// Just delete the old .zip file if it exists
				try {
					const zipFileName = getDeckFilename(oldName);
					await this.directoryHandle.removeEntry(zipFileName);
					console.log(`[FileSystemFolderProvider] Removed old .zip file: ${zipFileName}`);
				} catch {
					// .zip file doesn't exist, that's fine
				}
				return {
					success: true
				};
			}

			const oldFolderName = getDeckFolderName(cleanOldName);
			const newFolderName = getDeckFolderName(cleanNewName);

			// Load the deck (may trigger migration which creates cleanOldName)
			const loadResult = await this.loadDeck(oldName);
			if (!loadResult.success || !loadResult.data) {
				return {
					success: false,
					error: loadResult.error || 'Failed to load deck for renaming',
					errorCode: loadResult.errorCode
				};
			}

			// Check if new name already exists (after migration)
			try {
				await this.directoryHandle.getDirectoryHandle(newFolderName);
				return {
					success: false,
					error: `A deck with the name "${cleanNewName}" already exists`,
					errorCode: StorageErrorCode.AlreadyExists
				};
			} catch {
				// New name doesn't exist - this is good
			}

			// Update manifest with new name
			const archive = loadResult.data;
			archive.manifest.name = cleanNewName;
			archive.manifest.updatedAt = new Date().toISOString();

			// Save with new name
			const saveResult = await this.saveDeck(cleanNewName, archive);

			if (!saveResult.success) {
				return saveResult;
			}

			// Delete old folder - try both cleaned and original names
			// in case the folder has .zip in its name
			try {
				await this.directoryHandle.removeEntry(oldFolderName, { recursive: true });
			} catch (e) {
				console.log(`[FileSystemFolderProvider] Could not delete folder "${oldFolderName}", trying original name...`);
			}

			if (oldName !== cleanOldName) {
				// Also try deleting using original name
				const originalFolderName = getDeckFolderName(oldName);
				try {
					await this.directoryHandle.removeEntry(originalFolderName, { recursive: true });
				} catch (e) {
					console.log(`[FileSystemFolderProvider] Could not delete folder "${originalFolderName}"`);
				}
			}

			return {
				success: true
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				return {
					success: false,
					error: `Deck "${oldName}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to rename deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * List all deck folders
	 */
	async listDecks(): Promise<StorageResult<DeckListEntry[]>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckMap = new Map<string, DeckListEntry>();
			const allEntries: string[] = [];

			// Iterate through directory entries
			for await (const entry of this.directoryHandle.values()) {
				allEntries.push(`${entry.name} (${entry.kind})`);

				// Only include directories (deck folders), skip .zip files
				if (entry.kind === 'directory') {
					const dirHandle = entry as FileSystemDirectoryHandle;

					try {
						// Read manifest to get deck info
						const manifest = await this.readJsonFile(dirHandle, 'manifest.json');

						console.log(`[FileSystemFolderProvider] Found deck folder "${entry.name}" with manifest name: "${manifest.name}"`);

						// Use manifest.name as the key to prevent duplicates
						// If the same deck name appears in multiple folders, keep the most recent one
						const deckEntry = {
							name: manifest.name,
							lastModified: new Date(manifest.updatedAt).getTime()
						};

						const existing = deckMap.get(manifest.name);
						if (!existing || deckEntry.lastModified > existing.lastModified) {
							deckMap.set(manifest.name, deckEntry);
						}
					} catch (error) {
						// Skip folders that don't have a valid manifest
						console.log(`[FileSystemFolderProvider] Skipping folder "${entry.name}" - no valid manifest`);
						continue;
					}
				} else if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
					console.log(`[FileSystemFolderProvider] Skipping old format .zip file: "${entry.name}"`);
				}
			}

			console.log(`[FileSystemFolderProvider] All entries in storage directory:`, allEntries);

			const decks = Array.from(deckMap.values());
			console.log(`[FileSystemFolderProvider] Listed ${decks.length} unique decks:`, decks.map(d => d.name));

			// Sort by last modified (newest first)
			decks.sort((a, b) => b.lastModified - a.lastModified);

			return {
				success: true,
				data: decks
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to list decks',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Check if a deck folder exists
	 */
	async deckExists(deckName: string): Promise<StorageResult<boolean>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);
			await this.directoryHandle.getDirectoryHandle(deckFolderName);

			return {
				success: true,
				data: true
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				return {
					success: true,
					data: false
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to check deck existence',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async getAvailableSpace(): Promise<StorageResult<number>> {
		try {
			// Try to use Storage Manager API if available
			if ('storage' in navigator && 'estimate' in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				const available = (estimate.quota || 0) - (estimate.usage || 0);

				return {
					success: true,
					data: available
				};
			}

			// If not available, return a large estimate
			return {
				success: true,
				data: 1024 * 1024 * 1024 // 1GB estimate
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get available space',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	// ==================== SLIM FORMAT METHODS ====================

	/**
	 * Save a version in slim format (base or delta)
	 */
	async saveVersionSlim(
		deckName: string,
		branch: string,
		version: string,
		content: VersionContent
	): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			// Get or create deck folder structure
			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName, {
				create: true
			});
			const branchesHandle = await deckFolderHandle.getDirectoryHandle('branches', {
				create: true
			});
			const branchHandle = await branchesHandle.getDirectoryHandle(branch, {
				create: true
			});

			// Save as JSON file
			const fileName = `v${version}.json`;
			await this.writeJsonFile(branchHandle, fileName, content);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to save version',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Load a specific version in slim format
	 */
	async loadVersionSlim(
		deckName: string,
		branch: string,
		version: string
	): Promise<StorageResult<VersionContent>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName);
			const branchesHandle = await deckFolderHandle.getDirectoryHandle('branches');
			const branchHandle = await branchesHandle.getDirectoryHandle(branch);

			// Try JSON format first (new slim format)
			const jsonFileName = `v${version}.json`;
			try {
				const content = await this.readJsonFile(branchHandle, jsonFileName);

				// Validate it's a proper slim format
				if (isVersionBase(content) || isVersionDelta(content)) {
					return {
						success: true,
						data: content
					};
				}

				// JSON file exists but is not in slim format (legacy JSON)
				return {
					success: false,
					error: 'Version file is not in slim format',
					errorCode: StorageErrorCode.InvalidData
				};
			} catch {
				// JSON file doesn't exist, check for legacy .txt format
				const txtFileName = `v${version}.txt`;
				try {
					await this.readTextFile(branchHandle, txtFileName);
					return {
						success: false,
						error: 'Version is in legacy format, requires migration',
						errorCode: StorageErrorCode.InvalidData
					};
				} catch {
					return {
						success: false,
						error: `Version ${version} not found`,
						errorCode: StorageErrorCode.NotFound
					};
				}
			}
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				return {
					success: false,
					error: `Deck "${deckName}" or branch "${branch}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to load version',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * List all versions for a branch with their types (base/delta)
	 */
	async listVersionsSlim(
		deckName: string,
		branch: string
	): Promise<StorageResult<Array<{ version: string; isBase: boolean; fileName: string }>>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName);
			const branchesHandle = await deckFolderHandle.getDirectoryHandle('branches');
			const branchHandle = await branchesHandle.getDirectoryHandle(branch);

			const versions: Array<{ version: string; isBase: boolean; fileName: string }> = [];

			for await (const entry of branchHandle.values()) {
				if (entry.kind === 'file' && entry.name.startsWith('v') && entry.name.endsWith('.json')) {
					const fileName = entry.name;
					// Extract version number (remove 'v' prefix and '.json' suffix)
					const version = fileName.slice(1, -5);

					try {
						const content = await this.readJsonFile(branchHandle, fileName);
						const isBase = isVersionBase(content);

						versions.push({
							version,
							isBase,
							fileName
						});
					} catch {
						// Skip files that can't be parsed
						console.warn(`[FileSystemFolderProvider] Could not parse version file: ${fileName}`);
					}
				}
			}

			// Sort by version (semantic versioning)
			versions.sort((a, b) => {
				const partsA = a.version.split('.').map(Number);
				const partsB = b.version.split('.').map(Number);

				for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
					const partA = partsA[i] || 0;
					const partB = partsB[i] || 0;
					if (partA !== partB) return partA - partB;
				}
				return 0;
			});

			return {
				success: true,
				data: versions
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				return {
					success: false,
					error: `Deck "${deckName}" or branch "${branch}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to list versions',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Save maybeboard in slim format (CardReferencesByCategory)
	 */
	async saveMaybeboardSlim(
		deckName: string,
		categoryId: string,
		cards: CardReferencesByCategory
	): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName, {
				create: true
			});
			const maybeboardHandle = await deckFolderHandle.getDirectoryHandle('maybeboards', {
				create: true
			});

			// Save the category with slim card references
			const categoryData = {
				id: categoryId,
				cards,
				schemaVersion: '2.0' as const
			};

			await this.writeJsonFile(maybeboardHandle, `${categoryId}.json`, categoryData);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to save maybeboard',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Load maybeboard category in slim format
	 */
	async loadMaybeboardSlim(
		deckName: string,
		categoryId: string
	): Promise<StorageResult<{ id: string; cards: CardReferencesByCategory }>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName);
			const maybeboardHandle = await deckFolderHandle.getDirectoryHandle('maybeboards');

			const content = await this.readJsonFile(maybeboardHandle, `${categoryId}.json`);

			// Check if it's slim format (has schemaVersion 2.0)
			if (content.schemaVersion === '2.0') {
				return {
					success: true,
					data: {
						id: content.id,
						cards: content.cards
					}
				};
			}

			// Legacy format - needs migration
			return {
				success: false,
				error: 'Maybeboard is in legacy format, requires migration',
				errorCode: StorageErrorCode.InvalidData
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				return {
					success: false,
					error: `Maybeboard category "${categoryId}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to load maybeboard',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Save stash in slim format
	 */
	async saveStashSlim(
		deckName: string,
		branch: string,
		cards: CardReferencesByCategory
	): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName, {
				create: true
			});
			const branchesHandle = await deckFolderHandle.getDirectoryHandle('branches', {
				create: true
			});
			const branchHandle = await branchesHandle.getDirectoryHandle(branch, {
				create: true
			});

			// Save stash as JSON with slim format
			const stashData = {
				schemaVersion: '2.0' as const,
				cards
			};

			await this.writeJsonFile(branchHandle, 'stash.json', stashData);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to save stash',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Load stash in slim format
	 */
	async loadStashSlim(
		deckName: string,
		branch: string
	): Promise<StorageResult<CardReferencesByCategory>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName);
			const branchesHandle = await deckFolderHandle.getDirectoryHandle('branches');
			const branchHandle = await branchesHandle.getDirectoryHandle(branch);

			// Try new JSON format first
			try {
				const content = await this.readJsonFile(branchHandle, 'stash.json');

				if (content.schemaVersion === '2.0') {
					return {
						success: true,
						data: content.cards
					};
				}

				// JSON exists but not slim format
				return {
					success: false,
					error: 'Stash is in legacy format',
					errorCode: StorageErrorCode.InvalidData
				};
			} catch {
				// Try legacy .txt format
				try {
					await this.readTextFile(branchHandle, 'stash.txt');
					return {
						success: false,
						error: 'Stash is in legacy text format, requires migration',
						errorCode: StorageErrorCode.InvalidData
					};
				} catch {
					// No stash exists
					return {
						success: false,
						error: 'No stash found',
						errorCode: StorageErrorCode.NotFound
					};
				}
			}
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				return {
					success: false,
					error: `Deck "${deckName}" or branch "${branch}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to load stash',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Delete a stash
	 */
	async deleteStash(deckName: string, branch: string): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName);
			const branchesHandle = await deckFolderHandle.getDirectoryHandle('branches');
			const branchHandle = await branchesHandle.getDirectoryHandle(branch);

			// Try to delete both formats
			try {
				await branchHandle.removeEntry('stash.json');
			} catch {
				// stash.json doesn't exist
			}

			try {
				await branchHandle.removeEntry('stash.txt');
			} catch {
				// stash.txt doesn't exist
			}

			return { success: true };
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				// Deck/branch doesn't exist, stash is effectively deleted
				return { success: true };
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to delete stash',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Helper: Write a JSON file
	 */
	private async writeJsonFile(
		dirHandle: FileSystemDirectoryHandle,
		filename: string,
		data: unknown
	): Promise<void> {
		const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(JSON.stringify(data, null, 2));
		await writable.close();
	}

	/**
	 * Helper: Write a text file
	 */
	private async writeTextFile(
		dirHandle: FileSystemDirectoryHandle,
		filename: string,
		content: string
	): Promise<void> {
		const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(content);
		await writable.close();
	}

	/**
	 * Helper: Read a JSON file
	 */
	private async readJsonFile(
		dirHandle: FileSystemDirectoryHandle,
		filename: string
	): Promise<any> {
		const fileHandle = await dirHandle.getFileHandle(filename);
		const file = await fileHandle.getFile();
		const text = await file.text();
		return JSON.parse(text);
	}

	/**
	 * Helper: Read a text file
	 */
	private async readTextFile(
		dirHandle: FileSystemDirectoryHandle,
		filename: string
	): Promise<string> {
		const fileHandle = await dirHandle.getFileHandle(filename);
		const file = await fileHandle.getFile();
		return await file.text();
	}

	/**
	 * Helper: Calculate folder size recursively
	 */
	private async calculateFolderSize(dirHandle: FileSystemDirectoryHandle): Promise<number> {
		let totalSize = 0;

		for await (const entry of dirHandle.values()) {
			if (entry.kind === 'file') {
				const fileHandle = entry as FileSystemFileHandle;
				const file = await fileHandle.getFile();
				totalSize += file.size;
			} else if (entry.kind === 'directory') {
				const subDirHandle = entry as FileSystemDirectoryHandle;
				totalSize += await this.calculateFolderSize(subDirHandle);
			}
		}

		return totalSize;
	}
}

/**
 * Check if FileSystem Access API is supported
 */
export function isFolderStorageSupported(): boolean {
	return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}
