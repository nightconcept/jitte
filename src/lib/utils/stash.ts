/**
 * Stash system for auto-saving work in progress
 */

import type { Deck, DeckManifest } from '$lib/types/deck';
import type { Stash } from '$lib/types/version';
import type { Card } from '$lib/types/card';
import { serializePlaintext } from './decklist-parser';

/**
 * Flatten categorized cards into a single array
 */
function flattenDeck(deck: Deck): Card[] {
	const cards: Card[] = [];
	for (const category of Object.values(deck.cards)) {
		cards.push(...category);
	}
	return cards;
}

/**
 * Create a stash for the current deck state
 */
export function createStash(deck: Deck, lastSavedVersion: string): Stash {
	return {
		branch: deck.currentBranch,
		content: serializePlaintext(flattenDeck(deck), true),
		timestamp: new Date().toISOString(),
		lastSavedVersion
	};
}

/**
 * Save stash to manifest
 */
export function saveStash(manifest: DeckManifest, stash: Stash): DeckManifest {
	return {
		...manifest,
		stashes: {
			...manifest.stashes,
			[stash.branch]: stash
		},
		updatedAt: new Date().toISOString()
	};
}

/**
 * Get stash for a branch
 */
export function getStash(manifest: DeckManifest, branchName: string): Stash | undefined {
	return manifest.stashes[branchName];
}

/**
 * Check if a branch has a stash
 */
export function hasStash(manifest: DeckManifest, branchName: string): boolean {
	return branchName in manifest.stashes;
}

/**
 * Delete stash for a branch
 */
export function deleteStash(manifest: DeckManifest, branchName: string): DeckManifest {
	const { [branchName]: _removed, ...remainingStashes } = manifest.stashes;

	return {
		...manifest,
		stashes: remainingStashes,
		updatedAt: new Date().toISOString()
	};
}

/**
 * Check if stash is newer than a given timestamp
 */
export function isStashNewer(stash: Stash, compareTimestamp: string): boolean {
	return new Date(stash.timestamp) > new Date(compareTimestamp);
}

/**
 * Get age of stash in milliseconds
 */
export function getStashAge(stash: Stash): number {
	return Date.now() - new Date(stash.timestamp).getTime();
}

/**
 * Format stash age as human-readable string
 */
export function formatStashAge(stash: Stash): string {
	const ageMs = getStashAge(stash);
	const ageMinutes = Math.floor(ageMs / 60000);
	const ageHours = Math.floor(ageMinutes / 60);
	const ageDays = Math.floor(ageHours / 24);

	if (ageDays > 0) {
		return `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
	}
	if (ageHours > 0) {
		return `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
	}
	if (ageMinutes > 0) {
		return `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
	}
	return 'just now';
}

/**
 * Auto-stash interval in milliseconds (60 seconds)
 */
export const AUTO_STASH_INTERVAL_MS = 60000;
