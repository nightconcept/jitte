/**
 * Deck Serializer
 *
 * Handles serialization/deserialization between DeckArchive format and slim storage format.
 * This is the bridge between the UI-facing full card format and the storage-optimized slim format.
 *
 * Responsibilities:
 * - Convert full Card objects to CardReferences (slim format)
 * - Convert CardReferences back to full Card objects (requires hydration)
 * - Serialize/deserialize version content (bases and deltas)
 * - Handle legacy format detection and conversion
 */

import type { Card, CardsByCategory } from '$lib/types/card';
import type {
	CardReference,
	CardReferencesByCategory,
	MaybeboardReference,
	MaybeboardCategoryReference,
	StashReference
} from '$lib/types/card-reference';
import type { VersionBase, VersionDelta, VersionContent } from '$lib/types/version-delta';
import type { Maybeboard, MaybeboardCategory } from '$lib/types/maybeboard';
import type { DeckArchive } from '$lib/utils/zip';
import { cardsToReferences, referencesToCards } from '$lib/utils/card-reference';
import { hydrateCardReferences } from '$lib/utils/card-hydration';
import { isVersionBase, isVersionDelta } from '$lib/types/version-delta';
import { createBaseSnapshot } from '$lib/utils/version-delta';

/**
 * Schema version for slim format
 */
export const SLIM_SCHEMA_VERSION = '2.0';

/**
 * Check if content is in legacy plaintext format (e.g., "1x Doom Blade")
 */
export function isLegacyPlaintextFormat(content: string): boolean {
	// Legacy format starts with numbers followed by 'x' and card name
	const lines = content.trim().split('\n');
	if (lines.length === 0) return false;

	// Check first non-empty, non-comment line
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
			// Legacy format: "1x Card Name" or "1 Card Name"
			return /^\d+x?\s+\S/.test(trimmed);
		}
	}

	return false;
}

/**
 * Check if JSON content is in legacy (v1.0) format
 */
export function isLegacyJsonFormat(content: unknown): boolean {
	if (typeof content !== 'object' || content === null) return false;

	const obj = content as Record<string, unknown>;

	// Legacy format has schemaVersion '1.0' or no schemaVersion
	if (obj.schemaVersion === '1.0' || !obj.schemaVersion) {
		// Legacy format has 'cards' as CardsByCategory with full Card objects
		if (obj.cards && typeof obj.cards === 'object') {
			const cards = obj.cards as Record<string, unknown[]>;
			const firstCategory = Object.keys(cards)[0];
			if (firstCategory && Array.isArray(cards[firstCategory])) {
				const firstCard = cards[firstCategory][0];
				// Full cards have many fields like 'name', 'mana_cost', 'type_line', etc.
				if (firstCard && typeof firstCard === 'object' && 'type_line' in firstCard) {
					return true;
				}
			}
		}
	}

	return false;
}

/**
 * Check if content is slim format (v2.0)
 */
export function isSlimFormat(content: unknown): boolean {
	if (typeof content !== 'object' || content === null) return false;

	const obj = content as Record<string, unknown>;
	if (obj.schemaVersion !== SLIM_SCHEMA_VERSION) return false;

	// Check if it has the structure of a base or delta
	// Base: has 'cards' field
	// Delta: has 'baseVersion', 'previousVersion', 'added', 'removed', 'modified'
	const hasBaseStructure = 'cards' in obj && typeof obj.cards === 'object';
	const hasDeltaStructure =
		'baseVersion' in obj && 'previousVersion' in obj && 'added' in obj && 'removed' in obj;

	return hasBaseStructure || hasDeltaStructure;
}

/**
 * Serialize cards to slim format base snapshot
 * Note: Commit messages are stored in VersionMeta, not in the base content
 */
export function serializeToBase(cards: CardsByCategory, version: string): VersionBase {
	const refs = cardsToReferences(cards);
	return createBaseSnapshot(refs, version);
}

/**
 * Serialize version file content from DeckArchive format
 * Handles both JSON and plaintext legacy formats
 */
export function parseVersionFileContent(content: string): {
	cards: CardsByCategory;
	isLegacy: boolean;
	format: 'plaintext' | 'json-v1' | 'json-slim';
} {
	// Try to parse as JSON first
	try {
		const parsed = JSON.parse(content);

		// Check if it's slim format
		if (isSlimFormat(parsed)) {
			// This is already slim - for this function we need to return full cards
			// which requires hydration (async), so we can't handle it here
			throw new Error('Slim format requires async hydration - use parseVersionFileContentAsync');
		}

		// Check if it's legacy JSON format
		if (isLegacyJsonFormat(parsed)) {
			return {
				cards: parsed.cards as CardsByCategory,
				isLegacy: true,
				format: 'json-v1'
			};
		}

		// Unknown JSON format
		throw new Error('Unknown JSON format');
	} catch (e) {
		// Not valid JSON, check for plaintext
		if (isLegacyPlaintextFormat(content)) {
			// Parse plaintext format - this is a simplified parser
			// Full parsing would need to integrate with Scryfall lookup
			throw new Error('Plaintext format requires async card lookup - use parseVersionFileContentAsync');
		}

		throw new Error('Unable to parse version file content');
	}
}

/**
 * Async version that can handle all formats including slim
 */
export async function parseVersionFileContentAsync(content: string): Promise<{
	cards: CardsByCategory;
	refs?: CardReferencesByCategory;
	isLegacy: boolean;
	format: 'plaintext' | 'json-v1' | 'json-slim';
}> {
	// Try to parse as JSON first
	try {
		const parsed = JSON.parse(content);

		// Check if it's slim format (base or delta)
		if (isVersionBase(parsed)) {
			const base = parsed as VersionBase;
			const hydrationResult = await hydrateCardReferences(base.cards);
			return {
				cards: hydrationResult.cards,
				refs: base.cards,
				isLegacy: false,
				format: 'json-slim'
			};
		}

		if (isVersionDelta(parsed)) {
			// Delta needs reconstruction from base - this function is for single files
			throw new Error('Delta format requires full version chain reconstruction');
		}

		// Check if it's legacy JSON format
		if (isLegacyJsonFormat(parsed)) {
			return {
				cards: parsed.cards as CardsByCategory,
				isLegacy: true,
				format: 'json-v1'
			};
		}

		// Unknown JSON format - try to extract cards anyway
		if (parsed.cards && typeof parsed.cards === 'object') {
			return {
				cards: parsed.cards as CardsByCategory,
				isLegacy: true,
				format: 'json-v1'
			};
		}

		throw new Error('Unknown JSON format');
	} catch (e) {
		if (e instanceof SyntaxError) {
			// Not valid JSON, check for plaintext
			if (isLegacyPlaintextFormat(content)) {
				// For plaintext, we'd need to parse and lookup each card
				// This is complex and should be handled by the deck parser
				throw new Error('Plaintext format should be parsed by decklist-parser');
			}
		}

		throw e;
	}
}

/**
 * Serialize CardsByCategory to JSON string in slim base format
 */
export function serializeCardsToSlimJson(cards: CardsByCategory, version: string): string {
	const base = serializeToBase(cards, version);
	return JSON.stringify(base, null, 2);
}

/**
 * Convert DeckArchive maybeboard to slim format
 */
export function maybeboardToSlimFormat(maybeboard: Maybeboard): MaybeboardReference {
	return {
		categories: maybeboard.categories.map((cat) => ({
			id: cat.id,
			name: cat.name,
			cards: cardsToReferences({ cards: cat.cards }).cards || [],
			description: cat.description,
			order: cat.order,
			createdAt: cat.createdAt,
			updatedAt: cat.updatedAt
		})),
		defaultCategoryId: maybeboard.defaultCategoryId
	};
}

/**
 * Convert slim maybeboard back to full format (requires hydration)
 */
export async function slimMaybeboardToFull(slim: MaybeboardReference): Promise<Maybeboard> {
	// Collect all card references
	const allRefs: CardReferencesByCategory = {};
	for (const cat of slim.categories) {
		allRefs[cat.id] = cat.cards;
	}

	// Hydrate all at once
	const hydrated = await hydrateCardReferences(allRefs);

	return {
		categories: slim.categories.map((cat) => ({
			id: cat.id,
			name: cat.name,
			cards: hydrated.cards[cat.id] || [],
			description: cat.description,
			order: cat.order,
			createdAt: cat.createdAt,
			updatedAt: cat.updatedAt
		})),
		defaultCategoryId: slim.defaultCategoryId
	};
}

/**
 * Convert stash content to slim format
 */
export function stashToSlimFormat(stashContent: string): StashReference {
	try {
		const parsed = JSON.parse(stashContent);
		const cards = parsed.cards || {};
		const refs = cardsToReferences(cards);

		return {
			cards: refs,
			stashedAt: new Date().toISOString(),
			message: parsed.message
		};
	} catch {
		return {
			cards: {},
			stashedAt: new Date().toISOString()
		};
	}
}

/**
 * Convert slim stash back to archive format (requires hydration)
 */
export async function slimStashToArchiveFormat(
	stash: StashReference
): Promise<{ cards: CardsByCategory; message?: string }> {
	const hydrated = await hydrateCardReferences(stash.cards);
	return {
		cards: hydrated.cards,
		message: stash.message
	};
}

/**
 * Detect the format of a version file
 */
export function detectVersionFormat(
	content: string
): 'plaintext' | 'json-v1' | 'json-slim' | 'unknown' {
	// Try plaintext first (quick check)
	if (isLegacyPlaintextFormat(content)) {
		return 'plaintext';
	}

	// Try JSON
	try {
		const parsed = JSON.parse(content);

		if (isVersionBase(parsed) || isVersionDelta(parsed)) {
			return 'json-slim';
		}

		if (isLegacyJsonFormat(parsed)) {
			return 'json-v1';
		}

		// Has cards field - treat as json-v1
		if (parsed.cards) {
			return 'json-v1';
		}

		return 'unknown';
	} catch {
		return 'unknown';
	}
}

/**
 * Convert legacy version content to slim base format
 */
export async function convertLegacyToSlim(
	content: string,
	version: string
): Promise<VersionBase | null> {
	const format = detectVersionFormat(content);

	if (format === 'json-slim') {
		// Already slim
		const parsed = JSON.parse(content);
		if (isVersionBase(parsed)) {
			return parsed;
		}
		return null; // Delta - can't convert directly
	}

	if (format === 'json-v1') {
		const parsed = JSON.parse(content);
		const cards = parsed.cards as CardsByCategory;
		return serializeToBase(cards, version);
	}

	if (format === 'plaintext') {
		// Plaintext requires card lookup - not handled here
		return null;
	}

	return null;
}

/**
 * Create a version file name
 */
export function createVersionFileName(version: string, isSlim: boolean = true): string {
	return `v${version}.json`;
}

/**
 * Extract version number from file name
 */
export function extractVersionFromFileName(fileName: string): string | null {
	const match = fileName.match(/v([\d.]+)\.(json|txt)$/);
	return match ? match[1] : null;
}

/**
 * Check if archive needs migration to slim format
 */
export function archiveNeedsMigration(archive: DeckArchive): boolean {
	// Check if any version file is in legacy format
	for (const [, branchVersions] of Object.entries(archive.versions)) {
		for (const [, content] of Object.entries(branchVersions)) {
			const format = detectVersionFormat(content);
			if (format === 'plaintext' || format === 'json-v1') {
				return true;
			}
		}
	}

	return false;
}

/**
 * Serialization options
 */
export interface SerializationOptions {
	/** Maximum delta chain length before creating a new base */
	maxDeltaChainLength: number;
	/** Whether to use pretty printing for JSON */
	prettyPrint: boolean;
	/** Include commit messages in version metadata */
	includeCommitMessages: boolean;
}

/**
 * Default serialization options
 */
export const DEFAULT_SERIALIZATION_OPTIONS: SerializationOptions = {
	maxDeltaChainLength: 10,
	prettyPrint: true,
	includeCommitMessages: true
};
