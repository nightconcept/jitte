/**
 * V1 to V2 Migration
 *
 * Converts decks from full card format (v1.0) to slim CardReference format (v2.0).
 * This is the primary migration for the storage redesign.
 *
 * What it does:
 * 1. Loads all decks from old storage (localStorage/FileSystem)
 * 2. Converts full Card objects to CardReferences (~25x smaller)
 * 3. Creates base snapshots for each branch's current version
 * 4. Stores in new IndexedDB format
 * 5. Caches full card data in jitte-card-cache for future hydration
 */

import type {
	Migration,
	MigrationProgressCallback,
	MigrationResult,
	LegacyDeckData,
	LegacyCard
} from './types';
import { deckDatabase, type StoredDeck, type StoredVersion } from '../deck-database';
import { cardCache } from '$lib/api/cache';
import type { ScryfallCard } from '$lib/types/scryfall';
import type { CardReference, CardReferencesByCategory, MaybeboardReference } from '$lib/types/card-reference';
import type { VersionBase } from '$lib/types/version-delta';
import type { DeckFormat } from '$lib/formats/format-registry';
import { getStorageManager } from '../storage-manager';
import { detectVersionFormat } from '../deck-serializer';

// Storage keys for old localStorage format
const DECK_LIST_KEY = 'jitte-deck-list';
const DECK_PREFIX = 'jitte-deck-';

/**
 * Check if localStorage has old format decks
 */
function hasLocalStorageDecks(): boolean {
	if (typeof localStorage === 'undefined') return false;

	const deckListJson = localStorage.getItem(DECK_LIST_KEY);
	if (!deckListJson) return false;

	try {
		const deckList = JSON.parse(deckListJson);
		return Array.isArray(deckList) && deckList.length > 0;
	} catch {
		return false;
	}
}

/**
 * Get deck names from localStorage
 */
function getLocalStorageDeckNames(): string[] {
	if (typeof localStorage === 'undefined') return [];

	const deckListJson = localStorage.getItem(DECK_LIST_KEY);
	if (!deckListJson) return [];

	try {
		const deckList = JSON.parse(deckListJson);
		return Array.isArray(deckList) ? deckList : [];
	} catch {
		return [];
	}
}

/**
 * Load a deck from localStorage
 */
function loadDeckFromLocalStorage(deckName: string): LegacyDeckData | null {
	if (typeof localStorage === 'undefined') return null;

	const key = `${DECK_PREFIX}${deckName}`;
	const deckJson = localStorage.getItem(key);
	if (!deckJson) return null;

	try {
		return JSON.parse(deckJson);
	} catch {
		return null;
	}
}

/**
 * Convert a legacy card to a CardReference
 */
function legacyCardToReference(card: LegacyCard): CardReference | null {
	// Must have scryfallId for the new format
	if (!card.scryfallId) {
		console.warn(`[V1ToV2] Card "${card.name}" missing scryfallId, skipping`);
		return null;
	}

	return {
		scryfallId: card.scryfallId,
		quantity: card.quantity || 1,
		setCode: card.setCode || '',
		collectorNumber: card.collectorNumber || '',
		// Preserve custom overrides (especially for Cube format)
		customCmc: card.customCmc,
		customColorIdentity: card.customColorIdentity,
		customCategory: card.customCategory
	};
}

/**
 * Convert legacy cards by category to CardReferencesByCategory
 */
function convertCardsByCategory(
	legacyCards: Record<string, LegacyCard[]>
): CardReferencesByCategory {
	const refs: CardReferencesByCategory = {};

	for (const [category, cards] of Object.entries(legacyCards)) {
		refs[category] = [];
		for (const card of cards) {
			const ref = legacyCardToReference(card);
			if (ref) {
				refs[category].push(ref);
			}
		}
	}

	return refs;
}

/**
 * Cache a legacy card's full data for future hydration
 */
async function cacheLegacyCard(card: LegacyCard): Promise<void> {
	if (!card.scryfallId) return;

	// Check if already cached
	const existing = await cardCache.getCard(card.scryfallId);
	if (existing) return;

	// Build a minimal ScryfallCard from legacy data for caching
	// This allows immediate hydration without API calls
	// We need to cast to unknown first due to partial type requirements
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
}

/**
 * Parse legacy version content
 */
function parseVersionContent(content: string): Record<string, LegacyCard[]> | null {
	const format = detectVersionFormat(content);

	if (format === 'json-v1' || format === 'unknown') {
		try {
			const parsed = JSON.parse(content);
			if (parsed.cards && typeof parsed.cards === 'object') {
				return parsed.cards;
			}
		} catch {
			return null;
		}
	}

	// For plaintext format, we can't easily convert without Scryfall lookup
	if (format === 'plaintext') {
		console.warn('[V1ToV2] Plaintext version format detected, requires manual migration');
		return null;
	}

	return null;
}

/**
 * V1 to V2 Migration Implementation
 */
export class V1ToV2Migration implements Migration {
	id = 'v1-to-v2';
	description = 'Convert decks from full card format to slim CardReference format';
	fromVersion = '1.0' as const;
	toVersion = '2.0' as const;

	private migratedDecks: string[] = [];
	private warnings: string[] = [];

	async canMigrate(): Promise<boolean> {
		// Check if there are any old format decks
		if (hasLocalStorageDecks()) {
			return true;
		}

		// Check if storage manager has old format decks
		try {
			const storageManager = getStorageManager();
			if (!storageManager.isInitialized()) {
				return false;
			}

			const listResult = await storageManager.listDecks();
			if (listResult.success && listResult.data && listResult.data.length > 0) {
				// Check if any deck is in old format by loading one
				const firstDeck = listResult.data[0];
				const loadResult = await storageManager.loadDeck(firstDeck.name);
				if (loadResult.success && loadResult.data) {
					// Check if versions are in old format
					for (const [, branchVersions] of Object.entries(loadResult.data.versions)) {
						for (const content of Object.values(branchVersions)) {
							const format = detectVersionFormat(content);
							if (format === 'json-v1' || format === 'plaintext') {
								return true;
							}
						}
					}
				}
			}
		} catch (error) {
			console.error('[V1ToV2] Error checking for old format decks:', error);
		}

		return false;
	}

	async migrate(onProgress?: MigrationProgressCallback): Promise<MigrationResult> {
		const startTime = Date.now();
		this.migratedDecks = [];
		this.warnings = [];

		try {
			// Collect all decks to migrate
			const decksToMigrate: Array<{ name: string; source: 'localStorage' | 'fileSystem'; data?: LegacyDeckData }> = [];

			// Check localStorage first
			const localStorageDecks = getLocalStorageDeckNames();
			for (const deckName of localStorageDecks) {
				const data = loadDeckFromLocalStorage(deckName);
				if (data) {
					decksToMigrate.push({ name: deckName, source: 'localStorage', data });
				}
			}

			// Check FileSystem storage
			try {
				const storageManager = getStorageManager();
				if (storageManager.isInitialized()) {
					const listResult = await storageManager.listDecks();
					if (listResult.success && listResult.data) {
						for (const entry of listResult.data) {
							// Skip if already in localStorage list
							if (localStorageDecks.includes(entry.name)) continue;

							decksToMigrate.push({ name: entry.name, source: 'fileSystem' });
						}
					}
				}
			} catch (error) {
				this.warnings.push(`Could not check FileSystem storage: ${error}`);
			}

			const totalDecks = decksToMigrate.length;
			if (totalDecks === 0) {
				return {
					success: true,
					itemsMigrated: 0,
					durationMs: Date.now() - startTime
				};
			}

			onProgress?.({
				step: 'Migrating decks',
				percentage: 0,
				totalItems: totalDecks,
				processedItems: 0
			});

			// Migrate each deck
			for (let i = 0; i < decksToMigrate.length; i++) {
				const { name, source, data } = decksToMigrate[i];

				onProgress?.({
					step: 'Migrating decks',
					percentage: Math.round((i / totalDecks) * 100),
					currentItem: name,
					totalItems: totalDecks,
					processedItems: i
				});

				try {
					await this.migrateDeck(name, source, data);
					this.migratedDecks.push(name);
				} catch (error) {
					this.warnings.push(`Failed to migrate deck "${name}": ${error}`);
				}
			}

			onProgress?.({
				step: 'Migration complete',
				percentage: 100,
				totalItems: totalDecks,
				processedItems: totalDecks
			});

			return {
				success: true,
				itemsMigrated: this.migratedDecks.length,
				warnings: this.warnings.length > 0 ? this.warnings : undefined,
				durationMs: Date.now() - startTime
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Migration failed',
				warnings: this.warnings.length > 0 ? this.warnings : undefined,
				durationMs: Date.now() - startTime
			};
		}
	}

	private async migrateDeck(
		name: string,
		source: 'localStorage' | 'fileSystem',
		data?: LegacyDeckData
	): Promise<void> {
		console.log(`[V1ToV2] Migrating deck "${name}" from ${source}`);

		// Load deck data if not provided
		let deckData = data;
		if (!deckData && source === 'fileSystem') {
			const storageManager = getStorageManager();
			const loadResult = await storageManager.loadDeck(name);
			if (!loadResult.success || !loadResult.data) {
				throw new Error(`Failed to load deck: ${loadResult.error}`);
			}
			deckData = loadResult.data as unknown as LegacyDeckData;
		}

		if (!deckData) {
			throw new Error('No deck data available');
		}

		const now = Date.now();
		const manifest = deckData.manifest;

		// Create stored deck record
		// Note: Legacy format stores stashes separately from manifest
		const storedDeck: StoredDeck = {
			name: manifest.name,
			manifest: {
				...manifest,
				format: (manifest.format || 'commander') as DeckFormat,
				stashes: {},  // Will be populated from deckData.stashes during stash migration
				appVersion: manifest.appVersion || '0.0.0'
			},
			format: (manifest.format || 'commander') as DeckFormat,
			createdAt: new Date(manifest.createdAt).getTime(),
			updatedAt: now,
			storageSchemaVersion: '2.0',
			branchBases: {}
		};

		// Process each branch
		for (const [branchName, branchVersions] of Object.entries(deckData.versions)) {
			storedDeck.branchBases[branchName] = [];

			for (const [versionFile, content] of Object.entries(branchVersions)) {
				// Extract version number
				const versionMatch = versionFile.match(/v([\d.]+)\.(json|txt)$/);
				if (!versionMatch) continue;

				const version = versionMatch[1];

				// Parse the version content
				const legacyCards = parseVersionContent(content);
				if (!legacyCards) {
					this.warnings.push(`Could not parse version ${version} of branch ${branchName}`);
					continue;
				}

				// Convert to CardReferences
				const refs = convertCardsByCategory(legacyCards);

				// Cache all cards for future hydration
				for (const cards of Object.values(legacyCards)) {
					for (const card of cards) {
						await cacheLegacyCard(card);
					}
				}

				// Create base snapshot (all versions become bases during migration)
				const base: VersionBase = {
					schemaVersion: '2.0',
					version,
					cards: refs
				};

				// Find branch metadata
				const branchMeta = manifest.branches.find((b) => b.name === branchName);
				const versionMeta = branchMeta?.versions.find((v) => v.version === version);

				// Create stored version
				const storedVersion: StoredVersion = {
					id: `${name}/${branchName}/${version}`,
					deckName: name,
					branch: branchName,
					version,
					isBase: true,
					content: base,
					meta: {
						version,
						branch: branchName,
						commitMessage: versionMeta?.commitMessage || `Migrated from v1.0`,
						timestamp: versionMeta?.timestamp || new Date().toISOString(),
						isBase: true
					}
				};

				await deckDatabase.saveVersion(storedVersion);

				// Track as a base version
				if (!storedDeck.branchBases[branchName].includes(version)) {
					storedDeck.branchBases[branchName].push(version);
				}
			}
		}

		// Save the deck record
		await deckDatabase.saveDeck(storedDeck);

		// Migrate maybeboard if present
		if (deckData.maybeboard) {
			const slimMaybeboard: MaybeboardReference = {
				categories: deckData.maybeboard.categories.map((cat, index) => {
					const cards = cat.cards as unknown as LegacyCard[];
					const refs: CardReference[] = [];

					for (const card of cards) {
						const ref = legacyCardToReference(card);
						if (ref) {
							refs.push(ref);
							// Cache for hydration
							cacheLegacyCard(card);
						}
					}

					return {
						id: cat.id,
						name: cat.name,
						cards: refs,
						order: index,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					};
				}),
				defaultCategoryId: deckData.maybeboard.defaultCategoryId
			};

			await deckDatabase.saveMaybeboard(name, slimMaybeboard);
		}

		// Migrate stashes if present
		if (deckData.stashes) {
			for (const [branchName, stashContent] of Object.entries(deckData.stashes)) {
				try {
					const parsed = JSON.parse(stashContent);
					if (parsed.cards) {
						const refs = convertCardsByCategory(parsed.cards);

						// Cache stash cards
						for (const cards of Object.values(parsed.cards)) {
							for (const card of cards as LegacyCard[]) {
								await cacheLegacyCard(card);
							}
						}

						await deckDatabase.saveStash(name, branchName, {
							cards: refs,
							stashedAt: new Date().toISOString(),
							message: parsed.message
						});
					}
				} catch (error) {
					this.warnings.push(`Could not migrate stash for branch ${branchName}`);
				}
			}
		}

		console.log(`[V1ToV2] Successfully migrated deck "${name}"`);
	}

	async validate(): Promise<boolean> {
		// Verify all migrated decks exist in new format
		for (const deckName of this.migratedDecks) {
			const deck = await deckDatabase.getDeck(deckName);
			if (!deck) {
				console.error(`[V1ToV2] Validation failed: deck "${deckName}" not found`);
				return false;
			}

			// Verify at least one version exists (check all branches)
			let hasVersions = false;
			for (const branchName of Object.keys(deck.branchBases)) {
				const versions = await deckDatabase.getVersionsForBranch(deckName, branchName);
				if (versions.length > 0) {
					hasVersions = true;
					break;
				}
			}

			if (!hasVersions) {
				console.error(`[V1ToV2] Validation failed: deck "${deckName}" has no versions`);
				return false;
			}
		}

		return true;
	}
}

// Export a singleton instance
export const v1ToV2Migration = new V1ToV2Migration();
