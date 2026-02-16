import { useRoster } from '../../hooks/useRoster';
import { useGameConfig } from '../../hooks/useGameConfig';
import { useLineup } from '../../hooks/useLineup';
import { AttendanceList } from './AttendanceList';
import { SettingsPanel } from './SettingsPanel';
import { PositionBlocks } from '../lineup/PositionBlocks';
import styles from './GameSetupPage.module.css';

export function GameSetupPage() {
  const { players, togglePresent } = useRoster();
  const { config, setInnings, setPitchersPerGame, setCatchersPerGame } = useGameConfig();
  const { presentPlayers, positionBlocks, togglePositionBlock } = useLineup();

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Game Setup</h2>
      <AttendanceList players={players} onToggle={togglePresent} />
      <SettingsPanel
        innings={config.innings}
        onInningsChange={setInnings}
        pitchersPerGame={config.pitchersPerGame}
        onPitchersPerGameChange={setPitchersPerGame}
        catchersPerGame={config.catchersPerGame}
        onCatchersPerGameChange={setCatchersPerGame}
      />
      <PositionBlocks
        presentPlayers={presentPlayers}
        positionBlocks={positionBlocks}
        onToggleBlock={togglePositionBlock}
      />
    </div>
  );
}
