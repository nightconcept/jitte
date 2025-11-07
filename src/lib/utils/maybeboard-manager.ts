/**
 * Maybeboard management utilities
 */

import type { Maybeboard, MaybeboardCategory, CreateCategoryOptions } from '$lib/types/maybeboard';
import type { Card } from '$lib/types/card';

/**
 * Create a new maybeboard with default category
 */
export function createMaybeboard(): Maybeboard {
	const now = new Date().toISOString();
	return {
		categories: [
			{
				id: 'main',
				name: 'Main',
				cards: [],
				order: 0,
				createdAt: now,
				updatedAt: now
			}
		],
		defaultCategoryId: 'main'
	};
}

/**
 * Add a new category to the maybeboard
 */
export function addCategory(
	maybeboard: Maybeboard,
	options: CreateCategoryOptions
): Maybeboard {
	const now = new Date().toISOString();
	const maxOrder = Math.max(...maybeboard.categories.map((c) => c.order), 0);

	const newCategory: MaybeboardCategory = {
		id: generateCategoryId(options.name),
		name: options.name,
		cards: [],
		description: options.description,
		order: maxOrder + 1,
		createdAt: now,
		updatedAt: now
	};

	return {
		...maybeboard,
		categories: [...maybeboard.categories, newCategory]
	};
}

/**
 * Remove a category from the maybeboard
 */
export function removeCategory(maybeboard: Maybeboard, categoryId: string): Maybeboard {
	// Can't remove the default category
	if (categoryId === maybeboard.defaultCategoryId) {
		throw new Error('Cannot remove the default category');
	}

	return {
		...maybeboard,
		categories: maybeboard.categories.filter((c) => c.id !== categoryId)
	};
}

/**
 * Rename a category
 */
export function renameCategory(
	maybeboard: Maybeboard,
	categoryId: string,
	newName: string
): Maybeboard {
	return {
		...maybeboard,
		categories: maybeboard.categories.map((c) =>
			c.id === categoryId
				? { ...c, name: newName, updatedAt: new Date().toISOString() }
				: c
		)
	};
}

/**
 * Add a card to a maybeboard category
 */
export function addCardToMaybeboard(
	maybeboard: Maybeboard,
	categoryId: string,
	card: Card
): Maybeboard {
	const now = new Date().toISOString();

	return {
		...maybeboard,
		categories: maybeboard.categories.map((category) => {
			if (category.id !== categoryId) return category;

			// Check if card already exists
			const existingIndex = category.cards.findIndex((c) => c.name === card.name);

			if (existingIndex !== -1) {
				// Update quantity
				const updatedCards = [...category.cards];
				updatedCards[existingIndex] = {
					...updatedCards[existingIndex],
					quantity: updatedCards[existingIndex].quantity + card.quantity
				};
				return {
					...category,
					cards: updatedCards,
					updatedAt: now
				};
			} else {
				// Add new card
				return {
					...category,
					cards: [...category.cards, card],
					updatedAt: now
				};
			}
		})
	};
}

/**
 * Remove a card from a maybeboard category
 */
export function removeCardFromMaybeboard(
	maybeboard: Maybeboard,
	categoryId: string,
	cardName: string
): Maybeboard {
	const now = new Date().toISOString();

	return {
		...maybeboard,
		categories: maybeboard.categories.map((category) => {
			if (category.id !== categoryId) return category;

			return {
				...category,
				cards: category.cards.filter((c) => c.name !== cardName),
				updatedAt: now
			};
		})
	};
}

/**
 * Move a card between maybeboard categories
 */
export function moveCardBetweenCategories(
	maybeboard: Maybeboard,
	cardName: string,
	fromCategoryId: string,
	toCategoryId: string
): Maybeboard {
	// Find the card in the source category
	const sourceCategory = maybeboard.categories.find((c) => c.id === fromCategoryId);
	if (!sourceCategory) {
		throw new Error(`Category ${fromCategoryId} not found`);
	}

	const card = sourceCategory.cards.find((c) => c.name === cardName);
	if (!card) {
		throw new Error(`Card ${cardName} not found in category ${fromCategoryId}`);
	}

	// Remove from source
	let updated = removeCardFromMaybeboard(maybeboard, fromCategoryId, cardName);

	// Add to destination
	updated = addCardToMaybeboard(updated, toCategoryId, card);

	return updated;
}

/**
 * Update card quantity in maybeboard
 */
export function updateMaybeboardCardQuantity(
	maybeboard: Maybeboard,
	categoryId: string,
	cardName: string,
	newQuantity: number
): Maybeboard {
	const now = new Date().toISOString();

	return {
		...maybeboard,
		categories: maybeboard.categories.map((category) => {
			if (category.id !== categoryId) return category;

			return {
				...category,
				cards: category.cards.map((card) =>
					card.name === cardName ? { ...card, quantity: newQuantity } : card
				),
				updatedAt: now
			};
		})
	};
}

/**
 * Get a category by ID
 */
export function getCategory(
	maybeboard: Maybeboard,
	categoryId: string
): MaybeboardCategory | undefined {
	return maybeboard.categories.find((c) => c.id === categoryId);
}

/**
 * Generate a unique category ID from name
 */
function generateCategoryId(name: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	const timestamp = Date.now().toString(36);
	return `${base}-${timestamp}`;
}
