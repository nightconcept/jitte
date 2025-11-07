/**
 * Rate limiter for API requests
 * Ensures a minimum delay between requests to respect API rate limits
 */

export interface RateLimiterConfig {
	/** Minimum milliseconds between requests (default: 100ms for Scryfall) */
	minDelayMs: number;
	/** Maximum number of concurrent requests (default: 1 for strict rate limiting) */
	maxConcurrent?: number;
}

interface QueuedRequest<T> {
	fn: () => Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
}

/**
 * Rate limiter that queues requests and ensures minimum delay between them
 */
export class RateLimiter {
	private queue: QueuedRequest<unknown>[] = [];
	private lastRequestTime = 0;
	private isProcessing = false;
	private config: Required<RateLimiterConfig>;

	constructor(config: RateLimiterConfig) {
		this.config = {
			minDelayMs: config.minDelayMs,
			maxConcurrent: config.maxConcurrent ?? 1
		};
	}

	/**
	 * Execute a function with rate limiting
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.queue.push({ fn, resolve, reject } as QueuedRequest<unknown>);
			this.processQueue();
		});
	}

	/**
	 * Process the request queue
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;

		while (this.queue.length > 0) {
			const now = Date.now();
			const timeSinceLastRequest = now - this.lastRequestTime;
			const delay = Math.max(0, this.config.minDelayMs - timeSinceLastRequest);

			if (delay > 0) {
				await this.sleep(delay);
			}

			const request = this.queue.shift();
			if (!request) break;

			this.lastRequestTime = Date.now();

			try {
				const result = await request.fn();
				request.resolve(result);
			} catch (error) {
				request.reject(error);
			}
		}

		this.isProcessing = false;
	}

	/**
	 * Sleep for a given number of milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Get the current queue size
	 */
	getQueueSize(): number {
		return this.queue.length;
	}

	/**
	 * Clear the queue
	 */
	clear(): void {
		this.queue = [];
	}

	/**
	 * Update the rate limit configuration
	 */
	updateConfig(config: Partial<RateLimiterConfig>): void {
		if (config.minDelayMs !== undefined) {
			this.config.minDelayMs = config.minDelayMs;
		}
		if (config.maxConcurrent !== undefined) {
			this.config.maxConcurrent = config.maxConcurrent;
		}
	}
}
