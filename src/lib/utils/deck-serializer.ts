/**
 * Deck Serialization Utilities
 * Converts between Deck objects and archive format for storage
 *
 * As of v2.0, uses slim CardReference format for storage (~25x smaller).
 * Backward compatible with v1.0 (full card objects).
 */

import type { Deck, DeckManifest, CommanderDeck } from '$lib/types/deck';
import { isCommanderDeck, isCubeDeck } from '$lib/types/deck';
import type { Maybeboard, MaybeboardCategory } from '$lib/types/maybeboard';
import type { Card, CardsByCategory } from '$lib/types/card';
import type { CardReferencesByCategory, MaybeboardReference, MaybeboardCategoryReference } from '$lib/types/card-reference';
import type { VersionBase } from '$lib/types/version-delta';
import { serializePlaintext, parsePlaintext } from './decklist-parser';
import { CardCategory } from '$lib/types/card';
import { getAllCubeCategories } from './cube-categorization';
import type { DeckArchive } from './zip';
import { scryfallToCard } from './card-converter';
import { DeckFormat } from '$lib/formats/format-registry';
import { cardsToReferences, cardToReference, referencesToCards } from './card-reference';
import { hydrateCardReferences, prewarmCache } from './card-hydration';

/**
 * Deck version file format (JSON) - Legacy v1.0
 */
interface DeckVersionDataV1 {
	schemaVersion: '1.0';
	lastModified: string;
	cards: CardsByCategory;
}

/**
 * Slim schema version constant
 */
const SLIM_SCHEMA_VERSION = '2.0' as const;

/**
 * Convert a Deck to JSON format for storage
 * Uses slim CardReference format (schemaVersion 2.0) for ~25x storage reduction
 */
export function serializeDeckToJSON(deck: Deck): string {
	// Convert full cards to slim references
	const refs = cardsToReferences(deck.cards);

	const versionBase: VersionBase = {
		schemaVersion: SLIM_SCHEMA_VERSION,
		version: deck.currentVersion,
		cards: refs
	};

	return JSON.stringify(versionBase, null, 2);
}

/**
 * Pre-cache cards before saving for instant hydration on load
 * Call this before serializeDeckToJSON to ensure cards are cached
 */
export async function prewarmCacheBeforeSave(deck: Deck): Promise<void> {
	await prewarmCache(deck.cards);
}

/**
 * Convert a Deck to plaintext decklist (for export/clipboard)
 */
export function serializeDeckToPlaintext(deck: Deck, includeSetCodes = false): string {
	const allCards: Card[] = [];

	// Determine which categories to use based on deck format
	let categories: string[];
	if (isCubeDeck(deck)) {
		// Cube decks use color-based categories (including land subcategories)
		categories = getAllCubeCategories();
	} else {
		// Commander/Standard/Modern use type-based categories
		categories = [
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
	}

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
 * This will re-fetch cards that have metadata but no pricing (for fallback pricing)
 */
async function enrichCard(card: Card): Promise<Card> {
	// Skip if card already has complete metadata AND pricing
	// If pricing is missing, we need to re-fetch to get fallback pricing
	if (hasCompleteMetadata(card) && card.price !== undefined) {
		return card;
	}

	const { cardService } = await import('$lib/api/card-service');

	try {
		const scryfallCard = await cardService.getCardByName(card.name);

		if (scryfallCard) {
			// Pricing already enriched by cardService (including fallback)
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
 * Check if parsed JSON is slim format (v2.0)
 */
function isSlimFormat(data: unknown): data is VersionBase {
	if (typeof data !== 'object' || data === null) return false;
	const obj = data as Record<string, unknown>;
	return obj.schemaVersion === SLIM_SCHEMA_VERSION && 'cards' in obj;
}

/**
 * Check if parsed JSON is legacy format (v1.0)
 */
function isLegacyFormat(data: unknown): data is DeckVersionDataV1 {
	if (typeof data !== 'object' || data === null) return false;
	const obj = data as Record<string, unknown>;
	// v1.0 has schemaVersion '1.0' or missing, and has 'cards' with full card objects
	return (obj.schemaVersion === '1.0' || !obj.schemaVersion) && 'cards' in obj;
}

/**
 * Parse JSON deck format (synchronous, legacy v1.0 only)
 * For slim format, use deserializeDeckFromJSONAsync instead
 * @deprecated Use deserializeDeckFromJSONAsync for new code
 */
export function deserializeDeckFromJSON(jsonContent: string): CardsByCategory {
	try {
		const parsed = JSON.parse(jsonContent);

		// Handle slim format - throw error since hydration is async
		if (isSlimFormat(parsed)) {
			throw new Error('Slim format (v2.0) requires async deserialization - use deserializeDeckFromJSONAsync');
		}

		// Handle legacy format
		if (isLegacyFormat(parsed)) {
			return parsed.cards;
		}

		// Unknown format but has cards - try to use it
		if (parsed.cards && typeof parsed.cards === 'object') {
			console.warn(`Unknown schema version: ${parsed.schemaVersion}, attempting to parse anyway`);
			return parsed.cards;
		}

		throw new Error('Invalid deck JSON format');
	} catch (error) {
		if (error instanceof Error && error.message.includes('Slim format')) {
			throw error;
		}
		console.error('Failed to parse deck JSON:', error);
		throw new Error('Invalid deck JSON format');
	}
}

/**
 * Parse JSON deck format asynchronously
 * Handles both slim (v2.0) and legacy (v1.0) formats
 */
export async function deserializeDeckFromJSONAsync(jsonContent: string): Promise<CardsByCategory> {
	try {
		const parsed = JSON.parse(jsonContent);

		// Handle slim format - hydrate CardReferences to full Cards
		if (isSlimFormat(parsed)) {
			console.log('[deserializeDeck] Slim format v2.0 detected, hydrating cards...');
			const result = await hydrateCardReferences(parsed.cards);

			if (result.errors.length > 0) {
				console.warn(`[deserializeDeck] ${result.errors.length} cards could not be hydrated`);
			}

			console.log(`[deserializeDeck] Hydration complete: ${result.stats.cachedCount} cached, ${result.stats.fetchedCount} fetched, ${result.stats.durationMs}ms`);
			return result.cards;
		}

		// Handle legacy format - cards are already full objects
		if (isLegacyFormat(parsed)) {
			console.log('[deserializeDeck] Legacy format v1.0 detected');
			return parsed.cards;
		}

		// Unknown format but has cards - try to use it
		if (parsed.cards && typeof parsed.cards === 'object') {
			console.warn(`Unknown schema version: ${parsed.schemaVersion}, attempting to parse anyway`);
			return parsed.cards;
		}

		throw new Error('Invalid deck JSON format');
	} catch (error) {
		console.error('Failed to parse deck JSON:', error);
		throw new Error('Invalid deck JSON format');
	}
}

/**
 * Parse JSON deck format and enrich cards missing pricing
 * This ensures cards get fallback pricing if their specific edition has no pricing
 */
export async function deserializeDeckFromJSONWithEnrichment(jsonContent: string): Promise<CardsByCategory> {
	// Use new async deserializer that handles both formats
	const cards = await deserializeDeckFromJSONAsync(jsonContent);

	// For slim format, hydration already fetched fresh data with pricing
	// For legacy format, check each category for cards missing pricing
	const parsed = JSON.parse(jsonContent);
	if (isLegacyFormat(parsed)) {
		for (const [category, categoryCards] of Object.entries(cards)) {
			for (let i = 0; i < categoryCards.length; i++) {
				const card = categoryCards[i];
				// If card has no pricing, re-fetch to get enriched pricing
				if (card.price === undefined) {
					console.log(`[deserializeDeckFromJSON] Enriching ${card.name} - missing pricing`);
					categoryCards[i] = await enrichCard(card);
				}
			}
		}
	}

	return cards;
}

/**
 * Parse plaintext decklist and categorize cards
 * This is an async operation that may fetch card data from Scryfall for incomplete cards
 */
export async function deserializeDeckFromPlaintext(text: string): Promise<CardsByCategory> {
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
 * JSON decks will be enriched if cards are missing pricing
 */
export async function deserializeDeck(content: string): Promise<CardsByCategory> {
	// Try to detect if it's JSON
	const trimmed = content.trim();
	if (trimmed.startsWith('{')) {
		// JSON format - enrich cards missing pricing (for fallback pricing)
		return deserializeDeckFromJSONWithEnrichment(content);
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
	const format = manifest.format || DeckFormat.Commander; // Default to Commander for old decks
	const deck: Deck = {
		name: manifest.name,
		format,
		cards,
		cardCount,
		currentBranch: manifest.currentBranch,
		currentVersion: manifest.currentVersion,
		createdAt: manifest.createdAt,
		updatedAt: manifest.updatedAt,
		categorizationMode: manifest.categorizationMode || 'default', // Default mode for backward compatibility
		customCategories: manifest.customCategories
	} as Deck;

	// Set color identity for Commander decks only
	if (isCommanderDeck(deck)) {
		(deck as CommanderDeck).colorIdentity = []; // TODO: Calculate from cards
	}

	return {
		deck,
		manifest,
		maybeboard,
		versionContent
	};
}

// ==================== Maybeboard Serialization Helpers ====================

/**
 * Convert a full Maybeboard to slim MaybeboardReference format
 * Use this when you want to store maybeboard in slim format
 */
export function maybeboardToSlim(maybeboard: Maybeboard): MaybeboardReference {
	return {
		categories: maybeboard.categories.map((cat): MaybeboardCategoryReference => ({
			id: cat.id,
			name: cat.name,
			cards: cat.cards.map(cardToReference),
			description: cat.description,
			order: cat.order,
			createdAt: cat.createdAt,
			updatedAt: cat.updatedAt
		})),
		defaultCategoryId: maybeboard.defaultCategoryId
	};
}

/**
 * Convert a single maybeboard category to slim format
 */
export function maybeboardCategoryToSlim(category: MaybeboardCategory): MaybeboardCategoryReference {
	return {
		id: category.id,
		name: category.name,
		cards: category.cards.map(cardToReference),
		description: category.description,
		order: category.order,
		createdAt: category.createdAt,
		updatedAt: category.updatedAt
	};
}

/**
 * Hydrate a slim MaybeboardReference back to full Maybeboard
 */
export async function slimMaybeboardToFull(slim: MaybeboardReference): Promise<Maybeboard> {
	// Collect all card references for batch hydration
	const allRefs: CardReferencesByCategory = {};
	for (const cat of slim.categories) {
		allRefs[cat.id] = cat.cards;
	}

	// Hydrate all cards at once
	const hydrated = await hydrateCardReferences(allRefs);

	return {
		categories: slim.categories.map((cat): MaybeboardCategory => ({
			id: cat.id,
			name: cat.name,
			cards: hydrated.cards[cat.id] || [],
			description: cat.description,
			order: cat.order,
			createdAt: cat.createdAt,
			updatedAt: cat.updatedAt
		})),
		defaultCategoryId: slim.defaultCategoryId
	};
}

/**
 * Hydrate a single slim maybeboard category
 */
export async function slimCategoryToFull(slim: MaybeboardCategoryReference): Promise<MaybeboardCategory> {
	const refs: CardReferencesByCategory = { [slim.id]: slim.cards };
	const hydrated = await hydrateCardReferences(refs);

	return {
		id: slim.id,
		name: slim.name,
		cards: hydrated.cards[slim.id] || [],
		description: slim.description,
		order: slim.order,
		createdAt: slim.createdAt,
		updatedAt: slim.updatedAt
	};
}

/**
 * Check if a maybeboard category object is in slim format
 */
export function isSlimMaybeboardCategory(category: unknown): category is MaybeboardCategoryReference {
	if (typeof category !== 'object' || category === null) return false;
	const cat = category as Record<string, unknown>;

	// Check if cards array contains CardReferences (has scryfallId but NOT full card fields like imageUrls)
	if (!Array.isArray(cat.cards) || cat.cards.length === 0) return false;

	const firstCard = cat.cards[0] as Record<string, unknown>;
	// Slim format has scryfallId but doesn't have type_line or imageUrls
	return (
		'scryfallId' in firstCard &&
		!('type_line' in firstCard) &&
		!('imageUrls' in firstCard) &&
		!('types' in firstCard)
	);
}
