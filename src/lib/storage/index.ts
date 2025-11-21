/**
 * Storage module exports
 */

export { FileSystemFolderProvider, isFolderStorageSupported } from './filesystem-folder-provider';
export { LocalStorageProvider } from './local-storage-provider';
export { getStorageManager, isFileSystemAvailable, StorageManager } from './storage-manager';

export type {
	DeckListEntry,
	IStorageProvider,
	StorageCapabilities,
	StorageConfig,
	StorageResult
} from './types';

export { StorageErrorCode, StorageProvider } from './types';
