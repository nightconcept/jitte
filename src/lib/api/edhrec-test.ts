/**
 * EDHREC Integration Test Utilities
 *
 * Manual testing utilities for verifying EDHREC integration.
 * These are not automated tests - they're meant to be called from browser console.
 *
 * Usage (from browser console):
 *   import { testEDHREC } from '$lib/api/edhrec-test';
 *   await testEDHREC.testCommanderRecommendations('Atraxa, Praetors Voice');
 *   await testEDHREC.testSaltScore('Cyclonic Rift');
 *   await testEDHREC.testTopSaltScores();
 */

import { edhrecService } from './edhrec-service';

export const testEDHREC = {
	/**
	 * Test fetching commander recommendations
	 */
	async testCommanderRecommendations(commander: string) {
		console.log(`\n=== Testing Commander Recommendations: ${commander} ===`);

		try {
			const data = await edhrecService.getCommanderRecommendations(commander);

			console.log(`Commander: ${data.commander}`);
			console.log(`Total Decks: ${data.totalDecks}`);
			console.log(`Card Lists: ${data.cardlists.length}`);

			data.cardlists.forEach((list) => {
				console.log(`\n${list.header}:`);
				list.cards.slice(0, 5).forEach((card, i) => {
					console.log(
						`  ${i + 1}. ${card.name} - Synergy: ${card.synergyScore}% - ${card.label}`
					);
				});
			});

			return data;
		} catch (error) {
			console.error('Error:', error);
			throw error;
		}
	},

	/**
	 * Test fetching high synergy cards
	 */
	async testHighSynergyCards(commander: string, limit = 10) {
		console.log(`\n=== Testing High Synergy Cards: ${commander} ===`);

		try {
			const cards = await edhrecService.getHighSynergyCards(commander, limit);

			console.log(`Found ${cards.length} high synergy cards:`);
			cards.forEach((card, i) => {
				console.log(
					`  ${i + 1}. ${card.name} - Synergy: ${card.synergyScore}% - Inclusion: ${card.inclusionRate}%`
				);
			});

			return cards;
		} catch (error) {
			console.error('Error:', error);
			throw error;
		}
	},

	/**
	 * Test fetching salt score for a card
	 */
	async testSaltScore(cardName: string) {
		console.log(`\n=== Testing Salt Score: ${cardName} ===`);

		try {
			const score = await edhrecService.getSaltScore(cardName);

			if (score) {
				console.log(`Card: ${score.cardName}`);
				console.log(`Salt Score: ${score.saltScore}`);
				console.log(`Deck Count: ${score.deckCount}`);
				if (score.rank) {
					console.log(`Rank: #${score.rank}`);
				}
			} else {
				console.log(`No salt score found for ${cardName}`);
			}

			return score;
		} catch (error) {
			console.error('Error:', error);
			throw error;
		}
	},

	/**
	 * Test fetching top 100 saltiest cards
	 */
	async testTopSaltScores(limit = 10) {
		console.log(`\n=== Testing Top ${limit} Saltiest Cards ===`);

		try {
			const scores = await edhrecService.getAllSaltScores();

			console.log(`Found ${scores.length} cards with salt scores`);
			console.log(`\nTop ${limit}:`);

			scores.slice(0, limit).forEach((score) => {
				console.log(
					`  ${score.rank}. ${score.cardName} - Salt: ${score.saltScore} - Decks: ${score.deckCount}`
				);
			});

			return scores;
		} catch (error) {
			console.error('Error:', error);
			throw error;
		}
	},

	/**
	 * Test batch salt score fetching
	 */
	async testBatchSaltScores(cardNames: string[]) {
		console.log(`\n=== Testing Batch Salt Scores for ${cardNames.length} cards ===`);

		try {
			const scores = await edhrecService.getSaltScoresForCards(cardNames);

			console.log(`Found salt scores for ${scores.size} cards:`);
			scores.forEach((score, name) => {
				console.log(`  ${name}: ${score.saltScore}`);
			});

			return scores;
		} catch (error) {
			console.error('Error:', error);
			throw error;
		}
	},

	/**
	 * Test cache statistics
	 */
	testCacheStats() {
		console.log('\n=== Cache Statistics ===');

		const stats = edhrecService.getCacheStats();
		console.log(`Total Entries: ${stats.totalEntries}`);
		console.log(`Total Size: ${stats.totalSize} bytes`);

		if (stats.oldestEntry) {
			console.log(`Oldest Entry: ${new Date(stats.oldestEntry).toLocaleString()}`);
		}
		if (stats.newestEntry) {
			console.log(`Newest Entry: ${new Date(stats.newestEntry).toLocaleString()}`);
		}

		return stats;
	},

	/**
	 * Test rate limiter
	 */
	testRateLimiter() {
		console.log('\n=== Rate Limiter Status ===');

		const queueSize = edhrecService.getRateLimiterQueueSize();
		console.log(`Queue Size: ${queueSize} pending requests`);

		return queueSize;
	},

	/**
	 * Clear all cache
	 */
	clearCache() {
		console.log('\n=== Clearing Cache ===');
		edhrecService.clearCache();
		console.log('Cache cleared successfully');
	},

	/**
	 * Run all tests
	 */
	async runAllTests() {
		console.log('\n🧪 Running All EDHREC Integration Tests\n');

		try {
			// Test 1: Commander recommendations
			await this.testCommanderRecommendations('Atraxa, Praetors Voice');
			await new Promise((resolve) => setTimeout(resolve, 2500)); // Wait for rate limit

			// Test 2: High synergy cards
			await this.testHighSynergyCards('Muldrotha, the Gravetide', 5);
			await new Promise((resolve) => setTimeout(resolve, 2500));

			// Test 3: Salt score
			await this.testSaltScore('Cyclonic Rift');
			await new Promise((resolve) => setTimeout(resolve, 2500));

			// Test 4: Top salt scores
			await this.testTopSaltScores(10);

			// Test 5: Batch salt scores
			await this.testBatchSaltScores([
				'Rhystic Study',
				'Smothering Tithe',
				'Cyclonic Rift'
			]);

			// Test 6: Cache stats
			this.testCacheStats();

			// Test 7: Rate limiter
			this.testRateLimiter();

			console.log('\n✅ All tests completed successfully!');
		} catch (error) {
			console.error('\n❌ Tests failed:', error);
			throw error;
		}
	}
};

/**
 * Quick test function for common commanders
 */
export async function quickTest() {
	console.log('🚀 Running Quick EDHREC Test...\n');

	const testCommander = 'Atraxa, Praetors Voice';
	const testCards = ['Cyclonic Rift', 'Rhystic Study', 'Sol Ring'];

	try {
		console.log(`Testing commander recommendations for: ${testCommander}`);
		const highSynergy = await edhrecService.getHighSynergyCards(testCommander, 5);
		console.log(
			`✅ Found ${highSynergy.length} high synergy cards:`,
			highSynergy.map((c) => c.name)
		);

		console.log(`\nTesting salt scores for:`, testCards);
		const saltScores = await edhrecService.getSaltScoresForCards(testCards);
		console.log(`✅ Found ${saltScores.size} salt scores:`);
		saltScores.forEach((score, name) => {
			console.log(`  ${name}: ${score.saltScore}`);
		});

		console.log('\n✅ Quick test passed!');
		return true;
	} catch (error) {
		console.error('\n❌ Quick test failed:', error);
		return false;
	}
}
