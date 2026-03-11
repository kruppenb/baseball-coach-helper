import type { Division } from '../../types';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  division: Division;
  onDivisionChange: (value: Division) => void;
  pitchersPerGame?: number;
  onPitchersPerGameChange?: (value: number) => void;
  catchersPerGame?: number;
  onCatchersPerGameChange?: (value: number) => void;
}

const DIVISION_RULES: Record<Division, string[]> = {
  AAA: [
    '5 innings per game',
    'No player sits a 3rd inning until all have sat a 2nd',
    '2 infield innings required (any inning)',
    'No bunting allowed',
    'No stealing home',
  ],
  Coast: [
    '6 innings per game',
    '2 infield innings required (within first 5 innings)',
    'Bunting allowed',
    'Standard base stealing',
  ],
};

const countOptions = [1, 2, 3, 4];

export function SettingsPanel({
  division,
  onDivisionChange,
  pitchersPerGame,
  onPitchersPerGameChange,
  catchersPerGame,
  onCatchersPerGameChange,
}: SettingsPanelProps) {
  return (
    <div className={styles.settings}>
      <h3 className={styles.settingsTitle}>Settings</h3>
      <div className={styles.settingRow}>
        <label htmlFor="division-select" className={styles.settingLabel}>
          Division
        </label>
        <select
          id="division-select"
          value={division}
          onChange={(e) => onDivisionChange(e.target.value as Division)}
          className={styles.select}
        >
          <option value="AAA">AAA</option>
          <option value="Coast">Coast</option>
        </select>
      </div>

      <ul className={styles.rulesList}>
        {DIVISION_RULES[division].map((rule) => (
          <li key={rule} className={styles.ruleItem}>{rule}</li>
        ))}
      </ul>

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
