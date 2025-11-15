/**
 * Generic Request Queue Manager
 *
 * A flexible, priority-based request queue system that supports:
 * - Multiple cancellation strategies (replace-pending, debounce, deduplicate, no-cancel)
 * - Priority-based execution
 * - Request deduplication
 * - Rate limiting
 * - Per-request-type statistics
 *
 * Designed to work with any API by passing different configurations.
 */

/**
 * Typed error classes for better error handling in components
 */
export class RequestCancelledError extends Error {
	constructor(
		public requestType: string,
		public reason: string
	) {
		super(`Request cancelled: ${requestType} (${reason})`);
		this.name = 'RequestCancelledError';
	}
}

export class RequestTimeoutError extends Error {
	constructor(
		public requestType: string,
		public timeoutMs: number
	) {
		super(`Request timeout: ${requestType} (${timeoutMs}ms)`);
		this.name = 'RequestTimeoutError';
	}
}

export class RequestQueueFullError extends Error {
	constructor(
		public queueName: string,
		public maxSize: number
	) {
		super(`Queue full: ${queueName} (max: ${maxSize})`);
		this.name = 'RequestQueueFullError';
	}
}

export type CancellationStrategy =
	| 'replace-pending' // Cancel all pending requests of this type when a new one arrives
	| 'no-cancel' // Never cancel - execute all requests in order
	| 'debounce' // Cancel and restart timer on new request
	| 'deduplicate'; // Don't queue identical requests - return same Promise

export interface RequestTypeConfig {
	priority: number; // Higher = executes first
	cancellationStrategy: CancellationStrategy;
	debounceMs?: number; // Only for 'debounce' strategy (default: 300ms)
	deduplicationKey?: (params: any) => string; // Generate unique ID for deduplication
	silentCancellation?: boolean; // If true, resolve with null instead of rejecting on cancellation (default: false)
}

export interface QueueConfig {
	name: string; // API name (e.g., 'scryfall', 'edhrec')
	rateLimitMs: number; // Min delay between requests
	maxConcurrent?: number; // Max parallel requests (default: 1)
	maxQueueSize?: number; // Max queued requests (default: 100)
	requestTypes: Record<string, RequestTypeConfig>;
}

export interface QueueRequest<T> {
	id: string; // Unique ID (auto-generated or from deduplication key)
	type: string; // Request type (must match a key in requestTypes config)
	params?: any; // Parameters for deduplication key generation
	fn: () => Promise<T>; // The actual request function to execute
}

interface InternalQueueRequest<T> {
	id: string;
	type: string;
	priority: number;
	fn: () => Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
	status: 'pending' | 'in-flight' | 'completed' | 'cancelled';
	createdAt: number;
	debounceTimer?: ReturnType<typeof setTimeout>;
}

export interface QueueStats {
	apiName: string;
	pending: number;
	inFlight: number;
	completed: number;
	cancelled: number;
	errors: number;
	requestsByType: Record<
		string,
		{
			pending: number;
			completed: number;
			cancelled: number;
			errors: number;
		}
	>;
}

/**
 * Generic Request Queue Manager
 */
export class RequestQueueManager {
	private config: Required<QueueConfig>;
	private queue: InternalQueueRequest<unknown>[] = [];
	private lastRequestTime = 0;
	private isProcessing = false;
	private inFlightCount = 0;

	// Track promises for deduplication
	private pendingPromises = new Map<string, Promise<unknown>>();

	// Statistics
	private stats = {
		completed: 0,
		cancelled: 0,
		errors: 0,
		byType: new Map<
			string,
			{ pending: number; completed: number; cancelled: number; errors: number }
		>()
	};

	constructor(config: QueueConfig) {
		this.config = {
			name: config.name,
			rateLimitMs: config.rateLimitMs,
			maxConcurrent: config.maxConcurrent ?? 1,
			maxQueueSize: config.maxQueueSize ?? 100,
			requestTypes: config.requestTypes
		};

		// Initialize stats for all request types
		for (const type of Object.keys(config.requestTypes)) {
			this.stats.byType.set(type, { pending: 0, completed: 0, cancelled: 0, errors: 0 });
		}
	}

	/**
	 * Enqueue a request with automatic cancellation/deduplication handling
	 */
	async enqueue<T>(request: QueueRequest<T>): Promise<T> {
		const typeConfig = this.config.requestTypes[request.type];

		if (!typeConfig) {
			throw new Error(
				`[${this.config.name}] Unknown request type: ${request.type}. Available types: ${Object.keys(this.config.requestTypes).join(', ')}`
			);
		}

		// Generate unique ID for this request
		const id = this.generateId(request, typeConfig);

		// Handle deduplication strategy
		if (typeConfig.cancellationStrategy === 'deduplicate') {
			const existingPromise = this.pendingPromises.get(id);
			if (existingPromise) {
				console.log(
					`[${this.config.name}] Deduplicated request: ${request.type} (id: ${id})`
				);
				return existingPromise as Promise<T>;
			}
		}

		// Handle replace-pending strategy
		if (typeConfig.cancellationStrategy === 'replace-pending') {
			this.cancelPendingByType(request.type, 'replaced-by-newer');
		}

		// Handle debounce strategy
		if (typeConfig.cancellationStrategy === 'debounce') {
			this.cancelPendingByType(request.type, 'debounced'); // Cancel previous debounced requests
		}

		// Create promise that will be resolved when request completes
		return new Promise<T>((resolve, reject) => {
			const internalRequest: InternalQueueRequest<T> = {
				id,
				type: request.type,
				priority: typeConfig.priority,
				fn: request.fn,
				resolve,
				reject,
				status: 'pending',
				createdAt: Date.now()
			};

			// Handle debounce timer
			if (typeConfig.cancellationStrategy === 'debounce') {
				const debounceMs = typeConfig.debounceMs ?? 300;

				internalRequest.debounceTimer = setTimeout(() => {
					// Add to queue after debounce period
					this.addToQueue(internalRequest as InternalQueueRequest<unknown>);
				}, debounceMs);

				// Store the promise for deduplication during debounce period
				const promise = new Promise<T>((res, rej) => {
					internalRequest.resolve = res;
					internalRequest.reject = rej;
				});
				this.pendingPromises.set(id, promise);

				return;
			}

			// Add to queue immediately for other strategies
			this.addToQueue(internalRequest as InternalQueueRequest<unknown>);

			// Track promise for deduplication
			if (typeConfig.cancellationStrategy === 'deduplicate') {
				const promise = new Promise<T>((res, rej) => {
					internalRequest.resolve = res;
					internalRequest.reject = rej;
				});
				this.pendingPromises.set(id, promise);
			}
		});
	}

	/**
	 * Add a request to the queue and start processing
	 */
	private addToQueue(request: InternalQueueRequest<unknown>): void {
		// Check queue size limit
		if (this.queue.length >= this.config.maxQueueSize) {
			// Drop lowest priority pending request
			const lowestPriorityIndex = this.findLowestPriorityPendingRequest();
			if (lowestPriorityIndex !== -1) {
				const dropped = this.queue[lowestPriorityIndex];
				console.warn(
					`[${this.config.name}] Queue full (${this.config.maxQueueSize}). Dropping low priority request: ${dropped.type}`
				);
				this.cancelRequest(dropped, 'queue-full');
				this.queue.splice(lowestPriorityIndex, 1);
			} else {
				// No pending requests to drop - reject the new request
				console.error(
					`[${this.config.name}] Queue full (${this.config.maxQueueSize}) with no pending requests to drop`
				);
				request.status = 'cancelled';
				request.reject(
					new RequestQueueFullError(this.config.name, this.config.maxQueueSize)
				);
				return;
			}
		}

		// Add to queue
		this.queue.push(request);

		// Update stats
		const typeStats = this.stats.byType.get(request.type);
		if (typeStats) {
			typeStats.pending++;
		}

		// Sort queue by priority (highest first)
		this.queue.sort((a, b) => {
			// In-flight requests stay in place
			if (a.status === 'in-flight') return -1;
			if (b.status === 'in-flight') return 1;
			// Sort pending by priority
			return b.priority - a.priority;
		});

		// Start processing
		this.processQueue();
	}

	/**
	 * Process queued requests with rate limiting
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing) {
			return;
		}

		this.isProcessing = true;

		while (this.queue.length > 0 && this.inFlightCount < this.config.maxConcurrent) {
			// Find next pending request (highest priority)
			const requestIndex = this.queue.findIndex((r) => r.status === 'pending');
			if (requestIndex === -1) {
				break; // No pending requests
			}

			// Check rate limit
			const now = Date.now();
			const timeSinceLastRequest = now - this.lastRequestTime;
			const delay = Math.max(0, this.config.rateLimitMs - timeSinceLastRequest);

			if (delay > 0) {
				await this.sleep(delay);
			}

			// Get next request
			const request = this.queue[requestIndex];

			// Mark as in-flight
			request.status = 'in-flight';
			this.inFlightCount++;
			this.lastRequestTime = Date.now();

			// Update stats
			const typeStats = this.stats.byType.get(request.type);
			if (typeStats) {
				typeStats.pending--;
			}

			// Execute request (don't await - execute concurrently up to maxConcurrent)
			this.executeRequest(request).finally(() => {
				this.inFlightCount--;
				// Remove from queue
				const idx = this.queue.indexOf(request);
				if (idx !== -1) {
					this.queue.splice(idx, 1);
				}
				// Continue processing queue
				this.processQueue();
			});
		}

		this.isProcessing = false;
	}

	/**
	 * Execute a single request
	 */
	private async executeRequest(request: InternalQueueRequest<unknown>): Promise<void> {
		try {
			const result = await request.fn();
			request.status = 'completed';
			request.resolve(result);

			// Update stats
			this.stats.completed++;
			const typeStats = this.stats.byType.get(request.type);
			if (typeStats) {
				typeStats.completed++;
			}
		} catch (error) {
			request.status = 'completed'; // Mark as completed even on error
			request.reject(error);

			// Update stats
			this.stats.errors++;
			const typeStats = this.stats.byType.get(request.type);
			if (typeStats) {
				typeStats.errors++;
			}
		} finally {
			// Remove from pending promises
			this.pendingPromises.delete(request.id);
		}
	}

	/**
	 * Cancel all pending requests of a specific type
	 */
	private cancelPendingByType(type: string, reason: string = 'replaced'): void {
		const toCancel = this.queue.filter((r) => r.type === type && r.status === 'pending');

		for (const request of toCancel) {
			this.cancelRequest(request, reason);
		}

		// Remove cancelled requests from queue
		this.queue = this.queue.filter((r) => r.status !== 'cancelled');
	}

	/**
	 * Cancel a single request
	 */
	private cancelRequest(request: InternalQueueRequest<unknown>, reason: string = 'replaced'): void {
		// Clear debounce timer if exists
		if (request.debounceTimer) {
			clearTimeout(request.debounceTimer);
		}

		request.status = 'cancelled';

		// Get type config to check for silent cancellation
		const typeConfig = this.config.requestTypes[request.type];
		const silentCancellation = typeConfig?.silentCancellation ?? false;

		if (silentCancellation) {
			// Silent cancellation: resolve with null instead of rejecting
			console.debug(
				`[${this.config.name}] Silent cancellation: ${request.type} (${reason})`
			);
			request.resolve(null as any);
		} else {
			// Normal cancellation: reject with typed error
			request.reject(new RequestCancelledError(request.type, reason));
		}

		// Update stats
		this.stats.cancelled++;
		const typeStats = this.stats.byType.get(request.type);
		if (typeStats) {
			typeStats.cancelled++;
			if (typeStats.pending > 0) {
				typeStats.pending--;
			}
		}

		// Remove from pending promises
		this.pendingPromises.delete(request.id);
	}

	/**
	 * Cancel all pending requests of a specific type (public API)
	 */
	cancel(type: string): void {
		this.cancelPendingByType(type, 'manual-cancel');
	}

	/**
	 * Cancel a specific request by ID
	 */
	cancelById(id: string): void {
		const request = this.queue.find((r) => r.id === id && r.status === 'pending');
		if (request) {
			this.cancelRequest(request, 'manual-cancel-by-id');
			this.queue = this.queue.filter((r) => r.id !== id);
		}
	}

	/**
	 * Clear all pending requests
	 */
	clear(): void {
		const pendingRequests = this.queue.filter((r) => r.status === 'pending');
		for (const request of pendingRequests) {
			this.cancelRequest(request, 'queue-cleared');
		}
		this.queue = this.queue.filter((r) => r.status === 'in-flight');
	}

	/**
	 * Get queue statistics
	 */
	getStats(): QueueStats {
		const pending = this.queue.filter((r) => r.status === 'pending').length;
		const inFlight = this.inFlightCount;

		const requestsByType: Record<string, any> = {};
		for (const [type, stats] of this.stats.byType.entries()) {
			requestsByType[type] = { ...stats };
		}

		return {
			apiName: this.config.name,
			pending,
			inFlight,
			completed: this.stats.completed,
			cancelled: this.stats.cancelled,
			errors: this.stats.errors,
			requestsByType
		};
	}

	/**
	 * Get current queue size
	 */
	getQueueSize(): number {
		return this.queue.filter((r) => r.status === 'pending').length;
	}

	/**
	 * Generate unique ID for a request
	 */
	private generateId(request: QueueRequest<unknown>, typeConfig: RequestTypeConfig): string {
		if (typeConfig.deduplicationKey && request.params) {
			return typeConfig.deduplicationKey(request.params);
		}
		// Fallback: use timestamp + random
		return `${request.type}:${Date.now()}:${Math.random().toString(36).substring(7)}`;
	}

	/**
	 * Find the lowest priority pending request in the queue
	 */
	private findLowestPriorityPendingRequest(): number {
		let lowestIndex = -1;
		let lowestPriority = Infinity;

		for (let i = 0; i < this.queue.length; i++) {
			const request = this.queue[i];
			if (request.status === 'pending' && request.priority < lowestPriority) {
				lowestPriority = request.priority;
				lowestIndex = i;
			}
		}

		return lowestIndex;
	}

	/**
	 * Sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
