/**
 * Calculate differences between deck versions
 */

import type { Deck } from '$lib/types/deck';
import type { Card, CategorizedCards } from '$lib/types/card';
import type { VersionDiff, DiffCard } from '$lib/types/version';
import { suggestVersionBump } from './semver';

/**
 * Calculate the diff between two decks
 */
export function calculateDiff(oldDeck: Deck, newDeck: Deck): VersionDiff {
	const oldCards = flattenCards(oldDeck.cards);
	const newCards = flattenCards(newDeck.cards);

	const added: DiffCard[] = [];
	const removed: DiffCard[] = [];
	const modified: DiffCard[] = [];

	// Find added and modified cards
	for (const [name, newCard] of newCards) {
		const oldCard = oldCards.get(name);

		if (!oldCard) {
			// Card was added
			added.push({
				name,
				setCode: newCard.setCode,
				newQuantity: newCard.quantity,
				quantityDelta: newCard.quantity,
				price: newCard.price
			});
		} else if (oldCard.quantity !== newCard.quantity) {
			// Quantity changed
			modified.push({
				name,
				setCode: newCard.setCode,
				oldQuantity: oldCard.quantity,
				newQuantity: newCard.quantity,
				quantityDelta: newCard.quantity - oldCard.quantity,
				price: newCard.price
			});
		}
		// Note: Set code changes are not tracked as modifications
		// since they don't affect deck composition
	}

	// Find removed cards
	for (const [name, oldCard] of oldCards) {
		if (!newCards.has(name)) {
			removed.push({
				name,
				setCode: oldCard.setCode,
				oldQuantity: oldCard.quantity,
				quantityDelta: -oldCard.quantity,
				price: oldCard.price
			});
		}
	}

	// Calculate total changes (count quantity changes)
	const totalChanges =
		added.reduce((sum, c) => sum + (c.quantityDelta || 0), 0) +
		removed.reduce((sum, c) => sum + Math.abs(c.quantityDelta || 0), 0) +
		modified.reduce((sum, c) => sum + Math.abs(c.quantityDelta || 0), 0);

	// Suggest version bump
	const suggestedBump = suggestVersionBump(totalChanges);

	return {
		added,
		removed,
		modified,
		totalChanges,
		suggestedBump
	};
}

/**
 * Flatten categorized cards into a Map for easy comparison
 */
function flattenCards(cards: CategorizedCards): Map<string, Card> {
	const map = new Map<string, Card>();

	for (const category of Object.values(cards)) {
		for (const card of category) {
			map.set(card.name, card);
		}
	}

	return map;
}

/**
 * Calculate price difference between versions
 */
export function calculatePriceDiff(diff: VersionDiff): number {
	let total = 0;

	for (const card of diff.added) {
		if (card.price && card.quantityDelta) {
			total += card.price * card.quantityDelta;
		}
	}

	for (const card of diff.removed) {
		if (card.price && card.quantityDelta) {
			total += card.price * card.quantityDelta; // Already negative
		}
	}

	for (const card of diff.modified) {
		if (card.price && card.quantityDelta) {
			total += card.price * card.quantityDelta;
		}
	}

	return Number(total.toFixed(2));
}

/**
 * Generate a buylist from a diff (cards to purchase)
 */
export function generateBuylist(diff: VersionDiff): DiffCard[] {
	const buylist: DiffCard[] = [];

	// Include all added cards
	buylist.push(...diff.added);

	// Include cards with positive quantity changes
	for (const card of diff.modified) {
		if (card.quantityDelta && card.quantityDelta > 0) {
			buylist.push(card);
		}
	}

	return buylist.sort((a, b) => {
		// Sort by price descending
		const priceA = a.price || 0;
		const priceB = b.price || 0;
		return priceB - priceA;
	});
}

/**
 * Generate a remove list from a diff (cards to remove)
 */
export function generateRemoveList(diff: VersionDiff): DiffCard[] {
	const removeList: DiffCard[] = [];

	// Include all removed cards
	removeList.push(...diff.removed);

	// Include cards with negative quantity changes
	for (const card of diff.modified) {
		if (card.quantityDelta && card.quantityDelta < 0) {
			removeList.push({
				...card,
				quantityDelta: Math.abs(card.quantityDelta)
			});
		}
	}

	return removeList;
}

/**
 * Format diff as a git-style summary
 */
export function formatDiffSummary(diff: VersionDiff): string {
	const parts: string[] = [];

	if (diff.added.length > 0) {
		const count = diff.added.reduce((sum, c) => sum + (c.quantityDelta || 0), 0);
		parts.push(`+${count}`);
	}

	if (diff.removed.length > 0) {
		const count = diff.removed.reduce((sum, c) => sum + Math.abs(c.quantityDelta || 0), 0);
		parts.push(`-${count}`);
	}

	if (diff.modified.length > 0) {
		parts.push(`~${diff.modified.length}`);
	}

	return parts.join(' ') || 'No changes';
}

/**
 * Check if two decks are identical
 */
export function areDecksIdentical(deck1: Deck, deck2: Deck): boolean {
	const diff = calculateDiff(deck1, deck2);
	return diff.totalChanges === 0;
}
