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
import { scryfallToCard } from './card-converter';

/**
 * Deck version file format (JSON)
 */
interface DeckVersionData {
	schemaVersion: string;
	lastModified: string;
	cards: Record<CardCategory, Card[]>;
}

/**
 * Convert a Deck to JSON format for storage
 */
export function serializeDeckToJSON(deck: Deck): string {
	const versionData: DeckVersionData = {
		schemaVersion: '1.0',
		lastModified: new Date().toISOString(),
		cards: deck.cards
	};

	return JSON.stringify(versionData, null, 2);
}

/**
 * Convert a Deck to plaintext decklist (for export/clipboard)
 */
export function serializeDeckToPlaintext(deck: Deck, includeSetCodes = false): string {
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
 * DEPRECATED: Use serializeDeckToJSON for storage or serializeDeckToPlaintext for export
 */
export function serializeDeck(deck: Deck, includeSetCodes = false): string {
	return serializeDeckToPlaintext(deck, includeSetCodes);
}

/**
 * Check if a card has complete metadata (doesn't need Scryfall fetch)
 */
function hasCompleteMetadata(card: Card): boolean {
	return !!(
		card.name &&
		card.types &&
		card.types.length > 0 &&
		card.scryfallId &&
		card.oracleId
	);
}

/**
 * Enrich a card with Scryfall data if needed
 */
async function enrichCard(card: Card): Promise<Card> {
	// Skip if card already has complete metadata
	if (hasCompleteMetadata(card)) {
		return card;
	}

	const { cardService } = await import('$lib/api/card-service');

	try {
		const scryfallCard = await cardService.getCardByName(card.name);

		if (scryfallCard) {
			return scryfallToCard(scryfallCard, card.quantity, {
				setCode: card.setCode,
				collectorNumber: card.collectorNumber
			});
		}
	} catch (error) {
		console.error(`Error enriching card ${card.name}:`, error);
	}

	// Return original card if enrichment failed
	return card;
}

/**
 * Parse JSON deck format
 */
export function deserializeDeckFromJSON(jsonContent: string): Record<CardCategory, Card[]> {
	try {
		const versionData = JSON.parse(jsonContent) as DeckVersionData;

		// Validate schema version
		if (versionData.schemaVersion !== '1.0') {
			console.warn(`Unknown schema version: ${versionData.schemaVersion}, attempting to parse anyway`);
		}

		return versionData.cards;
	} catch (error) {
		console.error('Failed to parse deck JSON:', error);
		throw new Error('Invalid deck JSON format');
	}
}

/**
 * Parse plaintext decklist and categorize cards
 * This is an async operation that may fetch card data from Scryfall for incomplete cards
 */
export async function deserializeDeckFromPlaintext(text: string): Promise<Record<CardCategory, Card[]>> {
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

	// Enrich cards with Scryfall data and categorize
	for (const card of parseResult.cards) {
		try {
			// Only fetch from Scryfall if card doesn't have complete metadata
			const enrichedCard = await enrichCard(card);

			// Categorize the enriched card
			const category = categorizeCard(enrichedCard);
			categorized[category].push(enrichedCard);
		} catch (error) {
			console.error(`Error processing card ${card.name}:`, error);
			categorized[CardCategory.Other].push(card);
		}
	}

	return categorized;
}

/**
 * Auto-detect format and deserialize deck
 * Supports both JSON (new format) and plaintext (legacy format)
 */
export async function deserializeDeck(content: string): Promise<Record<CardCategory, Card[]>> {
	// Try to detect if it's JSON
	const trimmed = content.trim();
	if (trimmed.startsWith('{')) {
		// JSON format - fast, no API calls
		return deserializeDeckFromJSON(content);
	} else {
		// Plaintext format - legacy, requires API calls
		console.log('Loading legacy plaintext deck format, fetching card data from Scryfall...');
		return deserializeDeckFromPlaintext(content);
	}
}

/**
 * Categorize a card based on its properties
 */
function categorizeCard(card: Card): CardCategory {
	const types = card.types || [];
	const typesLower = types.map(t => t.toLowerCase());

	// Check for commander (legendary creature or "can be your commander")
	if (card.oracleText?.includes('can be your commander') ||
	    (typesLower.includes('legendary') && typesLower.includes('creature'))) {
		return CardCategory.Commander;
	}

	// Check for companion
	if (card.oracleText?.toLowerCase().includes('companion')) {
		return CardCategory.Companion;
	}

	// Categorize by primary type
	if (typesLower.includes('planeswalker')) return CardCategory.Planeswalker;
	if (typesLower.includes('creature')) return CardCategory.Creature;
	if (typesLower.includes('instant')) return CardCategory.Instant;
	if (typesLower.includes('sorcery')) return CardCategory.Sorcery;
	if (typesLower.includes('artifact')) return CardCategory.Artifact;
	if (typesLower.includes('enchantment')) return CardCategory.Enchantment;
	if (typesLower.includes('land')) return CardCategory.Land;

	return CardCategory.Other;
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
	// Use .json extension for new format
	// Use manifest.currentVersion instead of deck.currentVersion because the manifest
	// has been updated by createVersion() while the deck object still has the old version
	const versions: Record<string, Record<string, string>> = {
		[deck.currentBranch]: {
			[`v${manifest.currentVersion}.json`]: versionContent
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
export async function extractDeckFromArchive(archive: DeckArchive): Promise<{
	deck: Deck;
	manifest: DeckManifest;
	maybeboard: Maybeboard;
	versionContent: string;
}> {
	const { manifest, maybeboard, versions } = archive;

	// Get current branch and version
	const currentBranch = manifest.currentBranch;
	const currentVersion = manifest.currentVersion;
	const branchData = manifest.branches.find((b) => b.name === currentBranch);

	if (!branchData) {
		throw new Error(`Branch ${currentBranch} not found in manifest`);
	}

	// Get version content - try JSON first, fallback to .txt for legacy
	const branchVersions = versions[currentBranch] || {};
	const jsonFile = `v${currentVersion}.json`;
	const txtFile = `v${currentVersion}.txt`;
	const versionContent = branchVersions[jsonFile] || branchVersions[txtFile] || '';

	if (!versionContent) {
		throw new Error(`Version ${currentVersion} not found in branch ${currentBranch}`);
	}

	// Parse the decklist (auto-detects JSON vs plaintext)
	const cards = await deserializeDeck(versionContent);

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
