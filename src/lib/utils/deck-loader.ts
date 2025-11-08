/**
 * Utility for loading decks from plaintext files
 * Parses plaintext and enriches with Scryfall data
 */

import { parsePlaintext } from './decklist-parser';
import { cardService } from '$lib/api/card-service';
import type { Card } from '$lib/types/card';
import { CardCategory } from '$lib/types/card';
import type { Deck } from '$lib/types/deck';

/**
 * Load a deck from plaintext content
 * @param text - Plaintext decklist content
 * @param deckName - Name for the deck
 * @returns Deck object with enriched card data
 */
export async function loadDeckFromPlaintext(text: string, deckName: string): Promise<Deck> {
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
				enrichedCards.push({
					name: scryfallCard.name,
					quantity: card.quantity,
					setCode: card.setCode || scryfallCard.set.toUpperCase(),
					collectorNumber: card.collectorNumber || scryfallCard.collector_number,
					scryfallId: scryfallCard.id,
					oracleId: scryfallCard.oracle_id,
					types: scryfallCard.type_line.split(/[\s—]+/).filter(t =>
						['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'].includes(t)
					),
					cmc: scryfallCard.cmc,
					manaCost: scryfallCard.mana_cost || scryfallCard.card_faces?.[0]?.mana_cost,
					colorIdentity: scryfallCard.color_identity as Card['colorIdentity'],
					oracleText: scryfallCard.oracle_text || scryfallCard.card_faces?.[0]?.oracle_text,
					imageUrls: {
						small: scryfallCard.image_uris?.small || scryfallCard.card_faces?.[0]?.image_uris?.small,
						normal: scryfallCard.image_uris?.normal || scryfallCard.card_faces?.[0]?.image_uris?.normal,
						large: scryfallCard.image_uris?.large || scryfallCard.card_faces?.[0]?.image_uris?.large,
						png: scryfallCard.image_uris?.png || scryfallCard.card_faces?.[0]?.image_uris?.png,
						artCrop: scryfallCard.image_uris?.art_crop || scryfallCard.card_faces?.[0]?.image_uris?.art_crop,
						borderCrop: scryfallCard.image_uris?.border_crop || scryfallCard.card_faces?.[0]?.image_uris?.border_crop,
					},
					price: scryfallCard.prices.usd ? parseFloat(scryfallCard.prices.usd) : undefined,
					// Mock vendor pricing based on Scryfall USD price
					// TODO: Replace with real vendor API integration
					prices: scryfallCard.prices.usd ? {
						cardkingdom: parseFloat(scryfallCard.prices.usd) * 1.05, // Card Kingdom typically 5% higher
						tcgplayer: parseFloat(scryfallCard.prices.usd), // TCGPlayer as baseline
						manapool: parseFloat(scryfallCard.prices.usd) * 0.95 // Mana Pool typically 5% lower
					} : undefined,
					priceUpdatedAt: Date.now()
				});
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
		format: 'commander',
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
