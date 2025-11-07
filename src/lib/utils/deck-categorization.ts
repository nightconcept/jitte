/**
 * Card categorization utilities
 */

import type { Deck } from '$lib/types/deck';
import type { Card, CategorizedCards } from '$lib/types/card';
import { CardCategory } from '$lib/types/card';

/**
 * Categorize a deck's cards by type
 * This ensures cards are in the correct category based on their types
 */
export function categorizeDeck(cards: Card[]): CategorizedCards {
	const categorized: CategorizedCards = {
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

	for (const card of cards) {
		const category = determineCategory(card);
		categorized[category].push(card);
	}

	return categorized;
}

/**
 * Determine the primary category for a card
 */
export function determineCategory(card: Card): CardCategory {
	if (!card.types || card.types.length === 0) {
		return CardCategory.Other;
	}

	const types = card.types.map((t) => t.toLowerCase());

	// Priority order for multi-type cards
	if (types.includes('planeswalker')) return CardCategory.Planeswalker;
	if (types.includes('creature')) return CardCategory.Creature;
	if (types.includes('instant')) return CardCategory.Instant;
	if (types.includes('sorcery')) return CardCategory.Sorcery;
	if (types.includes('artifact')) return CardCategory.Artifact;
	if (types.includes('enchantment')) return CardCategory.Enchantment;
	if (types.includes('land')) return CardCategory.Land;

	return CardCategory.Other;
}

/**
 * Get the display order for categories
 */
export function getCategoryDisplayOrder(): CardCategory[] {
	return [
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

/**
 * Get a human-readable label for a category
 */
export function getCategoryLabel(category: CardCategory): string {
	const labels: Record<CardCategory, string> = {
		[CardCategory.Commander]: 'Commander',
		[CardCategory.Companion]: 'Companion',
		[CardCategory.Planeswalker]: 'Planeswalkers',
		[CardCategory.Creature]: 'Creatures',
		[CardCategory.Instant]: 'Instants',
		[CardCategory.Sorcery]: 'Sorceries',
		[CardCategory.Artifact]: 'Artifacts',
		[CardCategory.Enchantment]: 'Enchantments',
		[CardCategory.Land]: 'Lands',
		[CardCategory.Other]: 'Other'
	};
	return labels[category];
}
