import type { Player } from '../../types';
import { PlayerAttendance } from './PlayerAttendance';
import styles from './AttendanceList.module.css';

interface AttendanceListProps {
  players: Player[];
  onToggle: (id: string) => void;
}

export function AttendanceList({ players, onToggle }: AttendanceListProps) {
  const presentCount = players.filter((p) => p.isPresent).length;
  const totalCount = players.length;

  if (totalCount === 0) {
    return (
      <p className={styles.empty}>
        No players on roster. Add players in the Roster tab first.
      </p>
    );
  }

  return (
    <div>
      <p className={styles.summary}>
        {presentCount} of {totalCount} present
      </p>
      <div className={styles.list}>
        {players.map((player) => (
          <PlayerAttendance
            key={player.id}
            player={player}
            onToggle={() => onToggle(player.id)}
          />
        ))}
      </div>
    </div>
  );
}
