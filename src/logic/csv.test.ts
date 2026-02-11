import { describe, it, expect } from 'vitest';
import { exportRosterCsv, parseRosterCsv } from './csv';
import type { Player } from '../types';

function makePlayer(name: string): Player {
  return { id: crypto.randomUUID(), name, isPresent: true };
}

describe('exportRosterCsv', () => {
  it('produces correct CSV with header for 3 players', () => {
    const players = [makePlayer('Alice'), makePlayer('Bob'), makePlayer('Charlie')];
    const csv = exportRosterCsv(players);
    expect(csv).toBe('name\nAlice\nBob\nCharlie');
  });

  it('produces just "name" header for empty roster', () => {
    const csv = exportRosterCsv([]);
    expect(csv).toBe('name');
  });

  it('escapes names containing commas', () => {
    const players = [makePlayer('Smith, Jr.')];
    const csv = exportRosterCsv(players);
    expect(csv).toBe('name\n"Smith, Jr."');
  });

  it('escapes names containing double quotes', () => {
    const players = [makePlayer('The "Big" Kid')];
    const csv = exportRosterCsv(players);
    expect(csv).toBe('name\n"The ""Big"" Kid"');
  });
});

describe('parseRosterCsv', () => {
  it('parses simple one-name-per-line CSV', () => {
    const result = parseRosterCsv('Alice\nBob\nCharlie');
    expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('skips "name" header row (case-insensitive)', () => {
    const result = parseRosterCsv('Name\nAlice\nBob');
    expect(result).toEqual(['Alice', 'Bob']);
  });

  it('skips "player" header row', () => {
    const result = parseRosterCsv('Player\nAlice\nBob');
    expect(result).toEqual(['Alice', 'Bob']);
  });

  it('handles \\r\\n line endings', () => {
    const result = parseRosterCsv('name\r\nAlice\r\nBob\r\n');
    expect(result).toEqual(['Alice', 'Bob']);
  });

  it('skips empty lines', () => {
    const result = parseRosterCsv('name\n\nAlice\n\n\nBob\n');
    expect(result).toEqual(['Alice', 'Bob']);
  });

  it('returns empty array for empty string', () => {
    const result = parseRosterCsv('');
    expect(result).toEqual([]);
  });
});
