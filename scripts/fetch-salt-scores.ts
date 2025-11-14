/**
 * One-time script to fetch top salt scores from EDHREC and save locally
 *
 * Usage:
 *   npx tsx scripts/fetch-salt-scores.ts
 *
 * This script:
 * 1. Fetches the top salt scores page from EDHREC
 * 2. Parses the salt score data
 * 3. Saves to src/lib/data/salt-scores.ts
 * 4. Generates TypeScript file with proper typing
 *
 * Run this annually when EDHREC publishes new salt scores.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// EDHREC parser utilities
interface SaltScore {
	rank: number;
	name: string;
	score: number;
	deckCount: number;
}

/**
 * Extract __NEXT_DATA__ from HTML
 */
function parseNextData(html: string): any {
	const match = html.match(
		/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s
	);

	if (!match || !match[1]) {
		throw new Error('Could not find __NEXT_DATA__ in page HTML');
	}

	return JSON.parse(match[1]);
}

/**
 * Parse salt score from label string
 */
function parseSaltScore(str: string): number {
	const match = str.match(/Salt Score:\s*([\d.]+)/);
	return match ? parseFloat(match[1]) : 0;
}

/**
 * Parse deck count from label string
 */
function parseDeckCount(str: string): number {
	const match = str.match(/(\d[\d,]*)\s+decks?/);
	return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
}

/**
 * Fetch salt scores from EDHREC
 */
async function fetchSaltScores(limit: number = 200): Promise<SaltScore[]> {
	console.log(`Fetching top ${limit} salt scores from EDHREC...`);

	// Note: This uses CORS proxy for browser compatibility
	// When running from Node.js, you can fetch directly
	const url = 'https://edhrec.com/top/salt';

	console.log(`Fetching: ${url}`);

	const response = await fetch(url, {
		headers: {
			'User-Agent': 'Jitte Salt Score Fetcher (one-time data collection)',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
	}

	const html = await response.text();
	console.log('Page fetched successfully, parsing...');

	const nextData = parseNextData(html);

	// Navigate to card list
	const props = nextData.props;
	const pageProps = props?.pageProps;
	const data = pageProps?.data;
	const container = data?.container;
	const jsonDict = container?.json_dict;
	const cardlists = jsonDict?.cardlists;

	if (!cardlists || cardlists.length === 0) {
		throw new Error('Could not find salt score card list in page data');
	}

	const saltList = cardlists[0];
	const cardviews = saltList.cardviews || [];

	console.log(`Found ${cardviews.length} cards with salt scores`);

	const scores: SaltScore[] = cardviews.slice(0, limit).map((card: any, index: number) => ({
		rank: index + 1,
		name: card.name || '',
		score: parseSaltScore(card.label || ''),
		deckCount: parseDeckCount(card.label || '')
	}));

	return scores;
}

/**
 * Generate TypeScript file content
 */
function generateTypeScriptFile(scores: SaltScore[]): string {
	const date = new Date().toISOString().split('T')[0];
	const year = new Date().getFullYear();

	return `/**
 * EDHREC Salt Scores - ${year} Edition
 *
 * Source: https://edhrec.com/top/salt
 * © EDHREC.com - Used with attribution under fair use
 * Data fetched: ${date}
 *
 * Salt scores are community-driven ratings indicating how frustrating
 * cards are to play against, measured on a 0-4 scale:
 * - 0: Not salty at all, fun to play against
 * - 1: Slightly annoying
 * - 2: Moderately frustrating
 * - 3: Very frustrating
 * - 4: Extremely unfun, ruins games
 *
 * Scores are updated annually based on EDHREC's community survey.
 * To update this file, run: npx tsx scripts/fetch-salt-scores.ts
 */

export interface SaltScoreData {
	rank: number;
	name: string;
	score: number;
	deckCount: number;
}

/**
 * Top ${scores.length} saltiest cards from EDHREC
 * Sorted by salt score (highest first)
 */
export const SALT_SCORES: readonly SaltScoreData[] = Object.freeze([
${scores.map(s => `\t{ rank: ${s.rank}, name: ${JSON.stringify(s.name)}, score: ${s.score}, deckCount: ${s.deckCount} }`).join(',\n')}
] as const);

/**
 * Year of this salt score dataset
 */
export const SALT_SCORES_YEAR = ${year};

/**
 * Date when this data was last updated
 */
export const SALT_SCORES_UPDATED = '${date}';

/**
 * Number of cards in this dataset
 */
export const SALT_SCORES_COUNT = ${scores.length};

/**
 * Quick lookup map for fast card name -> salt score queries
 * Card names are normalized to lowercase for case-insensitive matching
 */
export const SALT_SCORES_MAP = new Map<string, SaltScoreData>(
	SALT_SCORES.map(score => [score.name.toLowerCase(), score])
);

/**
 * Get salt score for a card by name (case-insensitive)
 */
export function getSaltScore(cardName: string): SaltScoreData | undefined {
	return SALT_SCORES_MAP.get(cardName.toLowerCase());
}

/**
 * Check if a card has a salt score
 */
export function hasSaltScore(cardName: string): boolean {
	return SALT_SCORES_MAP.has(cardName.toLowerCase());
}

/**
 * Get all cards with salt score >= threshold
 */
export function getCardsBySaltThreshold(threshold: number): readonly SaltScoreData[] {
	return SALT_SCORES.filter(s => s.score >= threshold);
}

/**
 * Get top N saltiest cards
 */
export function getTopSaltiest(count: number): readonly SaltScoreData[] {
	return SALT_SCORES.slice(0, count);
}
`;
}

/**
 * Main script
 */
async function main() {
	try {
		console.log('🧂 EDHREC Salt Score Fetcher\n');

		// Fetch salt scores
		const scores = await fetchSaltScores(200);

		if (scores.length === 0) {
			throw new Error('No salt scores found');
		}

		console.log(`\n✅ Successfully fetched ${scores.length} salt scores`);
		console.log(`\nTop 5 saltiest cards:`);
		scores.slice(0, 5).forEach(s => {
			console.log(`  ${s.rank}. ${s.name} - ${s.score} (${s.deckCount.toLocaleString()} decks)`);
		});

		// Generate TypeScript file
		const fileContent = generateTypeScriptFile(scores);

		// Save to file
		const outputPath = join(process.cwd(), 'src/lib/data/salt-scores.ts');
		writeFileSync(outputPath, fileContent, 'utf-8');

		console.log(`\n✅ Saved to: src/lib/data/salt-scores.ts`);
		console.log(`\n📊 Statistics:`);
		console.log(`   Total cards: ${scores.length}`);
		console.log(`   Highest score: ${scores[0].score} (${scores[0].name})`);
		console.log(`   Lowest score: ${scores[scores.length - 1].score} (${scores[scores.length - 1].name})`);
		console.log(`   Average score: ${(scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(2)}`);

		console.log(`\n🎉 Done! Salt scores are now available locally.`);
		console.log(`\n📝 Next steps:`);
		console.log(`   1. Update edhrec-service.ts to use local scores first`);
		console.log(`   2. Only fetch from EDHREC API for cards not in local dataset`);
		console.log(`   3. Run this script annually to update scores`);

	} catch (error) {
		console.error('\n❌ Error:', error);
		process.exit(1);
	}
}

main();
