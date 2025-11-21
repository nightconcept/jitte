/**
 * Utilities for extracting deck information from archives without full loading
 */

import type { Card, ManaColor } from '$lib/types/card';
import type { DeckManifest } from '$lib/types/deck';
import type { DeckArchive } from './zip';
import { CardCategory } from '$lib/types/card';
import { DeckFormat } from '$lib/formats/format-registry';

/**
 * Commander information with name and colors
 */
export interface CommanderInfo {
	name: string;
	colorIdentity: ManaColor[];
	bracketLevel?: number;
}

/**
 * Deck information including format and commanders
 */
export interface DeckInfo {
	format: DeckFormat;
	commanders: CommanderInfo[];
}

/**
 * Extract commander information (names and colors) from a deck archive
 * @param archive - The deck archive
 * @returns Array of commander info with names and color identities
 */
export async function extractCommanderInfo(archive: DeckArchive): Promise<CommanderInfo[]> {
	try {
		const { deserializeDeck } = await import('./deck-serializer');
		const { countGameChangers, calculateBracketLevel } = await import('./game-changers');

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

		// Extract all unique card names for bracket calculation
		const uniqueCardNames: string[] = [];
		for (const category in categorizedCards) {
			const cards = categorizedCards[category];
			for (const card of cards) {
				if (!uniqueCardNames.includes(card.name)) {
					uniqueCardNames.push(card.name);
				}
			}
		}

		// Calculate bracket level
		const gameChangerCount = countGameChangers(uniqueCardNames);
		const bracketLevel = calculateBracketLevel(gameChangerCount);

		// Extract commander info
		const commanders = categorizedCards[CardCategory.Commander] || [];
		return commanders.map((card) => ({
			name: card.name,
			colorIdentity: card.colorIdentity || [],
			bracketLevel
		}));
	} catch (error) {
		console.error('[extractCommanderInfo] Error:', error);
		return [];
	}
}

/**
 * Extract commander names from a deck archive
 * @param archive - The deck archive
 * @returns Array of commander names
 */
export async function extractCommanderNames(archive: DeckArchive): Promise<string[]> {
	const info = await extractCommanderInfo(archive);
	return info.map((cmd) => cmd.name);
}

/**
 * Batch extract commander names for multiple decks
 * @param deckArchives - Map of deck name to deck archive
 * @returns Map of deck name to commander names
 */
export async function batchExtractCommanderNames(
	deckArchives: Map<string, DeckArchive>
): Promise<Map<string, string[]>> {
	const result = new Map<string, string[]>();

	// Process decks in parallel
	const promises = Array.from(deckArchives.entries()).map(async ([deckName, archive]) => {
		const commanders = await extractCommanderNames(archive);
		return { deckName, commanders };
	});

	const results = await Promise.all(promises);

	for (const { deckName, commanders } of results) {
		result.set(deckName, commanders);
	}

	return result;
}

/**
 * Extract full deck information including format and commanders
 * @param archive - The deck archive
 * @returns Deck info with format and commanders
 */
export async function extractDeckInfo(archive: DeckArchive): Promise<DeckInfo> {
	try {
		const manifest = archive.manifest;

		// Get the format from the manifest
		const format = manifest.format || DeckFormat.Commander;

		// Extract commanders (only relevant for Commander format)
		const commanders = await extractCommanderInfo(archive);

		return {
			format,
			commanders
		};
	} catch (error) {
		console.error('[extractDeckInfo] Error:', error);
		return {
			format: DeckFormat.Commander,
			commanders: []
		};
	}
}
