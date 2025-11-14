/**
 * Commander/EDH format ruleset
 */

import { BaseRuleset } from './base-ruleset';
import { DeckFormat } from '../format-registry';
import type { Deck, DeckValidationResult } from '$lib/types/deck';
import type { Card, ValidationWarning, ValidationWarningType } from '$lib/types/card';
import { validatePartnerCompatibility } from '$lib/utils/partner-detection';

export class CommanderRuleset extends BaseRuleset {
	format = DeckFormat.Commander;
	minDeckSize = 100;
	maxDeckSize = null;
	exactDeckSize = 100;
	maxCopiesPerCard = 1;
	allowsUnlimitedBasicLands = true;
	hasCommandZone = true;
	hasCompanionZone = true;
	hasSideboard = false;

	validateDeck(deck: Deck): DeckValidationResult {
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

		// Validate partner compatibility if there are 2 commanders
		if (deck.cards.commander.length === 2) {
			const partnerWarnings = validatePartnerCompatibility(deck.cards.commander);
			warnings.push(...partnerWarnings);
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
		warnings.push(...this.validateDeckSize(deck));

		// Check for duplicate cards (excluding basic lands)
		warnings.push(...this.validateCardCopies(deck));

		// Check color identity
		const colorIdentityValid = this.validateColorIdentity(deck);
		if (!colorIdentityValid) {
			warnings.push({
				type: 'color_identity' as ValidationWarningType,
				message: 'Some cards are outside the Commander color identity',
				severity: 'error'
			});
		}

		// Check banned cards
		warnings.push(...this.validateBannedCards(deck));

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

	validateCardAddition(deck: Deck, card: Card): ValidationWarning | null {
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

	/**
	 * Validate color identity (all cards must be within commander's identity)
	 */
	private validateColorIdentity(deck: Deck): boolean {
		const commanderIdentity = new Set(deck.colorIdentity);

		// If no commander, can't validate
		if (commanderIdentity.size === 0) return true;

		// Check all cards
		for (const category of Object.values(deck.cards)) {
			for (const card of category) {
				// Skip commander and companion (they define the identity)
				if (deck.cards.commander.includes(card) || deck.cards.companion.includes(card)) {
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
}
