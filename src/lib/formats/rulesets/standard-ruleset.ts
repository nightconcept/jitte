/**
 * Standard format ruleset
 */

import { BaseRuleset } from './base-ruleset';
import { DeckFormat } from '../format-registry';
import type { Deck, DeckValidationResult } from '$lib/types/deck';
import type { Card, ValidationWarning, ValidationWarningType } from '$lib/types/card';
import { BanListService } from '../ban-list-service';

export class StandardRuleset extends BaseRuleset {
	format = DeckFormat.Standard;
	minDeckSize = 60;
	maxDeckSize = null; // No maximum
	exactDeckSize = null;
	maxCopiesPerCard = 4;
	allowsUnlimitedBasicLands = true;
	hasCommandZone = false;
	hasCompanionZone = true;
	hasSideboard = true;
	sideboardSize = { min: 0, max: 15 };

	validateDeck(deck: Deck): DeckValidationResult {
		const warnings: ValidationWarning[] = [];

		// Validate deck size (min 60)
		warnings.push(...this.validateDeckSize(deck));

		// Validate 4-of rule
		warnings.push(...this.validateCardCopies(deck));

		// Validate banned cards
		warnings.push(...this.validateBannedCards(deck));

		// Check companion if present
		const companionCount = deck.cards.companion.reduce((sum, card) => sum + card.quantity, 0);
		if (companionCount > 1) {
			warnings.push({
				type: 'invalid_commander' as ValidationWarningType,
				message: 'Deck can only have 1 Companion',
				severity: 'error'
			});
		}

		const isValid = warnings.filter((w) => w.severity === 'error').length === 0;

		return {
			isValid,
			warnings,
			commanderCount: 0, // No commanders in Standard
			mainDeckSize: deck.cardCount - companionCount,
			colorIdentityValid: true // No color identity in Standard
		};
	}

	validateCardAddition(deck: Deck, card: Card): ValidationWarning | null {
		// Check if banned
		if (BanListService.isCardBanned(card, this.format)) {
			return {
				type: 'banned' as ValidationWarningType,
				message: `${card.name} is banned in Standard`,
				cardName: card.name,
				severity: 'error'
			};
		}

		// Check 4-of limit (excluding basic lands)
		const isBasicLand = card.types?.some((t) => t.toLowerCase() === 'basic');
		if (!isBasicLand) {
			let count = 0;
			for (const category of Object.values(deck.cards)) {
				const existing = category.find((c: Card) => c.name === card.name);
				if (existing) {
					count += existing.quantity;
				}
			}

			if (count >= 4) {
				return {
					type: 'duplicate' as ValidationWarningType,
					message: `${card.name} already has 4 copies in deck`,
					cardName: card.name,
					severity: 'error'
				};
			}
		}

		return null;
	}
}
