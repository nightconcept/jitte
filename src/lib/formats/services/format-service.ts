/**
 * Format service interface
 * Provides format-specific operations for deck management
 */

import type { Card, CategoryDefinition, CategorySchema, CardsByCategory } from '$lib/types/card';
import type { Deck, DeckStatistics } from '$lib/types/deck';
import type { DeckFormat } from '$lib/formats/format-registry';

/**
 * Abstract interface for format-specific operations
 * Each format (Commander, Cube, Standard, Modern) has its own implementation
 */
export interface FormatService {
	/** Format identifier */
	readonly format: DeckFormat;

	/**
	 * Get the default category schema for this format
	 * Returns the standard categories (type-based for Commander, color-based for Cube)
	 */
	getCategorySchema(): CategorySchema;

	/**
	 * Get a specific category definition by ID
	 */
	getCategory(categoryId: string): CategoryDefinition | undefined;

	/**
	 * Get all categories for this format
	 */
	getAllCategories(): CategoryDefinition[];

	/**
	 * Get categories sorted by display order
	 */
	getCategoriesInDisplayOrder(): CategoryDefinition[];

	/**
	 * Categorize a single card according to format rules
	 * Returns the category ID where this card should be placed
	 *
	 * @param card - The card to categorize
	 * @param mode - 'default' for automatic categorization, 'custom' returns uncategorized
	 */
	categorizeCard(card: Card, mode: 'default' | 'custom'): string;

	/**
	 * Categorize multiple cards at once
	 * Returns a CardsByCategory object with all cards organized
	 *
	 * @param cards - Array of cards to categorize
	 * @param mode - 'default' for automatic categorization, 'custom' puts all in uncategorized
	 */
	categorizeCards(cards: Card[], mode: 'default' | 'custom'): CardsByCategory;

	/**
	 * Calculate format-specific statistics for a deck
	 * Different formats have different stat requirements
	 * (e.g., Commander has brackets/salt, Cube doesn't)
	 */
	calculateStatistics(deck: Deck): Promise<DeckStatistics>;

	/**
	 * Create an empty deck for this format
	 */
	createEmptyDeck(name: string): Deck;

	/**
	 * Create an empty CardsByCategory structure with all categories initialized
	 *
	 * @param customCategories - Optional custom category definitions (for custom mode)
	 */
	createEmptyCardsByCategory(customCategories?: CategoryDefinition[]): CardsByCategory;

	/**
	 * Get the label for a category ID
	 */
	getCategoryLabel(categoryId: string): string;

	/**
	 * Get the icon class for a category ID
	 */
	getCategoryIcon(categoryId: string): string | undefined;

	/**
	 * Check if a category is required (must have at least minCards)
	 */
	isCategoryRequired(categoryId: string): boolean;

	/**
	 * Get maximum allowed cards for a category
	 */
	getMaxCardsForCategory(categoryId: string): number | undefined;
}
