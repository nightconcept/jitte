/**
 * Utility for converting Scryfall cards to our internal Card type
 */

import type { Card, CardFace } from '$lib/types/card';
import type { ScryfallCard } from '$lib/types/scryfall';

/**
 * Convert a Scryfall card to our internal Card type
 *
 * IMPORTANT: This function expects ScryfallCard to already have enriched pricing
 * from cardService. Pricing fallback is handled at the API boundary (cardService),
 * not here. Do not call this with raw Scryfall API responses.
 *
 * @param scryfallCard - The Scryfall card data (with enriched pricing from cardService)
 * @param quantity - The quantity of this card (default: 1)
 * @param overrides - Optional overrides for setCode and collectorNumber
 * @returns Card object with all fields populated
 */
export function scryfallToCard(
	scryfallCard: ScryfallCard,
	quantity = 1,
	overrides?: {
		setCode?: string;
		collectorNumber?: string;
	}
): Card {
	// Extract pricing directly from the enriched ScryfallCard
	// Pricing fallback has already been applied by cardService
	const basePrice = scryfallCard.prices.usd ? parseFloat(scryfallCard.prices.usd) : undefined;
	const pricing = basePrice
		? {
				cardkingdom: basePrice * 1.05, // Card Kingdom typically 5% higher
				tcgplayer: basePrice, // TCGPlayer as baseline
				manapool: basePrice * 0.95 // Mana Pool typically 5% lower
			}
		: undefined;

	const card: Card = {
		name: scryfallCard.name,
		quantity,
		setCode: overrides?.setCode || scryfallCard.set.toUpperCase(),
		collectorNumber: overrides?.collectorNumber || scryfallCard.collector_number,
		scryfallId: scryfallCard.id,
		oracleId: scryfallCard.oracle_id,
		types: scryfallCard.type_line
			.split(/[\s—]+/)
			.filter((t) =>
				['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'].includes(
					t
				)
			),
		cmc: scryfallCard.cmc,
		manaCost: scryfallCard.mana_cost || scryfallCard.card_faces?.[0]?.mana_cost,
		colorIdentity: scryfallCard.color_identity as Card['colorIdentity'],
		oracleText: scryfallCard.oracle_text || scryfallCard.card_faces?.[0]?.oracle_text,
		keywords: scryfallCard.keywords,
		imageUrls: {
			small: scryfallCard.image_uris?.small || scryfallCard.card_faces?.[0]?.image_uris?.small,
			normal: scryfallCard.image_uris?.normal || scryfallCard.card_faces?.[0]?.image_uris?.normal,
			large: scryfallCard.image_uris?.large || scryfallCard.card_faces?.[0]?.image_uris?.large,
			png: scryfallCard.image_uris?.png || scryfallCard.card_faces?.[0]?.image_uris?.png,
			artCrop:
				scryfallCard.image_uris?.art_crop || scryfallCard.card_faces?.[0]?.image_uris?.art_crop,
			borderCrop:
				scryfallCard.image_uris?.border_crop ||
				scryfallCard.card_faces?.[0]?.image_uris?.border_crop
		},
		layout: scryfallCard.layout,
		cardFaces: scryfallCard.card_faces?.map((face) => ({
			name: face.name,
			manaCost: face.mana_cost,
			typeLine: face.type_line,
			oracleText: face.oracle_text,
			// Only include imageUrls if the face actually has image_uris
			// Adventure cards have images at the top level, not on individual faces
			imageUrls: face.image_uris
				? {
						small: face.image_uris.small,
						normal: face.image_uris.normal,
						large: face.image_uris.large,
						png: face.image_uris.png,
						artCrop: face.image_uris.art_crop,
						borderCrop: face.image_uris.border_crop
					}
				: undefined,
			colors: face.colors,
			power: face.power,
			toughness: face.toughness,
			loyalty: face.loyalty
		})),
		price: basePrice,
		prices: pricing,
		priceUpdatedAt: Date.now(),
		legalities: scryfallCard.legalities as unknown as Card['legalities']
	};

	return card;
}
