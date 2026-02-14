import { CosmosClient, Container } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

function createClient(): CosmosClient {
  const connectionString = process.env.COSMOSDB_CONNECTION_STRING;
  if (connectionString) {
    return new CosmosClient(connectionString);
  }

  const endpoint = process.env.COSMOSDB_ENDPOINT;
  if (!endpoint) {
    throw new Error('Set COSMOSDB_ENDPOINT or COSMOSDB_CONNECTION_STRING');
  }

  return new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
}

const client = createClient();
const database = client.database('baseball-coach');

/** Singleton Cosmos container for all coach data. */
export const container: Container = database.container('coach-data');
