/**
 * Storage layer type definitions
 */

/**
 * Storage provider types
 */
export enum StorageProvider {
	/** Browser localStorage (fallback) */
	LocalStorage = 'localStorage',
	/** File System Access API */
	FileSystem = 'fileSystem'
}

/**
 * Storage capabilities
 */
export interface StorageCapabilities {
	/** Can store files */
	canStoreFiles: boolean;

	/** Can create directories */
	canCreateDirectories: boolean;

	/** Can list files */
	canListFiles: boolean;

	/** Requires user permission */
	requiresPermission: boolean;

	/** Maximum storage size (bytes) */
	maxSize?: number;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
	/** Preferred storage provider */
	provider: StorageProvider;

	/** Directory handle for FileSystem API */
	directoryHandle?: FileSystemDirectoryHandle;

	/** Directory path (for display purposes) */
	directoryPath?: string;
}

/**
 * Deck list entry for storage
 */
export interface DeckListEntry {
	/** Deck name */
	name: string;

	/** Full filename (with .zip extension) */
	filename: string;

	/** Last modified timestamp */
	lastModified: number;

	/** File size in bytes */
	size?: number;
}

/**
 * Storage operation result
 */
export interface StorageResult<T = void> {
	/** Success flag */
	success: boolean;

	/** Result data (if successful) */
	data?: T;

	/** Error message (if failed) */
	error?: string;

	/** Error code */
	errorCode?: StorageErrorCode;
}

/**
 * Storage error codes
 */
export enum StorageErrorCode {
	NotSupported = 'NOT_SUPPORTED',
	PermissionDenied = 'PERMISSION_DENIED',
	NotFound = 'NOT_FOUND',
	AlreadyExists = 'ALREADY_EXISTS',
	QuotaExceeded = 'QUOTA_EXCEEDED',
	InvalidData = 'INVALID_DATA',
	NetworkError = 'NETWORK_ERROR',
	Unknown = 'UNKNOWN'
}

/**
 * Storage provider interface
 */
export interface IStorageProvider {
	/** Storage provider type */
	readonly type: StorageProvider;

	/** Get storage capabilities */
	getCapabilities(): StorageCapabilities;

	/** Initialize storage (request permissions if needed) */
	initialize(): Promise<StorageResult<void>>;

	/** Check if initialized */
	isInitialized(): boolean;

	/** Save a deck archive */
	saveDeck(deckName: string, zipBlob: Blob): Promise<StorageResult<void>>;

	/** Load a deck archive */
	loadDeck(deckName: string): Promise<StorageResult<Blob>>;

	/** Delete a deck */
	deleteDeck(deckName: string): Promise<StorageResult<void>>;

	/** Rename a deck */
	renameDeck(oldName: string, newName: string): Promise<StorageResult<void>>;

	/** List all decks */
	listDecks(): Promise<StorageResult<DeckListEntry[]>>;

	/** Check if a deck exists */
	deckExists(deckName: string): Promise<StorageResult<boolean>>;

	/** Get available storage space */
	getAvailableSpace(): Promise<StorageResult<number>>;
}
