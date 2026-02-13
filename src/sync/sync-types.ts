export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncKeyConfig {
  endpoint: string;
  mode: 'singleton' | 'collection';
  /** For endpoints where GET response nests data under a specific key instead of `data` */
  responseKey?: string;
  /** For batting endpoint's PUT discriminator ('battingOrderState' or 'battingHistory') */
  pushDocType?: string;
}

export interface SyncApiResponse {
  data: unknown;
  _etag: string | null;
}

/** Non-standard /api/batting GET response shape */
export interface BattingApiResponse {
  battingOrderState: unknown;
  battingHistory: unknown[];
}
