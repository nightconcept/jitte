/**
 * Folder type definitions for organizing decks
 */

/**
 * Represents a folder for organizing decks
 */
export interface Folder {
	/** Unique folder ID */
	id: string;

	/** Display name of the folder */
	name: string;

	/** Parent folder ID (null for root folders) */
	parentId: string | null;

	/** ISO timestamp of folder creation */
	createdAt: string;

	/** ISO timestamp of last update */
	updatedAt: string;
}

/**
 * Folder structure storage format
 */
export interface FolderStructure {
	/** All folders in the system */
	folders: Folder[];

	/** Map of deck names to their folder IDs */
	deckFolderMap: Record<string, string>;

	/** Map of folder IDs to ordered arrays of deck names */
	deckOrder: Record<string, string[]>;

	/** Version of the folder structure format */
	version: string;
}

/**
 * Item in the deck browser (can be a folder or deck)
 */
export type BrowserItem =
	| {
			type: 'folder';
			folder: Folder;
	  }
	| {
			type: 'deck';
			deckName: string;
			lastModified: Date;
			size: number;
			commanders: string[];
	  };
