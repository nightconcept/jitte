/**
 * Folder management utilities
 */

import type { Folder, FolderStructure } from '$lib/types/folder';

const FOLDER_STORAGE_KEY = 'jitte-deck-folders';
const FOLDER_STRUCTURE_VERSION = '1.0.0';

/**
 * Load folder structure from localStorage
 */
export function loadFolderStructure(): FolderStructure {
	// Check if we're in the browser (not SSR)
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
		return {
			folders: [],
			deckFolderMap: {},
			deckOrder: {},
			version: FOLDER_STRUCTURE_VERSION
		};
	}

	try {
		const stored = localStorage.getItem(FOLDER_STORAGE_KEY);
		if (!stored) {
			return {
				folders: [],
				deckFolderMap: {},
				deckOrder: {},
				version: FOLDER_STRUCTURE_VERSION
			};
		}

		const parsed = JSON.parse(stored) as FolderStructure;
		// Ensure deckOrder exists (for backward compatibility)
		if (!parsed.deckOrder) {
			parsed.deckOrder = {};
		}
		return parsed;
	} catch (error) {
		console.error('[FolderManager] Error loading folder structure:', error);
		return {
			folders: [],
			deckFolderMap: {},
			deckOrder: {},
			version: FOLDER_STRUCTURE_VERSION
		};
	}
}

/**
 * Save folder structure to localStorage
 */
export function saveFolderStructure(structure: FolderStructure): void {
	// Check if we're in the browser (not SSR)
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
		return;
	}

	try {
		localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(structure));
	} catch (error) {
		console.error('[FolderManager] Error saving folder structure:', error);
		throw new Error('Failed to save folder structure');
	}
}

/**
 * Generate a unique folder ID
 */
export function generateFolderId(): string {
	return `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new folder
 */
export function createFolder(name: string, parentId: string | null = null): Folder {
	const now = new Date().toISOString();
	return {
		id: generateFolderId(),
		name,
		parentId,
		createdAt: now,
		updatedAt: now
	};
}

/**
 * Add a folder to the structure
 */
export function addFolder(structure: FolderStructure, folder: Folder): FolderStructure {
	return {
		...structure,
		folders: [...structure.folders, folder]
	};
}

/**
 * Rename a folder
 */
export function renameFolder(structure: FolderStructure, folderId: string, newName: string): FolderStructure {
	return {
		...structure,
		folders: structure.folders.map((f) =>
			f.id === folderId ? { ...f, name: newName, updatedAt: new Date().toISOString() } : f
		)
	};
}

/**
 * Delete a folder and all its subfolders
 * Decks in deleted folders are moved to root
 */
export function deleteFolder(structure: FolderStructure, folderId: string): FolderStructure {
	// Get all folder IDs to delete (this folder and all descendants)
	const toDelete = new Set<string>();
	const findDescendants = (id: string) => {
		toDelete.add(id);
		structure.folders.filter((f) => f.parentId === id).forEach((f) => findDescendants(f.id));
	};
	findDescendants(folderId);

	// Remove folders
	const newFolders = structure.folders.filter((f) => !toDelete.has(f.id));

	// Move decks to root (remove their folder assignments)
	const newDeckFolderMap: Record<string, string> = {};
	const decksMovedToRoot: string[] = [];
	for (const [deckName, deckFolderId] of Object.entries(structure.deckFolderMap)) {
		if (!toDelete.has(deckFolderId)) {
			newDeckFolderMap[deckName] = deckFolderId;
		} else {
			// Track decks being moved to root
			decksMovedToRoot.push(deckName);
		}
	}

	// Clean up deckOrder - remove deleted folders and move their decks to root
	const newDeckOrder = { ...structure.deckOrder };
	for (const id of toDelete) {
		delete newDeckOrder[id];
	}

	// Add moved decks to root order
	if (decksMovedToRoot.length > 0) {
		if (!newDeckOrder['root']) {
			newDeckOrder['root'] = [];
		}
		newDeckOrder['root'].push(...decksMovedToRoot);
	}

	return {
		...structure,
		folders: newFolders,
		deckFolderMap: newDeckFolderMap,
		deckOrder: newDeckOrder
	};
}

/**
 * Move a deck to a folder (or to root if folderId is null)
 */
export function moveDeckToFolder(
	structure: FolderStructure,
	deckName: string,
	folderId: string | null
): FolderStructure {
	const newDeckFolderMap = { ...structure.deckFolderMap };
	const newDeckOrder = { ...structure.deckOrder };

	// Get the old folder ID
	const oldFolderId = structure.deckFolderMap[deckName] || null;
	const oldKey = oldFolderId || 'root';
	const newKey = folderId || 'root';

	// Remove from old folder's order
	if (newDeckOrder[oldKey]) {
		newDeckOrder[oldKey] = newDeckOrder[oldKey].filter(name => name !== deckName);
	}

	// Add to new folder's order
	if (!newDeckOrder[newKey]) {
		newDeckOrder[newKey] = [];
	}
	if (!newDeckOrder[newKey].includes(deckName)) {
		newDeckOrder[newKey].push(deckName);
	}

	if (folderId === null) {
		// Move to root by removing from map
		delete newDeckFolderMap[deckName];
	} else {
		// Move to folder
		newDeckFolderMap[deckName] = folderId;
	}

	return {
		...structure,
		deckFolderMap: newDeckFolderMap,
		deckOrder: newDeckOrder
	};
}

/**
 * Get all child folders of a parent (or root folders if parentId is null)
 */
export function getChildFolders(structure: FolderStructure, parentId: string | null): Folder[] {
	return structure.folders.filter((f) => f.parentId === parentId);
}

/**
 * Get folder by ID
 */
export function getFolderById(structure: FolderStructure, folderId: string): Folder | undefined {
	return structure.folders.find((f) => f.id === folderId);
}

/**
 * Get deck's folder ID
 */
export function getDeckFolderId(structure: FolderStructure, deckName: string): string | null {
	return structure.deckFolderMap[deckName] || null;
}

/**
 * Get full path of a folder (e.g., "Parent/Child/GrandChild")
 */
export function getFolderPath(structure: FolderStructure, folderId: string): string {
	const path: string[] = [];
	let currentId: string | null = folderId;

	while (currentId) {
		const folder = getFolderById(structure, currentId);
		if (!folder) break;
		path.unshift(folder.name);
		currentId = folder.parentId;
	}

	return path.join('/');
}

/**
 * Check if a folder name is valid
 */
export function isValidFolderName(name: string): boolean {
	return name.trim().length > 0 && name.length <= 100;
}

/**
 * Check if a folder name already exists at the same level
 */
export function folderNameExists(
	structure: FolderStructure,
	name: string,
	parentId: string | null
): boolean {
	return structure.folders.some((f) => f.parentId === parentId && f.name.toLowerCase() === name.toLowerCase());
}

/**
 * Reorder decks within a folder
 * @param structure - Current folder structure
 * @param folderId - Folder ID (null for root)
 * @param deckOrder - New order of deck names
 */
export function reorderDecks(
	structure: FolderStructure,
	folderId: string | null,
	deckOrder: string[]
): FolderStructure {
	const newDeckOrder = { ...structure.deckOrder };
	const key = folderId || 'root';
	newDeckOrder[key] = deckOrder;

	return {
		...structure,
		deckOrder: newDeckOrder
	};
}

/**
 * Get the ordered list of deck names for a folder
 * @param structure - Current folder structure
 * @param folderId - Folder ID (null for root)
 * @param allDeckNames - All available deck names in this folder
 * @returns Ordered array of deck names
 */
export function getOrderedDecks(
	structure: FolderStructure,
	folderId: string | null,
	allDeckNames: string[]
): string[] {
	const key = folderId || 'root';
	const savedOrder = structure.deckOrder[key] || [];

	// Filter out decks that no longer exist
	const validOrder = savedOrder.filter(name => allDeckNames.includes(name));

	// Add any new decks that aren't in the saved order
	const newDecks = allDeckNames.filter(name => !validOrder.includes(name));

	return [...validOrder, ...newDecks];
}
