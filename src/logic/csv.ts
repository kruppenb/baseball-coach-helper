import type { Player } from '../types';

/**
 * Escape a CSV field value.
 * If the value contains commas, quotes, or newlines, wrap in double-quotes
 * and double any internal quote characters.
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Export a roster of players to a CSV string.
 * Returns a string with "name" header row and one player name per line.
 */
export function exportRosterCsv(players: Player[]): string {
  const lines = ['name', ...players.map((p) => escapeCsvField(p.name))];
  return lines.join('\n');
}

/**
 * Parse a CSV text string into an array of player name strings.
 * Splits by newlines, trims each line, skips empty lines.
 * If the first non-empty line is "name" or "player" (case-insensitive), skips it as a header.
 */
export function parseRosterCsv(csvText: string): string[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const startIndex = firstLine === 'name' || firstLine === 'player' ? 1 : 0;

  return lines.slice(startIndex).filter((line) => line.length > 0);
}

/**
 * Trigger a CSV file download in the browser.
 * Creates a temporary anchor element and clicks it to initiate the download.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
