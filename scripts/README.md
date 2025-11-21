# Scripts Directory

This directory contains utility scripts for maintaining Jitte's data and tooling.

## Available Scripts

### `update-ban-lists.ts`

Automatically fetches and updates ban lists for all Magic: The Gathering formats from Scryfall API.

**Usage:**
```bash
# Run the script
pnpm update-ban-lists
```

**What it does:**
1. Queries Scryfall API for banned/restricted cards in each format
2. Preserves existing ban dates by merging with current ban list files
3. Generates updated TypeScript files for all formats
4. Handles rate limiting (100ms between requests)
5. Updates timestamps automatically

**Supported formats:**
- Commander
- Modern
- Standard
- Vintage
- Legacy
- Pioneer
- Pauper
- Brawl
- Historic
- Alchemy
- Oathbreaker
- Pre-EDH

**When to run:**
- **After Wizards announces new bans:** Check Wizards' website for B&R updates
- **Monthly check:** Ensure ban lists are current
- **Before major releases:** Keep data fresh for new sets

**Output:**
```
🚫 Magic: The Gathering Ban List Updater

Fetching latest ban lists from Scryfall API...

📋 Updating Commander ban list...
  Fetching banned cards for commander...
  Found 45 banned cards
  ✅ Updated commander.ts
     Latest banned: Nadu, Winged Wisdom, Jeweled Lotus, Mana Crypt

📋 Updating Modern ban list...
  ...

✅ All ban lists updated successfully!
```

**Troubleshooting:**

If the script fails with rate limit errors:
- The script already includes 100ms delays between requests
- If still failing, increase the delay in the `sleep()` calls

If card names or dates look wrong:
- The script merges with existing data to preserve ban dates
- New cards use their release date as a fallback
- Review changes with `git diff` before committing

### `fetch-salt-scores.ts`

Fetches the top 200 salt scores from EDHREC and saves them to `src/lib/data/salt-scores.ts`.

**Usage:**
```bash
# Install dependencies first (if not already installed)
pnpm install

# Run the script
pnpm fetch-salt-scores
```

**What it does:**
1. Fetches https://edhrec.com/top/salt
2. Parses the salt score data from the page
3. Generates a TypeScript file with:
   - Array of top 200 cards with scores
   - Fast lookup map for queries
   - Helper functions
   - Type definitions
4. Saves to `src/lib/data/salt-scores.ts`

**When to run:**
- **First time setup:** To populate initial salt score data
- **Annual update:** When EDHREC publishes new salt scores (usually late in the year)
- **After major EDHREC changes:** If EDHREC updates their salt score methodology

**Output:**
```
🧂 EDHREC Salt Score Fetcher

Fetching top 200 salt scores from EDHREC...
Page fetched successfully, parsing...
Found 200 cards with salt scores

✅ Successfully fetched 200 salt scores

Top 5 saltiest cards:
  1. Stasis - 3.06 (14,232 decks)
  2. Armageddon - 2.89 (45,123 decks)
  3. Rhystic Study - 2.73 (891,617 decks)
  4. Cyclonic Rift - 2.65 (654,321 decks)
  5. Smothering Tithe - 2.34 (523,456 decks)

✅ Saved to: src/lib/data/salt-scores.ts
```

**Troubleshooting:**

If the script fails with CORS errors:
- The script should run in Node.js, which doesn't have CORS restrictions
- If still failing, check if EDHREC's page structure changed
- Update the parsing logic in the script

If the script fails with parsing errors:
- EDHREC may have changed their page structure
- Check the `__NEXT_DATA__` JSON structure on the page
- Update the `parseNextData` function accordingly

## Adding New Scripts

When creating new data-fetching scripts:

1. **Name convention:** `fetch-{data-type}.ts`
2. **Add to package.json:** Create a script entry like `"fetch-{data}": "tsx scripts/fetch-{data}.ts"`
3. **Document here:** Add a section explaining what it does and how to use it
4. **Error handling:** Always include try-catch and helpful error messages
5. **Attribution:** Document data sources and licenses
6. **Validation:** Validate fetched data before saving
7. **Backup:** Consider backing up existing data before overwriting

## Dependencies

Scripts use:
- **tsx:** TypeScript execution (like ts-node but faster)
- **Node.js built-ins:** `fs`, `path` for file operations
- **fetch:** Native Node.js fetch for HTTP requests

No additional dependencies needed beyond what's in package.json.
