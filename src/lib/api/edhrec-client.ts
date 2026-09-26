/**
 * EDHREC HTTP Client
 *
 * Low-level HTTP client for fetching EDHREC pages with respectful rate limiting.
 *
 * Rate Limiting Strategy:
 * - 30 requests per minute maximum (1 request every 2 seconds)
 * - Respects robots.txt (manual check required)
 * - Aggressive caching to minimize requests
 *
 * IMPORTANT: EDHREC does not provide an official API. This client uses web scraping
 * which may violate their Terms of Service. Use responsibly and consider contacting
 * EDHREC for official API access.
 */

import { RequestQueueManager } from './request-queue';
import { EDHREC_QUEUE_CONFIG } from './queue-configs';
import { EDHRECParser } from './edhrec-parser';
import { EDHRECError } from '$lib/types/edhrec';

export interface EDHRECClientConfig {
	/** Minimum delay between requests in ms (default: 2000ms = 30 req/min) */
	minDelayMs?: number;
	/** Request timeout in ms (default: 10000) */
	timeoutMs?: number;
}

export class EDHRECClient {
	private queueManager: RequestQueueManager;
	private timeoutMs: number;

	constructor(config: EDHRECClientConfig = {}) {
		this.timeoutMs = config.timeoutMs || 10000;

		// Use custom rate limit if provided, otherwise use default from config
		const queueConfig = { ...EDHREC_QUEUE_CONFIG };
		if (config.minDelayMs) {
			queueConfig.rateLimitMs = config.minDelayMs;
		}

		this.queueManager = new RequestQueueManager(queueConfig);
	}

	/**
	 * Fetch a commander page from EDHREC
	 */
	async fetchCommanderPage(commander: string): Promise<string> {
		const slug = EDHRECParser.sanitizeName(commander);
		const path = `commanders/${slug}`;

		return this.queueManager.enqueue({
			type: 'commander',
			params: { commanderName: commander },
			id: '',
			fn: async () => this.fetchUrl(path)
		});
	}

	/**
	 * Fetch the salt score top 100 page
	 */
	async fetchSaltScorePage(): Promise<string> {
		const path = 'top/salt';

		return this.queueManager.enqueue({
			type: 'general',
			params: {},
			id: '',
			fn: async () => this.fetchUrl(path)
		});
	}

	/**
	 * Fetch an individual card page
	 */
	async fetchCardPage(cardName: string): Promise<string> {
		const slug = EDHRECParser.sanitizeName(cardName);
		const path = `cards/${slug}`;

		return this.queueManager.enqueue({
			type: 'salt_score',
			params: { cardName },
			id: '',
			fn: async () => this.fetchUrl(path)
		});
	}

	/**
	 * Fetch a page through the same-origin route (rate limiting is handled by the queue manager)
	 */
	private async fetchUrl(path: string): Promise<string> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

			const response = await fetch(`/api/edhrec/${path}`, {
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new EDHRECError(`EDHREC request failed for ${path}`, response.status);
			}

			return await response.text();
		} catch (error) {
			if (error instanceof EDHRECError) {
				throw error;
			}

			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new EDHRECError(`Request timeout after ${this.timeoutMs}ms`);
				}

				throw new EDHRECError(
					`Network error fetching EDHREC page: ${error.message}`,
					undefined,
					error
				);
			}

			throw new EDHRECError('Unknown error fetching EDHREC page');
		}
	}

	/**
	 * Get current queue size (for monitoring)
	 */
	getQueueSize(): number {
		return this.queueManager.getQueueSize();
	}

	/**
	 * Get queue statistics
	 */
	getQueueStats() {
		return this.queueManager.getStats();
	}

	/**
	 * Update rate limiting configuration
	 * Use this to make rate limiting more conservative if needed
	 */
	updateRateLimit(minDelayMs: number): void {
		console.warn('[EDHREC] Runtime rate limit updates not yet supported with queue manager');
	}

	/**
	 * Clear the request queue (use with caution)
	 */
	clearQueue(): void {
		this.queueManager.clear();
	}

	/**
	 * Cancel all pending requests of a specific type
	 */
	cancelRequestsByType(type: string): void {
		this.queueManager.cancel(type);
	}
}
