import { describe, it, expect } from 'vitest';

// Re-implement the pure functions from the component for testability
// These mirror the logic in FieldStatusBanner.tsx and field-status.ts API

interface FieldStatus {
  id: string;
  name: string;
  status: string;
  detail: string;
  updatedAt: number;
}

interface StatusfyField {
  extension: string;
  name_short: string;
  status_clip: string;
  status_detail: string;
  status_time: string;
  status: string;
}

const DISPLAY_NAMES: Record<string, string> = {
  '27': 'Tolt Field 1',
  '28': 'Tolt Field 2',
  '29': 'Mariner Field',
};

function normalize(raw: StatusfyField[]): FieldStatus[] {
  return raw.map((f) => ({
    id: f.extension,
    name: DISPLAY_NAMES[f.extension] || f.name_short,
    status: f.status_clip,
    detail: f.status_detail || '',
    updatedAt: Number(f.status_time),
  }));
}

function timeAgo(unixSeconds: number): string {
  const minutes = Math.round((Date.now() / 1000 - unixSeconds) / 60);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function checkedAgo(ms: number): string {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function dotStatus(status: string): string {
  if (status === 'Open') return 'Open';
  if (status === 'Closed') return 'Closed';
  return 'other';
}

function summarize(fields: FieldStatus[]): string {
  const statuses = new Set(fields.map((f) => f.status));
  if (statuses.size === 1) {
    const s = [...statuses][0];
    return `All fields ${s.toLowerCase()}`;
  }
  const open = fields.filter((f) => f.status === 'Open').length;
  const closed = fields.filter((f) => f.status === 'Closed').length;
  const parts: string[] = [];
  if (open) parts.push(`${open} open`);
  if (closed) parts.push(`${closed} closed`);
  const other = fields.length - open - closed;
  if (other) parts.push(`${other} notice`);
  return parts.join(', ');
}

// --- Tests ---

describe('normalize', () => {
  it('maps Statusfy fields to normalized shape', () => {
    const raw: StatusfyField[] = [
      {
        extension: '27',
        name_short: 'Tolt 1',
        status_clip: 'Closed',
        status_detail: 'Fields rained out',
        status_time: '1774370237',
        status: '2',
      },
    ];
    const result = normalize(raw);
    expect(result).toEqual([
      {
        id: '27',
        name: 'Tolt Field 1',
        status: 'Closed',
        detail: 'Fields rained out',
        updatedAt: 1774370237,
      },
    ]);
  });

  it('uses friendly display name for known extensions', () => {
    const raw: StatusfyField[] = [
      { extension: '28', name_short: 'Tolt 2', status_clip: 'Open', status_detail: '', status_time: '1774370230', status: '0' },
      { extension: '29', name_short: 'Mariner Ballfield', status_clip: 'Closed', status_detail: '', status_time: '1774370221', status: '2' },
    ];
    const result = normalize(raw);
    expect(result[0].name).toBe('Tolt Field 2');
    expect(result[1].name).toBe('Mariner Field');
  });

  it('falls back to name_short for unknown extensions', () => {
    const raw: StatusfyField[] = [
      { extension: '99', name_short: 'Unknown Park', status_clip: 'Open', status_detail: '', status_time: '1774370000', status: '0' },
    ];
    const result = normalize(raw);
    expect(result[0].name).toBe('Unknown Park');
  });

  it('converts empty status_detail to empty string', () => {
    const raw: StatusfyField[] = [
      { extension: '27', name_short: 'Tolt 1', status_clip: 'Closed', status_detail: '', status_time: '1774370237', status: '2' },
    ];
    const result = normalize(raw);
    expect(result[0].detail).toBe('');
  });

  it('handles all three fields', () => {
    const raw: StatusfyField[] = [
      { extension: '27', name_short: 'Tolt 1', status_clip: 'Closed', status_detail: '', status_time: '1774370237', status: '2' },
      { extension: '28', name_short: 'Tolt 2', status_clip: 'Open', status_detail: 'Open for practice', status_time: '1774370230', status: '0' },
      { extension: '29', name_short: 'Mariner Ballfield', status_clip: 'Notice', status_detail: 'Infield only', status_time: '1774370221', status: '3' },
    ];
    const result = normalize(raw);
    expect(result).toHaveLength(3);
    expect(result.map((f) => f.status)).toEqual(['Closed', 'Open', 'Notice']);
  });
});

describe('timeAgo', () => {
  it('returns "just now" for very recent timestamps', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(timeAgo(now)).toBe('just now');
    expect(timeAgo(now - 29)).toBe('just now'); // <30 seconds rounds to 0 min
  });

  it('returns minutes for times under an hour', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(timeAgo(now - 5 * 60)).toBe('5m ago');
    expect(timeAgo(now - 30 * 60)).toBe('30m ago');
    expect(timeAgo(now - 59 * 60)).toBe('59m ago');
  });

  it('returns hours for times under a day', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(timeAgo(now - 60 * 60)).toBe('1h ago');
    expect(timeAgo(now - 5 * 60 * 60)).toBe('5h ago');
    expect(timeAgo(now - 23 * 60 * 60)).toBe('23h ago');
  });

  it('returns days for times over a day', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(timeAgo(now - 25 * 60 * 60)).toBe('1d ago');
    expect(timeAgo(now - 3 * 24 * 60 * 60)).toBe('3d ago');
  });
});

describe('checkedAgo', () => {
  it('returns "just now" for recent checks', () => {
    expect(checkedAgo(Date.now())).toBe('just now');
    expect(checkedAgo(Date.now() - 20_000)).toBe('just now'); // 20s
  });

  it('returns minutes for checks under an hour', () => {
    expect(checkedAgo(Date.now() - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours for checks over an hour', () => {
    expect(checkedAgo(Date.now() - 90 * 60_000)).toBe('2h ago');
  });
});

describe('dotStatus', () => {
  it('maps Open to Open', () => {
    expect(dotStatus('Open')).toBe('Open');
  });

  it('maps Closed to Closed', () => {
    expect(dotStatus('Closed')).toBe('Closed');
  });

  it('maps Notice to other', () => {
    expect(dotStatus('Notice')).toBe('other');
  });

  it('maps unknown statuses to other', () => {
    expect(dotStatus('Delayed')).toBe('other');
    expect(dotStatus('')).toBe('other');
  });
});

describe('summarize', () => {
  function makeField(status: string): FieldStatus {
    return { id: '1', name: 'Test', status, detail: '', updatedAt: 0 };
  }

  it('returns "All fields closed" when all closed', () => {
    const fields = [makeField('Closed'), makeField('Closed'), makeField('Closed')];
    expect(summarize(fields)).toBe('All fields closed');
  });

  it('returns "All fields open" when all open', () => {
    const fields = [makeField('Open'), makeField('Open'), makeField('Open')];
    expect(summarize(fields)).toBe('All fields open');
  });

  it('returns mixed summary for different statuses', () => {
    const fields = [makeField('Open'), makeField('Closed'), makeField('Closed')];
    expect(summarize(fields)).toBe('1 open, 2 closed');
  });

  it('handles notice statuses in mixed', () => {
    const fields = [makeField('Open'), makeField('Closed'), makeField('Notice')];
    expect(summarize(fields)).toBe('1 open, 1 closed, 1 notice');
  });

  it('handles all notice', () => {
    const fields = [makeField('Notice'), makeField('Notice')];
    expect(summarize(fields)).toBe('All fields notice');
  });
});
