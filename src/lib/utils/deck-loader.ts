/**
 * Utility for loading decks from plaintext files
 * Parses plaintext and enriches with Scryfall data
 */

import { parsePlaintext } from './decklist-parser';
import { cardService } from '$lib/api/card-service';
import type { Card } from '$lib/types/card';
import { CardCategory } from '$lib/types/card';
import type { Deck } from '$lib/types/deck';
import { scryfallToCard } from './card-converter';
import { DeckFormat } from '$lib/formats/format-registry';

/**
 * Load a deck from plaintext content
 * @param text - Plaintext decklist content
 * @param deckName - Name for the deck
 * @param format - Deck format (defaults to Commander)
 * @returns Deck object with enriched card data
 */
export async function loadDeckFromPlaintext(
	text: string,
	deckName: string,
	format: DeckFormat = DeckFormat.Commander
): Promise<Deck> {
	const parseResult = parsePlaintext(text);

	// Log any parse errors
	if (parseResult.errors.length > 0) {
		console.warn('Parse errors:', parseResult.errors);
	}

	// Enrich cards with Scryfall data
	const enrichedCards: Card[] = [];

	for (const card of parseResult.cards) {
		try {
			// Fetch card data from Scryfall
			const scryfallCard = await cardService.getCardByName(card.name);

			if (scryfallCard) {
				// Convert Scryfall card to our Card type
				const enrichedCard = scryfallToCard(scryfallCard, card.quantity, {
					setCode: card.setCode,
					collectorNumber: card.collectorNumber
				});
				enrichedCards.push(enrichedCard);
			} else {
				// Fallback: use basic card data if Scryfall lookup fails
				console.warn(`Failed to fetch data for card: ${card.name}`);
				enrichedCards.push(card);
			}
		} catch (error) {
			console.error(`Error enriching card ${card.name}:`, error);
			enrichedCards.push(card);
		}
	}

	// Categorize cards
	const categorizedCards = categorizeDeckCards(enrichedCards);

	// Calculate color identity from commander
	const commanderColors = new Set<string>();
	for (const commander of categorizedCards[CardCategory.Commander]) {
		if (commander.colorIdentity) {
			commander.colorIdentity.forEach(color => commanderColors.add(color));
		}
	}

	// Create deck object
	const deck: Deck = {
		name: deckName,
		cards: categorizedCards,
		cardCount: enrichedCards.reduce((sum, c) => sum + c.quantity, 0),
		format,
		colorIdentity: Array.from(commanderColors),
		currentBranch: 'main',
		currentVersion: '1.0.0',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	return deck;
}

/**
 * Categorize cards by type
 */
function categorizeDeckCards(cards: Card[]) {
	const categorized = {
		[CardCategory.Commander]: [] as Card[],
		[CardCategory.Companion]: [] as Card[],
		[CardCategory.Planeswalker]: [] as Card[],
		[CardCategory.Creature]: [] as Card[],
		[CardCategory.Instant]: [] as Card[],
		[CardCategory.Sorcery]: [] as Card[],
		[CardCategory.Artifact]: [] as Card[],
		[CardCategory.Enchantment]: [] as Card[],
		[CardCategory.Land]: [] as Card[],
		[CardCategory.Other]: [] as Card[]
	};

	// Separate commanders (look for legendary creatures at the end, or cards with "Kenrith" etc.)
	// For simplicity, we'll check if it's a legendary creature
	for (const card of cards) {
		const types = card.types || [];
		const typesLower = types.map(t => t.toLowerCase());

		// Check for commander (legendary creature or specific commander types)
		if (card.oracleText?.includes('can be your commander') ||
		    (typesLower.includes('legendary') && typesLower.includes('creature'))) {
			categorized[CardCategory.Commander].push(card);
		}
		// Check for companion
		else if (card.oracleText?.includes('Companion')) {
			categorized[CardCategory.Companion].push(card);
		}
		// Categorize by primary type
		else if (typesLower.includes('planeswalker')) {
			categorized[CardCategory.Planeswalker].push(card);
		} else if (typesLower.includes('creature')) {
			categorized[CardCategory.Creature].push(card);
		} else if (typesLower.includes('instant')) {
			categorized[CardCategory.Instant].push(card);
		} else if (typesLower.includes('sorcery')) {
			categorized[CardCategory.Sorcery].push(card);
		} else if (typesLower.includes('artifact')) {
			categorized[CardCategory.Artifact].push(card);
		} else if (typesLower.includes('enchantment')) {
			categorized[CardCategory.Enchantment].push(card);
		} else if (typesLower.includes('land')) {
			categorized[CardCategory.Land].push(card);
		} else {
			categorized[CardCategory.Other].push(card);
		}
	}

	return categorized;
}
