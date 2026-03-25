import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { logError } from '../lib/logging';

// Statusfy account for King County Parks — Tolt MacDonald Park fields
const STATUSFY_ACCOUNT_ID = '2062056722';
const FIELD_EXTENSIONS = '27,28,29'; // 27=Tolt 1, 28=Tolt 2, 29=Mariner
const STATUSFY_URL = `https://statusfy.com/${STATUSFY_ACCOUNT_ID}/list?output=json&extensions=${FIELD_EXTENSIONS}`;

const CACHE_TTL_MS = 2 * 60_000; // 2 minutes

// Friendly display names (Statusfy short names are terse)
const DISPLAY_NAMES: Record<string, string> = {
  '27': 'Tolt Field 1',
  '28': 'Tolt Field 2',
  '29': 'Mariner Field',
};

interface StatusfyField {
  extension: string;
  name_short: string;
  status_clip: string;
  status_detail: string;
  status_time: string;
  status: string;
}

interface CachedResponse {
  body: { fields: NormalizedField[]; fetchedAt: number };
  timestamp: number;
}

interface NormalizedField {
  id: string;
  name: string;
  status: string;
  detail: string;
  updatedAt: number;
}

let cache: CachedResponse | null = null;

function normalize(raw: StatusfyField[]): NormalizedField[] {
  return raw.map((f) => ({
    id: f.extension,
    name: DISPLAY_NAMES[f.extension] || f.name_short,
    status: f.status_clip,
    detail: f.status_detail || '',
    updatedAt: Number(f.status_time),
  }));
}

export async function getFieldStatus(
  _request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const now = Date.now();

  // Return cached response if still fresh
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return {
      status: 200,
      jsonBody: cache.body,
      headers: { 'Cache-Control': 'public, max-age=120' },
    };
  }

  try {
    const res = await fetch(STATUSFY_URL);
    if (!res.ok) {
      throw new Error(`Statusfy returned ${res.status}`);
    }

    const raw: StatusfyField[] = await res.json();
    const body = {
      fields: normalize(raw),
      fetchedAt: Math.floor(now / 1000),
    };

    cache = { body, timestamp: now };

    return {
      status: 200,
      jsonBody: body,
      headers: { 'Cache-Control': 'public, max-age=120' },
    };
  } catch (error) {
    logError(context, 'Failed to fetch field status from Statusfy', error);

    // If we have stale cached data, return it with a warning header
    if (cache) {
      return {
        status: 200,
        jsonBody: cache.body,
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-Field-Status-Stale': 'true',
        },
      };
    }

    return {
      status: 503,
      jsonBody: { error: 'Field status unavailable' },
    };
  }
}

app.http('getFieldStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'field-status',
  handler: getFieldStatus,
});
