import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  innings: 5 | 6;
  onInningsChange: (value: 5 | 6) => void;
  pitchersPerGame?: number;
  onPitchersPerGameChange?: (value: number) => void;
  catchersPerGame?: number;
  onCatchersPerGameChange?: (value: number) => void;
}

const countOptions = [1, 2, 3, 4];

export function SettingsPanel({
  innings,
  onInningsChange,
  pitchersPerGame,
  onPitchersPerGameChange,
  catchersPerGame,
  onCatchersPerGameChange,
}: SettingsPanelProps) {
  return (
    <div className={styles.settings}>
      <h3 className={styles.settingsTitle}>Settings</h3>
      <div className={styles.settingRow}>
        <label htmlFor="innings-select" className={styles.settingLabel}>
          Innings per game
        </label>
        <select
          id="innings-select"
          value={innings}
          onChange={(e) => onInningsChange(Number(e.target.value) as 5 | 6)}
          className={styles.select}
        >
          <option value={5}>5 innings</option>
          <option value={6}>6 innings</option>
        </select>
      </div>

      {onPitchersPerGameChange && (
        <div className={styles.settingRow}>
          <label htmlFor="pitchers-per-game-select" className={styles.settingLabel}>
            Pitchers per game
          </label>
          <select
            id="pitchers-per-game-select"
            value={pitchersPerGame ?? 1}
            onChange={(e) => onPitchersPerGameChange(Number(e.target.value))}
            className={styles.select}
          >
            {countOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}

      {onCatchersPerGameChange && (
        <div className={styles.settingRow}>
          <label htmlFor="catchers-per-game-select" className={styles.settingLabel}>
            Catchers per game
          </label>
          <select
            id="catchers-per-game-select"
            value={catchersPerGame ?? 1}
            onChange={(e) => onCatchersPerGameChange(Number(e.target.value))}
            className={styles.select}
          >
            {countOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
