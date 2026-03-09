// node imports
import Path from "node:path";

// npm imports
import KeyvSqlite from "@keyv/sqlite";
import { Cacheable, KeyvStoreAdapter } from "cacheable";
import { Perplexity } from "@perplexity-ai/perplexity_ai";

// local imports
import { PerplexityCached  } from "../src/perplexity_cached";

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

	const query:Perplexity.Search.SearchCreateParams = {
		query: [
			"- Pierre Lesne, tête de liste « Bavay en mouvement », candidat a la mairie de",
			"- Vincent Boussemart, 34 ans, enseignant au lycée des Nerviens, à la tête d’une nouvelle liste dans la continuité de la maire sortante Francine Caucheteux",
		],
	};

	console.time("first call (network or cache miss)");
	const response1 = await perplexityClient.search.create(query);
	console.timeEnd("first call (network or cache miss)");

	console.time("second call (should be cache hit)");
	const response2 = await perplexityClient.search.create(query);
	console.timeEnd("second call (should be cache hit)");

	console.log("First call results:");
	response1.results.forEach((result) => {
		console.log(`- ${result.title}: ${result.url}`);
	});

	console.log(`Second call returned ${response2.results.length} results`);
}

void main();