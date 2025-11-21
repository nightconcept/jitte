/**
 * Script to automatically update Magic: The Gathering ban lists
 *
 * Usage:
 *   pnpm update-ban-lists
 *   or
 *   npx tsx scripts/update-ban-lists.ts
 *
 * This script:
 * 1. Fetches banned/restricted cards from Scryfall API
 * 2. Generates updated ban list files for each format
 * 3. Preserves ban dates where possible (merges with existing data)
 * 4. Updates last_updated timestamps
 *
 * Data source: Scryfall API (api.scryfall.com)
 * Rate limit: 10 requests per second (100ms delay between requests)
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Format definitions matching the project's DeckFormat enum
const FORMATS = {
	commander: {
		scryfallName: 'commander',
		fileName: 'commander',
		displayName: 'Commander',
		source: 'https://mtgcommander.net/index.php/banned-list/'
	},
	modern: {
		scryfallName: 'modern',
		fileName: 'modern',
		displayName: 'Modern',
		source: 'https://magic.wizards.com/en/banned-restricted'
	},
	standard: {
		scryfallName: 'standard',
		fileName: 'standard',
		displayName: 'Standard',
		source: 'https://magic.wizards.com/en/banned-restricted'
	},
	vintage: {
		scryfallName: 'vintage',
		fileName: 'vintage',
		displayName: 'Vintage',
		source: 'https://magic.wizards.com/en/banned-restricted'
	},
	legacy: {
		scryfallName: 'legacy',
		fileName: 'legacy',
		displayName: 'Legacy',
		source: 'https://magic.wizards.com/en/banned-restricted'
	},
	pioneer: {
		scryfallName: 'pioneer',
		fileName: 'pioneer',
		displayName: 'Pioneer',
		source: 'https://magic.wizards.com/en/banned-restricted'
	},
	pauper: {
		scryfallName: 'pauper',
		fileName: 'pauper',
		displayName: 'Pauper',
		source: 'https://magic.wizards.com/en/banned-restricted'
	},
	brawl: {
		scryfallName: 'brawl',
		fileName: 'brawl',
		displayName: 'Brawl',
		source: 'https://magic.wizards.com/en/banned-restricted'
	},
	historic: {
		scryfallName: 'historic',
		fileName: 'historic',
		displayName: 'Historic',
		source: 'https://magic.wizards.com/en/banned-restricted'
	},
	alchemy: {
		scryfallName: 'alchemy',
		fileName: 'alchemy',
		displayName: 'Alchemy',
		source: 'https://magic.wizards.com/en/banned-restricted'
	},
	oathbreaker: {
		scryfallName: 'oathbreaker',
		fileName: 'oathbreaker',
		displayName: 'Oathbreaker',
		source: 'https://oathbreakermtg.org/banned-list/'
	},
	predh: {
		scryfallName: 'predh',
		fileName: 'predh',
		displayName: 'Pre-EDH',
		source: 'https://www.predhcommander.com/home'
	}
} as const;

interface ScryfallCard {
	name: string;
	oracle_id: string;
	legalities: Record<string, 'legal' | 'not_legal' | 'banned' | 'restricted'>;
	released_at: string;
}

interface BanListEntry {
	cardName: string;
	bannedDate: string;
	oracleId?: string;
}

interface ExistingBanList {
	banned: Array<BanListEntry | string>;
	restricted?: Array<BanListEntry | string>;
	suspended?: Array<BanListEntry | string>;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch all cards with a specific legality status from Scryfall
 */
async function fetchCardsWithLegality(
	format: string,
	legality: 'banned' | 'restricted'
): Promise<ScryfallCard[]> {
	const query = `${legality}:${format}`;
	const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;

	console.log(`  Fetching ${legality} cards for ${format}...`);

	const response = await fetch(url, {
		headers: {
			'User-Agent': 'Jitte Ban List Updater (github.com/user/jitte)',
			Accept: 'application/json'
		}
	});

	// Rate limiting: wait 100ms between requests
	await sleep(100);

	if (!response.ok) {
		if (response.status === 404) {
			// No cards found with this legality
			return [];
		}
		throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	const cards: ScryfallCard[] = data.data || [];

	// Handle pagination if there are more results
	let nextPage = data.next_page;
	while (nextPage) {
		console.log(`  Fetching next page...`);
		await sleep(100);

		const pageResponse = await fetch(nextPage, {
			headers: {
				'User-Agent': 'Jitte Ban List Updater (github.com/user/jitte)',
				Accept: 'application/json'
			}
		});

		if (!pageResponse.ok) break;

		const pageData = await pageResponse.json();
		cards.push(...(pageData.data || []));
		nextPage = pageData.next_page;
	}

	return cards;
}

/**
 * Load existing ban list to preserve ban dates
 */
function loadExistingBanList(formatFileName: string): ExistingBanList | null {
	const filePath = join(process.cwd(), 'src/lib/formats/ban-lists', `${formatFileName}.ts`);

	if (!existsSync(filePath)) {
		return null;
	}

	try {
		const content = readFileSync(filePath, 'utf-8');

		// Extract banned array using regex (simple parser)
		const bannedMatch = content.match(/banned:\s*\[([\s\S]*?)\]/);
		const restrictedMatch = content.match(/restricted:\s*\[([\s\S]*?)\]/);
		const suspendedMatch = content.match(/suspended:\s*\[([\s\S]*?)\]/);

		const result: ExistingBanList = { banned: [] };

		if (bannedMatch) {
			result.banned = parseCardEntries(bannedMatch[1]);
		}
		if (restrictedMatch) {
			result.restricted = parseCardEntries(restrictedMatch[1]);
		}
		if (suspendedMatch) {
			result.suspended = parseCardEntries(suspendedMatch[1]);
		}

		return result;
	} catch (error) {
		console.warn(`  Warning: Could not parse existing ban list for ${formatFileName}`);
		return null;
	}
}

/**
 * Parse card entries from ban list array string
 */
function parseCardEntries(arrayContent: string): BanListEntry[] {
	const entries: BanListEntry[] = [];
	const objectPattern = /\{\s*cardName:\s*['"]([^'"]+)['"]\s*,\s*bannedDate:\s*['"]([^'"]+)['"]\s*(?:,\s*oracleId:\s*['"]([^'"]+)['"])?\s*\}/g;

	let match: RegExpExecArray | null;
	while ((match = objectPattern.exec(arrayContent)) !== null) {
		entries.push({
			cardName: match[1],
			bannedDate: match[2],
			oracleId: match[3]
		});
	}

	return entries;
}

/**
 * Merge new ban list with existing data to preserve dates
 */
function mergeBanLists(
	newCards: ScryfallCard[],
	existing: BanListEntry[] | undefined
): BanListEntry[] {
	const existingMap = new Map<string, BanListEntry>();

	// Build map of existing cards
	if (existing) {
		for (const entry of existing) {
			const cardName = typeof entry === 'string' ? entry : entry.cardName;
			if (typeof entry !== 'string') {
				existingMap.set(cardName.toLowerCase(), entry);
			}
		}
	}

	// Merge with new data
	return newCards.map(card => {
		const existing = existingMap.get(card.name.toLowerCase());

		return {
			cardName: card.name,
			bannedDate: existing?.bannedDate || card.released_at || new Date().toISOString().split('T')[0],
			oracleId: card.oracle_id
		};
	});
}

/**
 * Generate TypeScript file content for a format's ban list
 */
function generateBanListFile(
	formatKey: string,
	formatConfig: typeof FORMATS[keyof typeof FORMATS],
	banned: BanListEntry[],
	restricted?: BanListEntry[]
): string {
	const today = new Date().toISOString().split('T')[0];
	const hasDeckFormat = ['commander', 'cube', 'standard', 'modern'].includes(formatKey);

	// Sort by card name
	banned.sort((a, b) => a.cardName.localeCompare(b.cardName));
	if (restricted) {
		restricted.sort((a, b) => a.cardName.localeCompare(b.cardName));
	}

	const formatBannedEntries = banned
		.map(entry => `\t\t{ cardName: '${entry.cardName}', bannedDate: '${entry.bannedDate}' }`)
		.join(',\n');

	const restrictedSection = restricted && restricted.length > 0
		? `,\n\trestricted: [\n${restricted
			.map(entry => `\t\t{ cardName: '${entry.cardName}', bannedDate: '${entry.bannedDate}' }`)
			.join(',\n')}\n\t]`
		: '';

	const formatImport = hasDeckFormat ? `import { DeckFormat } from '../format-registry';\n` : '';
	const formatField = hasDeckFormat ? `\n\tformat: DeckFormat.${formatKey.charAt(0).toUpperCase() + formatKey.slice(1)},` : '';

	return `/**
 * ${formatConfig.displayName} format ban list
 * Source: ${formatConfig.source}
 * Last updated: ${today}
 */

${formatImport}import type { FormatBanList } from './types';

export const ${formatKey}BanList: FormatBanList = {${formatField}
	lastUpdated: '${today}',
	source: '${formatConfig.source}',
	banned: [
${formatBannedEntries}
	]${restrictedSection}
};

// Simple export for FORMAT_METADATA embedding
export const ${formatKey}Banned: string[] = ${formatKey}BanList.banned.map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
${restricted && restricted.length > 0 ? `
// Restricted list for Vintage format
export const ${formatKey}Restricted: string[] = (${formatKey}BanList.restricted || []).map((entry) =>
	typeof entry === 'string' ? entry : entry.cardName
);
` : ''}`;
}

/**
 * Update a single format's ban list
 */
async function updateFormatBanList(
	formatKey: string,
	formatConfig: typeof FORMATS[keyof typeof FORMATS]
): Promise<void> {
	console.log(`\n📋 Updating ${formatConfig.displayName} ban list...`);

	try {
		// Fetch banned and restricted cards
		const bannedCards = await fetchCardsWithLegality(formatConfig.scryfallName, 'banned');
		const restrictedCards = await fetchCardsWithLegality(formatConfig.scryfallName, 'restricted');

		console.log(`  Found ${bannedCards.length} banned cards`);
		if (restrictedCards.length > 0) {
			console.log(`  Found ${restrictedCards.length} restricted cards`);
		}

		// Load existing data to preserve dates
		const existing = loadExistingBanList(formatConfig.fileName);

		// Merge with existing data
		const banned = mergeBanLists(bannedCards, existing?.banned as BanListEntry[] | undefined);
		const restricted = restrictedCards.length > 0
			? mergeBanLists(restrictedCards, existing?.restricted as BanListEntry[] | undefined)
			: undefined;

		// Generate file content
		const fileContent = generateBanListFile(formatKey, formatConfig, banned, restricted);

		// Write to file
		const outputPath = join(
			process.cwd(),
			'src/lib/formats/ban-lists',
			`${formatConfig.fileName}.ts`
		);
		writeFileSync(outputPath, fileContent, 'utf-8');

		console.log(`  ✅ Updated ${formatConfig.fileName}.ts`);

		if (banned.length > 0) {
			console.log(`     Latest banned: ${banned.slice(-3).map(c => c.cardName).join(', ')}`);
		}
	} catch (error) {
		console.error(`  ❌ Error updating ${formatConfig.displayName}:`, error);
	}
}

/**
 * Main script
 */
async function main() {
	console.log('🚫 Magic: The Gathering Ban List Updater\n');
	console.log('Fetching latest ban lists from Scryfall API...\n');

	const formatKeys = Object.keys(FORMATS) as Array<keyof typeof FORMATS>;

	for (const formatKey of formatKeys) {
		const formatConfig = FORMATS[formatKey];
		await updateFormatBanList(formatKey, formatConfig);
	}

	console.log('\n✅ All ban lists updated successfully!');
	console.log('\n📝 Next steps:');
	console.log('   1. Review the changes with git diff');
	console.log('   2. Verify ban dates are preserved correctly');
	console.log('   3. Run pnpm check to ensure no type errors');
	console.log('   4. Commit the updated ban lists');
}

main();
