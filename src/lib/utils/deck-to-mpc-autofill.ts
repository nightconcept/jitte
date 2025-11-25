/**
 * Utility for converting deck to MPC Autofill format
 *
 * MPC Autofill format specification:
 * - Basic cards: "1x Card Name" or "4x Card Name"
 * - Split cards: Use full name as-is (e.g., "Fire // Ice")
 * - Double-faced cards: MPC Autofill handles automatically
 * - Tokens: "t:token name" (not typically in main deck)
 * - Cardbacks: "b:cardback name" (manual specification)
 *
 * @see https://mpcfill.com/
 */

import { getFormatService } from '$lib/formats/services/format-service-factory';
import type { Card } from '$lib/types/card';
import type { Deck } from '$lib/types/deck';
import type { Maybeboard } from '$lib/types/maybeboard';

/**
 * Convert a deck to MPC Autofill format
 *
 * Format: One card per line as "1x Card Name" or "4x Card Name"
 * Cards are organized by format-specific categories with blank lines between sections
 *
 * @param deck - The deck to convert
 * @param maybeboard - Optional maybeboard to include at the bottom
 * @returns Plaintext string in MPC Autofill format
 */
export function deckToMpcAutofill(deck: Deck, maybeboard?: Maybeboard): string {
	const formatService = getFormatService(deck.format);
	const categories = formatService.getCategoriesInDisplayOrder();

	// Flatten all cards from deck.cards (which is CardsByCategory)
	const allCards: Card[] = [];
	for (const categoryCards of Object.values(deck.cards)) {
		allCards.push(...categoryCards);
	}

	// Group cards by their format-specific category
	const cardsByCategory = new Map<string, Card[]>();
	for (const card of allCards) {
		const categoryId = formatService.categorizeCard(card, 'default');
		if (!cardsByCategory.has(categoryId)) {
			cardsByCategory.set(categoryId, []);
		}
		cardsByCategory.get(categoryId)!.push(card);
	}

	// Build MPC Autofill output
	const lines: string[] = [];

	// Add each category in display order
	for (const category of categories) {
		const cards = cardsByCategory.get(category.id);
		if (!cards || cards.length === 0) {
			continue; // Skip empty categories
		}

		// Sort cards alphabetically within category
		const sortedCards = [...cards].sort((a, b) => a.name.localeCompare(b.name));

		// Add cards in MPC Autofill format: "1x Card Name" or "4x Card Name"
		for (const card of sortedCards) {
			lines.push(`${card.quantity}x ${card.name}`);
		}

		// Add blank line after category (for readability)
		lines.push('');
	}

	// Add maybeboard if provided
	if (maybeboard && maybeboard.categories.length > 0) {
		// Collect all maybeboard cards from all categories
		const allMaybeboardCards: Card[] = [];
		for (const category of maybeboard.categories) {
			allMaybeboardCards.push(...category.cards);
		}

		if (allMaybeboardCards.length > 0) {
			// Sort alphabetically
			const sortedMaybeboardCards = allMaybeboardCards.sort((a, b) => a.name.localeCompare(b.name));

			// Add maybeboard cards
			for (const card of sortedMaybeboardCards) {
				lines.push(`${card.quantity}x ${card.name}`);
			}
			lines.push('');
		}
	}

	// Join with newlines and trim trailing whitespace
	return lines.join('\n').trim();
}
