/**
 * Card Reference Conversion Utilities
 *
 * Handles conversion between full Card objects and slim CardReference objects.
 * CardReference is used for storage, Card is used for UI rendering.
 */

import type { Card, CardsByCategory, ManaColor, CubeCardCategory } from '$lib/types/card';
import type {
	CardReference,
	CardReferencesByCategory,
	CardReferencePlaceholder
} from '$lib/types/card-reference';
import type { ScryfallCard } from '$lib/types/scryfall';
import { scryfallToCard } from './card-converter';

/**
 * Convert a full Card object to a slim CardReference
 * Only extracts the essential fields needed for storage
 */
export function cardToReference(card: Card): CardReference {
	const ref: CardReference = {
		scryfallId: card.scryfallId || '',
		quantity: card.quantity,
		setCode: card.setCode || '',
		collectorNumber: card.collectorNumber || ''
	};

	// Include Cube overrides if present
	if (card.customCmc !== undefined) {
		ref.customCmc = card.customCmc;
	}
	if (card.customColorIdentity !== undefined && card.customColorIdentity.length > 0) {
		ref.customColorIdentity = card.customColorIdentity as string[];
	}
	if (card.customCategory !== undefined) {
		ref.customCategory = card.customCategory;
	}

	return ref;
}

/**
 * Convert a CardReference back to a full Card using Scryfall data
 * @param ref - The slim reference
 * @param scryfallCard - Full card data from Scryfall cache
 * @returns Full Card object
 */
export function referenceToCard(ref: CardReference, scryfallCard: ScryfallCard): Card {
	// Use the existing scryfallToCard converter
	const card = scryfallToCard(scryfallCard, ref.quantity, {
		setCode: ref.setCode,
		collectorNumber: ref.collectorNumber
	});

	// Apply Cube overrides
	if (ref.customCmc !== undefined) {
		card.customCmc = ref.customCmc;
	}
	if (ref.customColorIdentity !== undefined) {
		card.customColorIdentity = ref.customColorIdentity as ManaColor[];
	}
	if (ref.customCategory !== undefined) {
		card.customCategory = ref.customCategory as CubeCardCategory;
	}

	return card;
}

/**
 * Create a placeholder card when hydration fails
 * Used when a card can't be found in Scryfall (deleted, renamed, etc.)
 */
export function createPlaceholderCard(
	ref: CardReference,
	fallbackName: string,
	error: string
): Card {
	return {
		name: fallbackName || `Unknown Card (${ref.scryfallId})`,
		quantity: ref.quantity,
		setCode: ref.setCode,
		collectorNumber: ref.collectorNumber,
		scryfallId: ref.scryfallId,
		// Mark as placeholder with error
		types: [],
		imageUrls: undefined,
		// Store error info in a way components can detect
		oracleText: `[Error: ${error}]`,
		// Apply overrides even for placeholders
		customCmc: ref.customCmc,
		customColorIdentity: ref.customColorIdentity as ManaColor[] | undefined,
		customCategory: ref.customCategory as CubeCardCategory | undefined
	};
}

/**
 * Convert all cards in a deck from full Card objects to slim CardReferences
 */
export function cardsToReferences(cards: CardsByCategory): CardReferencesByCategory {
	const refs: CardReferencesByCategory = {};

	for (const [category, categoryCards] of Object.entries(cards)) {
		refs[category] = categoryCards.map(cardToReference);
	}

	return refs;
}

/**
 * Convert all CardReferences back to full Card objects
 * @param refs - The slim references by category
 * @param scryfallCache - Map of scryfallId -> ScryfallCard from cache
 * @param fallbackNames - Map of scryfallId -> card name for placeholder generation
 * @returns Object with hydrated cards and any errors
 */
export function referencesToCards(
	refs: CardReferencesByCategory,
	scryfallCache: Map<string, ScryfallCard>,
	fallbackNames?: Map<string, string>
): {
	cards: CardsByCategory;
	errors: Array<{ ref: CardReference; error: string }>;
} {
	const cards: CardsByCategory = {};
	const errors: Array<{ ref: CardReference; error: string }> = [];

	for (const [category, categoryRefs] of Object.entries(refs)) {
		cards[category] = [];

		for (const ref of categoryRefs) {
			const scryfallCard = scryfallCache.get(ref.scryfallId);

			if (scryfallCard) {
				cards[category].push(referenceToCard(ref, scryfallCard));
			} else {
				// Card not in cache - create placeholder
				const fallbackName = fallbackNames?.get(ref.scryfallId) || '';
				const error = 'Card not found in Scryfall cache';
				cards[category].push(createPlaceholderCard(ref, fallbackName, error));
				errors.push({ ref, error });
			}
		}
	}

	return { cards, errors };
}

/**
 * Extract all unique scryfall IDs from card references
 * Used to determine which cards need to be fetched from Scryfall
 */
export function extractScryfallIds(refs: CardReferencesByCategory): string[] {
	const ids = new Set<string>();

	for (const categoryRefs of Object.values(refs)) {
		for (const ref of categoryRefs) {
			if (ref.scryfallId) {
				ids.add(ref.scryfallId);
			}
		}
	}

	return Array.from(ids);
}

/**
 * Check if a CardReference has valid identification
 */
export function isValidReference(ref: CardReference): boolean {
	return !!(ref.scryfallId && ref.setCode && ref.collectorNumber);
}

/**
 * Compare two CardReferences for equality (same card, same printing)
 */
export function referencesEqual(a: CardReference, b: CardReference): boolean {
	return (
		a.scryfallId === b.scryfallId &&
		a.setCode === b.setCode &&
		a.collectorNumber === b.collectorNumber
	);
}

/**
 * Create a unique key for a CardReference (for Maps/Sets)
 */
export function referenceKey(ref: CardReference): string {
	return `${ref.scryfallId}:${ref.setCode}:${ref.collectorNumber}`;
}

/**
 * Count total cards across all categories
 */
export function countReferences(refs: CardReferencesByCategory): number {
	let count = 0;
	for (const categoryRefs of Object.values(refs)) {
		for (const ref of categoryRefs) {
			count += ref.quantity;
		}
	}
	return count;
}

/**
 * Merge two CardReferencesByCategory objects
 * Cards with same reference key have quantities summed
 */
export function mergeReferences(
	a: CardReferencesByCategory,
	b: CardReferencesByCategory
): CardReferencesByCategory {
	const result: CardReferencesByCategory = {};

	// Start with all categories from a
	for (const [category, refs] of Object.entries(a)) {
		result[category] = [...refs];
	}

	// Add/merge cards from b
	for (const [category, refs] of Object.entries(b)) {
		if (!result[category]) {
			result[category] = [];
		}

		for (const ref of refs) {
			const existingIndex = result[category].findIndex((r) => referencesEqual(r, ref));
			if (existingIndex >= 0) {
				// Sum quantities
				result[category][existingIndex] = {
					...result[category][existingIndex],
					quantity: result[category][existingIndex].quantity + ref.quantity
				};
			} else {
				result[category].push({ ...ref });
			}
		}
	}

	return result;
}
