/**
 * Commander format service implementation
 */

import type { FormatService } from './format-service';
import type {
	Card,
	CategoryDefinition,
	CategorySchema,
	CardsByCategory,
	ManaColor
} from '$lib/types/card';
import { CardCategory, UNCATEGORIZED_CATEGORY_ID } from '$lib/types/card';
import type { Deck, CommanderDeck, DeckStatistics } from '$lib/types/deck';
import { DeckFormat } from '$lib/formats/format-registry';
import {
	COMMANDER_CATEGORIES,
	COMMANDER_CATEGORY_SCHEMA,
	getCommanderCategory,
	getCommanderCategoriesInOrder
} from '../categorization/commander-categories';
import { determineCategory } from '$lib/utils/deck-categorization';
import { calculateStatistics as calculateDeckStatistics } from '$lib/utils/deck-statistics';

/**
 * Format service for Commander/EDH decks
 * Uses type-based categorization (creatures, instants, sorceries, etc.)
 */
export class CommanderFormatService implements FormatService {
	readonly format = DeckFormat.Commander;

	getCategorySchema(): CategorySchema {
		return COMMANDER_CATEGORY_SCHEMA;
	}

	getCategory(categoryId: string): CategoryDefinition | undefined {
		return getCommanderCategory(categoryId);
	}

	getAllCategories(): CategoryDefinition[] {
		return COMMANDER_CATEGORIES;
	}

	getCategoriesInDisplayOrder(): CategoryDefinition[] {
		return getCommanderCategoriesInOrder();
	}

	categorizeCard(card: Card, mode: 'default' | 'custom'): string {
		// In custom mode, all non-commander cards go to uncategorized
		if (mode === 'custom') {
			// Commanders are always categorized as commander even in custom mode
			if (card.types?.some((t) => t.toLowerCase() === 'legendary')) {
				// Could be commander, but we'll let validation handle that
				// For now, put legendary creatures in uncategorized too
			}
			return UNCATEGORIZED_CATEGORY_ID;
		}

		// In default mode, use type-based categorization
		return determineCategory(card);
	}

	categorizeCards(cards: Card[], mode: 'default' | 'custom'): CardsByCategory {
		const categorized: CardsByCategory = {};

		if (mode === 'custom') {
			// Initialize with uncategorized category
			categorized[UNCATEGORIZED_CATEGORY_ID] = [];

			// All cards go to uncategorized in custom mode
			for (const card of cards) {
				categorized[UNCATEGORIZED_CATEGORY_ID].push(card);
			}
		} else {
			// Initialize all Commander categories
			for (const cat of COMMANDER_CATEGORIES) {
				categorized[cat.id] = [];
			}

			// Categorize each card by type
			for (const card of cards) {
				const categoryId = this.categorizeCard(card, mode);
				categorized[categoryId].push(card);
			}
		}

		return categorized;
	}

	async calculateStatistics(deck: Deck): Promise<DeckStatistics> {
		// Delegate to existing statistics calculation
		// This will include Commander-specific stats like brackets, salt, combos
		return calculateDeckStatistics(deck);
	}

	createEmptyDeck(name: string): CommanderDeck {
		const now = new Date().toISOString();

		return {
			name,
			format: DeckFormat.Commander,
			cards: this.createEmptyCardsByCategory(),
			cardCount: 0,
			colorIdentity: [],
			currentBranch: 'main',
			currentVersion: '0.0.0',
			createdAt: now,
			updatedAt: now,
			categorizationMode: 'default'
		};
	}

	createEmptyCardsByCategory(customCategories?: CategoryDefinition[]): CardsByCategory {
		const categorized: CardsByCategory = {};

		if (customCategories) {
			// Initialize custom categories
			for (const cat of customCategories) {
				categorized[cat.id] = [];
			}
			// Always add uncategorized
			categorized[UNCATEGORIZED_CATEGORY_ID] = [];
		} else {
			// Initialize standard Commander categories
			for (const cat of COMMANDER_CATEGORIES) {
				categorized[cat.id] = [];
			}
		}

		return categorized;
	}

	getCategoryLabel(categoryId: string): string {
		const category = this.getCategory(categoryId);
		return category?.label || categoryId;
	}

	getCategoryIcon(categoryId: string): string | undefined {
		const category = this.getCategory(categoryId);
		return category?.icon;
	}

	isCategoryRequired(categoryId: string): boolean {
		const category = this.getCategory(categoryId);
		return category?.isRequired || false;
	}

	getMaxCardsForCategory(categoryId: string): number | undefined {
		const category = this.getCategory(categoryId);
		return category?.maxCards;
	}
}
