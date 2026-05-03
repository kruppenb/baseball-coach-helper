import type { Player } from '../../../types';
import styles from './PCTimeline.module.css';

interface LastGamePitchersProps {
  lastGamePitcherIds: string[];
  players: Player[];
}

/**
 * Compact "who pitched last game" reference. Helps avoid back-to-back pitcher
 * use. Hidden when there's no history.
 */
export function LastGamePitchers({ lastGamePitcherIds, players }: LastGamePitchersProps) {
  if (lastGamePitcherIds.length === 0) return null;
  const playersById = new Map(players.map((p) => [p.id, p]));
  const names = lastGamePitcherIds
    .map((id) => playersById.get(id)?.name)
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return null;
  return (
    <div className={styles.lastGame}>
      <span className={styles.lastGameLabel}>Last game pitchers:</span>
      <span className={styles.lastGameNames}>{names.join(', ')}</span>
    </div>
  );
}
