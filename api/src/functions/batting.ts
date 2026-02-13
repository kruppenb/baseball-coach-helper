import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';

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
    context.error('Failed to read batting data', error);
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
    const body = (await request.json()) as {
      docType: string;
      data: unknown;
    };

    if (body.docType === 'battingOrderState') {
      const doc = {
        id: `battingOrderState-${principal.userId}`,
        userId: principal.userId,
        docType: 'battingOrderState' as const,
        data: body.data,
        updatedAt: new Date().toISOString(),
      };

      const { resource } = await container.items.upsert(doc);

      return {
        status: 200,
        jsonBody: { data: resource!.data, _etag: resource!._etag },
      };
    }

    if (body.docType === 'battingHistory') {
      const entryData = body.data as { id: string };
      const doc = {
        id: `batting-${principal.userId}-${entryData.id}`,
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
    }

    return {
      status: 400,
      jsonBody: {
        error:
          'Invalid docType. Expected battingOrderState or battingHistory',
      },
    };
  } catch (error) {
    context.error('Failed to upsert batting data', error);
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
