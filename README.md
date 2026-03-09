# `perplexity_cache`

A tiny TypeScript wrapper around the official Perplexity SDK that adds transparent caching for:

- `client.search.create(...)`
- `client.responses.create(...)`

It is designed as a drop-in API-compatible surface so you can keep your existing calling code and reduce duplicate API calls during iteration.

## Why Use It

- Avoid paying repeatedly for identical prompts during development.
- Speed up repeated queries with local cache hits.
- Keep the same method shape as the original Perplexity client (`search.create` and `responses.create`).

## How It Works

`PerplexityCached` wraps a regular `Perplexity` client and a `Cacheable` instance.

- On `create(...)`, it builds a deterministic SHA-256 cache key from args.
- If cache is enabled and a value exists, it returns the cached value.
- Otherwise, it calls the network API and stores the response.

### Cache Key Details

- `search.create`: key = SHA-256 of normalized args.
	- If `query` is an array, it is normalized to a newline-joined string before hashing.
- `responses.create`: key = SHA-256 of `responses:${JSON.stringify(args)}`.

This keeps search and responses keyspaces independent.

## Requirements

- Node.js 18+
- A valid Perplexity API key in `PERPLEXITY_API_KEY`
- Dependencies:
	- `@perplexity-ai/perplexity_ai`
	- `cacheable`
	- a cache store implementation (examples use `@keyv/sqlite`)

## Installation

From this folder:

```bash
cd contribs/perplexity_cache
npm install @perplexity-ai/perplexity_ai cacheable @keyv/sqlite
```

If you run examples with `tsx`, install it where you execute commands:

```bash
npm install -D tsx typescript
```

## Quick Start

```ts
import Path from "node:path";
import KeyvSqlite from "@keyv/sqlite";
import { Cacheable, KeyvStoreAdapter } from "cacheable";
import { Perplexity } from "@perplexity-ai/perplexity_ai";
import { PerplexityCached } from "./src/perplexity_cached";

const baseClient = new Perplexity({
	apiKey: process.env.PERPLEXITY_API_KEY!,
});

const sqlitePath = Path.resolve(__dirname, "../../output/.perplexity_cache.sqlite");
const store = new KeyvSqlite(`sqlite://${sqlitePath}`);
const cacheable = new Cacheable({ secondary: store as KeyvStoreAdapter });

const client = new PerplexityCached(baseClient, cacheable);

const response = await client.responses.create({
	model: "perplexity/sonar",
	input: "Summarize this page: https://example.com",
	tools: [{ type: "fetch_url" }],
});

console.log(response.output_text);
```

## Constructor

```ts
new PerplexityCached(perplexityClient, cache, { cacheEnabled?: boolean })
```

- `perplexityClient`: instance of `Perplexity`
- `cache`: instance of `Cacheable`
- `cacheEnabled` (optional, default `true`):
	- `true`: read from cache and fallback to network on miss
	- `false`: skip cache reads, always call network, still write results to cache

## API Surface

The wrapper exposes:

- `client.search.create(args)`
- `client.responses.create(args)`

Both methods keep the input/output typing from the official SDK.

## Running Included Examples

From `contribs/perplexity_cache`:

```bash
# search.create with visible cache-hit timing
npx tsx ./examples/search_create.ts

# responses.create with fetch_url tool
npx tsx ./examples/response_create.ts

# pro-search preset response example
npx tsx ./examples/pro_search.ts

# pro-search + extracted references from response.output
npx tsx ./examples/pro_search_playground.ts
```

## Typical Cache Location

Examples write to:

`output/.perplexity_cache.sqlite`

You can change this path to isolate caches per project, environment, or experiment.

## Notes

- No TTL is enforced by this wrapper directly. Configure expiration in your `Cacheable` setup if needed.
- Cached response payloads are returned as-is.
- Cache key stability depends on argument structure and ordering in provided objects.

## File Layout

```text
contribs/perplexity_cache/
	src/perplexity_cached.ts
	examples/
		search_create.ts
		response_create.ts
		pro_search.ts
		pro_search_playground.ts
```
