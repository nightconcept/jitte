/**
 * Salt Score Calculator
 *
 * Calculate overall "saltiness" of a deck based on EDHREC salt scores.
 * Salt scores measure how frustrating/unfun a card is for opponents (0-4 scale).
 *
 * HYBRID APPROACH:
 * - Uses local data (top 100) first - instant, no API calls
 * - Falls back to EDHREC API only for rare cards outside top 100
 * - Aggressively caches API results (30-90 days)
 *
 * Usage:
 *   import { calculateDeckSaltScore } from '$lib/utils/salt-calculator';
 *   const salt = await calculateDeckSaltScore(deck);
 *   console.log(`Average salt: ${salt.averageSalt}`);
 */

import type { Deck } from '$lib/types/deck';
import type { DeckSaltScore } from '$lib/types/edhrec';
import { CardCategory } from '$lib/types/card';
import { edhrecService } from '$lib/api/edhrec-service';

/**
 * Calculate overall salt score for a deck
 * Returns average salt score and top 3 saltiest cards
 *
 * Performance: ~99% of cards are found in local data (instant),
 * only rare cards outside top 100 may trigger API calls
 */
export async function calculateDeckSaltScore(deck: Deck): Promise<DeckSaltScore> {
	// Gather all unique card names from deck (all categories)
	const allCards = [
		...deck.cards[CardCategory.Commander],
		...deck.cards[CardCategory.Companion],
		...deck.cards[CardCategory.Planeswalker],
		...deck.cards[CardCategory.Creature],
		...deck.cards[CardCategory.Instant],
		...deck.cards[CardCategory.Sorcery],
		...deck.cards[CardCategory.Artifact],
		...deck.cards[CardCategory.Enchantment],
		...deck.cards[CardCategory.Land],
		...deck.cards[CardCategory.Other]
	];

	// Filter out basic lands (they won't have salt scores)
	const basicLands = [
		'Plains',
		'Island',
		'Swamp',
		'Mountain',
		'Forest',
		'Wastes',
		'Snow-Covered Plains',
		'Snow-Covered Island',
		'Snow-Covered Swamp',
		'Snow-Covered Mountain',
		'Snow-Covered Forest'
	];
	const uniqueCardNames = [
		...new Set(
			allCards.map((card) => card.name).filter((name) => !basicLands.includes(name))
		)
	];

	// Batch fetch salt scores (uses hybrid approach: local data first, API fallback)
	// Note: This may take several minutes if many cards need API fetching (5s delay per card)
	const saltScoresMap = await edhrecService.getSaltScoresForCards(uniqueCardNames);

	// Convert to array of cards with scores
	const saltScores: Array<{ name: string; saltScore: number }> = [];

	for (const [name, scoreData] of saltScoresMap.entries()) {
		if (scoreData && scoreData.saltScore > 0) {
			saltScores.push({
				name,
				saltScore: scoreData.saltScore
			});
		}
	}

	// No salt scores found
	if (saltScores.length === 0) {
		return {
			totalSalt: 0,
			averageSalt: 0,
			topSaltyCards: [],
			totalCardsWithScores: 0
		};
	}

	// Calculate sum and average
	const sum = saltScores.reduce((acc, s) => acc + s.saltScore, 0);
	const averageSalt = sum / saltScores.length;

	// Get top 3 saltiest cards
	const topSaltyCards = saltScores.sort((a, b) => b.saltScore - a.saltScore).slice(0, 3);

	return {
		totalSalt: parseFloat(sum.toFixed(2)),
		averageSalt: parseFloat(averageSalt.toFixed(2)),
		topSaltyCards,
		totalCardsWithScores: saltScores.length
	};
}

/**
 * Get salt rating category based on average score
 */
export function getSaltRating(
	averageSalt: number
): {
	category: 'low' | 'medium' | 'high' | 'very-high';
	label: string;
	description: string;
} {
	if (averageSalt >= 2.5) {
		return {
			category: 'very-high',
			label: 'Very Salty',
			description: 'This deck contains many cards that frustrate opponents'
		};
	} else if (averageSalt >= 2.0) {
		return {
			category: 'high',
			label: 'Salty',
			description: 'This deck contains several frustrating cards'
		};
	} else if (averageSalt >= 1.5) {
		return {
			category: 'medium',
			label: 'Moderately Salty',
			description: 'This deck has some salt-inducing cards'
		};
	} else {
		return {
			category: 'low',
			label: 'Low Salt',
			description: 'This deck is relatively fun to play against'
		};
	}
}

/**
 * Get emoji representation of salt score
 */
export function getSaltEmoji(saltScore: number): string {
	const fullSalt = '🧂';
	const halfSalt = '🫙'; // Using jar emoji as half-filled
	const emptySalt = '○';

	const fullCount = Math.floor(saltScore);
	const hasHalf = saltScore % 1 >= 0.5;
	const emptyCount = 4 - fullCount - (hasHalf ? 1 : 0);

	return (
		fullSalt.repeat(fullCount) +
		(hasHalf ? halfSalt : '') +
		emptySalt.repeat(Math.max(0, emptyCount))
	);
}

/**
 * Get color for salt score visualization
 */
export function getSaltColor(
	saltScore: number
): {
	text: string;
	bg: string;
	border: string;
} {
	if (saltScore >= 2.5) {
		return {
			text: 'var(--color-accent-red)',
			bg: 'var(--color-accent-red-muted)',
			border: 'var(--color-accent-red)'
		};
	} else if (saltScore >= 2.0) {
		return {
			text: 'var(--color-accent-orange)',
			bg: 'var(--color-accent-orange-muted)',
			border: 'var(--color-accent-orange)'
		};
	} else if (saltScore >= 1.5) {
		return {
			text: 'var(--color-accent-yellow)',
			bg: 'var(--color-accent-yellow-muted)',
			border: 'var(--color-accent-yellow)'
		};
	} else {
		return {
			text: 'var(--color-accent-green)',
			bg: 'var(--color-accent-green-muted)',
			border: 'var(--color-accent-green)'
		};
	}
}
