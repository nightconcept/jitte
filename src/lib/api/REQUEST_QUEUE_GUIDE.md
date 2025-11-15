# Request Queue System Guide

## Overview

The request queue system provides intelligent, API-specific request management with automatic cancellation, deduplication, and rate limiting for all external APIs (Scryfall, EDHREC, Commander Spellbook).

## Key Features

### 1. **Per-API Queue Isolation**
Each API has its own independent queue with custom rate limits:
- **Scryfall**: 150ms between requests (~400 req/min)
- **EDHREC**: 2000ms between requests (30 req/min)
- **Commander Spellbook**: 100ms between requests (~600 req/min)

### 2. **Smart Cancellation Strategies**

#### `replace-pending` (Hover Requests)
- **Use case**: Card previews on hover
- **Behavior**: When a new hover request arrives, all pending hover requests are cancelled
- **Example**: Hovering over 10 cards rapidly → only the last one executes

#### `debounce` (Search Requests)
- **Use case**: Search autocomplete, user typing
- **Behavior**: Cancels previous request, waits for debounce period (300ms default)
- **Example**: Typing "sol r" → only "sol r" executes after 300ms pause

#### `deduplicate` (Data Fetching)
- **Use case**: Card data, commander data, salt scores
- **Behavior**: If identical request is queued/in-flight, returns same Promise
- **Example**: 3 components requesting same card → 1 API call, all 3 get result

#### `no-cancel` (Critical Operations)
- **Use case**: Bulk imports, batch operations, user-initiated actions
- **Behavior**: Never cancels, always executes in order
- **Example**: Importing 100-card deck → all 100 requests complete

### 3. **Priority-Based Execution**

Requests execute in priority order (not FIFO):

| Priority | Request Type | Use Case |
|----------|--------------|----------|
| 10 | hover | Card preview on hover |
| 8 | search | Full card search |
| 7 | autocomplete | Name autocomplete |
| 6 | printing | Get specific printing |
| 5 | general | Default one-off requests |
| 3 | bulk | Batch operations |
| 2 | import | Deck import |

### 4. **Request Deduplication**

Identical requests return the same Promise:

```typescript
// Multiple components request the same card
const promise1 = cardService.getCardByName('Sol Ring');
const promise2 = cardService.getCardByName('Sol Ring');
const promise3 = cardService.getCardByName('Sol Ring');

// All three get the same result from ONE API call
// promise1 === promise2 === promise3
```

## Usage

### Basic Usage (Automatic)

**Most code doesn't need changes!** The queue system works transparently:

```typescript
// Existing code works as-is
const card = await cardService.getCardByName('Lightning Bolt');
const results = await cardService.autocomplete('sol r');
```

### Advanced Usage (Optional Request Types)

For hover-intensive scenarios, specify request type:

```typescript
// In a hover handler
async function handleCardHover(cardName: string) {
  // Use 'hover' type to cancel obsolete hover requests
  const card = await cardService.getCardByName(cardName, 'hover');
  displayCard(card);
}
```

### Available Request Types

#### Scryfall
- `'hover'` - Card preview (replace-pending)
- `'search'` - Full search (debounce)
- `'autocomplete'` - Name autocomplete (deduplicate)
- `'printing'` - Get specific printing (deduplicate)
- `'bulk'` - Batch operations (no-cancel)
- `'import'` - Deck import (no-cancel)
- `'general'` - Default (deduplicate)

#### EDHREC
- `'commander'` - Commander page (deduplicate)
- `'salt_score'` - Card salt score (deduplicate)
- `'salt_batch'` - Batch salt scores (no-cancel)
- `'general'` - Default (no-cancel)

#### Commander Spellbook
- `'search'` - Search variants (deduplicate)
- `'variant_by_id'` - Get variant by ID (deduplicate)
- `'find_combos'` - Find combos in deck (no-cancel)
- `'general'` - Default (no-cancel)

## Monitoring & Debugging

### Get Queue Statistics

```typescript
import { scryfallClient } from '$lib/api/scryfall-client';

// Get current queue stats
const stats = scryfallClient.getQueueStats();
console.log(stats);

// Output:
// {
//   apiName: 'scryfall',
//   pending: 5,
//   inFlight: 1,
//   completed: 142,
//   cancelled: 8,
//   errors: 2,
//   requestsByType: {
//     hover: { pending: 0, completed: 25, cancelled: 8, errors: 0 },
//     search: { pending: 3, completed: 15, cancelled: 0, errors: 1 },
//     autocomplete: { pending: 2, completed: 102, cancelled: 0, errors: 1 }
//   }
// }
```

### Cancel Pending Requests

```typescript
// Cancel all pending hover requests
scryfallClient.cancelRequestsByType('hover');

// Clear entire queue
scryfallClient.clearQueue();
```

### Get Queue Size

```typescript
const queueSize = scryfallClient.getQueueSize();
console.log(`${queueSize} requests pending`);
```

## Migration Notes

### From Old RateLimiter

**Before:**
```typescript
import { RateLimiter } from './rate-limiter';
const limiter = new RateLimiter({ minDelayMs: 150 });
await limiter.execute(() => fetch(...));
```

**After:**
```typescript
// Automatically handled by clients!
// No changes needed in most code
```

### Backwards Compatibility

- ✅ All existing code works unchanged
- ✅ Request types default to `'general'`
- ✅ No breaking changes
- ⚠️ `updateRateLimit()` not supported (rate limits are static per API)

## Performance Tips

### 1. Use Appropriate Request Types

```typescript
// ❌ Bad: Uses default 'general' type
function onHover(card: Card) {
  const data = await cardService.getCardByName(card.name);
}

// ✅ Good: Uses 'hover' type (cancels obsolete hovers)
function onHover(card: Card) {
  const data = await cardService.getCardByName(card.name, 'hover');
}
```

### 2. Leverage Deduplication

```typescript
// ❌ Bad: Makes 100 separate requests
for (const card of deck.cards) {
  await cardService.getCardByName(card.name);
}

// ✅ Good: Uses batch operation
const identifiers = deck.cards.map(c => ({ name: c.name }));
await scryfallClient.getCardCollection(identifiers);
```

### 3. Monitor Queue Size

```typescript
// Check queue size before adding more requests
if (scryfallClient.getQueueSize() > 50) {
  console.warn('Queue is getting large, consider throttling');
}
```

## Troubleshooting

### Issue: Requests not executing

**Check 1:** Is the queue full?
```typescript
const stats = scryfallClient.getQueueStats();
console.log(`Pending: ${stats.pending}, Max: 100`);
```

**Check 2:** Are requests being cancelled?
```typescript
const stats = scryfallClient.getQueueStats();
console.log(`Cancelled: ${stats.cancelled}`);
// If high, check cancellation strategies
```

### Issue: Rate limit errors (429)

**Solution:** Queue manager should prevent this, but if it happens:
- Check if multiple queue instances exist (should be singletons)
- Verify rate limits are configured correctly

### Issue: Slow performance

**Check 1:** Queue size
```typescript
// Large queue = long wait times
const queueSize = scryfallClient.getQueueSize();
```

**Check 2:** Use batch operations
```typescript
// Instead of 75 individual requests:
await scryfallClient.getCardCollection(identifiers);
```

## Configuration

Queue configs are in `src/lib/api/queue-configs.ts`:

```typescript
export const SCRYFALL_QUEUE_CONFIG: QueueConfig = {
  name: 'scryfall',
  rateLimitMs: 150,
  maxConcurrent: 1,
  maxQueueSize: 100,
  requestTypes: {
    hover: {
      priority: 10,
      cancellationStrategy: 'replace-pending',
      deduplicationKey: (params) => `hover:${params.name}`
    },
    // ... more types
  }
};
```

To adjust:
1. Edit queue config
2. Restart dev server
3. Changes apply to all clients using that API

## Architecture

```
┌─────────────┐
│  Component  │
└──────┬──────┘
       │
       v
┌─────────────┐
│CardService  │
└──────┬──────┘
       │
       v
┌─────────────────────┐
│ ScryfallClient      │
│ - queueManager      │ ← RequestQueueManager instance
│ - getCard(id, type) │
└──────┬──────────────┘
       │
       v
┌──────────────────────┐
│ RequestQueueManager  │ ← Generic queue implementation
│ - queue[]            │
│ - enqueue()          │
│ - processQueue()     │
│ - cancel()           │
└──────┬───────────────┘
       │
       v
┌──────────────┐
│ Scryfall API │
└──────────────┘
```

## Future Enhancements

- [ ] Add AbortController support for in-flight cancellation
- [ ] Queue persistence (save queue state on refresh)
- [ ] Visual queue monitor component
- [ ] Per-request timeout configuration
- [ ] Retry logic for failed requests
- [ ] Request analytics dashboard

## Questions?

See the implementation:
- `src/lib/api/request-queue.ts` - Generic queue manager
- `src/lib/api/queue-configs.ts` - API-specific configurations
- `src/lib/api/scryfall-client.ts` - Scryfall integration
- `src/lib/api/edhrec-client.ts` - EDHREC integration
- `src/lib/api/commander-spellbook-client.ts` - Spellbook integration
