/**
 * Cube format ruleset
 * Cubes have minimal restrictions - they're custom draft environments
 */

import { BaseRuleset } from './base-ruleset';
import { DeckFormat } from '../format-registry';
import type { Deck, DeckValidationResult } from '$lib/types/deck';
import type { Card, ValidationWarning, ValidationWarningType } from '$lib/types/card';

export class CubeRuleset extends BaseRuleset {
	format = DeckFormat.Cube;
	minDeckSize = 0; // No minimum for Cube
	maxDeckSize = null; // No maximum
	exactDeckSize = null; // No exact size required
	maxCopiesPerCard = null; // No limit on copies (can have multiple of same card)
	allowsUnlimitedBasicLands = true;
	hasCommandZone = false;
	hasCompanionZone = false;
	hasSideboard = false;

	validateDeck(deck: Deck): DeckValidationResult {
		const warnings: ValidationWarning[] = [];

		// Cubes have minimal validation
		// No deck size requirements
		// No card limit requirements
		// No commander requirements
		// No color identity requirements

		// Only check for banned cards (if any)
		warnings.push(...this.validateBannedCards(deck));

		// Determine if deck is valid (only errors matter)
		const isValid = warnings.filter((w) => w.severity === 'error').length === 0;

		return {
			isValid,
			warnings,
			commanderCount: 0, // N/A for Cube
			mainDeckSize: deck.cardCount,
			colorIdentityValid: true // N/A for Cube
		};
	}

	validateCardAddition(deck: Deck, card: Card): ValidationWarning | null {
		// Check if card is banned
		if (this.validateBannedCards({ ...deck, cards: { ...deck.cards, temp: [card] } }).length > 0) {
			return {
				type: 'banned' as ValidationWarningType,
				message: `${card.name} is banned in Cube format`,
				cardName: card.name,
				severity: 'error'
			};
		}

		// No other restrictions for Cube
		return null;
	}
}
