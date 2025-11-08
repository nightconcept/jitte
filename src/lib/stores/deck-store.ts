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
		 * Add a card to the deck
		 */
		addCard(card: Card, category?: CardCategory): void {
			update((state) => {
				if (!state) return state;

				const newDeck = { ...state.deck };
				const targetCategory = category || inferCategory(card);

				// Add to the appropriate category
				newDeck.cards = {
					...newDeck.cards,
					[targetCategory]: [...newDeck.cards[targetCategory], card]
				};

				newDeck.cardCount = calculateTotalCards(newDeck.cards);
				newDeck.updatedAt = new Date().toISOString();

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

				const newDeck = { ...state.deck };
				const categoryCards = newDeck.cards[category];

				// Find the card and decrement quantity or remove it
				const cardIndex = categoryCards.findIndex((c) => c.name === cardName);
				if (cardIndex === -1) return state;

				const card = categoryCards[cardIndex];
				if (card.quantity > 1) {
					// Decrement quantity
					newDeck.cards[category] = [
						...categoryCards.slice(0, cardIndex),
						{ ...card, quantity: card.quantity - 1 },
						...categoryCards.slice(cardIndex + 1)
					];
				} else {
					// Remove the card entirely
					newDeck.cards[category] = [
						...categoryCards.slice(0, cardIndex),
						...categoryCards.slice(cardIndex + 1)
					];
				}

				newDeck.cardCount = calculateTotalCards(newDeck.cards);
				newDeck.updatedAt = new Date().toISOString();

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

				const newDeck = { ...state.deck };
				const categoryCards = newDeck.cards[category];
				const cardIndex = categoryCards.findIndex((c) => c.name === cardName);

				if (cardIndex === -1) return state;

				const card = categoryCards[cardIndex];
				const newQuantity = Math.max(0, card.quantity + delta);

				if (newQuantity === 0) {
					// Remove the card
					newDeck.cards[category] = [
						...categoryCards.slice(0, cardIndex),
						...categoryCards.slice(cardIndex + 1)
					];
				} else {
					// Update quantity
					newDeck.cards[category] = [
						...categoryCards.slice(0, cardIndex),
						{ ...card, quantity: newQuantity },
						...categoryCards.slice(cardIndex + 1)
					];
				}

				newDeck.cardCount = calculateTotalCards(newDeck.cards);
				newDeck.updatedAt = new Date().toISOString();

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

				const newDeck = { ...state.deck };
				const categoryCards = newDeck.cards[category];
				const cardIndex = categoryCards.findIndex((c) => c.name === cardName);

				if (cardIndex === -1) return state;

				// Keep the same quantity, but update the card data
				const oldCard = categoryCards[cardIndex];
				newDeck.cards[category] = [
					...categoryCards.slice(0, cardIndex),
					{ ...newCard, quantity: oldCard.quantity },
					...categoryCards.slice(cardIndex + 1)
				];

				newDeck.updatedAt = new Date().toISOString();

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
