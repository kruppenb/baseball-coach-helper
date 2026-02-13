import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';

const DOC_TYPE = 'roster';

export async function getRoster(
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
      return { status: 200, jsonBody: { data: [], _etag: null } };
    }

    return {
      status: 200,
      jsonBody: { data: resource.data, _etag: resource._etag },
    };
  } catch (error) {
    context.error('Failed to read roster', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function putRoster(
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
    context.error('Failed to upsert roster', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('getRoster', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'roster',
  handler: getRoster,
});

app.http('putRoster', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'roster',
  handler: putRoster,
});
