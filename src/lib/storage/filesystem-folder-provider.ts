/**
 * File System Folder-based Storage Provider
 * Saves decks as plain folder structures instead of zip files
 */

import { getDeckFolderName } from '$lib/utils/filename';
import type { DeckArchive } from '$lib/utils/zip';
import { compressDeckArchive, decompressDeckArchive } from '$lib/utils/zip';
import type { DeckListEntry, IStorageProvider, StorageCapabilities, StorageResult } from './types';
import { StorageErrorCode, StorageProvider } from './types';

/**
 * FileSystem Folder implementation of IStorageProvider
 * Stores decks as folders with JSON files instead of zip archives
 */
export class FileSystemFolderProvider implements IStorageProvider {
	readonly type = StorageProvider.FileSystem;

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
	 * Takes a zip blob, extracts it, and saves as folder
	 */
	async saveDeck(deckName: string, zipBlob: Blob): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			// Decompress the zip to get the archive structure
			const archive = await decompressDeckArchive(zipBlob);

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
	 * Load a deck from folder structure
	 * Reads folder and returns as a zip blob
	 */
	async loadDeck(deckName: string): Promise<StorageResult<Blob>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckFolderName = getDeckFolderName(deckName);

			// Get deck folder
			const deckFolderHandle = await this.directoryHandle.getDirectoryHandle(deckFolderName);

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

			// Compress to zip blob for compatibility with existing code
			const zipBlob = await compressDeckArchive(archive, deckName);

			return {
				success: true,
				data: zipBlob
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
			const oldFolderName = getDeckFolderName(oldName);
			const newFolderName = getDeckFolderName(newName);

			// Check if new name already exists
			try {
				await this.directoryHandle.getDirectoryHandle(newFolderName);
				return {
					success: false,
					error: `A deck with the name "${newName}" already exists`,
					errorCode: StorageErrorCode.AlreadyExists
				};
			} catch {
				// New name doesn't exist - this is good
			}

			// Load the deck
			const loadResult = await this.loadDeck(oldName);
			if (!loadResult.success || !loadResult.data) {
				return {
					success: false,
					error: loadResult.error || 'Failed to load deck for renaming',
					errorCode: loadResult.errorCode
				};
			}

			// Update manifest with new name
			const archive = await decompressDeckArchive(loadResult.data);
			archive.manifest.name = newName;
			archive.manifest.updatedAt = new Date().toISOString();

			// Save with new name
			const zipBlob = await compressDeckArchive(archive, newName);
			const saveResult = await this.saveDeck(newName, zipBlob);

			if (!saveResult.success) {
				return saveResult;
			}

			// Delete old folder
			await this.directoryHandle.removeEntry(oldFolderName, { recursive: true });

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
			const decks: DeckListEntry[] = [];

			// Iterate through directory entries
			for await (const entry of this.directoryHandle.values()) {
				// Only include directories (deck folders)
				if (entry.kind === 'directory') {
					const dirHandle = entry as FileSystemDirectoryHandle;

					try {
						// Read manifest to get deck info
						const manifest = await this.readJsonFile(dirHandle, 'manifest.json');

						// Calculate folder size (approximate)
						let size = 0;
						try {
							size = await this.calculateFolderSize(dirHandle);
						} catch {
							// Ignore size calculation errors
						}

						decks.push({
							name: manifest.name,
							filename: entry.name, // folder name
							lastModified: new Date(manifest.updatedAt).getTime(),
							size
						});
					} catch {
						// Skip folders that don't have a valid manifest
						continue;
					}
				}
			}

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
