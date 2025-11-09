/**
 * Deck validation for Commander format
 */

import type { Deck, DeckValidationResult } from '$lib/types/deck';
import type { Card, ValidationWarning, ValidationWarningType } from '$lib/types/card';

/**
 * Validate a Commander deck
 */
export function validateDeck(deck: Deck): DeckValidationResult {
	const warnings: ValidationWarning[] = [];

	// Check commander count
	const commanderCount = deck.cards.commander.reduce((sum, card) => sum + card.quantity, 0);

	if (commanderCount === 0) {
		warnings.push({
			type: 'invalid_commander' as ValidationWarningType,
			message: 'Deck must have at least one Commander',
			severity: 'error'
		});
	} else if (commanderCount > 2) {
		warnings.push({
			type: 'invalid_commander' as ValidationWarningType,
			message: 'Deck cannot have more than 2 Commanders (Partner)',
			severity: 'error'
		});
	}

	// Check companion count
	const companionCount = deck.cards.companion.reduce((sum, card) => sum + card.quantity, 0);
	if (companionCount > 1) {
		warnings.push({
			type: 'invalid_commander' as ValidationWarningType,
			message: 'Deck can only have 1 Companion',
			severity: 'error'
		});
	}

	// Check deck size (should be 100 total including commander)
	if (deck.cardCount !== 100) {
		warnings.push({
			type: 'deck_size' as ValidationWarningType,
			message: `Deck must have exactly 100 cards (currently ${deck.cardCount})`,
			severity: deck.cardCount < 100 ? 'warning' : 'error'
		});
	}

	// Check for duplicate cards (excluding basic lands)
	const duplicates = findDuplicates(deck);
	for (const cardName of duplicates) {
		warnings.push({
			type: 'duplicate' as ValidationWarningType,
			message: `Duplicate non-basic card: ${cardName}`,
			cardName,
			severity: 'error'
		});
	}

	// Check color identity
	const colorIdentityValid = validateColorIdentity(deck);
	if (!colorIdentityValid) {
		warnings.push({
			type: 'color_identity' as ValidationWarningType,
			message: 'Some cards are outside the Commander color identity',
			severity: 'error'
		});
	}

	// Determine if deck is valid
	const isValid = warnings.filter((w) => w.severity === 'error').length === 0;

	return {
		isValid,
		warnings,
		commanderCount,
		mainDeckSize: deck.cardCount - commanderCount - companionCount,
		colorIdentityValid
	};
}

/**
 * Find duplicate non-basic cards
 */
function findDuplicates(deck: Deck): string[] {
	const cardCounts: Map<string, number> = new Map();
	const basicLands = new Set([
		'plains',
		'island',
		'swamp',
		'mountain',
		'forest',
		'wastes',
		'snow-covered plains',
		'snow-covered island',
		'snow-covered swamp',
		'snow-covered mountain',
		'snow-covered forest'
	]);

	// Count all cards
	for (const category of Object.values(deck.cards)) {
		for (const card of category) {
			const normalizedName = card.name.toLowerCase();

			// Skip basic lands
			if (basicLands.has(normalizedName)) continue;

			// Skip if card has "Basic" in types
			if (card.types?.some((t: string) => t.toLowerCase() === 'basic')) continue;

			cardCounts.set(card.name, (cardCounts.get(card.name) || 0) + card.quantity);
		}
	}

	// Find duplicates (quantity > 1)
	const duplicates: string[] = [];
	for (const [name, count] of cardCounts) {
		if (count > 1) {
			duplicates.push(name);
		}
	}

	return duplicates;
}

/**
 * Validate color identity (all cards must be within commander's identity)
 */
function validateColorIdentity(deck: Deck): boolean {
	const commanderIdentity = new Set(deck.colorIdentity);

	// If no commander, can't validate
	if (commanderIdentity.size === 0) return true;

	// Check all cards
	for (const category of Object.values(deck.cards)) {
		for (const card of category) {
			// Skip commander and companion (they define the identity)
			if (
				deck.cards.commander.includes(card) ||
				deck.cards.companion.includes(card)
			) {
				continue;
			}

			// Check if card's color identity is within commander's
			if (card.colorIdentity) {
				for (const color of card.colorIdentity) {
					if (!commanderIdentity.has(color)) {
						return false;
					}
				}
			}
		}
	}

	return true;
}

/**
 * Check if a card is banned in Commander format
 */
export function isCardBanned(card: Card): boolean {
	// Check if card has legality information
	if (!card.legalities?.commander) {
		return false;
	}

	// A card is banned if its Commander legality is 'banned'
	return card.legalities.commander === 'banned';
}

/**
 * Validate a single card addition
 */
export function validateCardAddition(
	deck: Deck,
	card: Card
): ValidationWarning | null {
	// Check color identity
	const commanderIdentity = new Set(deck.colorIdentity);
	if (card.colorIdentity && commanderIdentity.size > 0) {
		for (const color of card.colorIdentity) {
			if (!commanderIdentity.has(color)) {
				return {
					type: 'color_identity' as ValidationWarningType,
					message: `${card.name} is outside Commander's color identity`,
					cardName: card.name,
					severity: 'error'
				};
			}
		}
	}

	// Check if it would create a duplicate
	const isBasicLand = card.types?.some((t) => t.toLowerCase() === 'basic');
	if (!isBasicLand) {
		for (const category of Object.values(deck.cards)) {
			const existing = category.find((c: Card) => c.name === card.name);
			if (existing && existing.quantity >= 1) {
				return {
					type: 'duplicate' as ValidationWarningType,
					message: `${card.name} is already in the deck`,
					cardName: card.name,
					severity: 'warning'
				};
			}
		}
	}

	return null;
}
