import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';
import { lineupStateBodySchema, validateBody } from '../lib/validation';

const DOC_TYPE = 'lineupState';

export async function getLineupState(
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
      return { status: 200, jsonBody: { data: null, _etag: null } };
    }

    return {
      status: 200,
      jsonBody: { data: resource.data, _etag: resource._etag },
    };
  } catch (error) {
    context.error('Failed to read lineup state', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function putLineupState(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

  try {
    const raw = await request.json();
    const parsed = validateBody(raw, lineupStateBodySchema);
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

    const { resource } = await container.items.upsert(doc);

    return {
      status: 200,
      jsonBody: { data: resource!.data, _etag: resource!._etag },
    };
  } catch (error) {
    context.error('Failed to upsert lineup state', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('getLineupState', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'lineup-state',
  handler: getLineupState,
});

app.http('putLineupState', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'lineup-state',
  handler: putLineupState,
});
