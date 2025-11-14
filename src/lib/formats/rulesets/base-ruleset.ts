/**
 * Base ruleset with shared validation logic
 */

import type { FormatRuleset } from '../ruleset';
import type { Deck, DeckValidationResult } from '$lib/types/deck';
import type { Card, ValidationWarning, ValidationWarningType } from '$lib/types/card';
import { BanListService } from '../ban-list-service';
import type { DeckFormat } from '../format-registry';

export abstract class BaseRuleset implements FormatRuleset {
	abstract format: DeckFormat;
	abstract minDeckSize: number;
	abstract maxDeckSize: number | null;
	abstract exactDeckSize: number | null;
	abstract maxCopiesPerCard: number | null;
	abstract allowsUnlimitedBasicLands: boolean;
	abstract hasCommandZone: boolean;
	abstract hasCompanionZone: boolean;
	abstract hasSideboard: boolean;

	abstract validateDeck(deck: Deck): DeckValidationResult;
	abstract validateCardAddition(deck: Deck, card: Card): ValidationWarning | null;

	// Shared validation helpers

	/**
	 * Validate that no banned cards are in the deck
	 */
	protected validateBannedCards(deck: Deck): ValidationWarning[] {
		const warnings: ValidationWarning[] = [];

		for (const category of Object.values(deck.cards)) {
			for (const card of category) {
				if (BanListService.isCardBanned(card, this.format)) {
					warnings.push({
						type: 'banned' as ValidationWarningType,
						message: `${card.name} is banned in ${this.format}`,
						cardName: card.name,
						severity: 'error'
					});
				}
			}
		}

		return warnings;
	}

	/**
	 * Validate deck size according to format rules
	 */
	protected validateDeckSize(deck: Deck): ValidationWarning[] {
		const warnings: ValidationWarning[] = [];

		if (this.exactDeckSize !== null) {
			if (deck.cardCount !== this.exactDeckSize) {
				warnings.push({
					type: 'deck_size' as ValidationWarningType,
					message: `Deck must have exactly ${this.exactDeckSize} cards (currently ${deck.cardCount})`,
					severity: deck.cardCount < this.exactDeckSize ? 'warning' : 'error'
				});
			}
		} else {
			if (deck.cardCount < this.minDeckSize) {
				warnings.push({
					type: 'deck_size' as ValidationWarningType,
					message: `Deck must have at least ${this.minDeckSize} cards (currently ${deck.cardCount})`,
					severity: 'error'
				});
			}
			if (this.maxDeckSize !== null && deck.cardCount > this.maxDeckSize) {
				warnings.push({
					type: 'deck_size' as ValidationWarningType,
					message: `Deck cannot have more than ${this.maxDeckSize} cards (currently ${deck.cardCount})`,
					severity: 'error'
				});
			}
		}

		return warnings;
	}

	/**
	 * Validate card copy limits (4-of rule for constructed, singleton for Commander)
	 */
	protected validateCardCopies(deck: Deck): ValidationWarning[] {
		const warnings: ValidationWarning[] = [];

		if (this.maxCopiesPerCard === null) return warnings;

		const cardCounts = new Map<string, number>();
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

		for (const category of Object.values(deck.cards)) {
			for (const card of category) {
				const normalizedName = card.name.toLowerCase();

				// Skip basic lands if unlimited
				if (this.allowsUnlimitedBasicLands && basicLands.has(normalizedName)) {
					continue;
				}

				// Skip if card has "Basic" in types
				if (card.types?.some((t: string) => t.toLowerCase() === 'basic')) {
					continue;
				}

				cardCounts.set(card.name, (cardCounts.get(card.name) || 0) + card.quantity);
			}
		}

		for (const [name, count] of cardCounts) {
			if (count > this.maxCopiesPerCard) {
				warnings.push({
					type: 'duplicate' as ValidationWarningType,
					message: `${name}: ${count} copies (max ${this.maxCopiesPerCard} allowed)`,
					cardName: name,
					severity: 'error'
				});
			}
		}

		return warnings;
	}
}
