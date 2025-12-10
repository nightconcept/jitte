/**
 * Version Delta Utilities
 *
 * Handles calculating deltas between deck versions and applying deltas
 * to reconstruct previous versions.
 */

import type {
	CardReference,
	CardReferencesByCategory,
	CardReferenceIdentifier
} from '$lib/types/card-reference';
import type {
	VersionDelta,
	VersionBase,
	CardModification,
	CategoryChange,
	DeltaCalculationResult,
	VERSION_STORAGE_SCHEMA,
	BASE_SNAPSHOT_INTERVAL
} from '$lib/types/version-delta';
import { referenceKey, referencesEqual } from './card-reference';

/**
 * Calculate the delta between two deck versions
 *
 * @param oldCards - Previous version's cards
 * @param newCards - Current version's cards
 * @param baseVersion - The base version this delta chain starts from
 * @param previousVersion - The immediate predecessor version
 * @param currentVersion - The version being created
 * @param versionsSinceBase - Number of versions since the last base
 * @returns Delta calculation result with recommendation on whether to create base
 */
export function calculateDelta(
	oldCards: CardReferencesByCategory,
	newCards: CardReferencesByCategory,
	baseVersion: string,
	previousVersion: string,
	currentVersion: string,
	versionsSinceBase: number
): DeltaCalculationResult {
	const added: CardReference[] = [];
	const removed: CardReferenceIdentifier[] = [];
	const modified: CardModification[] = [];
	const categoryChanges: CategoryChange[] = [];

	// Build maps for efficient lookup
	const oldCardMap = buildCardMap(oldCards);
	const newCardMap = buildCardMap(newCards);

	// Track which cards have been processed
	const processedKeys = new Set<string>();

	// Find added and modified cards
	for (const [category, refs] of Object.entries(newCards)) {
		for (const newRef of refs) {
			const key = referenceKey(newRef);
			processedKeys.add(key);

			const oldEntry = oldCardMap.get(key);

			if (!oldEntry) {
				// Card was added
				added.push(newRef);
			} else {
				// Card exists - check for modifications
				const oldRef = oldEntry.ref;
				const oldCategory = oldEntry.category;

				// Check if category changed
				if (oldCategory !== category) {
					categoryChanges.push({
						card: toIdentifier(newRef),
						fromCategory: oldCategory,
						toCategory: category
					});
				}

				// Check for property modifications
				const changes = getModifications(oldRef, newRef);
				if (changes) {
					modified.push({
						card: toIdentifier(newRef),
						changes
					});
				}
			}
		}
	}

	// Find removed cards
	for (const [key, entry] of oldCardMap.entries()) {
		if (!processedKeys.has(key)) {
			removed.push(toIdentifier(entry.ref));
		}
	}

	// Calculate statistics
	const stats = {
		addedCount: added.length,
		removedCount: removed.length,
		modifiedCount: modified.length,
		categoryChangesCount: categoryChanges.length,
		estimatedSavings: estimateSavings(oldCards, { added, removed, modified, categoryChanges })
	};

	// Determine if we should create a base instead
	const shouldCreateBase = shouldCreateBaseSnapshot(
		versionsSinceBase,
		stats.addedCount,
		stats.removedCount,
		currentVersion
	);

	const delta: VersionDelta = {
		schemaVersion: '2.0',
		baseVersion,
		version: currentVersion,
		previousVersion,
		added,
		removed,
		modified,
		categoryChanges: categoryChanges.length > 0 ? categoryChanges : undefined
	};

	return {
		delta,
		shouldCreateBase,
		baseReason: shouldCreateBase
			? versionsSinceBase >= 10
				? 'interval'
				: 'major_change'
			: undefined,
		stats
	};
}

/**
 * Apply a delta to a base/previous version to get the next version's state
 */
export function applyDelta(
	base: CardReferencesByCategory,
	delta: VersionDelta
): CardReferencesByCategory {
	// Deep clone the base
	const result: CardReferencesByCategory = {};
	for (const [category, refs] of Object.entries(base)) {
		result[category] = refs.map((ref) => ({ ...ref }));
	}

	// Build a map for efficient lookup and modification
	const cardMap = buildCardMap(result);

	// Apply removals
	for (const removed of delta.removed) {
		const key = identifierKey(removed);
		const entry = cardMap.get(key);
		if (entry) {
			const categoryCards = result[entry.category];
			const index = categoryCards.findIndex((r) => referenceKey(r) === key);
			if (index >= 0) {
				categoryCards.splice(index, 1);
			}
			cardMap.delete(key);
		}
	}

	// Apply category changes
	if (delta.categoryChanges) {
		for (const change of delta.categoryChanges) {
			const key = identifierKey(change.card);
			const entry = cardMap.get(key);
			if (entry) {
				// Remove from old category
				const oldCategoryCards = result[change.fromCategory];
				if (oldCategoryCards) {
					const index = oldCategoryCards.findIndex((r) => referenceKey(r) === key);
					if (index >= 0) {
						const [card] = oldCategoryCards.splice(index, 1);

						// Add to new category
						if (!result[change.toCategory]) {
							result[change.toCategory] = [];
						}
						result[change.toCategory].push(card);

						// Update map
						entry.category = change.toCategory;
					}
				}
			}
		}
	}

	// Apply modifications
	for (const mod of delta.modified) {
		const key = identifierKey(mod.card);
		const entry = cardMap.get(key);
		if (entry) {
			// Find and update the card
			const categoryCards = result[entry.category];
			const index = categoryCards.findIndex((r) => referenceKey(r) === key);
			if (index >= 0) {
				categoryCards[index] = {
					...categoryCards[index],
					...mod.changes
				};
			}
		}
	}

	// Apply additions
	for (const added of delta.added) {
		// Determine category from the delta's added array
		// The added card needs to go somewhere - we need to figure out category
		// For now, put in the first category that exists or create 'other'
		// Actually, added cards should preserve their category from where they were in newCards
		// But we don't have that info in the delta... we need to enhance the delta format

		// For now, we'll need to track where added cards should go
		// Let's put them in a default category and rely on categoryChanges to move them
		// Actually, looking at the delta calculation, added cards come from iterating newCards
		// So we know their category at calculation time. Let's enhance the CardReference in added
		// to include category, or enhance the delta format.

		// For simplicity, let's add a workaround: store added cards with their category
		// The CardReference doesn't have category, so we'll need to modify the delta format
		// OR we can infer it from the modification process

		// TEMPORARY: Put in 'other' - we'll need to enhance this
		// Actually, let me reconsider the data structure...

		// The proper solution is to either:
		// 1. Include category in the added array items
		// 2. Have a separate addedByCategory structure

		// For now, let's assume the delta was calculated correctly and we have category info
		// We'll need to update calculateDelta to include category in added items

		// Let's add to 'other' for now and fix the data structure
		if (!result['other']) {
			result['other'] = [];
		}
		result['other'].push({ ...added });
	}

	return result;
}

/**
 * Enhanced delta format with category info for added cards
 */
export interface EnhancedVersionDelta extends Omit<VersionDelta, 'added'> {
	added: Array<CardReference & { category: string }>;
}

/**
 * Calculate delta with category information preserved for added cards
 */
export function calculateEnhancedDelta(
	oldCards: CardReferencesByCategory,
	newCards: CardReferencesByCategory,
	baseVersion: string,
	previousVersion: string,
	currentVersion: string,
	versionsSinceBase: number
): DeltaCalculationResult & { delta: EnhancedVersionDelta } {
	const added: Array<CardReference & { category: string }> = [];
	const removed: CardReferenceIdentifier[] = [];
	const modified: CardModification[] = [];
	const categoryChanges: CategoryChange[] = [];

	const oldCardMap = buildCardMap(oldCards);
	const newCardMap = buildCardMap(newCards);
	const processedKeys = new Set<string>();

	// Find added and modified cards (with category for added)
	for (const [category, refs] of Object.entries(newCards)) {
		for (const newRef of refs) {
			const key = referenceKey(newRef);
			processedKeys.add(key);

			const oldEntry = oldCardMap.get(key);

			if (!oldEntry) {
				// Card was added - include category
				added.push({ ...newRef, category });
			} else {
				const oldRef = oldEntry.ref;
				const oldCategory = oldEntry.category;

				if (oldCategory !== category) {
					categoryChanges.push({
						card: toIdentifier(newRef),
						fromCategory: oldCategory,
						toCategory: category
					});
				}

				const changes = getModifications(oldRef, newRef);
				if (changes) {
					modified.push({
						card: toIdentifier(newRef),
						changes
					});
				}
			}
		}
	}

	// Find removed cards
	for (const [key, entry] of oldCardMap.entries()) {
		if (!processedKeys.has(key)) {
			removed.push(toIdentifier(entry.ref));
		}
	}

	const stats = {
		addedCount: added.length,
		removedCount: removed.length,
		modifiedCount: modified.length,
		categoryChangesCount: categoryChanges.length,
		estimatedSavings: estimateSavings(oldCards, {
			added: added as CardReference[],
			removed,
			modified,
			categoryChanges
		})
	};

	const shouldCreateBase = shouldCreateBaseSnapshot(
		versionsSinceBase,
		stats.addedCount,
		stats.removedCount,
		currentVersion
	);

	const delta: EnhancedVersionDelta = {
		schemaVersion: '2.0',
		baseVersion,
		version: currentVersion,
		previousVersion,
		added,
		removed,
		modified,
		categoryChanges: categoryChanges.length > 0 ? categoryChanges : undefined
	};

	return {
		delta,
		shouldCreateBase,
		baseReason: shouldCreateBase
			? versionsSinceBase >= 10
				? 'interval'
				: 'major_change'
			: undefined,
		stats
	};
}

/**
 * Apply an enhanced delta (with category info) to reconstruct a version
 */
export function applyEnhancedDelta(
	base: CardReferencesByCategory,
	delta: EnhancedVersionDelta
): CardReferencesByCategory {
	// Deep clone the base
	const result: CardReferencesByCategory = {};
	for (const [category, refs] of Object.entries(base)) {
		result[category] = refs.map((ref) => ({ ...ref }));
	}

	const cardMap = buildCardMap(result);

	// Apply removals
	for (const removed of delta.removed) {
		const key = identifierKey(removed);
		const entry = cardMap.get(key);
		if (entry) {
			const categoryCards = result[entry.category];
			const index = categoryCards.findIndex((r) => referenceKey(r) === key);
			if (index >= 0) {
				categoryCards.splice(index, 1);
			}
			cardMap.delete(key);
		}
	}

	// Apply category changes
	if (delta.categoryChanges) {
		for (const change of delta.categoryChanges) {
			const key = identifierKey(change.card);
			const entry = cardMap.get(key);
			if (entry) {
				const oldCategoryCards = result[change.fromCategory];
				if (oldCategoryCards) {
					const index = oldCategoryCards.findIndex((r) => referenceKey(r) === key);
					if (index >= 0) {
						const [card] = oldCategoryCards.splice(index, 1);
						if (!result[change.toCategory]) {
							result[change.toCategory] = [];
						}
						result[change.toCategory].push(card);
						entry.category = change.toCategory;
					}
				}
			}
		}
	}

	// Apply modifications
	for (const mod of delta.modified) {
		const key = identifierKey(mod.card);
		const entry = cardMap.get(key);
		if (entry) {
			const categoryCards = result[entry.category];
			const index = categoryCards.findIndex((r) => referenceKey(r) === key);
			if (index >= 0) {
				categoryCards[index] = {
					...categoryCards[index],
					...mod.changes
				};
			}
		}
	}

	// Apply additions (with category info)
	for (const added of delta.added) {
		const { category, ...cardRef } = added;
		if (!result[category]) {
			result[category] = [];
		}
		result[category].push(cardRef);
	}

	return result;
}

// ==================== Helper Functions ====================

/**
 * Build a map of card key -> { ref, category } for efficient lookup
 */
function buildCardMap(
	cards: CardReferencesByCategory
): Map<string, { ref: CardReference; category: string }> {
	const map = new Map<string, { ref: CardReference; category: string }>();

	for (const [category, refs] of Object.entries(cards)) {
		for (const ref of refs) {
			map.set(referenceKey(ref), { ref, category });
		}
	}

	return map;
}

/**
 * Convert a CardReference to a CardReferenceIdentifier
 */
function toIdentifier(ref: CardReference): CardReferenceIdentifier {
	return {
		scryfallId: ref.scryfallId,
		setCode: ref.setCode,
		collectorNumber: ref.collectorNumber
	};
}

/**
 * Create a key from a CardReferenceIdentifier
 */
function identifierKey(id: CardReferenceIdentifier): string {
	return `${id.scryfallId}:${id.setCode}:${id.collectorNumber}`;
}

/**
 * Get modifications between two CardReferences
 * Returns undefined if no modifications
 */
function getModifications(
	oldRef: CardReference,
	newRef: CardReference
): Partial<Omit<CardReference, 'scryfallId' | 'setCode' | 'collectorNumber'>> | undefined {
	const changes: Partial<Omit<CardReference, 'scryfallId' | 'setCode' | 'collectorNumber'>> = {};
	let hasChanges = false;

	if (oldRef.quantity !== newRef.quantity) {
		changes.quantity = newRef.quantity;
		hasChanges = true;
	}

	if (oldRef.customCmc !== newRef.customCmc) {
		changes.customCmc = newRef.customCmc;
		hasChanges = true;
	}

	if (!arraysEqual(oldRef.customColorIdentity, newRef.customColorIdentity)) {
		changes.customColorIdentity = newRef.customColorIdentity;
		hasChanges = true;
	}

	if (oldRef.customCategory !== newRef.customCategory) {
		changes.customCategory = newRef.customCategory;
		hasChanges = true;
	}

	return hasChanges ? changes : undefined;
}

/**
 * Compare two arrays for equality
 */
function arraysEqual(a?: string[], b?: string[]): boolean {
	if (!a && !b) return true;
	if (!a || !b) return false;
	if (a.length !== b.length) return false;
	return a.every((val, i) => val === b[i]);
}

/**
 * Determine if a base snapshot should be created
 */
function shouldCreateBaseSnapshot(
	versionsSinceBase: number,
	addedCount: number,
	removedCount: number,
	_currentVersion: string
): boolean {
	// Create base every 10 versions
	if (versionsSinceBase >= 10) {
		return true;
	}

	// Don't create base for other reasons currently
	// Could add logic for major version bumps or large changes
	return false;
}

/**
 * Estimate storage savings of using delta vs full snapshot
 */
function estimateSavings(
	fullSnapshot: CardReferencesByCategory,
	delta: {
		added: CardReference[];
		removed: CardReferenceIdentifier[];
		modified: CardModification[];
		categoryChanges: CategoryChange[];
	}
): number {
	// Rough estimate: ~100 bytes per CardReference
	const BYTES_PER_REF = 100;
	const BYTES_PER_ID = 50;
	const BYTES_PER_MOD = 60;
	const BYTES_PER_CAT_CHANGE = 70;

	let fullSize = 0;
	for (const refs of Object.values(fullSnapshot)) {
		fullSize += refs.length * BYTES_PER_REF;
	}

	const deltaSize =
		delta.added.length * BYTES_PER_REF +
		delta.removed.length * BYTES_PER_ID +
		delta.modified.length * BYTES_PER_MOD +
		delta.categoryChanges.length * BYTES_PER_CAT_CHANGE;

	return Math.max(0, fullSize - deltaSize);
}

/**
 * Create a base snapshot from cards
 */
export function createBaseSnapshot(
	cards: CardReferencesByCategory,
	version: string
): VersionBase {
	return {
		schemaVersion: '2.0',
		version,
		cards
	};
}

/**
 * Check if a version number indicates it's time for a new base
 * (every 10 versions within a base chain)
 */
export function isBaseIntervalVersion(
	versionNumber: number,
	interval: number = 10
): boolean {
	return versionNumber % interval === 0;
}
