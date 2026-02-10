import type { Player } from '../../types';
import { PlayerRow } from './PlayerRow';
import styles from './PlayerList.module.css';

interface PlayerListProps {
  players: Player[];
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

export function PlayerList({ players, onRename, onDelete }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <p className={styles.emptyState}>
        No players yet. Add your first player above.
      </p>
    );
  }

  return (
    <div>
      <p className={styles.count}>
        {players.length} {players.length === 1 ? 'player' : 'players'}
      </p>
      <div className={styles.list}>
        {players.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
