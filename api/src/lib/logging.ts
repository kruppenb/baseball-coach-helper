import { InvocationContext } from '@azure/functions';

export function logError(
  context: InvocationContext,
  message: string,
  error: unknown,
): void {
  const details: Record<string, unknown> = { message };
  if (error instanceof Error) {
    details.errorName = error.name;
    details.errorMessage = error.message;
    details.stack = error.stack;
    // Cosmos SDK adds `code` and `statusCode`
    const cosmosErr = error as { code?: string | number; statusCode?: number };
    if (cosmosErr.code !== undefined) details.code = cosmosErr.code;
    if (cosmosErr.statusCode !== undefined)
      details.statusCode = cosmosErr.statusCode;
  } else {
    details.errorRaw = String(error);
  }
  context.error(message, details);
}
