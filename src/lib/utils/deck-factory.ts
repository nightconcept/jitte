/**
 * Factory functions for creating new deck structures
 */

import type { Deck, DeckManifest, CommanderDeck } from '$lib/types/deck';
import type { Card, CardCategory, CategorizedCards, ManaColor } from '$lib/types/card';
import type { BranchMetadata } from '$lib/types/version';
import { DeckFormat } from '$lib/formats/format-registry';
import { getFormatService } from '$lib/formats/services/format-service-factory';

/**
 * Calculate the combined color identity from multiple commanders
 */
export function calculateColorIdentity(commanders: Card[]): ManaColor[] {
	const identitySet = new Set<ManaColor>();

	for (const commander of commanders) {
		if (commander.colorIdentity) {
			for (const color of commander.colorIdentity) {
				identitySet.add(color);
			}
		}
	}

	// Return in WUBRG order
	const wubrgOrder: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];
	return wubrgOrder.filter(color => identitySet.has(color));
}

/**
 * Create an empty categorized cards structure (legacy - use FormatService instead)
 * @deprecated Use FormatService.createEmptyCardsByCategory() instead
 */
export function createEmptyCategorizedCards(): CategorizedCards {
	return {
		commander: [],
		companion: [],
		planeswalker: [],
		creature: [],
		instant: [],
		sorcery: [],
		artifact: [],
		enchantment: [],
		land: [],
		other: []
	};
}

/**
 * Create a new empty deck using FormatService
 */
export function createEmptyDeck(
	name: string,
	format: DeckFormat = DeckFormat.Commander,
	commanders?: Card | Card[]
): Deck {
	// Use format service to create the appropriate deck type
	const formatService = getFormatService(format);
	const deck = formatService.createEmptyDeck(name);

	// Add commanders if provided (Commander format only)
	if (commanders && format === DeckFormat.Commander) {
		const commanderArray = Array.isArray(commanders) ? commanders : [commanders];
		const commanderCards = commanderArray.map((c) => ({ ...c, quantity: 1 }));

		// Add commanders to the deck
		deck.cards['commander'] = commanderCards;
		deck.cardCount = commanderCards.length;

		// Update color identity for Commander decks
		(deck as CommanderDeck).colorIdentity = calculateColorIdentity(commanderCards);
	}

	return deck;
}

/**
 * Create a new deck manifest
 */
export function createDeckManifest(deck: Deck): DeckManifest {
	const now = new Date().toISOString();

	const mainBranch: BranchMetadata = {
		name: 'main',
		versions: [],
		currentVersion: 'unsaved',
		createdAt: now,
		updatedAt: now
	};

	return {
		name: deck.name,
		format: deck.format,
		createdAt: deck.createdAt,
		updatedAt: deck.updatedAt,
		categorizationMode: deck.categorizationMode,
		customCategories: deck.customCategories,
		currentBranch: 'main',
		currentVersion: 'unsaved',
		branches: [mainBranch],
		stashes: {},
		appVersion: '0.1.0' // TODO: Get from package.json
	};
}

/**
 * Clone a deck with a new name
 */
export function cloneDeck(deck: Deck, newName: string): Deck {
	const now = new Date().toISOString();
	return {
		...deck,
		name: newName,
		createdAt: now,
		updatedAt: now,
		currentVersion: 'unsaved',
		currentBranch: 'main'
	};
}
