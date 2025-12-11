/**
 * Import Old .jitte Files
 *
 * Handles importing .jitte files that use the old full card format (v1.0).
 * Converts to slim format and stores in new IndexedDB structure.
 *
 * This is not a migration in the traditional sense - it's an import utility
 * that can be called when the user imports an old .jitte file.
 */

import type { DeckArchive } from '$lib/utils/zip';
import type { CardReference, CardReferencesByCategory, MaybeboardReference } from '$lib/types/card-reference';
import type { VersionBase } from '$lib/types/version-delta';
import type { DeckFormat } from '$lib/formats/format-registry';
import { deckDatabase, type StoredDeck, type StoredVersion } from '../deck-database';
import { cardCache } from '$lib/api/cache';
import type { ScryfallCard } from '$lib/types/scryfall';
import { detectVersionFormat } from '../deck-serializer';
import type { LegacyCard } from './types';
import { isLegacyCard } from './types';

/**
 * Progress callback for import
 */
export type ImportProgressCallback = (progress: ImportProgress) => void;

/**
 * Import progress
 */
export interface ImportProgress {
	step: string;
	percentage: number;
	currentItem?: string;
}

/**
 * Import result
 */
export interface ImportResult {
	success: boolean;
	deckName?: string;
	error?: string;
	warnings?: string[];
	wasConverted: boolean;
	cardsCached: number;
}

/**
 * Check if a .jitte archive is in old format
 */
export function isOldJitteFormat(archive: DeckArchive): boolean {
	for (const [, branchVersions] of Object.entries(archive.versions)) {
		for (const content of Object.values(branchVersions)) {
			const format = detectVersionFormat(content);
			if (format === 'json-v1' || format === 'plaintext') {
				return true;
			}
		}
	}
	return false;
}

/**
 * Convert a legacy card to CardReference
 */
function legacyCardToReference(card: LegacyCard): CardReference | null {
	if (!card.scryfallId) {
		return null;
	}

	return {
		scryfallId: card.scryfallId,
		quantity: card.quantity || 1,
		setCode: card.setCode || '',
		collectorNumber: card.collectorNumber || '',
		customCmc: card.customCmc,
		customColorIdentity: card.customColorIdentity,
		customCategory: card.customCategory
	};
}

/**
 * Cache a legacy card for hydration
 */
async function cacheLegacyCard(card: LegacyCard): Promise<boolean> {
	if (!card.scryfallId) return false;

	const existing = await cardCache.getCard(card.scryfallId);
	if (existing) return false;

	// Build a minimal ScryfallCard from legacy data for caching
	// Cast through unknown due to partial type requirements
	const scryfallCard = {
		id: card.scryfallId,
		oracle_id: card.oracleId || '',
		name: card.name,
		mana_cost: card.manaCost || '',
		cmc: card.cmc || 0,
		type_line: card.types?.join(' ') || '',
		oracle_text: card.oracleText || '',
		colors: [] as string[],
		color_identity: (card.colorIdentity || []) as string[],
		set: card.setCode || '',
		collector_number: card.collectorNumber || '',
		prices: {
			usd: card.prices?.['usd']?.toString() || null,
			usd_foil: card.prices?.['usd_foil']?.toString() || null,
			usd_etched: null,
			eur: card.prices?.['eur']?.toString() || null,
			eur_foil: null,
			tix: null,
			manapool: card.prices?.['manapool']?.toString() || null
		},
		image_uris: {
			small: card.imageUrls?.['small'] || '',
			normal: card.imageUrls?.['normal'] || '',
			large: card.imageUrls?.['large'] || '',
			png: card.imageUrls?.['png'] || '',
			art_crop: card.imageUrls?.['art_crop'] || '',
			border_crop: card.imageUrls?.['border_crop'] || ''
		}
	} as unknown as ScryfallCard;

	await cardCache.cacheCard(scryfallCard);
	return true;
}

/**
 * Convert cards by category to references
 */
function convertCardsByCategory(
	legacyCards: Record<string, unknown[]>
): { refs: CardReferencesByCategory; cards: LegacyCard[] } {
	const refs: CardReferencesByCategory = {};
	const allCards: LegacyCard[] = [];

	for (const [category, cards] of Object.entries(legacyCards)) {
		refs[category] = [];
		for (const card of cards) {
			if (isLegacyCard(card)) {
				const ref = legacyCardToReference(card);
				if (ref) {
					refs[category].push(ref);
					allCards.push(card);
				}
			}
		}
	}

	return { refs, cards: allCards };
}

/**
 * Parse version content and extract cards
 */
function parseVersionContent(content: string): Record<string, unknown[]> | null {
	try {
		const parsed = JSON.parse(content);
		if (parsed.cards && typeof parsed.cards === 'object') {
			return parsed.cards;
		}
	} catch {
		// Not JSON
	}
	return null;
}

/**
 * Import an old format .jitte file
 *
 * @param archive - The decompressed archive from the .jitte file
 * @param onProgress - Optional progress callback
 * @returns Import result
 */
export async function importOldJitteFile(
	archive: DeckArchive,
	onProgress?: ImportProgressCallback
): Promise<ImportResult> {
	const warnings: string[] = [];
	let cardsCached = 0;

	try {
		const manifest = archive.manifest;
		const deckName = manifest.name;

		onProgress?.({
			step: 'Checking format',
			percentage: 0
		});

		// Check if it's actually old format
		const needsConversion = isOldJitteFormat(archive);

		if (!needsConversion) {
			// Already in new format, just save directly
			return {
				success: true,
				deckName,
				wasConverted: false,
				cardsCached: 0
			};
		}

		onProgress?.({
			step: 'Converting deck',
			percentage: 10,
			currentItem: deckName
		});

		const now = Date.now();

		// Create stored deck
		const storedDeck: StoredDeck = {
			name: deckName,
			manifest: {
				...manifest,
				format: (manifest.format || 'commander') as DeckFormat
			},
			format: (manifest.format || 'commander') as DeckFormat,
			createdAt: new Date(manifest.createdAt).getTime(),
			updatedAt: now,
			storageSchemaVersion: '2.0',
			branchBases: {}
		};

		// Process versions
		let versionCount = 0;
		const totalVersions = Object.values(archive.versions).reduce(
			(sum, branch) => sum + Object.keys(branch).length,
			0
		);

		for (const [branchName, branchVersions] of Object.entries(archive.versions)) {
			storedDeck.branchBases[branchName] = [];

			for (const [versionFile, content] of Object.entries(branchVersions)) {
				versionCount++;

				onProgress?.({
					step: 'Converting versions',
					percentage: 10 + Math.round((versionCount / totalVersions) * 50),
					currentItem: `${branchName}/${versionFile}`
				});

				const versionMatch = versionFile.match(/v([\d.]+)\.(json|txt)$/);
				if (!versionMatch) continue;

				const version = versionMatch[1];
				const legacyCards = parseVersionContent(content);

				if (!legacyCards) {
					warnings.push(`Could not parse ${branchName}/${versionFile}`);
					continue;
				}

				const { refs, cards } = convertCardsByCategory(legacyCards);

				// Cache cards
				for (const card of cards) {
					const wasCached = await cacheLegacyCard(card);
					if (wasCached) cardsCached++;
				}

				// Create base
				const base: VersionBase = {
					schemaVersion: '2.0',
					version,
					cards: refs
				};

				const branchMeta = manifest.branches.find((b) => b.name === branchName);
				const versionMeta = branchMeta?.versions.find((v) => v.version === version);

				const storedVersion: StoredVersion = {
					id: `${deckName}/${branchName}/${version}`,
					deckName,
					branch: branchName,
					version,
					isBase: true,
					content: base,
					meta: {
						version,
						branch: branchName,
						commitMessage: versionMeta?.commitMessage || 'Imported from old format',
						timestamp: versionMeta?.timestamp || new Date().toISOString(),
						isBase: true
					}
				};

				await deckDatabase.saveVersion(storedVersion);
				storedDeck.branchBases[branchName].push(version);
			}
		}

		// Save deck
		await deckDatabase.saveDeck(storedDeck);

		onProgress?.({
			step: 'Converting maybeboard',
			percentage: 70
		});

		// Convert maybeboard
		if (archive.maybeboard?.categories) {
			const slimMaybeboard: MaybeboardReference = {
				categories: archive.maybeboard.categories.map((cat, index) => {
					const { refs, cards } = convertCardsByCategory({ cards: cat.cards as unknown[] });

					// Cache maybeboard cards
					for (const card of cards) {
						cacheLegacyCard(card).then((wasCached) => {
							if (wasCached) cardsCached++;
						});
					}

					return {
						id: cat.id,
						name: cat.name,
						cards: refs.cards || [],
						order: index,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					};
				}),
				defaultCategoryId: archive.maybeboard.defaultCategoryId
			};

			await deckDatabase.saveMaybeboard(deckName, slimMaybeboard);
		}

		onProgress?.({
			step: 'Converting stashes',
			percentage: 85
		});

		// Convert stashes
		if (archive.stashes) {
			for (const [branchName, stashContent] of Object.entries(archive.stashes)) {
				try {
					const parsed = JSON.parse(stashContent);
					if (parsed.cards) {
						const { refs, cards } = convertCardsByCategory(parsed.cards);

						for (const card of cards) {
							const wasCached = await cacheLegacyCard(card);
							if (wasCached) cardsCached++;
						}

						await deckDatabase.saveStash(deckName, branchName, {
							cards: refs,
							stashedAt: new Date().toISOString(),
							message: parsed.message
						});
					}
				} catch {
					warnings.push(`Could not convert stash for ${branchName}`);
				}
			}
		}

		onProgress?.({
			step: 'Import complete',
			percentage: 100
		});

		return {
			success: true,
			deckName,
			warnings: warnings.length > 0 ? warnings : undefined,
			wasConverted: true,
			cardsCached
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Import failed',
			warnings: warnings.length > 0 ? warnings : undefined,
			wasConverted: false,
			cardsCached
		};
	}
}

/**
 * Check if a deck needs to be imported in old format
 */
export function needsOldFormatImport(archive: DeckArchive): boolean {
	return isOldJitteFormat(archive);
}
