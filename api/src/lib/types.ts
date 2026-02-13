/** Discriminator for documents stored in the coach-data container. */
export type DocType =
  | 'roster'
  | 'gameConfig'
  | 'lineupState'
  | 'battingOrderState'
  | 'gameHistory'
  | 'battingHistory';

/**
 * Shape of every document in Cosmos DB.
 * The `data` field holds the actual frontend payload (Player[], GameConfig, etc.).
 */
export interface CosmosDocument {
  id: string;
  userId: string;
  docType: DocType;
  data: unknown;
  updatedAt: string;
  _etag?: string;
}
