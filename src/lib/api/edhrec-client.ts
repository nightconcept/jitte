/**
 * EDHREC HTTP Client
 *
 * Low-level HTTP client for fetching EDHREC pages with respectful rate limiting.
 *
 * Rate Limiting Strategy:
 * - 30 requests per minute maximum (1 request every 2 seconds)
 * - User agent identifies as "Jitte Deck Manager"
 * - Respects robots.txt (manual check required)
 * - Aggressive caching to minimize requests
 *
 * IMPORTANT: EDHREC does not provide an official API. This client uses web scraping
 * which may violate their Terms of Service. Use responsibly and consider contacting
 * EDHREC for official API access.
 */

import { RateLimiter } from './rate-limiter';
import { EDHRECParser } from './edhrec-parser';
import { EDHRECError } from '$lib/types/edhrec';

export interface EDHRECClientConfig {
	/** Base URL for EDHREC (default: https://edhrec.com) */
	baseUrl?: string;
	/** Minimum delay between requests in ms (default: 2000ms = 30 req/min) */
	minDelayMs?: number;
	/** User agent string */
	userAgent?: string;
	/** Request timeout in ms (default: 10000) */
	timeoutMs?: number;
	/** Use CORS proxy (for development only) */
	useCorsProxy?: boolean;
	/** CORS proxy URL (default: https://corsproxy.io/?) */
	corsProxyUrl?: string;
}

export class EDHRECClient {
	private rateLimiter: RateLimiter;
	private baseUrl: string;
	private userAgent: string;
	private timeoutMs: number;
	private useCorsProxy: boolean;
	private corsProxyUrl: string;

	constructor(config: EDHRECClientConfig = {}) {
		this.baseUrl = config.baseUrl || 'https://edhrec.com';
		this.userAgent = config.userAgent || 'Jitte Deck Manager (https://github.com/user/jitte)';
		this.timeoutMs = config.timeoutMs || 10000;
		this.useCorsProxy = config.useCorsProxy ?? false;
		this.corsProxyUrl = config.corsProxyUrl || 'https://corsproxy.io/?';

		// Default to 2000ms delay = 30 requests per minute
		const minDelayMs = config.minDelayMs || 2000;

		this.rateLimiter = new RateLimiter({
			minDelayMs,
			maxConcurrent: 1 // Strict sequential processing
		});
	}

	/**
	 * Fetch a commander page from EDHREC
	 */
	async fetchCommanderPage(commander: string): Promise<string> {
		const slug = EDHRECParser.sanitizeName(commander);
		const url = `${this.baseUrl}/commanders/${slug}`;

		return this.fetchWithRateLimit(url);
	}

	/**
	 * Fetch the salt score top 100 page
	 */
	async fetchSaltScorePage(): Promise<string> {
		const url = `${this.baseUrl}/top/salt`;
		return this.fetchWithRateLimit(url);
	}

	/**
	 * Fetch an individual card page
	 */
	async fetchCardPage(cardName: string): Promise<string> {
		const slug = EDHRECParser.sanitizeName(cardName);
		const url = `${this.baseUrl}/cards/${slug}`;

		return this.fetchWithRateLimit(url);
	}

	/**
	 * Fetch URL with rate limiting and error handling
	 */
	private async fetchWithRateLimit(url: string): Promise<string> {
		return this.rateLimiter.execute(async () => {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

				// Apply CORS proxy if enabled
				const fetchUrl = this.useCorsProxy ? `${this.corsProxyUrl}${encodeURIComponent(url)}` : url;

				const response = await fetch(fetchUrl, {
					headers: {
						'User-Agent': this.userAgent,
						Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
						'Accept-Language': 'en-US,en;q=0.5',
						'Accept-Encoding': 'gzip, deflate, br',
						DNT: '1',
						Connection: 'keep-alive',
						'Upgrade-Insecure-Requests': '1'
					},
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					throw new EDHRECError(
						`EDHREC request failed for ${url}`,
						response.status
					);
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

					// Check for CORS-specific errors
					if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
						throw new EDHRECError(
							`CORS Error: Browser blocked request to EDHREC. This is a browser security restriction. Solutions: 1) Enable CORS proxy in settings, 2) Use a server-side proxy, or 3) Contact EDHREC for API access. See console for details.`,
							undefined,
							error
						);
					}

					throw new EDHRECError(
						`Network error fetching EDHREC page: ${error.message}`,
						undefined,
						error
					);
				}

				throw new EDHRECError('Unknown error fetching EDHREC page');
			}
		});
	}

	/**
	 * Get current rate limiter queue size (for monitoring)
	 */
	getQueueSize(): number {
		return this.rateLimiter.getQueueSize();
	}

	/**
	 * Update rate limiting configuration
	 * Use this to make rate limiting more conservative if needed
	 */
	updateRateLimit(minDelayMs: number): void {
		this.rateLimiter.updateConfig({ minDelayMs });
	}

	/**
	 * Clear the request queue (use with caution)
	 */
	clearQueue(): void {
		this.rateLimiter.clear();
	}
}
