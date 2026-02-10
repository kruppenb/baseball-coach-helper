import { useRoster } from '../../hooks/useRoster';
import { useGameConfig } from '../../hooks/useGameConfig';
import { AttendanceList } from './AttendanceList';
import { SettingsPanel } from './SettingsPanel';
import styles from './GameSetupPage.module.css';

export function GameSetupPage() {
  const { players, togglePresent } = useRoster();
  const { config, setInnings } = useGameConfig();

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Game Setup</h2>
      <AttendanceList players={players} onToggle={togglePresent} />
      <SettingsPanel innings={config.innings} onInningsChange={setInnings} />
    </div>
  );
}
