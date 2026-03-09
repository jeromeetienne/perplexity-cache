import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PerplexityCached } from "../src/perplexity_cached";

class InMemoryCache {
	private map = new Map<string, unknown>();

	async get<T>(key: string): Promise<T | undefined> {
		return this.map.get(key) as T | undefined;
	}

	async set<T>(key: string, value: T): Promise<void> {
		this.map.set(key, value);
	}
}

describe("PerplexityCached", () => {
	it("caches search.create calls", async () => {
		let searchCalls = 0;

		const client = {
			search: {
				create: async (args: unknown) => {
					searchCalls += 1;
					return { id: `search-${searchCalls}`, args };
				},
			},
			responses: {
				create: async (args: unknown) => ({ id: "resp-1", args }),
			},
		} as any;

		const cache = new InMemoryCache() as any;
		const cached = new PerplexityCached(client, cache, { cacheEnabled: true });

		const args = { query: "hello world" } as any;
		const first = await cached.search.create(args);
		const second = await cached.search.create(args);

		assert.equal(searchCalls, 1);
		assert.deepEqual(second, first);
	});

	it("caches responses.create calls", async () => {
		let responsesCalls = 0;

		const client = {
			search: {
				create: async (args: unknown) => ({ id: "search-1", args }),
			},
			responses: {
				create: async (args: unknown) => {
					responsesCalls += 1;
					return { id: `resp-${responsesCalls}`, args };
				},
			},
		} as any;

		const cache = new InMemoryCache() as any;
		const cached = new PerplexityCached(client, cache, { cacheEnabled: true });

		const args = { model: "sonar", input: "hi" } as any;
		const first = await cached.responses.create(args);
		const second = await cached.responses.create(args);

		assert.equal(responsesCalls, 1);
		assert.deepEqual(second, first);
	});

	it("does not read from cache when cacheEnabled is false", async () => {
		let searchCalls = 0;

		const client = {
			search: {
				create: async (args: unknown) => {
					searchCalls += 1;
					return { id: `search-${searchCalls}`, args };
				},
			},
			responses: {
				create: async (args: unknown) => ({ id: "resp-1", args }),
			},
		} as any;

		const cache = new InMemoryCache() as any;
		const cached = new PerplexityCached(client, cache, { cacheEnabled: false });

		const args = { query: "hello world" } as any;
		const first = await cached.search.create(args);
		const second = await cached.search.create(args);

		assert.equal(searchCalls, 2);
		assert.notDeepEqual(second, first);
	});
});
