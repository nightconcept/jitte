/**
 * Deck Manager Store
 * Manages the list of available decks and persistence operations
 */

import { writable, get } from 'svelte/store';
import type { Deck, DeckManifest } from '$lib/types/deck';
import type { Maybeboard } from '$lib/types/maybeboard';
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

				deckStore.load(deck, maybeboard);

				update((state) => ({
					...state,
					activeDeckName: deckName,
					activeManifest: manifest,
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
	async function createDeck(name: string, commanderName?: string): Promise<void> {
		console.log('[deckManager.createDeck] Starting:', { name, commanderName });
		update((state) => ({ ...state, isLoading: true, error: null }));

		let commander = undefined;

		// Fetch commander card data if provided
		if (commanderName) {
			try {
				console.log('[deckManager.createDeck] Fetching commander data...');
				const { CardService } = await import('$lib/api/card-service');
				const cardService = new CardService();

				// Get full card data by exact name
				const commanderCard = await cardService.getCardByName(commanderName);
				console.log('[deckManager.createDeck] Commander card fetched:', commanderCard?.name);
				if (commanderCard) {
					// Convert ScryfallCard to Card type
					commander = {
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
					};
				}
			} catch (error) {
				console.error('[deckManager.createDeck] Failed to fetch commander:', error);
				// Continue with undefined commander
			}
		}

		console.log('[deckManager.createDeck] Creating deck in store...');
		deckStore.createNew(name, commander);

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
	 * Clear error
	 */
	function clearError(): void {
		update((state) => ({ ...state, error: null }));
	}

	return {
		subscribe,
		initializeStorage,
		refreshDeckList,
		loadDeck,
		saveDeck,
		loadVersion,
		createDeck,
		deleteDeck,
		clearError
	};
}

export const deckManager = createDeckManager();
