# Data Directory

This directory contains static data files used by Jitte.

## Files

### `salt-scores.ts`

Contains EDHREC salt score data for Commander cards.

**Source:** https://edhrec.com/top/salt
**License:** Used with attribution under fair use
**Update Frequency:** Annually (EDHREC publishes new scores once per year)

**To update:**
```bash
pnpm fetch-salt-scores
```

This will:
1. Fetch the latest top 200 salt scores from EDHREC
2. Parse and format the data
3. Overwrite `salt-scores.ts` with new data
4. Update the timestamp and year

**Data Structure:**
- `SALT_SCORES`: Array of top 200 saltiest cards
- `SALT_SCORES_MAP`: Fast lookup map (card name → score)
- Helper functions for querying salt scores

**Attribution:**
Salt scores are community-driven ratings from EDHREC indicating how frustrating cards are to play against (0-4 scale). Data is used with attribution to EDHREC.com.

## Adding New Data Files

When adding new static data:
1. Create a TypeScript file exporting typed data
2. Document the source, license, and update frequency
3. If data needs periodic updates, create a fetch script in `scripts/`
4. Add appropriate attribution in the Footer component
