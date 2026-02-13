import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';

const DOC_TYPE = 'gameHistory';

export async function getGameHistory(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

  try {
    const querySpec = {
      query:
        'SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType',
      parameters: [
        { name: '@userId', value: principal.userId },
        { name: '@docType', value: DOC_TYPE },
      ],
    };

    const { resources } = await container.items
      .query(querySpec)
      .fetchAll();

    return {
      status: 200,
      jsonBody: { data: resources.map((r: { data: unknown }) => r.data) },
    };
  } catch (error) {
    context.error('Failed to read game history', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function putGameHistoryEntry(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

  try {
    const body = (await request.json()) as {
      data: { id: string; [key: string]: unknown };
    };
    const doc = {
      id: `game-${principal.userId}-${body.data.id}`,
      userId: principal.userId,
      docType: DOC_TYPE,
      data: body.data,
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await container.items.upsert(doc);

    return {
      status: 200,
      jsonBody: { data: resource!.data, _etag: resource!._etag },
    };
  } catch (error) {
    context.error('Failed to upsert game history entry', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('getGameHistory', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'game-history',
  handler: getGameHistory,
});

app.http('putGameHistoryEntry', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'game-history',
  handler: putGameHistoryEntry,
});
