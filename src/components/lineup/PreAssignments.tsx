import type { Player, BatteryAssignments } from '../../types';
import styles from './PreAssignments.module.css';

interface PreAssignmentsProps {
  innings: number;
  presentPlayers: Player[];
  pitcherAssignments: BatteryAssignments;
  catcherAssignments: BatteryAssignments;
  onPitcherChange: (inning: number, playerId: string) => void;
  onCatcherChange: (inning: number, playerId: string) => void;
}

export function PreAssignments({
  innings,
  presentPlayers,
  pitcherAssignments,
  catcherAssignments,
  onPitcherChange,
  onCatcherChange,
}: PreAssignmentsProps) {
  const inningNumbers = Array.from({ length: innings }, (_, i) => i + 1);

  return (
    <div className={styles.preAssignments}>
      <h3 className={styles.sectionTitle}>Pitchers and Catchers</h3>
      <p className={styles.hint}>
        Assign who pitches and catches each inning. Leave blank to let the
        generator decide.
      </p>
      <div className={styles.grid}>
        {inningNumbers.map((inning) => (
          <div key={inning} className={styles.inningRow}>
            <span className={styles.inningLabel}>Inning {inning}</span>
            <label className={styles.selectLabel}>
              P:
              <select
                className={styles.playerSelect}
                value={pitcherAssignments[inning] ?? ''}
                onChange={(e) => onPitcherChange(inning, e.target.value)}
              >
                <option value="">--</option>
                {presentPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.selectLabel}>
              C:
              <select
                className={styles.playerSelect}
                value={catcherAssignments[inning] ?? ''}
                onChange={(e) => onCatcherChange(inning, e.target.value)}
              >
                <option value="">--</option>
                {presentPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
