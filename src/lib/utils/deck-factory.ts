/**
 * Factory functions for creating new deck structures
 */

import type { Deck, DeckManifest } from '$lib/types/deck';
import type { Card, CardCategory, CategorizedCards, ManaColor } from '$lib/types/card';
import type { BranchMetadata } from '$lib/types/version';
import { DeckFormat } from '$lib/formats/format-registry';

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
export function createEmptyDeck(
	name: string,
	format: DeckFormat = DeckFormat.Commander,
	commanders?: Card | Card[]
): Deck {
	const now = new Date().toISOString();
	const cards = createEmptyCategorizedCards();

	// Add commanders if provided
	if (commanders) {
		const commanderArray = Array.isArray(commanders) ? commanders : [commanders];
		cards.commander = commanderArray.map((c) => ({ ...c, quantity: 1 }));
	}

	const commanderCount = cards.commander.length;

	return {
		name,
		cards,
		cardCount: commanderCount,
		format,
		colorIdentity: calculateColorIdentity(cards.commander),
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
		format: deck.format,
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
