/**
 * Svelte store for managing the current working deck state
 */

import { writable, derived, get } from 'svelte/store';
import type {
	Deck,
	WorkingDeck,
	DeckManifest,
	DeckStatistics,
	CreateBranchOptions
} from '$lib/types/deck';
import type { Maybeboard } from '$lib/types/maybeboard';
import type { Card, CategorizedCards } from '$lib/types/card';
import { CardCategory } from '$lib/types/card';
import type { VersionDiff } from '$lib/types/version';
import { createEmptyDeck } from '$lib/utils/deck-factory';
import { calculateStatistics } from '$lib/utils/deck-statistics';
import { validateDeck } from '$lib/utils/deck-validation';
import { categorizeDeck } from '$lib/utils/deck-categorization';
import { calculateDiff } from '$lib/utils/diff';
import { serializePlaintext } from '$lib/utils/decklist-parser';

/**
 * The main deck store
 */
function createDeckStore() {
	const { subscribe, set, update } = writable<WorkingDeck | null>(null);

	return {
		subscribe,

		/**
		 * Initialize a new deck
		 */
		createNew(name: string, commander?: Card): void {
			const deck = createEmptyDeck(name, commander);
			const maybeboard: Maybeboard = {
				categories: [
					{
						id: 'main',
						name: 'Main',
						cards: [],
						order: 0,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				],
				defaultCategoryId: 'main'
			};

			const statistics = calculateStatistics(deck);

			set({
				deck,
				maybeboard,
				statistics,
				isEditing: false,
				hasUnsavedChanges: false
			});
		},

		/**
		 * Load an existing deck from manifest
		 */
		load(deck: Deck, maybeboard: Maybeboard): void {
			const statistics = calculateStatistics(deck);
			set({
				deck,
				maybeboard,
				statistics,
				isEditing: false,
				hasUnsavedChanges: false
			});
		},

		/**
		 * Update deck version after commit (preserves edit state)
		 */
		updateVersion(newVersion: string): void {
			update((state) => {
				if (!state) return state;

				const updatedDeck = {
					...state.deck,
					currentVersion: newVersion,
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: updatedDeck,
					hasUnsavedChanges: false
				};
			});
		},

		/**
		 * Add a card to the deck
		 */
		addCard(card: Card, category?: CardCategory): void {
			update((state) => {
				if (!state) return state;

				const targetCategory = category || inferCategory(card);
				const categoryCards = state.deck.cards[targetCategory] || [];

				// Check if card already exists in this category
				const existingIndex = categoryCards.findIndex((c) => c.name === card.name);

				let updatedCategoryCards: Card[];
				if (existingIndex !== -1) {
					// Card exists - increment quantity
					const existingCard = categoryCards[existingIndex];
					updatedCategoryCards = [
						...categoryCards.slice(0, existingIndex),
						{ ...existingCard, quantity: existingCard.quantity + card.quantity },
						...categoryCards.slice(existingIndex + 1)
					];
				} else {
					// New card - add to category
					updatedCategoryCards = [...categoryCards, card];
				}

				// Create new cards object with updated category
				const updatedCards = {
					...state.deck.cards,
					[targetCategory]: updatedCategoryCards
				};

				// Create new deck object with all updates
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Remove a card from the deck
		 */
		removeCard(cardName: string, category: CardCategory): void {
			update((state) => {
				if (!state) return state;

				const categoryCards = state.deck.cards[category];

				// Find the card and decrement quantity or remove it
				const cardIndex = categoryCards.findIndex((c) => c.name === cardName);
				if (cardIndex === -1) return state;

				const card = categoryCards[cardIndex];
				let updatedCategoryCards: Card[];
				if (card.quantity > 1) {
					// Decrement quantity
					updatedCategoryCards = [
						...categoryCards.slice(0, cardIndex),
						{ ...card, quantity: card.quantity - 1 },
						...categoryCards.slice(cardIndex + 1)
					];
				} else {
					// Remove the card entirely
					updatedCategoryCards = [
						...categoryCards.slice(0, cardIndex),
						...categoryCards.slice(cardIndex + 1)
					];
				}

				// Create new cards object with updated category
				const updatedCards = {
					...state.deck.cards,
					[category]: updatedCategoryCards
				};

				// Create new deck object with all updates
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Update card quantity
		 */
		updateCardQuantity(cardName: string, category: CardCategory, delta: number): void {
			update((state) => {
				if (!state) return state;

				const categoryCards = state.deck.cards[category];
				const cardIndex = categoryCards.findIndex((c) => c.name === cardName);

				if (cardIndex === -1) return state;

				const card = categoryCards[cardIndex];
				const newQuantity = Math.max(0, card.quantity + delta);

				let updatedCategoryCards: Card[];
				if (newQuantity === 0) {
					// Remove the card
					updatedCategoryCards = [
						...categoryCards.slice(0, cardIndex),
						...categoryCards.slice(cardIndex + 1)
					];
				} else {
					// Update quantity
					updatedCategoryCards = [
						...categoryCards.slice(0, cardIndex),
						{ ...card, quantity: newQuantity },
						...categoryCards.slice(cardIndex + 1)
					];
				}

				// Create new cards object with updated category
				const updatedCards = {
					...state.deck.cards,
					[category]: updatedCategoryCards
				};

				// Create new deck object with all updates
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Switch card printing (set code)
		 */
		switchPrinting(cardName: string, category: CardCategory, newCard: Card): void {
			update((state) => {
				if (!state) return state;

				const categoryCards = state.deck.cards[category];
				const cardIndex = categoryCards.findIndex((c) => c.name === cardName);

				if (cardIndex === -1) return state;

				// Keep the same quantity, but update the card data
				const oldCard = categoryCards[cardIndex];
				const updatedCategoryCards = [
					...categoryCards.slice(0, cardIndex),
					{ ...newCard, quantity: oldCard.quantity },
					...categoryCards.slice(cardIndex + 1)
				];

				// Create new cards object with updated category
				const updatedCards = {
					...state.deck.cards,
					[category]: updatedCategoryCards
				};

				// Create new deck object with all updates
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Toggle edit mode
		 */
		setEditMode(isEditing: boolean): void {
			update((state) => {
				if (!state) return state;

				// When entering edit mode, capture the initial state for diff calculation
				if (isEditing && !state.isEditing) {
					return {
						...state,
						isEditing,
						initialDeckState: JSON.parse(JSON.stringify(state.deck)) // Deep clone
					};
				}

				// When leaving edit mode, clear the initial state
				if (!isEditing && state.isEditing) {
					return {
						...state,
						isEditing,
						initialDeckState: undefined
					};
				}

				return { ...state, isEditing };
			});
		},

		/**
		 * Mark as saved (clear unsaved changes flag)
		 */
		markAsSaved(): void {
			update((state) => {
				if (!state) return state;
				return {
					...state,
					hasUnsavedChanges: false,
					lastStashAt: undefined
				};
			});
		},

		/**
		 * Update stash timestamp
		 */
		updateStashTimestamp(): void {
			update((state) => {
				if (!state) return state;
				return {
					...state,
					lastStashAt: new Date().toISOString()
				};
			});
		},

		/**
		 * Add a card to the maybeboard
		 */
		addCardToMaybeboard(card: Card, categoryId?: string): void {
			update((state) => {
				if (!state) return state;

				const targetCategoryId = categoryId || state.maybeboard.defaultCategoryId;
				const categoryIndex = state.maybeboard.categories.findIndex(c => c.id === targetCategoryId);

				if (categoryIndex === -1) return state; // Category not found

				const newMaybeboard = { ...state.maybeboard };
				const category = newMaybeboard.categories[categoryIndex];
				const categoryCards = [...category.cards];

				// Check if card already exists in this category
				const existingIndex = categoryCards.findIndex(c => c.name === card.name);

				if (existingIndex !== -1) {
					// Increment quantity
					categoryCards[existingIndex] = {
						...categoryCards[existingIndex],
						quantity: categoryCards[existingIndex].quantity + card.quantity
					};
				} else {
					// Add new card
					categoryCards.push(card);
				}

				// Update category
				newMaybeboard.categories = [
					...newMaybeboard.categories.slice(0, categoryIndex),
					{
						...category,
						cards: categoryCards,
						updatedAt: new Date().toISOString()
					},
					...newMaybeboard.categories.slice(categoryIndex + 1)
				];

				return {
					...state,
					maybeboard: newMaybeboard,
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Remove a card from the maybeboard
		 */
		removeCardFromMaybeboard(cardName: string, categoryId: string): void {
			update((state) => {
				if (!state) return state;

				const categoryIndex = state.maybeboard.categories.findIndex(c => c.id === categoryId);
				if (categoryIndex === -1) return state;

				const newMaybeboard = { ...state.maybeboard };
				const category = newMaybeboard.categories[categoryIndex];
				const categoryCards = [...category.cards];

				const cardIndex = categoryCards.findIndex(c => c.name === cardName);
				if (cardIndex === -1) return state;

				const card = categoryCards[cardIndex];

				if (card.quantity > 1) {
					// Decrement quantity
					categoryCards[cardIndex] = { ...card, quantity: card.quantity - 1 };
				} else {
					// Remove card entirely
					categoryCards.splice(cardIndex, 1);
				}

				// Update category
				newMaybeboard.categories = [
					...newMaybeboard.categories.slice(0, categoryIndex),
					{
						...category,
						cards: categoryCards,
						updatedAt: new Date().toISOString()
					},
					...newMaybeboard.categories.slice(categoryIndex + 1)
				];

				return {
					...state,
					maybeboard: newMaybeboard,
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Move a card from deck to maybeboard
		 */
		moveToMaybeboard(cardName: string, category: CardCategory, categoryId?: string): void {
			update((state) => {
				if (!state) return state;

				// Find the card in the deck
				const categoryCards = state.deck.cards[category];
				const cardIndex = categoryCards.findIndex(c => c.name === cardName);

				if (cardIndex === -1) return state;

				const card = categoryCards[cardIndex];

				// Add to maybeboard
				const targetCategoryId = categoryId || state.maybeboard.defaultCategoryId;
				const mbCategoryIndex = state.maybeboard.categories.findIndex(c => c.id === targetCategoryId);

				if (mbCategoryIndex === -1) return state;

				const newMaybeboard = { ...state.maybeboard };
				const mbCategory = newMaybeboard.categories[mbCategoryIndex];
				const mbCards = [...mbCategory.cards];

				// Check if card exists in maybeboard
				const mbCardIndex = mbCards.findIndex(c => c.name === cardName);
				if (mbCardIndex !== -1) {
					mbCards[mbCardIndex] = {
						...mbCards[mbCardIndex],
						quantity: mbCards[mbCardIndex].quantity + card.quantity
					};
				} else {
					mbCards.push(card);
				}

				// Update maybeboard category
				newMaybeboard.categories = [
					...newMaybeboard.categories.slice(0, mbCategoryIndex),
					{
						...mbCategory,
						cards: mbCards,
						updatedAt: new Date().toISOString()
					},
					...newMaybeboard.categories.slice(mbCategoryIndex + 1)
				];

				// Remove from deck
				const updatedCategoryCards = [
					...categoryCards.slice(0, cardIndex),
					...categoryCards.slice(cardIndex + 1)
				];

				const updatedCards = {
					...state.deck.cards,
					[category]: updatedCategoryCards
				};

				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: newDeck,
					maybeboard: newMaybeboard,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Move a card from maybeboard to deck
		 */
		moveToDeck(cardName: string, categoryId: string, targetCategory?: CardCategory): void {
			update((state) => {
				if (!state) return state;

				// Find card in maybeboard
				const mbCategoryIndex = state.maybeboard.categories.findIndex(c => c.id === categoryId);
				if (mbCategoryIndex === -1) return state;

				const mbCategory = state.maybeboard.categories[mbCategoryIndex];
				const mbCardIndex = mbCategory.cards.findIndex(c => c.name === cardName);

				if (mbCardIndex === -1) return state;

				const card = mbCategory.cards[mbCardIndex];
				const deckCategory = targetCategory || inferCategory(card);

				// Add to deck
				const deckCategoryCards = state.deck.cards[deckCategory] || [];
				const deckCardIndex = deckCategoryCards.findIndex(c => c.name === cardName);

				let updatedDeckCategoryCards: Card[];
				if (deckCardIndex !== -1) {
					// Increment quantity
					updatedDeckCategoryCards = [
						...deckCategoryCards.slice(0, deckCardIndex),
						{
							...deckCategoryCards[deckCardIndex],
							quantity: deckCategoryCards[deckCardIndex].quantity + card.quantity
						},
						...deckCategoryCards.slice(deckCardIndex + 1)
					];
				} else {
					// Add new card
					updatedDeckCategoryCards = [...deckCategoryCards, card];
				}

				const updatedCards = {
					...state.deck.cards,
					[deckCategory]: updatedDeckCategoryCards
				};

				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				// Remove from maybeboard
				const newMaybeboard = { ...state.maybeboard };
				newMaybeboard.categories = [
					...newMaybeboard.categories.slice(0, mbCategoryIndex),
					{
						...mbCategory,
						cards: [
							...mbCategory.cards.slice(0, mbCardIndex),
							...mbCategory.cards.slice(mbCardIndex + 1)
						],
						updatedAt: new Date().toISOString()
					},
					...newMaybeboard.categories.slice(mbCategoryIndex + 1)
				];

				return {
					...state,
					deck: newDeck,
					maybeboard: newMaybeboard,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Export the current deck to plaintext format
		 * Returns plaintext decklist compatible with Arena/MTGO/Moxfield/Archidekt
		 */
		exportToPlaintext(includeSetCodes = true): string | null {
			const state = get({ subscribe });
			if (!state) return null;

			const allCards: Card[] = [];

			// Add cards from all categories in order
			const categories = [
				CardCategory.Commander,
				CardCategory.Companion,
				CardCategory.Planeswalker,
				CardCategory.Creature,
				CardCategory.Instant,
				CardCategory.Sorcery,
				CardCategory.Artifact,
				CardCategory.Enchantment,
				CardCategory.Land,
				CardCategory.Other
			];

			for (const category of categories) {
				const categoryCards = state.deck.cards[category] || [];
				allCards.push(...categoryCards);
			}

			return serializePlaintext(allCards, includeSetCodes);
		},

		/**
		 * Clear the deck
		 */
		clear(): void {
			set(null);
		}
	};
}

/**
 * Infer the category of a card based on its types
 */
function inferCategory(card: Card): CardCategory {
	if (!card.types || card.types.length === 0) {
		return CardCategory.Other;
	}

	const types = card.types.map((t) => t.toLowerCase());

	if (types.includes('planeswalker')) return CardCategory.Planeswalker;
	if (types.includes('creature')) return CardCategory.Creature;
	if (types.includes('instant')) return CardCategory.Instant;
	if (types.includes('sorcery')) return CardCategory.Sorcery;
	if (types.includes('artifact')) return CardCategory.Artifact;
	if (types.includes('enchantment')) return CardCategory.Enchantment;
	if (types.includes('land')) return CardCategory.Land;

	return CardCategory.Other;
}

/**
 * Calculate total cards in categorized deck
 */
function calculateTotalCards(cards: CategorizedCards): number {
	let total = 0;
	for (const category of Object.values(CardCategory)) {
		for (const card of cards[category] || []) {
			total += card.quantity;
		}
	}
	return total;
}

/**
 * Export the store
 */
export const deckStore = createDeckStore();

/**
 * Derived store for validation warnings
 */
export const validationWarnings = derived(deckStore, ($deck) => {
	if (!$deck) return [];
	return validateDeck($deck.deck).warnings;
});

/**
 * Derived store for whether deck is valid
 */
export const isDeckValid = derived(deckStore, ($deck) => {
	if (!$deck) return false;
	return validateDeck($deck.deck).isValid;
});

/**
 * Derived store for current edit diff
 * Calculates difference between initial state and current state
 */
export const currentDiff = derived(deckStore, ($deck) => {
	if (!$deck || !$deck.initialDeckState || !$deck.isEditing) {
		return null;
	}
	return calculateDiff($deck.initialDeckState, $deck.deck);
});
