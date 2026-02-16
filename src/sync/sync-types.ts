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

/** Conflict details returned when a push receives HTTP 412 (ETag mismatch) */
export interface ConflictInfo {
  key: string;
  localData: unknown;
  cloudData: unknown;
  cloudEtag: string | null;
  cloudUpdatedAt: string | null;
}
