import { CosmosClient, Container } from '@azure/cosmos';

const connectionString = process.env.COSMOSDB_CONNECTION_STRING;
if (!connectionString) {
  throw new Error(
    'COSMOSDB_CONNECTION_STRING environment variable is required',
  );
}

const client = new CosmosClient(connectionString);
const database = client.database('baseball-coach');

/** Singleton Cosmos container for all coach data. */
export const container: Container = database.container('coach-data');
