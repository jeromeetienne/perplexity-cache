// node imports
import Path from "node:path";

// npm imports
import KeyvSqlite from "@keyv/sqlite";
import { Cacheable, KeyvStoreAdapter } from "cacheable";
import { Perplexity } from "@perplexity-ai/perplexity_ai";

// local imports
import { PerplexityCached } from "../src/perplexity_cached";

async function main() {
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Create the PerplexityCached instance
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// Init perplexity client
	const perplexityClientUncached = new Perplexity({
		apiKey: process.env.PERPLEXITY_API_KEY!,
	});

	// Init cacheable
	const sqlitePath = Path.resolve(__dirname, `../.perplexity_cache.sqlite`);
	const sqliteUrl = `sqlite://${sqlitePath}`;
	const store = new KeyvSqlite(sqliteUrl);
	const cacheable = new Cacheable({ secondary: store as KeyvStoreAdapter });

	// Create the cached client
	const perplexityClient = new PerplexityCached(perplexityClientUncached, cacheable);

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Perform a search using the cached client
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	const body: Perplexity.Responses.ResponsesCreateParams = {
    		model: "perplexity/sonar",
		input: "Summarize the content at https://www.canalfm.fr/les-elections-municipales-a-bavay-2",
		tools: [
			{
				type: "fetch_url" as const
			}
		],
		instructions: "Use fetch_url to retrieve and summarize the article."
	}

	// First call - will hit the API
	console.log("First call (uncached)...");
	console.time("first call");
	const response1 = await perplexityClient.responses.create(body) as Perplexity.Responses.ResponseCreateResponse
	console.timeEnd("first call");

	// Second call - will use cache
	console.log("\nSecond call (cached)...");
	console.time("second call");
	const response2 = await perplexityClient.responses.create(body) as Perplexity.Responses.ResponseCreateResponse
	console.timeEnd("second call");

	console.log('\n',response1.output_text);
	console.assert(response1.output_text === response2.output_text, "Cached response should match original response");
}

void main();