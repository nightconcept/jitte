/**
 * Calculate deck statistics (mana curve, color distribution, etc.)
 */

import type { Deck, DeckStatistics } from '$lib/types/deck';
import type { Card, CardCategory, ManaColor } from '$lib/types/card';
import { validateDeck } from './deck-validation';
import { countGameChangers, calculateBracketLevel } from './game-changers';

/**
 * Calculate comprehensive deck statistics
 */
export function calculateStatistics(deck: Deck): DeckStatistics {
	const allCards = getAllCards(deck);
	const uniqueCardNames = getUniqueCardNames(deck);

	// Calculate Game Changer count
	const gameChangerCount = countGameChangers(uniqueCardNames);

	// Calculate bracket level
	const bracketLevel = calculateBracketLevel(gameChangerCount);

	return {
		totalCards: deck.cardCount,
		manaCurve: calculateManaCurve(allCards),
		colorDistribution: calculateColorDistribution(allCards),
		typeDistribution: calculateTypeDistribution(deck),
		averageCmc: calculateAverageCmc(allCards),
		landCount: countLands(deck),
		nonLandCount: deck.cardCount - countLands(deck),
		totalPrice: calculateTotalPrice(allCards),
		warnings: validateDeck(deck).warnings,
		gameChangerCount,
		bracketLevel
	};
}

/**
 * Get all cards from a deck as a flat array
 */
function getAllCards(deck: Deck): Card[] {
	const cards: Card[] = [];
	for (const category of Object.keys(deck.cards) as CardCategory[]) {
		for (const card of deck.cards[category]) {
			// Expand cards by quantity
			for (let i = 0; i < card.quantity; i++) {
				cards.push(card);
			}
		}
	}
	return cards;
}

/**
 * Get unique card names from a deck (for Game Changer counting)
 */
function getUniqueCardNames(deck: Deck): string[] {
	const names: string[] = [];
	for (const category of Object.keys(deck.cards) as CardCategory[]) {
		for (const card of deck.cards[category]) {
			names.push(card.name);
		}
	}
	return names;
}

/**
 * Calculate mana curve (CMC distribution)
 */
function calculateManaCurve(cards: Card[]): Record<number, number> {
	const curve: Record<number, number> = {};

	for (const card of cards) {
		// Skip lands
		if (card.types?.some((t) => t.toLowerCase() === 'land')) continue;

		const cmc = card.cmc ?? 0;
		// Group CMC 7+ as "7+"
		const key = Math.min(cmc, 7);
		curve[key] = (curve[key] || 0) + 1;
	}

	return curve;
}

/**
 * Calculate color distribution based on mana symbols in mana costs
 */
function calculateColorDistribution(cards: Card[]): Record<string, number> {
	const distribution: Record<string, number> = {
		W: 0,
		U: 0,
		B: 0,
		R: 0,
		G: 0,
		C: 0
	};

	for (const card of cards) {
		if (!card.manaCost) continue;

		// Count each mana symbol
		const symbols = card.manaCost.match(/\{[^}]+\}/g) || [];
		for (const symbol of symbols) {
			const cleaned = symbol.replace(/[{}]/g, '');

			// Handle hybrid mana (e.g., "W/U")
			if (cleaned.includes('/')) {
				const colors = cleaned.split('/');
				for (const color of colors) {
					if (color in distribution) {
						distribution[color] += 0.5; // Split hybrid mana
					}
				}
			}
			// Handle single color
			else if (cleaned in distribution) {
				distribution[cleaned]++;
			}
		}
	}

	return distribution;
}

/**
 * Calculate card type distribution (percentage by category)
 */
function calculateTypeDistribution(deck: Deck): Record<string, number> {
	const distribution: Record<string, number> = {};

	for (const category of Object.keys(deck.cards) as CardCategory[]) {
		const count = deck.cards[category].reduce((sum, card) => sum + card.quantity, 0);
		if (count > 0) {
			distribution[category] = count;
		}
	}

	return distribution;
}

/**
 * Calculate average converted mana cost
 */
function calculateAverageCmc(cards: Card[]): number {
	// Exclude lands from CMC calculation
	const nonLands = cards.filter((card) => !card.types?.some((t) => t.toLowerCase() === 'land'));

	if (nonLands.length === 0) return 0;

	const totalCmc = nonLands.reduce((sum, card) => sum + (card.cmc ?? 0), 0);
	return Number((totalCmc / nonLands.length).toFixed(2));
}

/**
 * Count total lands in deck
 */
function countLands(deck: Deck): number {
	return deck.cards.land.reduce((sum, card) => sum + card.quantity, 0);
}

/**
 * Calculate total deck price
 */
function calculateTotalPrice(cards: Card[]): number {
	let total = 0;
	for (const card of cards) {
		if (card.price) {
			total += card.price;
		}
	}
	return Number(total.toFixed(2));
}

/**
 * Suggest land count based on deck composition
 */
export function suggestLandCount(averageCmc: number, nonLandCount: number): number {
	// Basic heuristic: higher average CMC needs more lands
	const baselands = 35;
	const cmcAdjustment = Math.floor((averageCmc - 3) * 2);
	return Math.max(30, Math.min(40, baselands + cmcAdjustment));
}
