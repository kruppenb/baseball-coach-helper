import type { Player } from '../../types';
import styles from './PlayerAttendance.module.css';

interface PlayerAttendanceProps {
  player: Player;
  onToggle: () => void;
}

export function PlayerAttendance({ player, onToggle }: PlayerAttendanceProps) {
  return (
    <button
      className={`${styles.attendanceRow} ${!player.isPresent ? styles.absent : ''}`}
      onClick={onToggle}
      role="switch"
      aria-checked={player.isPresent}
      aria-label={`${player.name}: ${player.isPresent ? 'present' : 'absent'}`}
    >
      <span className={styles.playerName}>{player.name}</span>
      <span className={styles.status}>
        {player.isPresent ? 'Present' : 'Absent'}
      </span>
    </button>
  );
}
