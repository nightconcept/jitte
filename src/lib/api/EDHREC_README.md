# EDHREC Integration

This directory contains the EDHREC API integration for Jitte. EDHREC (EDH/Commander Recommendation Engine) provides card recommendations and salt scores for Commander decks.

## ⚠️ Important Notice

**EDHREC does not provide an official public API.** This integration uses web scraping to extract data from EDHREC's Next.js pages. This approach:

- **May violate EDHREC's Terms of Service**
- **Could break if EDHREC redesigns their website**
- **Should be used respectfully with conservative rate limiting**
- **⚠️ Requires CORS proxy for browser-based requests** (enabled by default)

**Recommendation:** Contact EDHREC for official API access before deploying to production.

### CORS Issue & Solution

**Problem:** Browsers block cross-origin requests to EDHREC due to CORS security policies.

**Current Solution:** By default, requests are routed through a CORS proxy (https://corsproxy.io) to bypass browser restrictions. This is enabled automatically.

**Limitations:**
- CORS proxy adds latency
- Relies on third-party service (corsproxy.io)
- Not suitable for production use
- May have rate limits

**Production Solutions:**
1. **Server-side proxy:** Create your own backend proxy to forward requests
2. **Official API:** Contact EDHREC for official API access (recommended)
3. **Disable feature:** Make EDHREC integration optional and disable in production

## Architecture

The integration consists of 6 main files:

```
src/lib/
├── types/edhrec.ts           # TypeScript type definitions
├── api/
│   ├── edhrec-cache.ts       # localStorage caching layer
│   ├── edhrec-parser.ts      # HTML parser for __NEXT_DATA__
│   ├── edhrec-client.ts      # HTTP client with rate limiting
│   ├── edhrec-service.ts     # High-level service API
│   └── edhrec-test.ts        # Manual testing utilities
└── utils/
    └── salt-calculator.ts    # Deck salt score calculator
```

## Configuration

### CORS Proxy Configuration

**Enable/Disable CORS Proxy:**
```typescript
// In edhrec-service.ts
constructor() {
  this.client = new EDHRECClient({
    minDelayMs: 2000,
    useCorsProxy: true, // Set to false to disable (will fail in browser)
    corsProxyUrl: 'https://corsproxy.io/?' // Custom CORS proxy URL
  });
}
```

**Alternative CORS Proxies:**
- `https://corsproxy.io/?` (default, free)
- `https://cors-anywhere.herokuapp.com/` (may require request)
- Your own server-side proxy (recommended for production)

### Rate Limiting

**Default Configuration:**
- **30 requests per minute** (1 request every 2 seconds)
- Sequential request processing (no concurrent requests)
- Configurable via `EDHRECClient` constructor

**Rationale:**
- Be respectful to EDHREC's servers
- Avoid IP blocking
- Minimize impact on their infrastructure

**To adjust rate limiting:**
```typescript
import { edhrecService } from '$lib/api/edhrec-service';

// Make it more conservative (4 seconds between requests = 15 req/min)
edhrecService.updateRateLimit(4000);
```

## Caching Strategy

**Cache TTLs:**
- **Commander recommendations:** 24 hours
- **Salt scores:** 7 days
- **Top 100 salt list:** 7 days

**Why aggressive caching?**
- EDHREC data doesn't change frequently
- Reduces load on EDHREC servers
- Improves performance
- Minimizes risk of rate limiting/blocking

**Cache is stored in:** `localStorage` with prefix `edhrec_cache_`

## Usage

### Basic Example

```typescript
import { edhrecService } from '$lib/api/edhrec-service';

// Get high synergy cards for a commander
const recommendations = await edhrecService.getHighSynergyCards(
  'Atraxa, Praetors Voice',
  10  // limit
);

recommendations.forEach(card => {
  console.log(`${card.name} - Synergy: ${card.synergyScore}%`);
});

// Get salt score for a card
const saltScore = await edhrecService.getSaltScore('Cyclonic Rift');
if (saltScore) {
  console.log(`${saltScore.cardName}: ${saltScore.saltScore} salt`);
}

// Calculate deck salt score
import { calculateDeckSaltScore } from '$lib/utils/salt-calculator';

const deckSalt = await calculateDeckSaltScore(deck);
console.log(`Total salt: ${deckSalt.totalSalt}`);
console.log(`Average salt: ${deckSalt.averageSalt}`);
console.log(`Top salty cards:`, deckSalt.topSaltyCards);
```

### Advanced Usage

```typescript
// Get all commander data
const commanderData = await edhrecService.getCommanderRecommendations('Muldrotha');

// Access different card lists
commanderData.cardlists.forEach(list => {
  console.log(`\n${list.header}:`);
  list.cards.slice(0, 5).forEach(card => {
    console.log(`  - ${card.name}`);
  });
});

// Batch fetch salt scores (more efficient)
const cards = ['Rhystic Study', 'Smothering Tithe', 'Cyclonic Rift'];
const saltMap = await edhrecService.getSaltScoresForCards(cards);

saltMap.forEach((score, name) => {
  console.log(`${name}: ${score.saltScore}`);
});

// Get top 100 saltiest cards
const top100 = await edhrecService.getAllSaltScores();
```

### In Svelte Components

```svelte
<script lang="ts">
  import { edhrecService } from '$lib/api/edhrec-service';
  import type { EDHRECCardRecommendation } from '$lib/types/edhrec';

  let recommendations = $state<EDHRECCardRecommendation[]>([]);
  let loading = $state(false);

  async function loadRecommendations(commander: string) {
    loading = true;
    try {
      recommendations = await edhrecService.getHighSynergyCards(commander, 20);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      // Gracefully fail - EDHREC data is optional
    } finally {
      loading = false;
    }
  }
</script>

{#if loading}
  <p>Loading recommendations...</p>
{:else if recommendations.length > 0}
  <ul>
    {#each recommendations as card}
      <li>
        {card.name} - {card.synergyScore}% synergy
      </li>
    {/each}
  </ul>
{/if}
```

## Testing

Manual testing utilities are provided in `edhrec-test.ts`:

```typescript
import { testEDHREC, quickTest } from '$lib/api/edhrec-test';

// Run a quick test
await quickTest();

// Test commander recommendations
await testEDHREC.testCommanderRecommendations('Atraxa, Praetors Voice');

// Test salt scores
await testEDHREC.testSaltScore('Cyclonic Rift');

// Test top 100 salt list
await testEDHREC.testTopSaltScores(10);

// Run all tests
await testEDHREC.runAllTests();

// Check cache stats
testEDHREC.testCacheStats();

// Clear cache
testEDHREC.clearCache();
```

## Error Handling

The service is designed to **fail gracefully**:

```typescript
try {
  const recs = await edhrecService.getHighSynergyCards('CommanderName');
  // Use recommendations
} catch (error) {
  // EDHREC is unavailable - app continues to work
  console.warn('EDHREC unavailable:', error);
}

// Salt scores return null if not found (not an error)
const salt = await edhrecService.getSaltScore('SomeCard');
if (salt) {
  console.log(`Salt: ${salt.saltScore}`);
} else {
  console.log('No salt score available');
}
```

## Data Structures

### EDHRECCardRecommendation
```typescript
{
  name: string;              // "Rhystic Study"
  sanitized: string;         // "rhystic-study"
  synergyScore: number;      // 45 (percentage)
  inclusionRate: number;     // 78 (percentage)
  deckCount: number;         // 125000
  label: string;             // "78% of 125000 decks"
  url: string;               // "https://edhrec.com/cards/rhystic-study"
  category?: string;         // "High Synergy Cards"
}
```

### EDHRECSaltScore
```typescript
{
  cardName: string;          // "Cyclonic Rift"
  saltScore: number;         // 2.65 (0-4 scale)
  deckCount: number;         // 450000
  rank?: number;             // 5 (position in top 100)
}
```

### DeckSaltScore
```typescript
{
  totalSalt: number;         // 18.5 (sum of all salt scores in deck)
  averageSalt: number;       // 2.1 (average salt score)
  topSaltyCards: Array<{     // Top 3 saltiest cards in deck
    name: string;
    saltScore: number;
  }>;
  totalCardsWithScores: number;  // How many cards had salt scores
}
```

## Monitoring

```typescript
import { edhrecService } from '$lib/api/edhrec-service';

// Check rate limiter queue
const queueSize = edhrecService.getRateLimiterQueueSize();
console.log(`Pending requests: ${queueSize}`);

// Get cache statistics
const stats = edhrecService.getCacheStats();
console.log(`Cache entries: ${stats.totalEntries}`);
console.log(`Cache size: ${stats.totalSize} bytes`);

// Clear cache if needed
edhrecService.clearCache();
```

## Future Improvements

### UI Components (Not Yet Implemented)
- `SaltScoreBadge.svelte` - Display salt score with emoji/color
- `CardInsightModal.svelte` - Show EDHREC data for cards
- `RecommendationsPanel.svelte` - Show popular cards you're missing

### Potential Features
- Commander-specific deck recommendations
- Category filtering (creatures, artifacts, etc.)
- Price-aware recommendations (suggest budget alternatives)
- Combo detection integration
- Sync with user's EDHREC account (if API becomes available)

## Legal & Ethical Considerations

1. **Respect EDHREC's Terms of Service**
2. **Attribute EDHREC properly** in UI (link back to edhrec.com)
3. **Use conservative rate limiting** (default 30 req/min)
4. **Cache aggressively** to minimize requests
5. **Consider contacting EDHREC** for official partnership/API access

## Troubleshooting

### "NetworkError when attempting to fetch resource" (CORS Error)
**Symptoms:** Salt score shows "N/A", console shows CORS/network errors

**Causes:**
- Browser blocking cross-origin requests to EDHREC
- CORS proxy not enabled or not working
- CORS proxy service is down

**Solutions:**
1. **Verify CORS proxy is enabled** (should be by default):
   ```typescript
   // In src/lib/api/edhrec-service.ts
   useCorsProxy: true // Should be enabled
   ```

2. **Try alternative CORS proxy:**
   ```typescript
   corsProxyUrl: 'https://cors-anywhere.herokuapp.com/'
   ```

3. **Check browser console** for specific error details

4. **Test with curl** (EDHREC should respond):
   ```bash
   curl https://edhrec.com/top/salt
   ```

5. **Long-term:** Set up your own server-side proxy or contact EDHREC for API access

### "Could not find __NEXT_DATA__ in page HTML"
- EDHREC changed their page structure
- Parser needs to be updated
- Check `edhrec-parser.ts`
- CORS proxy may have modified the response

### "Request timeout" or network errors
- EDHREC may be down
- Network connectivity issues
- Rate limiting may be too aggressive (increase delay)
- CORS proxy may be slow (adds latency)

### Cache growing too large
- Call `edhrecService.clearCache()` periodically
- Reduce cache TTLs
- Cache has auto-cleanup (removes oldest 25% when full)

### Salt scores not found
- Card may not have a salt score (not all cards do)
- Card name spelling must match EDHREC exactly
- Try variations of card name
- Check if EDHREC has data for that card

## Contributing

When modifying the EDHREC integration:

1. **Test thoroughly** with `edhrec-test.ts`
2. **Update type definitions** if data structure changes
3. **Respect rate limits** - be conservative
4. **Update this README** with any changes
5. **Run type check:** `pnpm check`

## Resources

- EDHREC Website: https://edhrec.com
- EDHREC Salt Scores: https://edhrec.com/top/salt
- Next.js `__NEXT_DATA__` docs: https://nextjs.org/docs
