/**
 * Deck Serialization Utilities
 * Converts between Deck objects and archive format for storage
 */

import type { Deck, DeckManifest } from '$lib/types/deck';
import type { Maybeboard } from '$lib/types/maybeboard';
import type { Card } from '$lib/types/card';
import { serializePlaintext, parsePlaintext } from './decklist-parser';
import { CardCategory } from '$lib/types/card';
import type { DeckArchive } from './zip';

/**
 * Convert a Deck to plaintext decklist
 */
export function serializeDeck(deck: Deck, includeSetCodes = true): string {
	const allCards: Card[] = [];

	// Add cards in canonical order
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
		const cards = deck.cards[category] || [];
		allCards.push(...cards);
	}

	return serializePlaintext(allCards, includeSetCodes);
}

/**
 * Parse plaintext decklist and categorize cards
 */
export function deserializeDeck(text: string): Record<CardCategory, Card[]> {
	const parseResult = parsePlaintext(text);

	// Initialize categorized structure
	const categorized: Record<CardCategory, Card[]> = {
		[CardCategory.Commander]: [],
		[CardCategory.Companion]: [],
		[CardCategory.Planeswalker]: [],
		[CardCategory.Creature]: [],
		[CardCategory.Instant]: [],
		[CardCategory.Sorcery]: [],
		[CardCategory.Artifact]: [],
		[CardCategory.Enchantment]: [],
		[CardCategory.Land]: [],
		[CardCategory.Other]: []
	};

	// For now, put all parsed cards in "Other" category
	// TODO: Fetch card data from Scryfall to properly categorize
	categorized[CardCategory.Other] = parseResult.cards;

	return categorized;
}

/**
 * Create a DeckArchive from a Deck and DeckManifest
 */
export function createDeckArchive(
	deck: Deck,
	manifest: DeckManifest,
	maybeboard: Maybeboard,
	versionContent: string
): DeckArchive {
	// Create versions structure with the current version
	const versions: Record<string, Record<string, string>> = {
		[deck.currentBranch]: {
			[`v${deck.currentVersion}.txt`]: versionContent
		}
	};

	return {
		manifest,
		maybeboard,
		versions
	};
}

/**
 * Extract deck data from a DeckArchive
 */
export function extractDeckFromArchive(archive: DeckArchive): {
	deck: Deck;
	manifest: DeckManifest;
	maybeboard: Maybeboard;
	versionContent: string;
} {
	const { manifest, maybeboard, versions } = archive;

	// Get current branch and version
	const currentBranch = manifest.currentBranch;
	const currentVersion = manifest.currentVersion;
	const branchData = manifest.branches.find((b) => b.name === currentBranch);

	if (!branchData) {
		throw new Error(`Branch ${currentBranch} not found in manifest`);
	}

	// Get version content
	const branchVersions = versions[currentBranch] || {};
	const versionFile = `v${currentVersion}.txt`;
	const versionContent = branchVersions[versionFile] || '';

	// Parse the decklist
	const cards = deserializeDeck(versionContent);

	// Calculate total card count
	let cardCount = 0;
	for (const categoryCards of Object.values(cards)) {
		for (const card of categoryCards) {
			cardCount += card.quantity;
		}
	}

	// Create Deck object
	const deck: Deck = {
		name: manifest.name,
		format: 'commander',
		cards,
		cardCount,
		colorIdentity: [], // TODO: Calculate from cards
		currentBranch: manifest.currentBranch,
		currentVersion: manifest.currentVersion,
		createdAt: manifest.createdAt,
		updatedAt: manifest.updatedAt
	};

	return {
		deck,
		manifest,
		maybeboard,
		versionContent
	};
}
