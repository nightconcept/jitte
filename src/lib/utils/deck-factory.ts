/**
 * Factory functions for creating new deck structures
 */

import type { Deck, DeckManifest } from '$lib/types/deck';
import type { Card, CardCategory, CategorizedCards } from '$lib/types/card';
import type { BranchMetadata } from '$lib/types/version';

/**
 * Create an empty categorized cards structure
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
 * Create a new empty deck
 */
export function createEmptyDeck(name: string, commander?: Card): Deck {
	const now = new Date().toISOString();
	const cards = createEmptyCategorizedCards();

	// Add commander if provided
	if (commander) {
		cards.commander = [{ ...commander, quantity: 1 }];
	}

	return {
		name,
		cards,
		cardCount: commander ? 1 : 0,
		format: 'commander',
		colorIdentity: commander?.colorIdentity || [],
		currentBranch: 'main',
		currentVersion: 'unsaved',
		createdAt: now,
		updatedAt: now
	};
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
		format: 'commander',
		createdAt: deck.createdAt,
		updatedAt: deck.updatedAt,
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
