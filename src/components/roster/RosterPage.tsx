import { useRoster } from '../../hooks/useRoster';
import { PlayerInput } from './PlayerInput';
import { PlayerList } from './PlayerList';
import styles from './RosterPage.module.css';

export function RosterPage() {
  const { players, addPlayer, renamePlayer, removePlayer } = useRoster();

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Roster</h2>
      <PlayerInput onAdd={addPlayer} />
      <PlayerList
        players={players}
        onRename={renamePlayer}
        onDelete={removePlayer}
      />
    </div>
  );
}
