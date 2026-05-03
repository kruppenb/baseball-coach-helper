import type { Player } from '../../../types';
import styles from './PCTimeline.module.css';

interface PCChipProps {
  role: 'P' | 'C';
  inning: number;
  player?: Player;
  colorIndex?: number;
  /** Total innings this player plays in this role (for the small badge). */
  totalForPlayer?: number;
  onClick: () => void;
}

const PALETTE_SIZE = 8;

export function PCChip({ role, inning, player, colorIndex, totalForPlayer, onClick }: PCChipProps) {
  if (!player) {
    return (
      <button
        type="button"
        className={`${styles.chip} ${styles.chipEmpty}`}
        onClick={onClick}
        aria-label={`${role === 'P' ? 'Pitcher' : 'Catcher'} for inning ${inning} — empty`}
      >
        <span className={styles.chipName}>+</span>
      </button>
    );
  }
  const swatch = ((colorIndex ?? 0) % PALETTE_SIZE) + 1;
  return (
    <button
      type="button"
      className={`${styles.chip} ${styles[`chipColor${swatch}`]}`}
      onClick={onClick}
      aria-label={`${role === 'P' ? 'Pitcher' : 'Catcher'} for inning ${inning} — ${player.name}`}
    >
      <span className={styles.chipName}>{player.name}</span>
      {totalForPlayer && totalForPlayer > 1 && (
        <span className={styles.chipBadge}>×{totalForPlayer}</span>
      )}
    </button>
  );
}
