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

	const query = [
		`- Pierre Lesne, tête de liste « Bavay en mouvement », candidat a la mairie de 'bavay la romain'`,
		`- Quel est son parcours et son expérience ?`,
		`- Pourquoi se présente-t-il à la mairie maintenant ?`,
		`- Quelles sont ses trois principales priorités politiques ?`,
		`- Qui le soutient ?`,
		`- Quelles critiques ou controverses existent à son sujet ?`
	].join('\n')
	const body: Perplexity.Responses.ResponsesCreateParams = {
		// more on presets - https://docs.perplexity.ai/docs/agent-api/presets
		preset: "pro-search",
		input: query,
	}

	// First call - will hit the API
	const response = await perplexityClient.responses.create(body) as Perplexity.Responses.ResponseCreateResponse

	console.log(response.output_text);

	// display ResponsesUsage in a readable format 
	if (response.usage) {
		console.log("\nUsage:", JSON.stringify(response.usage.cost, null, 8));
	}
}

void main();