# Repository documentation map

Start at [AGENTS.md](../../AGENTS.md) for the repo intent and commands.
Use the table to find the owner of each topic.
Treat code as the source for behavior when an older guide disagrees with it.

| Topic | Current guide | Detailed reference or implementation |
| --- | --- | --- |
| App flow and code ownership | [Architecture](architecture.md) | [`src/routes/`](../../src/routes/) and [`src/lib/`](../../src/lib/) |
| Daily development and checks | [Development](development.md) | [`package.json`](../../package.json) and [`mise.toml`](../../mise.toml) |
| UI and theme | [Development](development.md#ui-and-theme) | [`STYLE.md`](../../STYLE.md), [`theme/README.md`](../../theme/README.md), and [`src/app.css`](../../src/app.css) |
| Storage and deck versions | [Architecture](architecture.md#deck-state-and-storage) | [`src/lib/storage/`](../../src/lib/storage/) and [`src/lib/utils/deck-serializer.ts`](../../src/lib/utils/deck-serializer.ts) |
| Formats and validation | [Architecture](architecture.md#formats) | [`src/lib/formats/`](../../src/lib/formats/) |
| External APIs | [Architecture](architecture.md#external-data) | [`src/lib/api/`](../../src/lib/api/), [queue guide](../../src/lib/api/REQUEST_QUEUE_GUIDE.md), and [EDHREC guide](../../src/lib/api/EDHREC_README.md) |
| Generated data | [Development](development.md#generated-data) | [`scripts/README.md`](../../scripts/README.md) and [`src/lib/data/README.md`](../../src/lib/data/README.md) |

## Older material

The [storage redesign plan](../history/storage-redesign.md) holds design history, not current instructions.
Some theme and API guides describe earlier setups; verify their examples against imports and package scripts.

Update the matching guide in `docs/repo/` when an implementation path changes.
Link to detailed material instead of copying it into `AGENTS.md`.
