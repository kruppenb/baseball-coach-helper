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
import { positionBlocksBodySchema, validateBody } from '../lib/validation';

const DOC_TYPE = 'positionBlocks';

export async function getPositionBlocks(
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
      return { status: 200, jsonBody: { data: null, _etag: null } };
    }

    return {
      status: 200,
      jsonBody: { data: resource.data, _etag: resource._etag, updatedAt: resource.updatedAt ?? null },
    };
  } catch (error) {
    logError(context, 'Failed to read position blocks', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function putPositionBlocks(
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
    const parsed = validateBody(raw, positionBlocksBodySchema);
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
    logError(context, 'Failed to upsert position blocks', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('getPositionBlocks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'position-blocks',
  handler: getPositionBlocks,
});

app.http('putPositionBlocks', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'position-blocks',
  handler: putPositionBlocks,
});
