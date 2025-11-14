/**
 * Deck validation using format-specific rulesets
 */

import type { Deck, DeckValidationResult } from '$lib/types/deck';
import type { Card, ValidationWarning } from '$lib/types/card';
import { RulesetFactory } from '$lib/formats/ruleset-factory';

/**
 * Validate a deck using its format's ruleset
 */
export function validateDeck(deck: Deck): DeckValidationResult {
	const ruleset = RulesetFactory.getRuleset(deck.format);
	return ruleset.validateDeck(deck);
}

/**
 * Validate a single card addition to a deck
 */
export function validateCardAddition(deck: Deck, card: Card): ValidationWarning | null {
	const ruleset = RulesetFactory.getRuleset(deck.format);
	return ruleset.validateCardAddition(deck, card);
}

/**
 * Check if a card is banned in a specific format
 * @deprecated Use BanListService.isCardBanned instead
 */
export function isCardBanned(card: Card): boolean {
	// Legacy function - check Commander format for backward compatibility
	if (!card.legalities?.commander) {
		return false;
	}
	return card.legalities.commander === 'banned';
}
