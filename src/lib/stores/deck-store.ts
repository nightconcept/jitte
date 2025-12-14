/**
 * Svelte store for managing the current working deck state
 */

import { writable, derived, get } from 'svelte/store';
import type {
	Deck,
	CommanderDeck,
	WorkingDeck,
	DeckManifest,
	DeckStatistics,
	CreateBranchOptions,
	CategorizationMode,
	PricingStatus
} from '$lib/types/deck';
import { isCommanderDeck } from '$lib/types/deck';
import type { Maybeboard } from '$lib/types/maybeboard';
import type { Card, CategorizedCards, CardsByCategory, CategoryDefinition, ManaColor } from '$lib/types/card';
import { CardCategory, CubeCardCategory, UNCATEGORIZED_CATEGORY_ID } from '$lib/types/card';
import { getAllCubeCategories } from '$lib/utils/cube-categorization';
import type { VersionDiff } from '$lib/types/version';
import { DeckFormat } from '$lib/formats/format-registry';
import { getFormatService } from '$lib/formats/services/format-service-factory';
import { createEmptyDeck, calculateColorIdentity } from '$lib/utils/deck-factory';
import { calculateStatistics } from '$lib/utils/deck-statistics';
import { validateDeck } from '$lib/utils/deck-validation';
import { categorizeDeck } from '$lib/utils/deck-categorization';
import { calculateDiff } from '$lib/utils/diff';
import { serializePlaintext } from '$lib/utils/decklist-parser';
import { deckToMpcAutofill } from '$lib/utils/deck-to-mpc-autofill';

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
		createNew(name: string, format: DeckFormat, commanders?: Card | Card[]): void {
			const deck = createEmptyDeck(name, format, commanders);
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
				isEditing: true, // Default to unlocked (editing enabled)
				hasUnsavedChanges: false,
				pricingStatus: 'idle'
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
				isEditing: true, // Default to unlocked (editing enabled)
				hasUnsavedChanges: false,
				pricingStatus: 'idle'
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
		 * Update deck name
		 */
		setDeckName(newName: string): void {
			update((state) => {
				if (!state) return state;

				const updatedDeck = {
					...state.deck,
					name: newName,
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: updatedDeck,
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Add a card to the deck
		 */
		addCard(card: Card, category?: string): void {
			update((state) => {
				if (!state) return state;

				const targetCategory = category || inferCategory(card, state.deck);
				console.log('[deck-store] addCard:', {
					cardName: card.name,
					deckFormat: state.deck.format,
					targetCategory,
					providedCategory: category,
					colorIdentity: card.colorIdentity,
					types: card.types
				});
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
				const updatedCards: CardsByCategory = {
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

				console.log('[deck-store] addCard complete - deck categories:', Object.keys(newDeck.cards));
				console.log('[deck-store] addCard complete - category counts:',
					Object.entries(newDeck.cards).map(([cat, cards]) => `${cat}: ${cards.length}`).join(', '));

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
		removeCard(cardName: string, category: string): void {
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
				const updatedCards: CardsByCategory = {
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
		 * Set commanders (replaces all commanders)
		 * Use this for setting 1 or 2 commanders at once
		 */
		setCommanders(commanders: Card[]): void {
			update((state) => {
				if (!state) return state;

				// Ensure quantity is 1 for all commanders
				const commandersWithQuantity = commanders.map(c => ({ ...c, quantity: 1 }));

				// Replace the commander cards
				const updatedCards: CardsByCategory = {
					...state.deck.cards,
					[CardCategory.Commander]: commandersWithQuantity
				};

				// Calculate new color identity
				const colorIdentity = calculateColorIdentity(commandersWithQuantity);

				// Create new deck object with all updates
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				// Set color identity for Commander decks only
				if (isCommanderDeck(newDeck)) {
					(newDeck as CommanderDeck).colorIdentity = colorIdentity;
				}

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Change a single commander (maintains partner if present)
		 * @param index - Which commander to replace (0 or 1)
		 * @param newCommander - New commander card
		 */
		replaceCommander(index: number, newCommander: Card): void {
			update((state) => {
				if (!state) return state;

				const currentCommanders = [...state.deck.cards.commander];

				if (index < 0 || index >= currentCommanders.length) {
					console.warn(`Invalid commander index: ${index}`);
					return state;
				}

				// Replace the commander at the specified index
				currentCommanders[index] = { ...newCommander, quantity: 1 };

				// Replace the commander cards
				const updatedCards: CardsByCategory = {
					...state.deck.cards,
					[CardCategory.Commander]: currentCommanders
				};

				// Calculate new color identity
				const colorIdentity = calculateColorIdentity(currentCommanders);

				// Create new deck object with all updates
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				// Set color identity for Commander decks only
				if (isCommanderDeck(newDeck)) {
					(newDeck as CommanderDeck).colorIdentity = colorIdentity;
				}

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Add a partner commander (only if current commander has partner ability)
		 */
		addPartner(partner: Card): void {
			update((state) => {
				if (!state) return state;

				const currentCommanders = state.deck.cards.commander;

				if (currentCommanders.length >= 2) {
					console.warn('Deck already has 2 commanders');
					return state;
				}

				// Add the partner
				const updatedCommanders = [...currentCommanders, { ...partner, quantity: 1 }];

				const updatedCards: CardsByCategory = {
					...state.deck.cards,
					[CardCategory.Commander]: updatedCommanders
				};

				// Calculate new color identity
				const colorIdentity = calculateColorIdentity(updatedCommanders);

				// Create new deck object with all updates
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				// Set color identity for Commander decks only
				if (isCommanderDeck(newDeck)) {
					(newDeck as CommanderDeck).colorIdentity = colorIdentity;
				}

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Remove a partner commander (keeping the other one)
		 */
		removePartner(commanderName: string): void {
			update((state) => {
				if (!state) return state;

				const currentCommanders = state.deck.cards.commander;

				if (currentCommanders.length <= 1) {
					console.warn('Cannot remove the only commander');
					return state;
				}

				// Remove the specified commander
				const updatedCommanders = currentCommanders.filter(c => c.name !== commanderName);

				const updatedCards: CardsByCategory = {
					...state.deck.cards,
					[CardCategory.Commander]: updatedCommanders
				};

				// Calculate new color identity
				const colorIdentity = calculateColorIdentity(updatedCommanders);

				// Create new deck object with all updates
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				// Set color identity for Commander decks only
				if (isCommanderDeck(newDeck)) {
					(newDeck as CommanderDeck).colorIdentity = colorIdentity;
				}

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
		updateCardQuantity(cardName: string, category: string, delta: number): void {
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
				const updatedCards: CardsByCategory = {
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
		switchPrinting(cardName: string, category: string, newCard: Card): void {
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
				const updatedCards: CardsByCategory = {
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
		 * Enrich a card with additional data (e.g., cardFaces for double-faced cards)
		 * This merges the enrichment data into the existing card without replacing it
		 */
		enrichCard(cardName: string, category: string, enrichmentData: Partial<Card>): void {
			update((state) => {
				if (!state) return state;

				const categoryCards = state.deck.cards[category];
				const cardIndex = categoryCards.findIndex((c) => c.name === cardName);

				if (cardIndex === -1) return state;

				// Merge enrichment data into existing card
				const oldCard = categoryCards[cardIndex];
				const enrichedCard = { ...oldCard, ...enrichmentData };

				const updatedCategoryCards = [
					...categoryCards.slice(0, cardIndex),
					enrichedCard,
					...categoryCards.slice(cardIndex + 1)
				];

				// Create new cards object with updated category
				const updatedCards: CardsByCategory = {
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
		 * Update statistics (e.g., after combo detection completes)
		 */
		updateStatistics(statistics: DeckStatistics): void {
			update((state) => {
				if (!state) return state;
				return {
					...state,
					statistics
				};
			});
		},

		/**
		 * Set pricing enrichment status
		 */
		setPricingStatus(status: PricingStatus): void {
			update((state) => {
				if (!state) return state;
				return {
					...state,
					pricingStatus: status
				};
			});
		},

		/**
		 * Update cards with enriched pricing data
		 * This updates both the cards and recalculates statistics (for total price)
		 */
		updateCardsPricing(updatedCards: CardsByCategory): void {
			update((state) => {
				if (!state) return state;

				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards
				};

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					pricingStatus: 'loaded' as PricingStatus
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
		moveToMaybeboard(cardName: string, category: string, categoryId?: string): void {
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

				const updatedCards: CardsByCategory = {
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
		moveToDeck(cardName: string, categoryId: string, targetCategory?: string): void {
			update((state) => {
				if (!state) return state;

				// Find card in maybeboard
				const mbCategoryIndex = state.maybeboard.categories.findIndex(c => c.id === categoryId);
				if (mbCategoryIndex === -1) return state;

				const mbCategory = state.maybeboard.categories[mbCategoryIndex];
				const mbCardIndex = mbCategory.cards.findIndex(c => c.name === cardName);

				if (mbCardIndex === -1) return state;

				const card = mbCategory.cards[mbCardIndex];
				const deckCategory = targetCategory || inferCategory(card, state.deck);

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

				const updatedCards: CardsByCategory = {
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
		 * Create a new maybeboard category
		 */
		createMaybeboardCategory(options: { name: string; description?: string }): void {
			update((state) => {
				if (!state) return state;

				const now = new Date().toISOString();
				const maxOrder = Math.max(...state.maybeboard.categories.map((c) => c.order), 0);

				// Generate category ID from name
				const categoryId = options.name
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

				const newCategory = {
					id: categoryId,
					name: options.name,
					cards: [],
					description: options.description,
					order: maxOrder + 1,
					createdAt: now,
					updatedAt: now
				};

				const newMaybeboard = {
					...state.maybeboard,
					categories: [...state.maybeboard.categories, newCategory]
				};

				return {
					...state,
					maybeboard: newMaybeboard,
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Delete a maybeboard category
		 */
		deleteMaybeboardCategory(categoryId: string): void {
			update((state) => {
				if (!state) return state;

				// Can't delete the default category
				if (categoryId === state.maybeboard.defaultCategoryId) {
					console.error('Cannot delete the default category');
					return state;
				}

				const newMaybeboard = {
					...state.maybeboard,
					categories: state.maybeboard.categories.filter((c) => c.id !== categoryId)
				};

				return {
					...state,
					maybeboard: newMaybeboard,
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Update card quantity in maybeboard
		 */
		updateMaybeboardCardQuantity(cardName: string, categoryId: string, newQuantity: number): void {
			update((state) => {
				if (!state) return state;

				const categoryIndex = state.maybeboard.categories.findIndex(c => c.id === categoryId);
				if (categoryIndex === -1) return state;

				const newMaybeboard = { ...state.maybeboard };
				const category = { ...newMaybeboard.categories[categoryIndex] };
				let categoryCards = [...category.cards];

				const cardIndex = categoryCards.findIndex(c => c.name === cardName);
				if (cardIndex === -1) return state;

				if (newQuantity <= 0) {
					// Remove card if quantity is 0 or less
					categoryCards.splice(cardIndex, 1);
				} else {
					// Update quantity
					categoryCards[cardIndex] = {
						...categoryCards[cardIndex],
						quantity: newQuantity
					};
				}

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
		 * Import cards to maybeboard from plaintext
		 */
		importToMaybeboard(decklist: string, categoryId: string): void {
			update((state) => {
				if (!state) return state;

				// Parse the decklist
				const { parsePlaintext } = require('$lib/utils/decklist-parser');
				const parseResult = parsePlaintext(decklist);

				if (parseResult.errors.length > 0) {
					console.error('Failed to parse decklist:', parseResult.errors);
					return state;
				}

				// Find the category
				const categoryIndex = state.maybeboard.categories.findIndex(c => c.id === categoryId);
				if (categoryIndex === -1) return state;

				const newMaybeboard = { ...state.maybeboard };
				const category = { ...newMaybeboard.categories[categoryIndex] };
				let categoryCards = [...category.cards];

				// Add each card to the category
				for (const card of parseResult.cards) {
					const existingIndex = categoryCards.findIndex(c => c.name === card.name);

					if (existingIndex !== -1) {
						// Update quantity
						categoryCards[existingIndex] = {
							...categoryCards[existingIndex],
							quantity: categoryCards[existingIndex].quantity + card.quantity
						};
					} else {
						// Add new card
						categoryCards.push(card);
					}
				}

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
		 * Export the current deck to plaintext format
		 * Returns plaintext decklist compatible with Arena/MTGO/Moxfield/Archidekt
		 */
		exportToPlaintext(includeSetCodes = true, excludeCommander = false): string | null {
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
				// Skip commander if excludeCommander is true
				if (excludeCommander && category === CardCategory.Commander) {
					continue;
				}

				const categoryCards = state.deck.cards[category] || [];
				allCards.push(...categoryCards);
			}

			return serializePlaintext(allCards, includeSetCodes);
		},

		/**
		 * Export the current deck to cube plaintext format
		 * Returns plaintext with "# mainboard" header and card names only (no quantities)
		 * Format: # mainboard\n\nCard Name\n\nCard Name\n...
		 */
		exportToCubePlaintext(): string | null {
			const state = get({ subscribe });
			if (!state) return null;

			const allCards: Card[] = [];

			// For cube, we use all CubeCardCategories (including land subcategories)
			const categories = getAllCubeCategories();

			for (const category of categories) {
				const categoryCards = state.deck.cards[category] || [];
				allCards.push(...categoryCards);
			}

			// Build the plaintext with "# mainboard" header and card names only
			const lines: string[] = ['# mainboard', ''];
			for (const card of allCards) {
				lines.push(card.name);
			}

			return lines.join('\n');
		},

		/**
		 * Export the current deck to MPC Autofill format
		 * Returns plaintext decklist in format: "1x Card Name" per line
		 */
		exportToMpcAutofill(): string | null {
			const state = get({ subscribe });
			if (!state) return null;

			return deckToMpcAutofill(state.deck, state.maybeboard);
		},

		/**
		 * Export the current cube to CubeCobra CSV format
		 * Returns CSV content matching CubeCobra's export format
		 */
		exportToCubeCobraCSV(): string | null {
			const state = get({ subscribe });
			if (!state) return null;

			const allCards: Card[] = [];

			// For cube, we use all CubeCardCategories (including land subcategories)
			const categories = getAllCubeCategories();

			for (const category of categories) {
				const categoryCards = state.deck.cards[category] || [];
				allCards.push(...categoryCards);
			}

			// Helper to escape CSV fields
			const escapeCSV = (value: string): string => {
				if (value.includes(',') || value.includes('"') || value.includes('\n')) {
					return `"${value.replace(/"/g, '""')}"`;
				}
				return `"${value}"`;
			};

			// Helper to get color string from colorIdentity
			const getColorString = (colorIdentity?: ('W' | 'U' | 'B' | 'R' | 'G' | 'C')[]): string => {
				if (!colorIdentity || colorIdentity.length === 0) return '';
				// Filter out 'C' (colorless) and join remaining colors
				return colorIdentity.filter((c) => c !== 'C').join('');
			};

			// Helper to get Color Category (for CubeCobra's color-based filtering)
			const getColorCategory = (colorIdentity?: ('W' | 'U' | 'B' | 'R' | 'G' | 'C')[]): string => {
				if (!colorIdentity || colorIdentity.length === 0) return 'null';
				const colors = colorIdentity.filter((c) => c !== 'C');
				if (colors.length === 0) return 'null';
				if (colors.length > 1) return 'null'; // Multicolored
				const colorMap: Record<string, string> = {
					W: 'White',
					U: 'Blue',
					B: 'Black',
					R: 'Red',
					G: 'Green'
				};
				return colorMap[colors[0]] || 'null';
			};

			// Helper to reconstruct type line
			const getTypeLine = (card: Card): string => {
				// Try to get from card faces first
				if (card.cardFaces && card.cardFaces[0]?.typeLine) {
					return card.cardFaces[0].typeLine;
				}
				// Reconstruct from types and subtypes
				const types = card.types || [];
				const subtypes = card.subtypes || [];
				if (subtypes.length > 0) {
					return `${types.join(' ')} - ${subtypes.join(' ')}`;
				}
				return types.join(' ');
			};

			// CSV Header
			const header =
				'name,CMC,Type,Color,Set,Collector Number,Rarity,Color Category,status,Finish,maybeboard,image URL,image Back URL,tags,Notes,MTGO ID,Custom';

			// Build CSV rows
			const rows: string[] = [header];

			for (const card of allCards) {
				// For double-faced cards, use only the front face name (before " // ")
				const cardName = card.name.includes(' // ')
					? card.name.split(' // ')[0]
					: card.name;

				const row = [
					escapeCSV(cardName),
					card.cmc ?? 0,
					escapeCSV(getTypeLine(card)),
					getColorString(card.colorIdentity),
					escapeCSV(card.setCode?.toLowerCase() || ''),
					escapeCSV(card.collectorNumber || ''),
					'rare', // Default rarity - not currently stored
					getColorCategory(card.colorIdentity),
					'Owned', // Default status
					'Non-foil', // Default finish
					'false', // Not maybeboard (we export main deck only)
					'', // image URL
					'', // image Back URL
					escapeCSV(''), // tags
					escapeCSV(''), // Notes
					-1, // MTGO ID - not currently stored
					'false' // Custom
				].join(',');
				rows.push(row);
			}

			return rows.join('\n');
		},

		/**
		 * Replace the entire deck with a new set of cards
		 * Used for bulk edit operations like importing a plaintext decklist
		 * Preserves the commander(s) from the current deck
		 */
		replaceDeck(cards: Card[]): void {
			update((state) => {
				if (!state) return state;

				// Get format service for current deck format
				const formatService = getFormatService(state.deck.format);

				// Categorize the new cards using format-aware service
				const categorizedCards = formatService.categorizeCards(
					cards,
					state.deck.categorizationMode
				);

				// Preserve special cards (commanders for Commander format)
				if (isCommanderDeck(state.deck)) {
					categorizedCards[CardCategory.Commander] = state.deck.cards[CardCategory.Commander] || [];
				}

				// Create new deck with categorized cards
				const newDeck: Deck = {
					...state.deck,
					cards: categorizedCards,
					cardCount: calculateTotalCards(categorizedCards),
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
		 * Update card printing information
		 * Updates set-specific data like scryfallId, setCode, collectorNumber, and imageUrls
		 */
		updateCardPrinting(
			cardName: string,
			printingData: {
				scryfallId?: string;
				setCode?: string;
				collectorNumber?: string;
				imageUrls?: Card['imageUrls'];
				cardFaces?: Card['cardFaces'];
			}
		): void {
			console.log('[DeckStore] updateCardPrinting called:', {
				cardName,
				printingData
			});

			update((state) => {
				if (!state) return state;

				let cardFound = false;
				const updatedCards = { ...state.deck.cards };

				// Search through all categories to find and update the card
				for (const category of Object.keys(updatedCards) as CardCategory[]) {
					const categoryCards = updatedCards[category];
					const cardIndex = categoryCards.findIndex(c => c.name === cardName);

					if (cardIndex !== -1) {
						console.log('[DeckStore] Found card in category:', category, 'at index:', cardIndex);
						console.log('[DeckStore] Original card:', categoryCards[cardIndex]);

						// Found the card, update its printing data
						const updatedCard = {
							...categoryCards[cardIndex],
							...printingData
						};

						console.log('[DeckStore] Updated card:', updatedCard);

						updatedCards[category] = [
							...categoryCards.slice(0, cardIndex),
							updatedCard,
							...categoryCards.slice(cardIndex + 1)
						];

						cardFound = true;
						break; // Card found and updated, stop searching
					}
				}

				if (!cardFound) {
					console.warn(`[DeckStore] Card "${cardName}" not found in deck for printing update`);
					return state;
				}

				// Create new deck object with updated cards
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					updatedAt: new Date().toISOString()
				};

				console.log('[DeckStore] Returning updated state with new deck');

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Update maybeboard card printing information
		 * Updates set-specific data like scryfallId, setCode, collectorNumber, and imageUrls
		 */
		updateMaybeboardCardPrinting(
			cardName: string,
			categoryId: string,
			printingData: {
				scryfallId?: string;
				setCode?: string;
				collectorNumber?: string;
				imageUrls?: Card['imageUrls'];
				cardFaces?: Card['cardFaces'];
			}
		): void {
			console.log('[DeckStore] updateMaybeboardCardPrinting called:', {
				cardName,
				categoryId,
				printingData
			});

			update((state) => {
				if (!state) return state;

				const categoryIndex = state.maybeboard.categories.findIndex(c => c.id === categoryId);
				if (categoryIndex === -1) {
					console.warn(`[DeckStore] Maybeboard category "${categoryId}" not found`);
					return state;
				}

				const newMaybeboard = { ...state.maybeboard };
				const category = { ...newMaybeboard.categories[categoryIndex] };
				const categoryCards = [...category.cards];

				const cardIndex = categoryCards.findIndex(c => c.name === cardName);
				if (cardIndex === -1) {
					console.warn(`[DeckStore] Card "${cardName}" not found in maybeboard category "${categoryId}"`);
					return state;
				}

				console.log('[DeckStore] Found card in maybeboard category:', categoryId, 'at index:', cardIndex);
				console.log('[DeckStore] Original card:', categoryCards[cardIndex]);

				// Update the card with new printing data
				categoryCards[cardIndex] = {
					...categoryCards[cardIndex],
					...printingData
				};

				console.log('[DeckStore] Updated card:', categoryCards[cardIndex]);

				category.cards = categoryCards;
				category.updatedAt = new Date().toISOString();

				newMaybeboard.categories = [
					...newMaybeboard.categories.slice(0, categoryIndex),
					category,
					...newMaybeboard.categories.slice(categoryIndex + 1)
				];

				console.log('[DeckStore] Returning updated state with new maybeboard');

				return {
					...state,
					maybeboard: newMaybeboard,
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Update card custom properties (CMC, color identity, and category overrides)
		 * Primarily used for Cube format to customize card properties
		 */
		updateCardCustomProperties(
			cardName: string,
			customProperties: {
				customCmc?: number;
				customColorIdentity?: ManaColor[];
				customCategory?: CubeCardCategory;
			}
		): void {
			console.log('[DeckStore] updateCardCustomProperties called:', {
				cardName,
				customProperties
			});

			update((state) => {
				if (!state) return state;

				let cardFound = false;
				let foundCard: Card | null = null;
				let oldCategory: string | null = null;
				const updatedCards = { ...state.deck.cards };

				// Search through all categories to find the card
				for (const category of Object.keys(updatedCards)) {
					const categoryCards = updatedCards[category];
					const cardIndex = categoryCards.findIndex(c => c.name === cardName);

					if (cardIndex !== -1) {
						console.log('[DeckStore] Found card in category:', category, 'at index:', cardIndex);
						console.log('[DeckStore] Original card:', categoryCards[cardIndex]);

						foundCard = categoryCards[cardIndex];
						oldCategory = category;
						cardFound = true;
						break;
					}
				}

				if (!cardFound || !foundCard || !oldCategory) {
					console.warn(`[DeckStore] Card "${cardName}" not found in deck for custom properties update`);
					return state;
				}

				// Update the card with new custom properties
				const updatedCard = {
					...foundCard,
					...customProperties
				};

				console.log('[DeckStore] Updated card:', updatedCard);

				// Determine the new category based on updated properties
				const newCategory = inferCategory(updatedCard, state.deck);

				console.log('[DeckStore] Category change:', {
					oldCategory,
					newCategory,
					needsMove: oldCategory !== newCategory
				});

				// If category changed, move the card
				if (oldCategory !== newCategory) {
					// Remove from old category
					const oldCategoryCards = updatedCards[oldCategory];
					const cardIndex = oldCategoryCards.findIndex(c => c.name === cardName);
					updatedCards[oldCategory] = [
						...oldCategoryCards.slice(0, cardIndex),
						...oldCategoryCards.slice(cardIndex + 1)
					];

					// Add to new category
					const newCategoryCards = updatedCards[newCategory] || [];
					updatedCards[newCategory] = [...newCategoryCards, updatedCard];
				} else {
					// Same category, just update in place
					const categoryCards = updatedCards[oldCategory];
					const cardIndex = categoryCards.findIndex(c => c.name === cardName);
					updatedCards[oldCategory] = [
						...categoryCards.slice(0, cardIndex),
						updatedCard,
						...categoryCards.slice(cardIndex + 1)
					];
				}

				// Create new deck object with updated cards
				const newDeck: Deck = {
					...state.deck,
					cards: updatedCards,
					updatedAt: new Date().toISOString()
				};

				console.log('[DeckStore] Returning updated state with custom properties');

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Create a new custom category
		 */
		createCustomCategory(definition: Omit<CategoryDefinition, 'order'>): void {
			update((state) => {
				if (!state) return state;

				// Get the next order number
				const maxOrder = state.deck.customCategories
					? Math.max(...state.deck.customCategories.map((c) => c.order), -1)
					: -1;

				const newCategory: CategoryDefinition = {
					...definition,
					order: maxOrder + 1
				};

				// Add category to the deck
				const customCategories = [...(state.deck.customCategories || []), newCategory];

				// Initialize an empty array for this category in deck.cards if needed
				const updatedCards: CardsByCategory = {
					...state.deck.cards,
					[newCategory.id]: state.deck.cards[newCategory.id] || []
				};

				const newDeck: Deck = {
					...state.deck,
					customCategories,
					cards: updatedCards,
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: newDeck,
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Delete a custom category
		 * Moves all cards from the deleted category to uncategorized
		 */
		deleteCustomCategory(categoryId: string): void {
			update((state) => {
				if (!state) return state;

				// Can't delete uncategorized category
				if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
					console.warn('Cannot delete the uncategorized category');
					return state;
				}

				// Get cards from the category being deleted
				const categoryCards = state.deck.cards[categoryId] || [];

				// Move cards to uncategorized
				const uncategorizedCards = state.deck.cards[UNCATEGORIZED_CATEGORY_ID] || [];
				const updatedUncategorized = [...uncategorizedCards, ...categoryCards];

				// Remove the category
				const customCategories = (state.deck.customCategories || []).filter(
					(c) => c.id !== categoryId
				);

				// Update cards object - remove the deleted category and update uncategorized
				const updatedCards: CardsByCategory = { ...state.deck.cards };
				delete updatedCards[categoryId];
				updatedCards[UNCATEGORIZED_CATEGORY_ID] = updatedUncategorized;

				const newDeck: Deck = {
					...state.deck,
					customCategories,
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
		 * Update a custom category definition
		 */
		updateCustomCategory(
			categoryId: string,
			updates: Partial<Omit<CategoryDefinition, 'id' | 'order'>>
		): void {
			update((state) => {
				if (!state) return state;

				const categoryIndex = (state.deck.customCategories || []).findIndex(
					(c) => c.id === categoryId
				);

				if (categoryIndex === -1) {
					console.warn(`Category "${categoryId}" not found`);
					return state;
				}

				const customCategories = [...(state.deck.customCategories || [])];
				customCategories[categoryIndex] = {
					...customCategories[categoryIndex],
					...updates
				};

				const newDeck: Deck = {
					...state.deck,
					customCategories,
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: newDeck,
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Reorder custom categories
		 */
		reorderCustomCategories(categoryIds: string[]): void {
			update((state) => {
				if (!state) return state;

				// Create a map of categoryId to new order
				const orderMap = new Map(categoryIds.map((id, index) => [id, index]));

				// Update the order field for each category
				const customCategories = (state.deck.customCategories || [])
					.map((category) => ({
						...category,
						order: orderMap.get(category.id) ?? category.order
					}))
					.sort((a, b) => a.order - b.order);

				const newDeck: Deck = {
					...state.deck,
					customCategories,
					updatedAt: new Date().toISOString()
				};

				return {
					...state,
					deck: newDeck,
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Switch between default and custom categorization modes
		 */
		switchCategorizationMode(mode: CategorizationMode): void {
			update((state) => {
				if (!state) return state;

				console.log('[deck-store] switchCategorizationMode called:', {
					requestedMode: mode,
					currentMode: state.deck.categorizationMode,
					format: state.deck.format
				});

				// If already in this mode, do nothing
				if (state.deck.categorizationMode === mode) {
					console.log('[deck-store] Already in mode:', mode);
					return state;
				}

				const formatService = getFormatService(state.deck.format);

				// Get all default format categories
				const defaultCategories = formatService.getAllCategories();

				// Separate zone categories (commander, companion) from customizable cards
				const zoneCategoryCards: Record<string, Card[]> = {};
				const customizableCards: Card[] = [];

				for (const [category, categoryCards] of Object.entries(state.deck.cards)) {
					// Check if this is a zone category (commander, companion)
					// Zone categories have card limits (maxCards) and should be preserved
					const categoryDef = formatService.getCategory(category);
					const isZoneCategory = categoryDef && (categoryDef.isRequired || categoryDef.maxCards !== undefined);

					if (isZoneCategory) {
						// This is a zone category - preserve it (commander, companion)
						zoneCategoryCards[category] = categoryCards;
					} else {
						// This is a type category or custom category - cards can be reorganized
						customizableCards.push(...categoryCards);
					}
				}

				let updatedCards: CardsByCategory;
				let customCategories = state.deck.customCategories;

				if (mode === 'custom') {
					// Switching to custom mode - move customizable cards to uncategorized
					// Initialize custom categories if not present
					if (!customCategories || customCategories.length === 0) {
						customCategories = [];
					}

					// Create card structure with BOTH default categories (for validation) AND custom categories
					// First, initialize all default categories as empty
					updatedCards = formatService.createEmptyCardsByCategory();

					// Then add custom categories
					for (const cat of customCategories) {
						updatedCards[cat.id] = [];
					}

					// Add uncategorized if not already present
					if (!updatedCards[UNCATEGORIZED_CATEGORY_ID]) {
						updatedCards[UNCATEGORIZED_CATEGORY_ID] = [];
					}

					// Move customizable cards to uncategorized
					updatedCards[UNCATEGORIZED_CATEGORY_ID] = customizableCards;

					// Preserve all zone category cards (commander, companion)
					for (const [category, cards] of Object.entries(zoneCategoryCards)) {
						updatedCards[category] = cards;
					}
				} else {
					// Switching to default mode - recategorize customizable cards by type/color
					updatedCards = formatService.createEmptyCardsByCategory();

					// Preserve all zone category cards (commander, companion)
					for (const [category, cards] of Object.entries(zoneCategoryCards)) {
						updatedCards[category] = cards;
					}

					// Recategorize customizable cards using default logic
					for (const card of customizableCards) {
						const category = formatService.categorizeCard(card, 'default');
						if (!updatedCards[category]) {
							updatedCards[category] = [];
						}
						updatedCards[category].push(card);
					}
				}

				const newDeck: Deck = {
					...state.deck,
					categorizationMode: mode,
					customCategories,
					cards: updatedCards,
					cardCount: calculateTotalCards(updatedCards),
					updatedAt: new Date().toISOString()
				};

				console.log('[deck-store] switchCategorizationMode complete:', {
					newMode: newDeck.categorizationMode,
					customCategoriesCount: customCategories?.length || 0,
					cardCategories: Object.keys(updatedCards),
					uncategorizedCount: updatedCards[UNCATEGORIZED_CATEGORY_ID]?.length || 0
				});

				return {
					...state,
					deck: newDeck,
					statistics: calculateStatistics(newDeck),
					hasUnsavedChanges: true
				};
			});
		},

		/**
		 * Move a card between custom categories
		 */
		moveCardToCustomCategory(
			cardName: string,
			fromCategoryId: string,
			toCategoryId: string
		): void {
			update((state) => {
				if (!state) return state;

				// Can't move to the same category
				if (fromCategoryId === toCategoryId) return state;

				// Find the card in the source category
				const fromCards = state.deck.cards[fromCategoryId] || [];
				const cardIndex = fromCards.findIndex((c) => c.name === cardName);

				if (cardIndex === -1) {
					console.warn(`Card "${cardName}" not found in category "${fromCategoryId}"`);
					return state;
				}

				const card = fromCards[cardIndex];

				// Remove from source category
				const updatedFromCards = [
					...fromCards.slice(0, cardIndex),
					...fromCards.slice(cardIndex + 1)
				];

				// Add to target category (check for duplicates and merge quantities)
				const toCards = state.deck.cards[toCategoryId] || [];
				const existingIndex = toCards.findIndex((c) => c.name === cardName);

				let updatedToCards: Card[];
				if (existingIndex !== -1) {
					// Card already exists in target - merge quantities
					updatedToCards = [
						...toCards.slice(0, existingIndex),
						{
							...toCards[existingIndex],
							quantity: toCards[existingIndex].quantity + card.quantity
						},
						...toCards.slice(existingIndex + 1)
					];
				} else {
					// New card in target category
					updatedToCards = [...toCards, card];
				}

				// Update cards object
				const updatedCards: CardsByCategory = {
					...state.deck.cards,
					[fromCategoryId]: updatedFromCards,
					[toCategoryId]: updatedToCards
				};

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
function inferCategory(card: Card, deck: Deck): string {
	// Get the format service for the deck's format
	const formatService = getFormatService(deck.format);

	// Use the format service to categorize the card
	const categorizationMode = deck.categorizationMode || 'default';
	const category = formatService.categorizeCard(card, categorizationMode);

	console.log('[inferCategory]:', {
		cardName: card.name,
		deckFormat: deck.format,
		categorizationMode,
		inferredCategory: category,
		colorIdentity: card.colorIdentity,
		types: card.types
	});

	return category;
}

/**
 * Calculate total cards in categorized deck
 */
function calculateTotalCards(cards: CardsByCategory): number {
	let total = 0;
	for (const categoryCards of Object.values(cards)) {
		for (const card of categoryCards) {
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
