# Card Import Issues: Split/Adventure Cards & Alternate Names

## Overview

This document explains two critical issues with card imports and their solutions:

1. **Split/Adventure Cards** - Cards like "Fire // Ice" and "Bonecrusher Giant // Stomp" not importing
2. **Alternate Card Names** - Universes Beyond cards with alternate names (e.g., "Mina Harker", "Battle Bus", "The Hexcore") not importing

## Issue 1: Split/Adventure Cards Not Importing

### Problem

Cards with " // " in their names (split and adventure cards) fail to import from decklists:

- **Split Cards**: "Fire // Ice", "Wear // Tear"
- **Adventure Cards**: "Bonecrusher Giant // Stomp", "Brazen Borrower // Petty Theft"
- **Modal DFCs**: "Valki, God of Lies // Tibalt, Cosmic Impostor"

### Root Cause

Scryfall's `/cards/collection` batch endpoint doesn't recognize the full card name with " // ". When you send:

```json
{
  "identifiers": [
    { "name": "Fire // Ice" }
  ]
}
```

Scryfall returns it in the `not_found` array because it expects just the front face name:

```json
{
  "identifiers": [
    { "name": "Fire" }
  ]
}
```

### Solution

Extract the front face name before sending to Scryfall by splitting on " // " (with spaces):

```typescript
// In card-service.ts
const cardName = name.includes(' // ') ? name.split(' // ')[0].trim() : name;
```

This fix was applied to three methods:
1. `getCardByName()` - Line 159
2. `getCardsByNames()` - Lines 220-224
3. `getCardsBatch()` - Lines 301-307

### Image Display Issue

Split/adventure cards also had an issue displaying images in `CardDetailModal` because images are stored differently:

```typescript
// Normal cards
card.image_uris.normal

// Split/adventure cards
card.card_faces[0].image_uris.normal
```

**Fix in CardDetailModal.svelte (lines 43-55)**:
```typescript
const imageSource = scryfallCard.image_uris || scryfallCard.card_faces?.[0]?.image_uris;
```

## Issue 2: Alternate Card Names Not Importing

### Problem

Universes Beyond sets include cards with alternate/serialized names that don't match their canonical Magic names:

| Alternate Name | Canonical Name |
|----------------|----------------|
| Mina Harker | Thalia, Guardian of Thraben |
| Battle Bus | Mobilizer Mech |
| The Hexcore | Midnight Clock |

These cards fail to import even after the split card fix because they require **fuzzy matching**.

### Root Cause

Scryfall has two name lookup modes:

1. **Exact Match** (`/cards/named?exact=Mina Harker`)
   - Only finds cards with that exact name
   - Fails for alternate names
   - Returns 404

2. **Fuzzy Match** (`/cards/named?fuzzy=Mina Harker`)
   - Uses Scryfall's name resolution algorithm
   - Resolves alternate names to canonical names
   - Returns the canonical card

The batch import uses the collection endpoint (no fuzzy matching), and the retry mechanism was using exact matching.

### Solution

**Step 1**: Add fuzzy matching parameter to `getCardByName()`

```typescript
// card-service.ts (lines 151-167)
async getCardByName(
  name: string,
  requestType: string = 'general',
  exact: boolean = true  // NEW PARAMETER
): Promise<ScryfallCard | null> {
  try {
    const cardName = name.includes(' // ') ? name.split(' // ')[0].trim() : name;
    const card = await scryfallClient.getCardNamed(cardName, exact, requestType);
    await cardCache.cacheCard(card);
    return card;
  } catch (error) {
    console.error('Get card by name error:', error);
    return null;
  }
}
```

**Step 2**: Update retry logic to use fuzzy matching

```typescript
// +page.svelte (line 420)
const scryfallCard = await cardService.getCardByName(
  notFoundCard.name,
  'import-retry',
  false  // fuzzy matching = true
);
```

## Import Flow Diagram

```
User pastes decklist
        ↓
Parse card names
        ↓
Batch lookup (75 cards at a time)
  ├─ Split card names → Extract front face
  └─ Send to Scryfall /cards/collection
        ↓
Process results
  ├─ Found cards → Convert & add to deck
  └─ Not found → Retry individually
        ↓
Individual retry with FUZZY MATCHING
  ├─ Split card names → Extract front face
  ├─ Alternate names → Fuzzy match resolves
  └─ Send to Scryfall /cards/named?fuzzy=...
        ↓
Success or final failure
```

## Testing

### Test File

Create `/tmp/test.json`:
```json
{
  "identifiers": [
    {"name": "Mina Harker"},
    {"name": "Battle Bus"},
    {"name": "The Hexcore"}
  ]
}
```

Or test with a decklist:
```
1 Fire // Ice
1 Bonecrusher Giant // Stomp
1 Mina Harker
1 Battle Bus
1 The Hexcore
```

### Expected Behavior

**Before fixes**:
- ❌ "Fire // Ice" - Not found
- ❌ "Bonecrusher Giant // Stomp" - Not found (or found but no image)
- ❌ "Mina Harker" - Not found after retry
- ❌ "Battle Bus" - Not found after retry
- ❌ "The Hexcore" - Not found after retry

**After fixes**:
- ✅ "Fire // Ice" → Found as "Fire // Ice" (split card)
- ✅ "Bonecrusher Giant // Stomp" → Found with images displayed
- ✅ "Mina Harker" → Found as "Thalia, Guardian of Thraben"
- ✅ "Battle Bus" → Found as "Mobilizer Mech"
- ✅ "The Hexcore" → Found as "Midnight Clock"

### Debug Logs

Look for these console logs during import:

```
[handleImportDeck] Retrying not_found cards individually...
[handleImportDeck] Retrying: "Mina Harker"
[handleImportDeck] ✓ Found via retry: "Mina Harker" → "Thalia, Guardian of Thraben"
```

## Files Modified

1. **src/lib/api/card-service.ts**
   - Line 151-167: Added `exact` parameter to `getCardByName()`
   - Line 220-224: Extract front face in `getCardsByNames()`
   - Line 301-307: Extract front face in `getCardsBatch()`

2. **src/routes/+page.svelte**
   - Line 411-448: Added individual retry mechanism with fuzzy matching
   - Extensive debug logging for troubleshooting

3. **src/lib/components/CardDetailModal.svelte**
   - Line 43-55: Fallback to `card_faces[0].image_uris` for split cards

## Known Limitations

1. **Batch Import Performance**: The retry mechanism processes cards one at a time. For decklists with many alternate names, this could be slow due to Scryfall's rate limiting.

2. **Ambiguous Names**: Fuzzy matching might return unexpected results for ambiguous card names. For example, "Jace" might match "Jace Beleren" instead of "Jace, the Mind Sculptor".

3. **Front Face Only**: The current implementation always uses the front face for split cards. Users cannot specifically import the back face of a modal DFC.

## Scryfall API Reference

### Card Collection Endpoint
- **URL**: `POST https://api.scryfall.com/cards/collection`
- **Max Identifiers**: 75 per request
- **Supports**: Exact name matching only, set+collector number
- **Does NOT Support**: Fuzzy matching, alternate names, full split card names with " // "

### Named Card Endpoint
- **URL**: `GET https://api.scryfall.com/cards/named`
- **Parameters**:
  - `exact` - Exact name matching (case-insensitive)
  - `fuzzy` - Fuzzy matching (resolves alternate names, typos)
- **Rate Limit**: 10 requests per second (100ms delay)

## Future Improvements

1. **Pre-process alternate names**: Build a local mapping of known alternate names to canonical names to avoid individual API calls

2. **Better heuristics**: Detect likely alternate names (e.g., non-Magic character names) and use fuzzy matching in the initial batch

3. **User feedback**: Show a diff when alternate names resolve (e.g., "Imported 'Mina Harker' as 'Thalia, Guardian of Thraben'")

4. **Parallel fuzzy lookups**: Use Promise.all() to retry multiple not_found cards in parallel (respecting rate limits)

## Troubleshooting

### Card still not importing?

1. **Check console logs**: Look for `[handleImportDeck]` messages
2. **Verify card name spelling**: Even fuzzy matching has limits
3. **Check Scryfall directly**: Try searching on scryfall.com to confirm the card exists
4. **Set/Collector number**: If available, use `1 Card Name (SET) 123` format for specific printings

### Images not showing?

1. **Check card layout**: Run this in console:
   ```javascript
   console.log(card.layout, card.image_uris, card.card_faces?.[0]?.image_uris)
   ```

2. **Verify image URLs**: Scryfall image servers might be down temporarily

3. **Clear cache**: Use browser DevTools to clear cache and retry

## Summary

Both issues are now fixed:
- ✅ Split/adventure cards import correctly by extracting front face names
- ✅ Alternate names import correctly using fuzzy matching retry mechanism
- ✅ Card images display correctly for all card types
- ✅ Comprehensive debug logging for future troubleshooting
