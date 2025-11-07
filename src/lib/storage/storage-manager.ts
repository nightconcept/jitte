/**
 * Storage Manager
 * Abstracts storage operations and manages provider selection
 */

import { FileSystemProvider, isFileSystemSupported } from './filesystem-provider';
import { LocalStorageProvider } from './local-storage-provider';
import type { DeckListEntry, IStorageProvider, StorageConfig, StorageResult } from './types';
import { StorageErrorCode, StorageProvider } from './types';

/**
 * Storage Manager class
 * Handles automatic provider selection and fallback
 */
export class StorageManager {
	private provider: IStorageProvider | null = null;
	private config: StorageConfig | null = null;

	/**
	 * Initialize storage with auto-detection
	 * Prefers FileSystem API if available, falls back to localStorage
	 */
	async initialize(preferredProvider?: StorageProvider): Promise<StorageResult<StorageConfig>> {
		// Determine which provider to use
		let providerType: StorageProvider;

		if (preferredProvider) {
			providerType = preferredProvider;
		} else if (isFileSystemSupported()) {
			providerType = StorageProvider.FileSystem;
		} else {
			providerType = StorageProvider.LocalStorage;
		}

		// Create provider instance
		this.provider = this.createProvider(providerType);

		// Initialize the provider
		const initResult = await this.provider.initialize();

		if (!initResult.success) {
			// If preferred provider failed and it was FileSystem, fall back to localStorage
			if (providerType === StorageProvider.FileSystem) {
				console.warn(
					'FileSystem API initialization failed, falling back to localStorage',
					initResult.error
				);

				this.provider = this.createProvider(StorageProvider.LocalStorage);
				const fallbackResult = await this.provider.initialize();

				if (!fallbackResult.success) {
					return {
						success: false,
						error: 'All storage providers failed to initialize',
						errorCode: StorageErrorCode.NotSupported
					};
				}

				providerType = StorageProvider.LocalStorage;
			} else {
				return initResult;
			}
		}

		// Create config
		this.config = {
			provider: providerType,
			directoryHandle:
				this.provider instanceof FileSystemProvider
					? this.provider.getDirectoryHandle() || undefined
					: undefined,
			directoryPath:
				this.provider instanceof FileSystemProvider
					? this.provider.getDirectoryPath() || undefined
					: undefined
		};

		return {
			success: true,
			data: this.config
		};
	}

	/**
	 * Initialize with existing configuration
	 */
	async initializeWithConfig(config: StorageConfig): Promise<StorageResult<void>> {
		this.provider = this.createProvider(config.provider);

		// If FileSystem provider and has handle, restore it
		if (this.provider instanceof FileSystemProvider && config.directoryHandle) {
			const result = await this.provider.initializeWithHandle(config.directoryHandle);
			if (!result.success) {
				return result;
			}
		} else {
			const result = await this.provider.initialize();
			if (!result.success) {
				return result;
			}
		}

		this.config = config;

		return {
			success: true
		};
	}

	/**
	 * Check if storage is initialized
	 */
	isInitialized(): boolean {
		return this.provider?.isInitialized();
	}

	/**
	 * Get current storage configuration
	 */
	getConfig(): StorageConfig | null {
		return this.config;
	}

	/**
	 * Get current provider
	 */
	getProvider(): IStorageProvider | null {
		return this.provider;
	}

	/**
	 * Save a deck
	 */
	async saveDeck(deckName: string, zipBlob: Blob): Promise<StorageResult<void>> {
		if (!this.provider) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		return await this.provider.saveDeck(deckName, zipBlob);
	}

	/**
	 * Load a deck
	 */
	async loadDeck(deckName: string): Promise<StorageResult<Blob>> {
		if (!this.provider) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		return await this.provider.loadDeck(deckName);
	}

	/**
	 * Delete a deck
	 */
	async deleteDeck(deckName: string): Promise<StorageResult<void>> {
		if (!this.provider) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		return await this.provider.deleteDeck(deckName);
	}

	/**
	 * List all decks
	 */
	async listDecks(): Promise<StorageResult<DeckListEntry[]>> {
		if (!this.provider) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		return await this.provider.listDecks();
	}

	/**
	 * Check if a deck exists
	 */
	async deckExists(deckName: string): Promise<StorageResult<boolean>> {
		if (!this.provider) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		return await this.provider.deckExists(deckName);
	}

	/**
	 * Get available storage space
	 */
	async getAvailableSpace(): Promise<StorageResult<number>> {
		if (!this.provider) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		return await this.provider.getAvailableSpace();
	}

	/**
	 * Switch to a different storage provider
	 */
	async switchProvider(newProvider: StorageProvider): Promise<StorageResult<StorageConfig>> {
		const provider = this.createProvider(newProvider);
		const initResult = await provider.initialize();

		if (!initResult.success) {
			return {
				success: false,
				error: initResult.error,
				errorCode: initResult.errorCode
			};
		}

		this.provider = provider;
		this.config = {
			provider: newProvider,
			directoryHandle:
				provider instanceof FileSystemProvider
					? provider.getDirectoryHandle() || undefined
					: undefined,
			directoryPath:
				provider instanceof FileSystemProvider
					? provider.getDirectoryPath() || undefined
					: undefined
		};

		return {
			success: true,
			data: this.config
		};
	}

	/**
	 * Create a provider instance
	 */
	private createProvider(type: StorageProvider): IStorageProvider {
		switch (type) {
			case StorageProvider.FileSystem:
				return new FileSystemProvider();
			case StorageProvider.LocalStorage:
				return new LocalStorageProvider();
			default:
				throw new Error(`Unknown storage provider: ${type}`);
		}
	}
}

/**
 * Singleton storage manager instance
 */
let storageManagerInstance: StorageManager | null = null;

/**
 * Get or create the storage manager instance
 */
export function getStorageManager(): StorageManager {
	if (!storageManagerInstance) {
		storageManagerInstance = new StorageManager();
	}
	return storageManagerInstance;
}

/**
 * Check if FileSystem API is available
 */
export function isFileSystemAvailable(): boolean {
	return isFileSystemSupported();
}
