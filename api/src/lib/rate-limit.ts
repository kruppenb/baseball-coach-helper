import { HttpResponseInit } from '@azure/functions';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

const requests = new Map<string, number[]>();

export function checkRateLimit(userId: string): HttpResponseInit | null {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = requests.get(userId);
  if (timestamps) {
    timestamps = timestamps.filter((t) => t > windowStart);
  } else {
    timestamps = [];
  }

  if (timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    return {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
      jsonBody: { error: 'Too many requests. Please try again later.' },
    };
  }

  timestamps.push(now);
  requests.set(userId, timestamps);
  return null;
}

// Periodically evict stale entries to prevent unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [userId, timestamps] of requests) {
    const active = timestamps.filter((t) => t > cutoff);
    if (active.length === 0) {
      requests.delete(userId);
    } else {
      requests.set(userId, active);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();
