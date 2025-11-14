/**
 * Format ruleset interface - defines validation rules for each format
 */

import type { Deck, DeckValidationResult } from '$lib/types/deck';
import type { Card, ValidationWarning } from '$lib/types/card';
import type { DeckFormat } from './format-registry';

export interface FormatRuleset {
	format: DeckFormat;

	// Deck construction rules
	minDeckSize: number;
	maxDeckSize: number | null; // null = no maximum
	exactDeckSize: number | null; // For Commander (100)

	// Card copy rules
	maxCopiesPerCard: number | null; // 4 for Standard/Modern, 1 for Commander
	allowsUnlimitedBasicLands: boolean;

	// Special zones
	hasCommandZone: boolean;
	hasCompanionZone: boolean;
	hasSideboard: boolean;
	sideboardSize?: { min: number; max: number };

	// Validation
	validateDeck(deck: Deck): DeckValidationResult;
	validateCardAddition(deck: Deck, card: Card): ValidationWarning | null;
}
