import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';
import { logError } from '../lib/logging';
import { battingBodySchema, validateBody } from '../lib/validation';

export async function getBatting(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

  try {
    // Read battingOrderState singleton
    const orderDocId = `battingOrderState-${principal.userId}`;
    const { resource: orderResource } = await container
      .item(orderDocId, principal.userId)
      .read();

    // Query battingHistory collection
    const querySpec = {
      query:
        'SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType',
      parameters: [
        { name: '@userId', value: principal.userId },
        { name: '@docType', value: 'battingHistory' },
      ],
    };
    const { resources: historyResources } = await container.items
      .query(querySpec)
      .fetchAll();

    return {
      status: 200,
      jsonBody: {
        battingOrderState: orderResource?.data ?? {
          currentOrder: null,
          isConfirmed: false,
        },
        battingHistory: historyResources.map(
          (r: { data: unknown }) => r.data,
        ),
      },
    };
  } catch (error) {
    logError(context, 'Failed to read batting data', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function putBatting(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

  try {
    const raw = await request.json();
    const parsed = validateBody(raw, battingBodySchema);
    if (!parsed.success) {
      return { status: 400, jsonBody: { error: parsed.error } };
    }

    const body = parsed.data;

    const ifMatch = request.headers.get('if-match');

    if (body.docType === 'battingOrderState') {
      const doc = {
        id: `battingOrderState-${principal.userId}`,
        userId: principal.userId,
        docType: 'battingOrderState' as const,
        data: body.data,
        updatedAt: new Date().toISOString(),
      };

      const options = ifMatch
        ? { accessCondition: { type: 'IfMatch' as const, condition: ifMatch } }
        : {};

      const { resource } = await container.items.upsert(doc, options);

      return {
        status: 200,
        jsonBody: { data: resource!.data, _etag: resource!._etag },
      };
    }

    const doc = {
      id: `batting-${principal.userId}-${body.data.id}`,
      userId: principal.userId,
      docType: 'battingHistory' as const,
      data: body.data,
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await container.items.upsert(doc);

    return {
      status: 200,
      jsonBody: { data: resource!.data, _etag: resource!._etag },
    };
  } catch (error) {
    const cosmosErr = error as { statusCode?: number };
    if (cosmosErr.statusCode === 412) {
      // Only battingOrderState uses accessCondition, so conflict is for that doc
      const docId = `battingOrderState-${principal.userId}`;
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
    logError(context, 'Failed to upsert batting data', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('getBatting', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'batting',
  handler: getBatting,
});

app.http('putBatting', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'batting',
  handler: putBatting,
});
