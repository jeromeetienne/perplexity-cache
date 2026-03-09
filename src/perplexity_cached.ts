// node imports
import Crypto from "node:crypto";

// npm imports
import Perplexity from "@perplexity-ai/perplexity_ai";
import { Cacheable } from "cacheable";

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	type
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

type SearchArgs = Parameters<Perplexity["search"]["create"]>[0];
type SearchResponse = Awaited<ReturnType<Perplexity["search"]["create"]>>;
type SearchCreate = Perplexity["search"]["create"];
type ResponsesArgs = Parameters<Perplexity["responses"]["create"]>[0];
type ResponsesResponse = Awaited<ReturnType<Perplexity["responses"]["create"]>>;
type ResponsesCreate = Perplexity["responses"]["create"];

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	PerplexityCached
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class PerplexityCached {
	private _perplexityClient: Perplexity;
	private _cache: Cacheable;
	private _cacheEnabled: boolean;

	// API-compatible surface: client.search.create(...)
	public readonly search: {
		create: SearchCreate;
	};
	public readonly responses: {
		create: ResponsesCreate;
	};

	constructor(perplexityClient: Perplexity, cache: Cacheable, {
		cacheEnabled = true,
	}: {
		cacheEnabled?: boolean;
	} = {}) {
		this._perplexityClient = perplexityClient;
		this._cache = cache;
		this._cacheEnabled = cacheEnabled;

		// Bind the cached method to the same surface as the original client for drop-in compatibility. 
		// - The original client is still accessible as this.perplexityClient if needed.
		this.search = {
			create: this._searchCreateCached.bind(this) as SearchCreate,
		};
		this.responses = {
			create: this._responsesCreateCached.bind(this) as ResponsesCreate,
		};
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	
	/**
	 * Cleans the OpenAI cache by deleting all cached values.
	 */
	public async cleanCache() {
		await this._cache.clear();
	}

	/**
	 * Enables or disables caching. When disabled, all calls will bypass the cache and go directly to the Perplexity API. When re-enabled, previously cached entries will be available again until they expire based on the cache's eviction policy.
	 */
	public setCacheEnabled(cacheEnabled: boolean) {
		this._cacheEnabled = cacheEnabled;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	

	private async _searchCreateCached(args: SearchArgs): Promise<SearchResponse> {
		const key = this._buildSearchCacheKey(args);

		// check the cache for a valid entry before making the network call - IIF this.cacheEnabled
		if (this._cacheEnabled === true) {
			const searchResponse = await this._cache.get<SearchResponse>(key);
			if (searchResponse !== undefined) {
				return searchResponse;
			}
		}

		// Make the network call
		const searchResponse: SearchResponse = await this._perplexityClient.search.create(args);

		// write the response in the cache 
		await this._cache.set<SearchResponse>(key, searchResponse);

		// return the original response, not the cached entry wrapper
		return searchResponse;
	}

	private async _responsesCreateCached(args: ResponsesArgs): Promise<ResponsesResponse> {
		const key = this._buildResponsesCacheKey(args);

		// check the cache for a valid entry before making the network call - IIF this.cacheEnabled
		if (this._cacheEnabled === true) {
			const response = await this._cache.get<ResponsesResponse>(key);
			if (response !== undefined) {
				return response;
			}
		}

		// Make the network call
		const response: ResponsesResponse = await this._perplexityClient.responses.create(args);

		// write the response in the cache
		await this._cache.set<ResponsesResponse>(key, response);

		// return the original response, not the cached entry wrapper
		return response;
	}


	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private function
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private _buildSearchCacheKey(args: SearchArgs): string {
		// Canonicalize to avoid key drift from inconsequential shape differences.
		const normalized = {
			...args,
			query: Array.isArray((args as any).query)
				? (args as any).query.join("\n")
				: (args as any).query,
		};
		const raw = JSON.stringify(normalized);
		return Crypto.createHash("sha256").update(raw).digest("hex");
	}

	private _buildResponsesCacheKey(args: ResponsesArgs): string {
		// Prefix with a namespace to keep search and responses cache spaces independent.
		const raw = `responses:${JSON.stringify(args)}`;
		return Crypto.createHash("sha256").update(raw).digest("hex");
	}
}