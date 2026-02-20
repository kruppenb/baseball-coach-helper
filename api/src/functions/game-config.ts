import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { checkRateLimit } from '../lib/rate-limit';
import { container } from '../lib/cosmos';
import { logError } from '../lib/logging';
import { gameConfigBodySchema, validateBody } from '../lib/validation';

const DOC_TYPE = 'gameConfig';

export async function getGameConfig(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }
  const rateLimited = checkRateLimit(principal.userId);
  if (rateLimited) return rateLimited;

  const docId = `${DOC_TYPE}-${principal.userId}`;

  try {
    const { resource } = await container
      .item(docId, principal.userId)
      .read();

    if (!resource) {
      return {
        status: 200,
        jsonBody: { data: { innings: 6 }, _etag: null },
      };
    }

    return {
      status: 200,
      jsonBody: { data: resource.data, _etag: resource._etag, updatedAt: resource.updatedAt ?? null },
    };
  } catch (error) {
    logError(context, 'Failed to read game config', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function putGameConfig(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }
  const rateLimited = checkRateLimit(principal.userId);
  if (rateLimited) return rateLimited;

  try {
    const raw = await request.json();
    const parsed = validateBody(raw, gameConfigBodySchema);
    if (!parsed.success) {
      return { status: 400, jsonBody: { error: parsed.error } };
    }

    const doc = {
      id: `${DOC_TYPE}-${principal.userId}`,
      userId: principal.userId,
      docType: DOC_TYPE,
      data: parsed.data.data,
      updatedAt: new Date().toISOString(),
    };

    const ifMatch = request.headers.get('if-match');
    const options = ifMatch
      ? { accessCondition: { type: 'IfMatch' as const, condition: ifMatch } }
      : {};

    const { resource } = await container.items.upsert(doc, options);

    return {
      status: 200,
      jsonBody: { data: resource!.data, _etag: resource!._etag },
    };
  } catch (error) {
    const cosmosErr = error as { code?: number; statusCode?: number };
    if (cosmosErr.code === 412 || cosmosErr.statusCode === 412) {
      const docId = `${DOC_TYPE}-${principal.userId}`;
      try {
        const { resource: current } = await container
          .item(docId, principal.userId)
          .read();
        return {
          status: 412,
          jsonBody: {
            error: 'Conflict: data was modified by another device',
            cloudData: current?.data ?? null,
            cloudEtag: current?._etag ?? null,
            cloudUpdatedAt: current?.updatedAt ?? null,
          },
        };
      } catch (readError) {
        logError(context, 'Failed to read current doc during conflict', readError);
        return { status: 412, jsonBody: { error: 'Conflict detected' } };
      }
    }
    logError(context, 'Failed to upsert game config', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('getGameConfig', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'game-config',
  handler: getGameConfig,
});

app.http('putGameConfig', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'game-config',
  handler: putGameConfig,
});
