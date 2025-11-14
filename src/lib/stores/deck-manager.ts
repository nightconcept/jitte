/**
 * Deck Manager Store
 * Manages the list of available decks and persistence operations
 */

import { writable, get } from 'svelte/store';
import type { Deck, DeckManifest } from '$lib/types/deck';
import type { Maybeboard } from '$lib/types/maybeboard';
import type { Card } from '$lib/types/card';
import { getStorageManager } from '$lib/storage/storage-manager';
import type { DeckListEntry } from '$lib/storage/types';
import { deckStore } from './deck-store';
import { createVersion } from '$lib/utils/version-control';
import { createDeckManifest } from '$lib/utils/deck-factory';

/**
 * Deck list item for display
 */
export interface DeckListItem {
	name: string;
	lastModified: Date;
	size: number;
}

/**
 * App state
 */
interface AppState {
	decks: DeckListItem[];
	activeDeckName: string | null;
	activeManifest: DeckManifest | null;
	isLoading: boolean;
	error: string | null;
	isInitialized: boolean;
}

const ACTIVE_DECK_KEY = 'jitte:activeDeckName';

/**
 * Create the deck manager store
 */
function createDeckManager() {
	const initialState: AppState = {
		decks: [],
		activeDeckName: null,
		activeManifest: null,
		isLoading: false,
		error: null,
		isInitialized: false
	};

	const { subscribe, set, update } = writable<AppState>(initialState);

	const storage = getStorageManager();

	/**
	 * Initialize storage
	 */
	async function initializeStorage(): Promise<void> {
		update((state) => ({ ...state, isLoading: true, error: null }));

		// Initialize the storage manager
		const initResult = await storage.initialize();

		if (!initResult.success) {
			update((state) => ({
				...state,
				isLoading: false,
				error: initResult.error || 'Failed to initialize storage',
				isInitialized: false
			}));
			return;
		}

		update((state) => ({ ...state, isInitialized: true }));

		// Load deck list
		await refreshDeckList();

		// Load last active deck
		const lastActiveDeckName = localStorage.getItem(ACTIVE_DECK_KEY);
		if (lastActiveDeckName) {
			await loadDeck(lastActiveDeckName);
		}

		update((state) => ({ ...state, isLoading: false }));
	}

	/**
	 * Refresh the list of available decks
	 */
	async function refreshDeckList(): Promise<void> {
		const result = await storage.listDecks();

		if (result.success && result.data) {
			const deckItems: DeckListItem[] = result.data.map((entry) => ({
				name: entry.name,
				lastModified: new Date(entry.lastModified),
				size: entry.size || 0
			}));

			update((state) => ({ ...state, decks: deckItems }));
		} else {
			update((state) => ({
				...state,
				error: result.error || 'Failed to load decks'
			}));
		}
	}

	/**
	 * Load a deck into the active state
	 */
	async function loadDeck(deckName: string): Promise<void> {
		update((state) => ({ ...state, isLoading: true, error: null }));

		const result = await storage.loadDeck(deckName);

		if (result.success && result.data) {
			// Decompress the zip file
			const { decompressDeckArchive } = await import('$lib/utils/zip');
			const { extractDeckFromArchive } = await import('$lib/utils/deck-serializer');

			try {
				const archive = await decompressDeckArchive(result.data);
				const { deck, manifest, maybeboard } = await extractDeckFromArchive(archive);

				// Auto-migrate: Add versioningScheme if missing (defaults to semantic for backwards compatibility)
				let migratedManifest = manifest;
				if (!manifest.versioningScheme) {
					console.log('[deckManager.loadDeck] Auto-migrating manifest to include versioningScheme');
					migratedManifest = {
						...manifest,
						versioningScheme: 'semantic' as const
					};
					// Note: Migration will be persisted on next save
				}

				deckStore.load(deck, maybeboard);

				update((state) => ({
					...state,
					activeDeckName: deckName,
					activeManifest: migratedManifest,
					isLoading: false
				}));

				// Persist active deck name
				localStorage.setItem(ACTIVE_DECK_KEY, deckName);
			} catch (error) {
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Failed to parse deck'
				}));
			}
		} else {
			update((state) => ({
				...state,
				isLoading: false,
				error: result.error || 'Failed to load deck'
			}));
		}
	}

	/**
	 * Save the current deck
	 */
	async function saveDeck(commitMessage: string, newVersion?: string): Promise<boolean> {
		console.log('[deckManager.saveDeck] Starting save:', { commitMessage, newVersion });

		const currentState = get(deckStore);
		if (!currentState) {
			console.error('[deckManager.saveDeck] No active deck to save');
			update((state) => ({ ...state, error: 'No active deck to save' }));
			return false;
		}

		const appState = get({ subscribe });
		console.log('[deckManager.saveDeck] App state:', {
			activeDeckName: appState.activeDeckName,
			hasManifest: !!appState.activeManifest
		});

		if (!appState.activeDeckName || !appState.activeManifest) {
			// First save - deck doesn't exist yet
			console.log('[deckManager.saveDeck] First save - creating new deck archive');
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const { serializeDeckToJSON, createDeckArchive } = await import('$lib/utils/deck-serializer');
				const { compressDeckArchive } = await import('$lib/utils/zip');

				const deck = currentState.deck;
				console.log('[deckManager.saveDeck] Current deck:', deck);

				// Create initial manifest
				const manifest = createDeckManifest(deck);
				console.log('[deckManager.saveDeck] Created manifest:', manifest);

				// Apply commit message to the first version
				const { manifest: updatedManifest, version: newVersionString } = createVersion(
					manifest,
					deck,
					commitMessage,
					newVersion
				);
				console.log('[deckManager.saveDeck] After createVersion:', {
					newVersionString,
					manifestCurrentVersion: updatedManifest.currentVersion,
					branchVersions: updatedManifest.branches[0]?.versions
				});

				const decklistContent = serializeDeckToJSON(deck);
				const archive = createDeckArchive(deck, updatedManifest, currentState.maybeboard, decklistContent);
				console.log('[deckManager.saveDeck] Created archive:', {
					manifestCurrentVersion: archive.manifest.currentVersion,
					branchVersions: archive.manifest.branches[0]?.versions,
					versionFiles: Object.keys(archive.versions.main || {})
				});

				const zipBlob = await compressDeckArchive(archive, deck.name);

				const result = await storage.saveDeck(deck.name, zipBlob);
				console.log('[deckManager.saveDeck] Storage save result:', result.success);

				if (result.success) {
					// Update the deck version (preserves edit state)
					deckStore.updateVersion(updatedManifest.currentVersion);
					await refreshDeckList();
					update((state) => ({
						...state,
						activeDeckName: deck.name,
						activeManifest: updatedManifest,
						isLoading: false
					}));
					localStorage.setItem(ACTIVE_DECK_KEY, deck.name);
					console.log('[deckManager.saveDeck] First save complete, updated manifest:', updatedManifest);
					return true;
				} else {
					console.error('[deckManager.saveDeck] Storage save failed:', result.error);
					update((state) => ({
						...state,
						isLoading: false,
						error: result.error || 'Failed to save deck'
					}));
					return false;
				}
			} catch (error) {
				console.error('[deckManager.saveDeck] Exception during first save:', error);
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}));
				return false;
			}
		} else {
			// Updating existing deck
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				// Load existing archive, update it, and save
				const loadResult = await storage.loadDeck(appState.activeDeckName);
				if (!loadResult.success || !loadResult.data) {
					throw new Error('Failed to load existing deck');
				}

				const { decompressDeckArchive, compressDeckArchive } = await import('$lib/utils/zip');
				const { serializeDeckToJSON } = await import('$lib/utils/deck-serializer');

				const archive = await decompressDeckArchive(loadResult.data);
				const deck = currentState.deck;

				// Create new version using the manifest
				const { manifest: updatedManifest, version: newVersionString } = createVersion(
					appState.activeManifest,
					deck,
					commitMessage,
					newVersion
				);

				// Serialize current deck state to JSON format
				const decklistContent = serializeDeckToJSON(deck);

				// Update archive versions
				const currentBranch = deck.currentBranch;
				if (!archive.versions[currentBranch]) {
					archive.versions[currentBranch] = {};
				}
				archive.versions[currentBranch][`v${newVersionString}.json`] = decklistContent;

				// Update manifest in archive
				archive.manifest = updatedManifest;

				// Update maybeboard
				archive.maybeboard = currentState.maybeboard;

				// Compress and save
				const zipBlob = await compressDeckArchive(archive, deck.name);
				const saveResult = await storage.saveDeck(appState.activeDeckName, zipBlob);

				if (saveResult.success) {
					// Update the deck version (preserves edit state)
					deckStore.updateVersion(newVersionString);
					await refreshDeckList();
					update((state) => ({
						...state,
						activeManifest: updatedManifest,
						isLoading: false
					}));
					return true;
				} else {
					update((state) => ({
						...state,
						isLoading: false,
						error: saveResult.error || 'Failed to save deck'
					}));
					return false;
				}
			} catch (error) {
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}));
				return false;
			}
		}
	}

	/**
	 * Load a specific version of the current deck
	 */
	async function loadVersion(version: string): Promise<void> {
		console.log('[deckManager.loadVersion] Starting:', { version });

		const appState = get({ subscribe });
		if (!appState.activeDeckName || !appState.activeManifest) {
			console.error('[deckManager.loadVersion] No active deck');
			update((state) => ({ ...state, error: 'No active deck' }));
			return;
		}

		update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			// Load the deck archive
			console.log('[deckManager.loadVersion] Loading deck:', appState.activeDeckName);
			const loadResult = await storage.loadDeck(appState.activeDeckName);
			if (!loadResult.success || !loadResult.data) {
				throw new Error('Failed to load deck');
			}

			const { decompressDeckArchive } = await import('$lib/utils/zip');
			const { deserializeDeck } = await import('$lib/utils/deck-serializer');

			console.log('[deckManager.loadVersion] Decompressing archive...');
			const archive = await decompressDeckArchive(loadResult.data);
			console.log('[deckManager.loadVersion] Archive loaded:', {
				manifestVersion: archive.manifest.currentVersion,
				branches: Object.keys(archive.versions),
				versionsInMain: Object.keys(archive.versions.main || {}),
				allVersions: archive.versions
			});

			// Use the current branch from the deck store, not from the saved manifest
			const deckStoreState = get(deckStore);
			const currentBranch = deckStoreState?.deck.currentBranch || appState.activeManifest.currentBranch;
			console.log('[deckManager.loadVersion] Current branch:', currentBranch);

			// Load the specific version file - try JSON first, fallback to .txt for legacy
			const jsonFileName = `v${version}.json`;
			const txtFileName = `v${version}.txt`;
			const versionContent = archive.versions[currentBranch]?.[jsonFileName] ||
			                       archive.versions[currentBranch]?.[txtFileName];

			if (!versionContent) {
				console.error('[deckManager.loadVersion] Version not found!');
				console.error(`Version ${version} not found in branch ${currentBranch}`);
				console.error('Available versions:', Object.keys(archive.versions[currentBranch] || {}));
				throw new Error(`Version ${version} not found in branch ${currentBranch}`);
			}

			console.log(`Loading version ${version} from branch ${currentBranch}`);
			console.log(`Using file: ${archive.versions[currentBranch]?.[jsonFileName] ? jsonFileName : txtFileName}`);

			// Parse the decklist into categorized cards
			const cards = await deserializeDeck(versionContent);

			// Calculate total card count
			const cardCount = Object.values(cards).reduce(
				(sum, category) => sum + category.reduce((s, c) => s + c.quantity, 0),
				0
			);

			// Reconstruct the deck object
			const deck: Deck = {
				name: archive.manifest.name,
				cards,
				cardCount,
				format: archive.manifest.format,
				colorIdentity: [], // TODO: Calculate from commander
				currentBranch,
				currentVersion: version,
				createdAt: archive.manifest.createdAt,
				updatedAt: new Date().toISOString()
			};

			// Load into store
			deckStore.load(deck, archive.maybeboard);

			// Update the manifest to reflect the version we just loaded
			const updatedManifest = {
				...archive.manifest,
				currentVersion: version
			};

			update((state) => ({
				...state,
				isLoading: false,
				activeManifest: updatedManifest
			}));
		} catch (error) {
			update((state) => ({
				...state,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to load version'
			}));
		}
	}

	/**
	 * Create a new deck
	 */
	async function createDeck(name: string, commanderNames?: string | string[]): Promise<void> {
		const namesArray = commanderNames ? (Array.isArray(commanderNames) ? commanderNames : [commanderNames]) : [];
		console.log('[deckManager.createDeck] Starting:', { name, commanderNames: namesArray });
		update((state) => ({ ...state, isLoading: true, error: null }));

		const commanders: Card[] = [];

		// Fetch commander card data if provided
		if (namesArray.length > 0) {
			try {
				console.log('[deckManager.createDeck] Fetching commander data...');
				const { CardService } = await import('$lib/api/card-service');
				const cardService = new CardService();

				// Fetch all commanders
				for (const commanderName of namesArray) {
					const commanderCard = await cardService.getCardByName(commanderName);
					console.log('[deckManager.createDeck] Commander card fetched:', commanderCard?.name);

					if (commanderCard) {
						// Convert ScryfallCard to Card type
						commanders.push({
							name: commanderCard.name,
							quantity: 1,
							setCode: commanderCard.set,
							collectorNumber: commanderCard.collector_number,
							scryfallId: commanderCard.id,
							oracleId: commanderCard.oracle_id,
							types: commanderCard.type_line?.split('—')[0]?.trim().split(' '),
							cmc: commanderCard.cmc,
							manaCost: commanderCard.mana_cost,
							colorIdentity: commanderCard.color_identity,
							oracleText: commanderCard.oracle_text,
							keywords: commanderCard.keywords,
							imageUrls: commanderCard.image_uris
								? {
										small: commanderCard.image_uris.small,
										normal: commanderCard.image_uris.normal,
										large: commanderCard.image_uris.large,
										png: commanderCard.image_uris.png,
										artCrop: commanderCard.image_uris.art_crop,
										borderCrop: commanderCard.image_uris.border_crop
								  }
								: undefined,
							price: commanderCard.prices.usd ? parseFloat(commanderCard.prices.usd) : undefined,
							prices: commanderCard.prices.usd
								? {
										cardkingdom: parseFloat(commanderCard.prices.usd) * 1.05,
										tcgplayer: parseFloat(commanderCard.prices.usd),
										manapool: parseFloat(commanderCard.prices.usd) * 0.95
								  }
								: undefined,
							priceUpdatedAt: Date.now()
						});
					}
				}
			} catch (error) {
				console.error('[deckManager.createDeck] Failed to fetch commander:', error);
				// Continue with whatever commanders we managed to fetch
			}
		}

		console.log('[deckManager.createDeck] Creating deck in store with', commanders.length, 'commanders');
		deckStore.createNew(name, commanders.length > 0 ? commanders : undefined);

		console.log('[deckManager.createDeck] Updating manager state...');
		// The deck will be saved when the user first commits
		update((state) => ({
			...state,
			activeDeckName: null, // Will be set on first save
			isLoading: false
		}));

		console.log('[deckManager.createDeck] Complete');
	}

	/**
	 * Delete a deck
	 */
	async function deleteDeck(deckName: string): Promise<void> {
		update((state) => ({ ...state, isLoading: true, error: null }));

		const result = await storage.deleteDeck(deckName);

		if (result.success) {
			await refreshDeckList();

			// If we deleted the active deck, clear it
			const appState = get({ subscribe });
			if (appState.activeDeckName === deckName) {
				deckStore.clear();
				update((state) => ({ ...state, activeDeckName: null, activeManifest: null }));
				localStorage.removeItem(ACTIVE_DECK_KEY);
			}

			update((state) => ({ ...state, isLoading: false }));
		} else {
			update((state) => ({
				...state,
				isLoading: false,
				error: result.error || 'Failed to delete deck'
			}));
		}
	}

	/**
	 * Rename a deck
	 */
	async function renameDeck(oldName: string, newName: string): Promise<void> {
		update((state) => ({ ...state, isLoading: true, error: null }));

		const result = await storage.renameDeck(oldName, newName);

		if (result.success) {
			await refreshDeckList();

			// If we renamed the active deck, update the active deck name
			const appState = get({ subscribe });
			if (appState.activeDeckName === oldName) {
				update((state) => ({ ...state, activeDeckName: newName }));
				localStorage.setItem(ACTIVE_DECK_KEY, newName);
			}

			update((state) => ({ ...state, isLoading: false }));
		} else {
			update((state) => ({
				...state,
				isLoading: false,
				error: result.error || 'Failed to rename deck'
			}));
		}
	}

	/**
	 * Load version data without setting it as active
	 * Used for diff comparison
	 */
	async function loadVersionData(version: string, branchName?: string): Promise<Deck | null> {
		const appState = get({ subscribe });
		if (!appState.activeDeckName || !appState.activeManifest) {
			return null;
		}

		try {
			// Load the deck archive
			const loadResult = await storage.loadDeck(appState.activeDeckName);
			if (!loadResult.success || !loadResult.data) {
				return null;
			}

			const { decompressDeckArchive } = await import('$lib/utils/zip');
			const { deserializeDeck } = await import('$lib/utils/deck-serializer');

			const archive = await decompressDeckArchive(loadResult.data);

			// Use the provided branch name, or fall back to current branch from deck store or manifest
			const deckStoreState = get(deckStore);
			const currentBranch = branchName || deckStoreState?.deck.currentBranch || appState.activeManifest.currentBranch;

			// Load the specific version file
			const jsonFileName = `v${version}.json`;
			const txtFileName = `v${version}.txt`;
			const versionContent = archive.versions[currentBranch]?.[jsonFileName] ||
			                       archive.versions[currentBranch]?.[txtFileName];

			if (!versionContent) {
				return null;
			}

			// Parse the decklist into categorized cards
			const cards = await deserializeDeck(versionContent);

			// Calculate total card count
			const cardCount = Object.values(cards).reduce(
				(sum, category) => sum + category.reduce((s, c) => s + c.quantity, 0),
				0
			);

			// Reconstruct the deck object
			const deck: Deck = {
				name: archive.manifest.name,
				cards,
				cardCount,
				format: archive.manifest.format,
				colorIdentity: [], // TODO: Calculate from commander
				currentBranch,
				currentVersion: version,
				createdAt: archive.manifest.createdAt,
				updatedAt: new Date().toISOString()
			};

			return deck;
		} catch (error) {
			console.error('Failed to load version data:', error);
			return null;
		}
	}

	/**
	 * Create a new branch
	 */
	async function createNewBranch(
		branchName: string,
		mode: 'current' | 'version',
		fromVersion?: string
	): Promise<boolean> {
		const currentState = get(deckStore);
		const appState = get({ subscribe });

		if (!currentState || !appState.activeManifest || !appState.activeDeckName) {
			update((state) => ({ ...state, error: 'No active deck to create branch' }));
			return false;
		}

		try {
			const { createBranch } = await import('$lib/utils/version-control');
			const { serializeDeckToJSON, createDeckArchive } = await import('$lib/utils/deck-serializer');
			const { compressDeckArchive } = await import('$lib/utils/zip');
			const { decompressDeckArchive } = await import('$lib/utils/zip');

			// Load the current deck archive
			const loadResult = await storage.loadDeck(appState.activeDeckName);
			if (!loadResult.success || !loadResult.data) {
				throw new Error('Failed to load deck for branching');
			}

			const archive = await decompressDeckArchive(loadResult.data);

			// Create the branch in the manifest
			const options = {
				name: branchName,
				sourceBranch: currentState.deck.currentBranch,
				sourceVersion: mode === 'version' ? fromVersion : currentState.deck.currentVersion,
				fromScratch: false
			};

			const updatedManifest = createBranch(archive.manifest, options);

			// Copy version files from source branch to new branch
			const newBranchMetadata = updatedManifest.branches.find((b) => b.name === branchName);
			if (!newBranchMetadata) {
				throw new Error('Failed to create branch metadata');
			}

			// Initialize the new branch directory in versions
			const newBranchVersions: Record<string, string> = {};

			// Copy all version files that are in the new branch's metadata
			if (archive.versions[options.sourceBranch]) {
				for (const versionMeta of newBranchMetadata.versions) {
					const jsonFileName = `v${versionMeta.version}.json`;
					const txtFileName = `v${versionMeta.version}.txt`;

					// Copy whichever file exists
					if (archive.versions[options.sourceBranch][jsonFileName]) {
						newBranchVersions[jsonFileName] = archive.versions[options.sourceBranch][jsonFileName];
					} else if (archive.versions[options.sourceBranch][txtFileName]) {
						newBranchVersions[txtFileName] = archive.versions[options.sourceBranch][txtFileName];
					}
				}
			}

			// Update the archive with the new manifest and version files
			const updatedArchive = {
				...archive,
				manifest: updatedManifest,
				versions: {
					...archive.versions,
					[branchName]: newBranchVersions
				}
			};

			// Save the updated archive
			const zipBlob = await compressDeckArchive(updatedArchive, currentState.deck.name);
			const result = await storage.saveDeck(appState.activeDeckName, zipBlob);

			if (result.success) {
				// Update the active manifest
				update((state) => ({
					...state,
					activeManifest: updatedManifest
				}));
				return true;
			} else {
				update((state) => ({
					...state,
					error: result.error || 'Failed to create branch'
				}));
				return false;
			}
		} catch (error) {
			update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Failed to create branch'
			}));
			return false;
		}
	}

	/**
	 * Switch to a different branch
	 */
	async function switchToBranch(branchName: string): Promise<boolean> {
		const appState = get({ subscribe });

		if (!appState.activeManifest || !appState.activeDeckName) {
			update((state) => ({ ...state, error: 'No active deck to switch branch' }));
			return false;
		}

		try {
			const { switchBranch } = await import('$lib/utils/version-control');
			const { decompressDeckArchive } = await import('$lib/utils/zip');
			const { compressDeckArchive } = await import('$lib/utils/zip');

			// Update the manifest to switch branches
			const updatedManifest = switchBranch(appState.activeManifest, branchName);

			// Load the deck archive
			const loadResult = await storage.loadDeck(appState.activeDeckName);
			if (!loadResult.success || !loadResult.data) {
				throw new Error('Failed to load deck for branch switching');
			}

			const archive = await decompressDeckArchive(loadResult.data);

			// Update the archive with the new manifest
			const updatedArchive = {
				...archive,
				manifest: updatedManifest
			};

			// Save the updated archive
			const zipBlob = await compressDeckArchive(updatedArchive, appState.activeDeckName);
			const saveResult = await storage.saveDeck(appState.activeDeckName, zipBlob);

			if (!saveResult.success) {
				throw new Error('Failed to save branch switch');
			}

			// Load the version data for the new branch's current version
			const versionDeck = await loadVersionData(updatedManifest.currentVersion, branchName);
			if (!versionDeck) {
				throw new Error('Failed to load version data for new branch');
			}

			// Update the deck store with the new branch's data
			deckStore.load(versionDeck, archive.maybeboard || { categories: {} });

			// Update the active manifest
			update((state) => ({
				...state,
				activeManifest: updatedManifest
			}));

			return true;
		} catch (error) {
			update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Failed to switch branch'
			}));
			return false;
		}
	}

	/**
	 * Delete a branch
	 */
	async function deleteBranchFromDeck(branchName: string): Promise<boolean> {
		const appState = get({ subscribe });

		if (!appState.activeManifest || !appState.activeDeckName) {
			update((state) => ({ ...state, error: 'No active deck' }));
			return false;
		}

		try {
			const { deleteBranch } = await import('$lib/utils/version-control');
			const { compressDeckArchive } = await import('$lib/utils/zip');
			const { decompressDeckArchive } = await import('$lib/utils/zip');

			// Load the current deck archive
			const loadResult = await storage.loadDeck(appState.activeDeckName);
			if (!loadResult.success || !loadResult.data) {
				throw new Error('Failed to load deck for branch deletion');
			}

			const archive = await decompressDeckArchive(loadResult.data);

			// Delete the branch from manifest (also validates we're not deleting main or current branch)
			const updatedManifest = deleteBranch(archive.manifest, branchName);

			// Remove version files for this branch from archive
			const updatedVersions = { ...archive.versions };
			delete updatedVersions[branchName];

			// Update the archive
			const updatedArchive = {
				...archive,
				manifest: updatedManifest,
				versions: updatedVersions
			};

			// Save the updated archive
			const zipBlob = await compressDeckArchive(updatedArchive, appState.activeDeckName);
			const saveResult = await storage.saveDeck(appState.activeDeckName, zipBlob);

			if (!saveResult.success) {
				throw new Error('Failed to save after branch deletion');
			}

			// Update the active manifest
			update((state) => ({
				...state,
				activeManifest: updatedManifest
			}));

			return true;
		} catch (error) {
			update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Failed to delete branch'
			}));
			return false;
		}
	}

	/**
	 * Change the versioning scheme for the active deck
	 */
	async function updateVersioningScheme(newScheme: 'semantic' | 'date'): Promise<boolean> {
		const appState = get({ subscribe });

		if (!appState.activeManifest || !appState.activeDeckName) {
			update((state) => ({ ...state, error: 'No active deck' }));
			return false;
		}

		try {
			const { changeVersioningScheme } = await import('$lib/utils/version-control');
			const { compressDeckArchive, decompressDeckArchive } = await import('$lib/utils/zip');

			// Load the current deck archive
			const loadResult = await storage.loadDeck(appState.activeDeckName);
			if (!loadResult.success || !loadResult.data) {
				throw new Error('Failed to load deck for scheme change');
			}

			const archive = await decompressDeckArchive(loadResult.data);

			// Update the manifest with new versioning scheme
			const updatedManifest = changeVersioningScheme(archive.manifest, newScheme);

			// Update the archive
			const updatedArchive = {
				...archive,
				manifest: updatedManifest
			};

			// Save the updated archive
			const zipBlob = await compressDeckArchive(updatedArchive, appState.activeDeckName);
			const saveResult = await storage.saveDeck(appState.activeDeckName, zipBlob);

			if (!saveResult.success) {
				throw new Error('Failed to save versioning scheme change');
			}

			// Update the active manifest and deck store
			update((state) => ({
				...state,
				activeManifest: updatedManifest
			}));

			// Update the deck store's current version
			deckStore.updateVersion(updatedManifest.currentVersion);

			return true;
		} catch (error) {
			update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Failed to update versioning scheme'
			}));
			return false;
		}
	}

	/**
	 * Clear error
	 */
	function clearError(): void {
		update((state) => ({ ...state, error: null }));
	}

	/**
	 * Get storage instance
	 */
	function getStorage() {
		return storage;
	}

	return {
		subscribe,
		initializeStorage,
		refreshDeckList,
		loadDeck,
		saveDeck,
		loadVersion,
		loadVersionData,
		createDeck,
		deleteDeck,
		renameDeck,
		createNewBranch,
		switchToBranch,
		deleteBranchFromDeck,
		updateVersioningScheme,
		clearError,
		getStorage
	};
}

export const deckManager = createDeckManager();
