import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';

const DOC_TYPE = 'gameConfig';

export async function getGameConfig(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

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
      jsonBody: { data: resource.data, _etag: resource._etag },
    };
  } catch (error) {
    context.error('Failed to read game config', error);
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

  try {
    const body = (await request.json()) as { data: unknown };
    const doc = {
      id: `${DOC_TYPE}-${principal.userId}`,
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
    context.error('Failed to upsert game config', error);
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
