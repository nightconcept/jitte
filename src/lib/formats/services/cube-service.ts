/**
 * Cube format service implementation
 */

import type { FormatService } from './format-service';
import type {
	Card,
	CategoryDefinition,
	CategorySchema,
	CardsByCategory
} from '$lib/types/card';
import { CubeCardCategory, UNCATEGORIZED_CATEGORY_ID } from '$lib/types/card';
import type { Deck, CubeDeck, DeckStatistics } from '$lib/types/deck';
import { DeckFormat } from '$lib/formats/format-registry';
import {
	CUBE_CATEGORIES,
	CUBE_CATEGORY_SCHEMA,
	getCubeCategory,
	getCubeCategoriesInOrder
} from '../categorization/cube-categories';
import { determineCubeCategory } from '$lib/utils/cube-categorization';

/**
 * Format service for Cube decks
 * Uses color-based categorization (WUBRG + colorless/multicolored/lands)
 */
export class CubeFormatService implements FormatService {
	readonly format = DeckFormat.Cube;

	getCategorySchema(): CategorySchema {
		return CUBE_CATEGORY_SCHEMA;
	}

	getCategory(categoryId: string): CategoryDefinition | undefined {
		return getCubeCategory(categoryId);
	}

	getAllCategories(): CategoryDefinition[] {
		return CUBE_CATEGORIES;
	}

	getCategoriesInDisplayOrder(): CategoryDefinition[] {
		return getCubeCategoriesInOrder();
	}

	categorizeCard(card: Card, mode: 'default' | 'custom'): string {
		// In custom mode, all cards go to uncategorized
		if (mode === 'custom') {
			return UNCATEGORIZED_CATEGORY_ID;
		}

		// In default mode, use color-based categorization
		return determineCubeCategory(card);
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
			// Initialize all Cube categories
			for (const cat of CUBE_CATEGORIES) {
				categorized[cat.id] = [];
			}

			// Categorize each card by color
			for (const card of cards) {
				const categoryId = this.categorizeCard(card, mode);
				categorized[categoryId].push(card);
			}
		}

		return categorized;
	}

	async calculateStatistics(deck: Deck): Promise<DeckStatistics> {
		// Cube has simplified statistics (no brackets, salt, or combos)
		const stats: DeckStatistics = {
			totalCards: deck.cardCount,
			manaCurve: {},
			colorDistribution: {},
			manaProduction: {},
			typeDistribution: {},
			averageCmc: 0,
			averageCmcWithLands: 0,
			medianCmc: 0,
			medianCmcWithLands: 0,
			totalManaValue: 0,
			landCount: 0,
			nonLandCount: 0,
			totalPrice: 0,
			warnings: [],
			gameChangerCount: 0,
			bracketLevel: 0 // Not applicable for Cube
		};

		// Calculate basic statistics
		let totalCmc = 0;
		let totalPrice = 0;
		const cmcValues: number[] = [];

		for (const categoryId in deck.cards) {
			const cards = deck.cards[categoryId];
			for (const card of cards) {
				// Price
				if (card.prices) {
					const cardPrice =
						card.prices.cardkingdom || card.prices.tcgplayer || card.prices.manapool || 0;
					totalPrice += cardPrice * card.quantity;
				}

				// CMC
				const cmc = card.cmc || 0;
				totalCmc += cmc * card.quantity;
				for (let i = 0; i < card.quantity; i++) {
					cmcValues.push(cmc);
				}

				// Land count
				if (card.types?.some((t) => t.toLowerCase() === 'land')) {
					stats.landCount += card.quantity;
				} else {
					stats.nonLandCount += card.quantity;
				}
			}
		}

		stats.totalPrice = totalPrice;
		stats.totalManaValue = totalCmc;
		stats.averageCmc = stats.nonLandCount > 0 ? totalCmc / stats.nonLandCount : 0;
		stats.averageCmcWithLands = stats.totalCards > 0 ? totalCmc / stats.totalCards : 0;

		// Calculate median CMC
		if (cmcValues.length > 0) {
			cmcValues.sort((a, b) => a - b);
			const mid = Math.floor(cmcValues.length / 2);
			stats.medianCmc =
				cmcValues.length % 2 === 0 ? (cmcValues[mid - 1] + cmcValues[mid]) / 2 : cmcValues[mid];
			stats.medianCmcWithLands = stats.medianCmc; // Same for Cube
		}

		return stats;
	}

	createEmptyDeck(name: string): CubeDeck {
		const now = new Date().toISOString();

		return {
			name,
			format: DeckFormat.Cube,
			cards: this.createEmptyCardsByCategory(),
			cardCount: 0,
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
			// Initialize standard Cube categories
			for (const cat of CUBE_CATEGORIES) {
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
