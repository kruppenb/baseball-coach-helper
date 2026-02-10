import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  innings: 5 | 6;
  onInningsChange: (value: 5 | 6) => void;
}

export function SettingsPanel({ innings, onInningsChange }: SettingsPanelProps) {
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
    </div>
  );
}
