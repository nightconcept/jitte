/**
 * IndexedDB Deck Storage Provider
 *
 * Uses the new slim CardReference format with delta-based versioning.
 * Stores deck data in IndexedDB (jitte-deck-storage database).
 *
 * Key differences from other providers:
 * - Uses slim CardReference format (not full Card objects)
 * - Delta-based version storage (not full snapshots)
 * - Automatic hydration from Scryfall cache on load
 */

import type { DeckFormat } from '$lib/formats/format-registry';
import type { CardReferencesByCategory, MaybeboardReference } from '$lib/types/card-reference';
import type { VersionBase, VersionMeta } from '$lib/types/version-delta';
import type { DeckManifest } from '$lib/types/deck';
import type { Maybeboard } from '$lib/types/maybeboard';
import type { DeckArchive } from '$lib/utils/zip';
import type { DeckListEntry, IStorageProvider, StorageCapabilities, StorageResult } from './types';
import { StorageErrorCode, StorageProvider } from './types';
import {
	deckDatabase,
	type StoredDeck,
	type StoredVersion,
	type StoredMaybeboard
} from './deck-database';
import { cardsToReferences, referencesToCards, extractScryfallIds } from '$lib/utils/card-reference';
import { hydrateCardReferences } from '$lib/utils/card-hydration';
import {
	calculateEnhancedDelta,
	createBaseSnapshot,
	type EnhancedVersionDelta
} from '$lib/utils/version-delta';
import {
	reconstructVersion,
	countVersionsSinceBase,
	compareVersions
} from '$lib/utils/version-reconstruction';
import { BASE_SNAPSHOT_INTERVAL } from '$lib/types/version-delta';

/**
 * IndexedDB implementation of IStorageProvider
 * Uses slim format internally, converts to/from DeckArchive for compatibility
 */
export class IndexedDBDeckProvider implements IStorageProvider {
	readonly type = StorageProvider.IndexedDB;

	private initialized = false;

	getCapabilities(): StorageCapabilities {
		return {
			canStoreFiles: true,
			canCreateDirectories: false, // IndexedDB doesn't use directories
			canListFiles: true,
			requiresPermission: false, // No user permission needed
			maxSize: undefined // IndexedDB has large quota (50MB+)
		};
	}

	async initialize(): Promise<StorageResult<void>> {
		try {
			// Test that IndexedDB is available by getting stats
			await deckDatabase.getStats();
			this.initialized = true;

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'IndexedDB not available',
				errorCode: StorageErrorCode.NotSupported
			};
		}
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Save a deck archive to IndexedDB
	 * Converts full Card objects to slim CardReferences
	 */
	async saveDeck(deckName: string, archive: DeckArchive): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const { manifest, maybeboard, versions } = archive;

			// Get existing deck to determine if this is new or update
			const existingDeck = await deckDatabase.getDeck(deckName);
			const now = Date.now();

			// Convert maybeboard to slim format
			const slimMaybeboard: MaybeboardReference = {
				categories: maybeboard.categories.map((cat) => ({
					id: cat.id,
					name: cat.name,
					cards: cardsToReferences({ [cat.id]: cat.cards })[cat.id] || [],
					description: cat.description,
					order: cat.order,
					createdAt: cat.createdAt,
					updatedAt: cat.updatedAt
				})),
				defaultCategoryId: maybeboard.defaultCategoryId
			};

			// Process versions - convert to slim format with deltas
			const branchBases: Record<string, string[]> = existingDeck?.branchBases || {};

			for (const [branchName, branchVersions] of Object.entries(versions)) {
				// Get existing versions for this branch
				const existingVersions = await deckDatabase.getVersionsForBranch(deckName, branchName);

				for (const [versionFile, content] of Object.entries(branchVersions)) {
					// Extract version number from filename (e.g., "v1.0.0.json" -> "1.0.0")
					const versionMatch = versionFile.match(/v([\d.]+)\.(json|txt)$/);
					if (!versionMatch) continue;

					const version = versionMatch[1];

					// Check if version already exists
					const existingVersion = existingVersions.find((v) => v.version === version);
					if (existingVersion) continue; // Skip existing versions

					// Parse the content to get cards
					let cards: CardReferencesByCategory;
					try {
						const parsed = JSON.parse(content);
						// Convert full cards to references
						cards = cardsToReferences(parsed.cards || {});
					} catch {
						// Try plaintext parsing fallback (legacy)
						console.warn(`[IndexedDBProvider] Could not parse version ${version}, skipping`);
						continue;
					}

					// Determine if this should be a base or delta
					const versionsSinceBase = countVersionsSinceBase(version, existingVersions);
					const isFirstVersion = existingVersions.length === 0;
					const shouldBeBase = isFirstVersion || versionsSinceBase >= BASE_SNAPSHOT_INTERVAL;

					if (shouldBeBase) {
						// Create base snapshot
						const base = createBaseSnapshot(cards, version);

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
								commitMessage: `Version ${version}`,
								timestamp: new Date().toISOString(),
								isBase: true
							}
						};

						await deckDatabase.saveVersion(storedVersion);

						// Track base
						if (!branchBases[branchName]) {
							branchBases[branchName] = [];
						}
						if (!branchBases[branchName].includes(version)) {
							branchBases[branchName].push(version);
						}
					} else {
						// Create delta from previous version
						// Find the previous version
						const sortedVersions = [...existingVersions]
							.map((v) => v.version)
							.sort(compareVersions);
						const prevVersion = sortedVersions[sortedVersions.length - 1];

						if (prevVersion) {
							// Reconstruct previous version to calculate delta
							const prevReconstructed = reconstructVersion(prevVersion, existingVersions);
							const nearestBase = branchBases[branchName]?.[branchBases[branchName].length - 1] || prevVersion;

							const deltaResult = calculateEnhancedDelta(
								prevReconstructed.cards,
								cards,
								nearestBase,
								prevVersion,
								version,
								versionsSinceBase
							);

							const storedVersion: StoredVersion = {
								id: `${deckName}/${branchName}/${version}`,
								deckName,
								branch: branchName,
								version,
								isBase: false,
								content: deltaResult.delta,
								meta: {
									version,
									branch: branchName,
									commitMessage: `Version ${version}`,
									timestamp: new Date().toISOString(),
									isBase: false,
									baseVersion: nearestBase,
									deltaDepth: versionsSinceBase + 1
								}
							};

							await deckDatabase.saveVersion(storedVersion);
						}
					}
				}
			}

			// Save deck record
			const storedDeck: StoredDeck = {
				name: deckName,
				manifest,
				format: manifest.format as DeckFormat,
				createdAt: existingDeck?.createdAt || now,
				updatedAt: now,
				storageSchemaVersion: '2.0',
				branchBases
			};

			await deckDatabase.saveDeck(storedDeck);

			// Save maybeboard
			await deckDatabase.saveMaybeboard(deckName, slimMaybeboard);

			// Save stashes if present
			if (archive.stashes) {
				for (const [branchName, stashContent] of Object.entries(archive.stashes)) {
					try {
						const parsed = JSON.parse(stashContent);
						const stashCards = cardsToReferences(parsed.cards || {});
						await deckDatabase.saveStash(deckName, branchName, {
							cards: stashCards,
							stashedAt: new Date().toISOString(),
							message: parsed.message
						});
					} catch {
						// Skip invalid stashes
					}
				}
			}

			return { success: true };
		} catch (error) {
			console.error('[IndexedDBProvider] Save error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to save deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Load a deck archive from IndexedDB
	 * Hydrates slim CardReferences to full Card objects
	 */
	async loadDeck(deckName: string): Promise<StorageResult<DeckArchive>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			// Load deck record
			const storedDeck = await deckDatabase.getDeck(deckName);
			if (!storedDeck) {
				return {
					success: false,
					error: `Deck "${deckName}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			// Load maybeboard
			const slimMaybeboard = await deckDatabase.getMaybeboard(deckName);

			// Build versions object
			const versions: Record<string, Record<string, string>> = {};

			// Get all branches from manifest
			for (const branch of storedDeck.manifest.branches) {
				const branchVersions = await deckDatabase.getVersionsForBranch(deckName, branch.name);

				if (!versions[branch.name]) {
					versions[branch.name] = {};
				}

				for (const sv of branchVersions) {
					// Reconstruct the version
					const reconstructed = reconstructVersion(sv.version, branchVersions);

					// Hydrate cards
					const hydrationResult = await hydrateCardReferences(reconstructed.cards);

					// Serialize to JSON format expected by DeckArchive
					const versionData = {
						schemaVersion: '1.0', // Output in old format for compatibility
						lastModified: sv.meta.timestamp,
						cards: hydrationResult.cards
					};

					versions[branch.name][`v${sv.version}.json`] = JSON.stringify(versionData, null, 2);
				}
			}

			// Hydrate maybeboard
			let maybeboard: Maybeboard = {
				categories: [],
				defaultCategoryId: 'main'
			};

			if (slimMaybeboard) {
				// Collect all card references from maybeboard
				const allMaybeboardRefs: CardReferencesByCategory = {};
				for (const cat of slimMaybeboard.categories) {
					allMaybeboardRefs[cat.id] = cat.cards;
				}

				// Hydrate all at once
				const hydrated = await hydrateCardReferences(allMaybeboardRefs);

				maybeboard = {
					categories: slimMaybeboard.categories.map((cat) => ({
						id: cat.id,
						name: cat.name,
						cards: hydrated.cards[cat.id] || [],
						description: cat.description,
						order: cat.order,
						createdAt: cat.createdAt,
						updatedAt: cat.updatedAt
					})),
					defaultCategoryId: slimMaybeboard.defaultCategoryId
				};
			}

			// Build stashes
			const stashes: Record<string, string> = {};
			for (const branch of storedDeck.manifest.branches) {
				const stash = await deckDatabase.getStash(deckName, branch.name);
				if (stash) {
					const hydrated = await hydrateCardReferences(stash.cards);
					stashes[branch.name] = JSON.stringify({
						cards: hydrated.cards,
						message: stash.message
					});
				}
			}

			const archive: DeckArchive = {
				manifest: storedDeck.manifest,
				maybeboard,
				versions,
				stashes: Object.keys(stashes).length > 0 ? stashes : undefined
			};

			return {
				success: true,
				data: archive
			};
		} catch (error) {
			console.error('[IndexedDBProvider] Load error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to load deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async deleteDeck(deckName: string): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			await deckDatabase.deleteDeck(deckName);
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to delete deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async renameDeck(oldName: string, newName: string): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			// Load old deck
			const loadResult = await this.loadDeck(oldName);
			if (!loadResult.success || !loadResult.data) {
				return {
					success: false,
					error: loadResult.error || 'Failed to load deck for renaming',
					errorCode: loadResult.errorCode
				};
			}

			// Check if new name exists
			const exists = await deckDatabase.deckExists(newName);
			if (exists) {
				return {
					success: false,
					error: `A deck with the name "${newName}" already exists`,
					errorCode: StorageErrorCode.AlreadyExists
				};
			}

			// Update manifest name
			const archive = loadResult.data;
			archive.manifest.name = newName;
			archive.manifest.updatedAt = new Date().toISOString();

			// Save with new name
			const saveResult = await this.saveDeck(newName, archive);
			if (!saveResult.success) {
				return saveResult;
			}

			// Delete old deck
			await deckDatabase.deleteDeck(oldName);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to rename deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async listDecks(): Promise<StorageResult<DeckListEntry[]>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const decks = await deckDatabase.listDecks();

			const entries: DeckListEntry[] = decks.map((deck) => ({
				name: deck.name,
				lastModified: deck.updatedAt
			}));

			// Sort by last modified (newest first)
			entries.sort((a, b) => b.lastModified - a.lastModified);

			return {
				success: true,
				data: entries
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to list decks',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async deckExists(deckName: string): Promise<StorageResult<boolean>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const exists = await deckDatabase.deckExists(deckName);
			return {
				success: true,
				data: exists
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to check deck existence',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async getAvailableSpace(): Promise<StorageResult<number>> {
		try {
			if ('storage' in navigator && 'estimate' in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				const available = (estimate.quota || 0) - (estimate.usage || 0);
				return {
					success: true,
					data: available
				};
			}

			// Default estimate for IndexedDB
			return {
				success: true,
				data: 50 * 1024 * 1024 // 50MB estimate
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get available space',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	// ==================== Slim Format Native Methods ====================

	/**
	 * Save a deck directly in slim format (no conversion)
	 * Used internally and for optimized operations
	 */
	async saveDeckSlim(
		deckName: string,
		manifest: DeckManifest,
		cards: CardReferencesByCategory,
		maybeboard: MaybeboardReference,
		branch: string,
		version: string,
		commitMessage: string
	): Promise<StorageResult<void>> {
		try {
			const existingDeck = await deckDatabase.getDeck(deckName);
			const existingVersions = await deckDatabase.getVersionsForBranch(deckName, branch);
			const now = Date.now();

			// Determine if base or delta
			const branchBases = existingDeck?.branchBases || {};
			const versionsSinceBase = countVersionsSinceBase(version, existingVersions);
			const isFirstVersion = existingVersions.length === 0;
			const shouldBeBase = isFirstVersion || versionsSinceBase >= BASE_SNAPSHOT_INTERVAL;

			let storedVersion: StoredVersion;

			if (shouldBeBase) {
				const base = createBaseSnapshot(cards, version);
				storedVersion = {
					id: `${deckName}/${branch}/${version}`,
					deckName,
					branch,
					version,
					isBase: true,
					content: base,
					meta: {
						version,
						branch,
						commitMessage,
						timestamp: new Date().toISOString(),
						isBase: true
					}
				};

				if (!branchBases[branch]) {
					branchBases[branch] = [];
				}
				branchBases[branch].push(version);
			} else {
				// Get previous version for delta
				const sortedVersions = [...existingVersions]
					.map((v) => v.version)
					.sort(compareVersions);
				const prevVersion = sortedVersions[sortedVersions.length - 1];
				const prevReconstructed = reconstructVersion(prevVersion, existingVersions);
				const nearestBase = branchBases[branch]?.[branchBases[branch].length - 1] || prevVersion;

				const deltaResult = calculateEnhancedDelta(
					prevReconstructed.cards,
					cards,
					nearestBase,
					prevVersion,
					version,
					versionsSinceBase
				);

				storedVersion = {
					id: `${deckName}/${branch}/${version}`,
					deckName,
					branch,
					version,
					isBase: false,
					content: deltaResult.delta,
					meta: {
						version,
						branch,
						commitMessage,
						timestamp: new Date().toISOString(),
						isBase: false,
						baseVersion: nearestBase,
						deltaDepth: versionsSinceBase + 1
					}
				};
			}

			await deckDatabase.saveVersion(storedVersion);

			// Update deck record
			const storedDeck: StoredDeck = {
				name: deckName,
				manifest,
				format: manifest.format as DeckFormat,
				createdAt: existingDeck?.createdAt || now,
				updatedAt: now,
				storageSchemaVersion: '2.0',
				branchBases
			};

			await deckDatabase.saveDeck(storedDeck);
			await deckDatabase.saveMaybeboard(deckName, maybeboard);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to save deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Load a specific version in slim format (no hydration)
	 */
	async loadVersionSlim(
		deckName: string,
		branch: string,
		version: string
	): Promise<StorageResult<CardReferencesByCategory>> {
		try {
			const storedVersions = await deckDatabase.getVersionsForBranch(deckName, branch);
			const reconstructed = reconstructVersion(version, storedVersions);

			return {
				success: true,
				data: reconstructed.cards
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to load version',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}
}

// Export singleton
export const indexedDBDeckProvider = new IndexedDBDeckProvider();
