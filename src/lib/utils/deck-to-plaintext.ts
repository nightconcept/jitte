/**
 * Utility for converting deck to sorted plaintext with category headers
 */

import type { Deck } from '$lib/types/deck';
import type { Maybeboard } from '$lib/types/maybeboard';
import type { Card } from '$lib/types/card';
import { getFormatService } from '$lib/formats/services/format-service-factory';

/**
 * Convert a deck to categorized plaintext format
 * Outputs cards organized by format-specific categories with # headers
 *
 * Format examples:
 * - Commander/Standard/Modern: # Commander, # Creatures, # Instants, etc.
 * - Cube: # White, # Blue, # Black, etc.
 *
 * @param deck - The deck to convert
 * @param maybeboard - Optional maybeboard to include at the bottom
 * @returns Plaintext string with category headers
 */
export function deckToSortedPlaintext(deck: Deck, maybeboard?: Maybeboard): string {
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

	// Build plaintext output
	const lines: string[] = [];

	// Add each category in display order
	for (const category of categories) {
		const cards = cardsByCategory.get(category.id);
		if (!cards || cards.length === 0) {
			continue; // Skip empty categories
		}

		// Sort cards alphabetically within category
		const sortedCards = [...cards].sort((a, b) => a.name.localeCompare(b.name));

		// Add category header
		lines.push(`# ${category.label}`);

		// Add cards
		for (const card of sortedCards) {
			// Format: "1 Card Name" or "4 Card Name" (with quantity)
			if (card.quantity === 1) {
				lines.push(`1 ${card.name}`);
			} else {
				lines.push(`${card.quantity} ${card.name}`);
			}
		}

		// Add blank line after category (except for last category)
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
			const sortedMaybeboardCards = allMaybeboardCards.sort((a, b) =>
				a.name.localeCompare(b.name)
			);

			lines.push('# Maybeboard');
			for (const card of sortedMaybeboardCards) {
				if (card.quantity === 1) {
					lines.push(`1 ${card.name}`);
				} else {
					lines.push(`${card.quantity} ${card.name}`);
				}
			}
			lines.push('');
		}
	}

	// Join with newlines and trim trailing whitespace
	return lines.join('\n').trim();
}
