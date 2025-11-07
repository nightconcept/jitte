/**
 * Storage module exports
 */

export { FileSystemProvider, isFileSystemSupported } from './filesystem-provider';
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
