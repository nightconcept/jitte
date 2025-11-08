/**
 * File System Access API storage provider
 * Primary storage method for supported browsers (Chrome, Edge, Opera)
 */

import { getDeckFilename } from '$lib/utils/filename';
import type { DeckListEntry, IStorageProvider, StorageCapabilities, StorageResult } from './types';
import { StorageErrorCode, StorageProvider } from './types';

/**
 * FileSystem API implementation of IStorageProvider
 */
export class FileSystemProvider implements IStorageProvider {
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

	async saveDeck(deckName: string, zipBlob: Blob): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const filename = getDeckFilename(deckName);

			// Create/get file handle
			const fileHandle = await this.directoryHandle.getFileHandle(filename, {
				create: true
			});

			// Create writable stream
			const writable = await fileHandle.createWritable();

			// Write blob to file
			await writable.write(zipBlob);

			// Close the file
			await writable.close();

			return {
				success: true
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotAllowedError') {
				return {
					success: false,
					error: 'Permission denied to write file',
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

	async loadDeck(deckName: string): Promise<StorageResult<Blob>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const filename = getDeckFilename(deckName);

			// Get file handle
			const fileHandle = await this.directoryHandle.getFileHandle(filename);

			// Get file
			const file = await fileHandle.getFile();

			return {
				success: true,
				data: file
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

	async deleteDeck(deckName: string): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const filename = getDeckFilename(deckName);

			// Remove the file
			await this.directoryHandle.removeEntry(filename);

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

	async renameDeck(oldName: string, newName: string): Promise<StorageResult<void>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const oldFilename = getDeckFilename(oldName);
			const newFilename = getDeckFilename(newName);

			// Check if new name already exists
			try {
				await this.directoryHandle.getFileHandle(newFilename);
				return {
					success: false,
					error: `A deck with the name "${newName}" already exists`,
					errorCode: StorageErrorCode.AlreadyExists
				};
			} catch {
				// New name doesn't exist - this is good
			}

			// Load the old file
			const oldFileHandle = await this.directoryHandle.getFileHandle(oldFilename);
			const oldFile = await oldFileHandle.getFile();
			const blob = await oldFile.arrayBuffer();

			// Create new file
			const newFileHandle = await this.directoryHandle.getFileHandle(newFilename, { create: true });
			const writable = await newFileHandle.createWritable();
			await writable.write(blob);
			await writable.close();

			// Delete old file
			await this.directoryHandle.removeEntry(oldFilename);

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
				// Only include .zip files
				if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
					const fileHandle = entry as FileSystemFileHandle;
					const file = await fileHandle.getFile();

					// Extract deck name (remove .zip extension)
					const name = entry.name.replace(/\.zip$/i, '');

					decks.push({
						name,
						filename: entry.name,
						lastModified: file.lastModified,
						size: file.size
					});
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

	async deckExists(deckName: string): Promise<StorageResult<boolean>> {
		if (!this.directoryHandle) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const filename = getDeckFilename(deckName);
			await this.directoryHandle.getFileHandle(filename);

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
}

/**
 * Check if FileSystem Access API is supported
 */
export function isFileSystemSupported(): boolean {
	return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}
