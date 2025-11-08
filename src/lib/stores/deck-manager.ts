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
				const { deck, manifest, maybeboard } = extractDeckFromArchive(archive);

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
		const currentState = get(deckStore);
		if (!currentState) {
			update((state) => ({ ...state, error: 'No active deck to save' }));
			return false;
		}

		const appState = get({ subscribe });
		if (!appState.activeDeckName || !appState.activeManifest) {
			// First save - deck doesn't exist yet
			// Create a new deck archive
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const { serializeDeck, createDeckArchive } = await import('$lib/utils/deck-serializer');
				const { compressDeckArchive } = await import('$lib/utils/zip');

				const deck = currentState.deck;

				// Create initial manifest
				const manifest = createDeckManifest(deck);

				// Apply commit message to the first version
				const { manifest: updatedManifest } = createVersion(
					manifest,
					deck,
					commitMessage,
					newVersion
				);

				const decklistContent = serializeDeck(deck, true);
				const archive = createDeckArchive(deck, updatedManifest, currentState.maybeboard, decklistContent);
				const zipBlob = await compressDeckArchive(archive, deck.name);

				const result = await storage.saveDeck(deck.name, zipBlob);

				if (result.success) {
					deckStore.markAsSaved();
					await refreshDeckList();
					update((state) => ({
						...state,
						activeDeckName: deck.name,
						activeManifest: updatedManifest,
						isLoading: false
					}));
					localStorage.setItem(ACTIVE_DECK_KEY, deck.name);
					return true;
				} else {
					update((state) => ({
						...state,
						isLoading: false,
						error: result.error || 'Failed to save deck'
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
				const { serializeDeck } = await import('$lib/utils/deck-serializer');

				const archive = await decompressDeckArchive(loadResult.data);
				const deck = currentState.deck;

				// Create new version using the manifest
				const { manifest: updatedManifest, version: newVersionString } = createVersion(
					appState.activeManifest,
					deck,
					commitMessage,
					newVersion
				);

				// Serialize current deck state
				const decklistContent = serializeDeck(deck, true);

				// Update archive versions
				const currentBranch = deck.currentBranch;
				if (!archive.versions[currentBranch]) {
					archive.versions[currentBranch] = {};
				}
				archive.versions[currentBranch][`v${newVersionString}.txt`] = decklistContent;

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
	 * Create a new deck
	 */
	async function createDeck(name: string, commanderName?: string): Promise<void> {
		update((state) => ({ ...state, isLoading: true, error: null }));

		let commander = undefined;

		// Fetch commander card data if provided
		if (commanderName) {
			try {
				const { CardService } = await import('$lib/api/card-service');
				const cardService = new CardService();

				// Get full card data by exact name
				const commanderCard = await cardService.getCardByName(commanderName);
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
				console.error('Failed to fetch commander:', error);
				// Continue with undefined commander
			}
		}

		deckStore.createNew(name, commander);

		// The deck will be saved when the user first commits
		update((state) => ({
			...state,
			activeDeckName: null, // Will be set on first save
			isLoading: false
		}));
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
		createDeck,
		deleteDeck,
		clearError
	};
}

export const deckManager = createDeckManager();
