/**
 * Utilities for extracting deck information from archives without full loading
 */

import type { Card, ManaColor } from '$lib/types/card';
import type { DeckManifest } from '$lib/types/deck';
import { CardCategory } from '$lib/types/card';

/**
 * Commander information with name and colors
 */
export interface CommanderInfo {
	name: string;
	colorIdentity: ManaColor[];
}

/**
 * Extract commander information (names and colors) from a deck archive
 * @param zipBlob - The deck zip file
 * @returns Array of commander info with names and color identities
 */
export async function extractCommanderInfo(zipBlob: Blob): Promise<CommanderInfo[]> {
	try {
		const { decompressDeckArchive } = await import('./zip');
		const { deserializeDeck } = await import('./deck-serializer');

		// Decompress the archive
		const archive = await decompressDeckArchive(zipBlob);
		const manifest: DeckManifest = archive.manifest;

		// Get the current branch and version
		const currentBranch = manifest.currentBranch;
		const currentVersion = manifest.currentVersion;

		// Find the branch metadata
		const branchMetadata = manifest.branches.find((b) => b.name === currentBranch);
		if (!branchMetadata) {
			return [];
		}

		// Get the version files for this branch
		const versionFiles = archive.versions[currentBranch];
		if (!versionFiles) {
			return [];
		}

		// Find the current version file (JSON or TXT format)
		const versionFileJson = versionFiles[`v${currentVersion}.json`];
		const versionFileTxt = versionFiles[`v${currentVersion}.txt`];

		if (!versionFileJson && !versionFileTxt) {
			return [];
		}

		// Parse the deck data
		let categorizedCards: { [category: string]: Card[] } = {};

		if (versionFileJson) {
			// JSON format - parse directly
			const data = JSON.parse(versionFileJson);
			categorizedCards = data.cards || {};
		} else if (versionFileTxt) {
			// TXT format - deserialize
			categorizedCards = await deserializeDeck(versionFileTxt);
		}

		// Extract commander info
		const commanders = categorizedCards[CardCategory.Commander] || [];
		return commanders.map((card) => ({
			name: card.name,
			colorIdentity: card.colorIdentity || []
		}));
	} catch (error) {
		console.error('[extractCommanderInfo] Error:', error);
		return [];
	}
}

/**
 * Extract commander names from a deck archive
 * @param zipBlob - The deck zip file
 * @returns Array of commander names
 */
export async function extractCommanderNames(zipBlob: Blob): Promise<string[]> {
	const info = await extractCommanderInfo(zipBlob);
	return info.map((cmd) => cmd.name);
}

/**
 * Batch extract commander names for multiple decks
 * @param deckBlobs - Map of deck name to zip blob
 * @returns Map of deck name to commander names
 */
export async function batchExtractCommanderNames(
	deckBlobs: Map<string, Blob>
): Promise<Map<string, string[]>> {
	const result = new Map<string, string[]>();

	// Process decks in parallel
	const promises = Array.from(deckBlobs.entries()).map(async ([deckName, blob]) => {
		const commanders = await extractCommanderNames(blob);
		return { deckName, commanders };
	});

	const results = await Promise.all(promises);

	for (const { deckName, commanders } of results) {
		result.set(deckName, commanders);
	}

	return result;
}
