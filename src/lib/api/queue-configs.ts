/**
 * API-Specific Queue Configurations
 *
 * Defines request types, priorities, and cancellation strategies for each API.
 */

import type { QueueConfig } from './request-queue';

/**
 * Scryfall API Queue Configuration
 *
 * Rate Limit: 150ms between requests (conservative)
 * Request Types:
 * - hover: Card preview on hover (high priority, replace pending)
 * - search: Full card search (high priority, debounce)
 * - autocomplete: Name autocomplete (high priority, deduplicate)
 * - printing: Get specific printing (medium priority, no cancel)
 * - bulk: Batch operations (low priority, no cancel)
 * - import: Deck import operations (low priority, no cancel)
 * - general: Default for one-off requests (medium priority, no cancel)
 */
export const SCRYFALL_QUEUE_CONFIG: QueueConfig = {
	name: 'scryfall',
	rateLimitMs: 150,
	maxConcurrent: 1,
	maxQueueSize: 100,
	requestTypes: {
		hover: {
			priority: 10,
			cancellationStrategy: 'replace-pending',
			deduplicationKey: (params) => `hover:${params.name}`,
			silentCancellation: true // Resolve with null instead of rejecting
		},
		'commander-detect': {
			priority: 9,
			cancellationStrategy: 'deduplicate',
			deduplicationKey: (params) => `commander-detect:${params.name}`,
			silentCancellation: false // Let errors propagate for timeout handling
		},
		search: {
			priority: 8,
			cancellationStrategy: 'debounce',
			debounceMs: 300,
			deduplicationKey: (params) => `search:${params.query}:${params.limit || 10}`,
			silentCancellation: true // Resolve with null instead of rejecting
		},
		autocomplete: {
			priority: 7,
			cancellationStrategy: 'deduplicate',
			deduplicationKey: (params) => `autocomplete:${params.query}:${params.includeExtras || false}`,
			silentCancellation: true // Resolve with null instead of rejecting
		},
		printing: {
			priority: 6,
			cancellationStrategy: 'deduplicate',
			deduplicationKey: (params) =>
				params.oracleId
					? `printing:oracle:${params.oracleId}`
					: `printing:${params.setCode}:${params.collectorNumber}`
		},
		bulk: {
			priority: 3,
			cancellationStrategy: 'no-cancel'
		},
		import: {
			priority: 2,
			cancellationStrategy: 'no-cancel'
		},
		general: {
			priority: 5,
			cancellationStrategy: 'deduplicate',
			deduplicationKey: (params) => `general:${params.name || params.id || Date.now()}`
		}
	}
};

/**
 * EDHREC API Queue Configuration
 *
 * Rate Limit: 2000ms between requests (30 req/min - respectful)
 * Request Types:
 * - commander: Commander recommendation pages (high priority, deduplicate)
 * - salt_score: Individual card salt scores (medium priority, deduplicate)
 * - salt_batch: Batch salt score lookups (low priority, no cancel)
 * - general: Default for other requests (medium priority, no cancel)
 */
export const EDHREC_QUEUE_CONFIG: QueueConfig = {
	name: 'edhrec',
	rateLimitMs: 2000, // 30 requests per minute
	maxConcurrent: 1,
	maxQueueSize: 50, // Smaller queue due to slow rate limit
	requestTypes: {
		commander: {
			priority: 10,
			cancellationStrategy: 'deduplicate',
			deduplicationKey: (params) => `commander:${params.commanderName?.toLowerCase()}`
		},
		salt_score: {
			priority: 5,
			cancellationStrategy: 'deduplicate',
			deduplicationKey: (params) => `salt:${params.cardName?.toLowerCase()}`
		},
		salt_batch: {
			priority: 3,
			cancellationStrategy: 'no-cancel'
		},
		general: {
			priority: 5,
			cancellationStrategy: 'no-cancel'
		}
	}
};

/**
 * Commander Spellbook API Queue Configuration
 *
 * Rate Limit: 100ms between requests (conservative)
 * Request Types:
 * - search: Search combo variants (high priority, deduplicate)
 * - variant_by_id: Get specific variant (high priority, deduplicate)
 * - find_combos: Find combos in deck (medium priority, no cancel)
 * - general: Default for other requests (medium priority, no cancel)
 */
export const SPELLBOOK_QUEUE_CONFIG: QueueConfig = {
	name: 'commander_spellbook',
	rateLimitMs: 100,
	maxConcurrent: 1,
	maxQueueSize: 100,
	requestTypes: {
		search: {
			priority: 8,
			cancellationStrategy: 'deduplicate',
			deduplicationKey: (params) => `search:${params.query}:${params.limit || 100}`
		},
		variant_by_id: {
			priority: 7,
			cancellationStrategy: 'deduplicate',
			deduplicationKey: (params) => `variant:${params.id}`
		},
		find_combos: {
			priority: 5,
			cancellationStrategy: 'no-cancel'
		},
		general: {
			priority: 5,
			cancellationStrategy: 'no-cancel'
		}
	}
};
