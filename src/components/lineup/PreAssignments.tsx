import type { Player, BatteryAssignments } from '../../types';
import styles from './PreAssignments.module.css';

interface PreAssignmentsProps {
  innings: number;
  presentPlayers: Player[];
  pitcherAssignments: BatteryAssignments;
  catcherAssignments: BatteryAssignments;
  catcherInningsHistory: Record<string, number>;
  onPitcherChange: (inning: number, playerId: string) => void;
  onCatcherChange: (inning: number, playerId: string) => void;
}

export function PreAssignments({
  innings,
  presentPlayers,
  pitcherAssignments,
  catcherAssignments,
  catcherInningsHistory,
  onPitcherChange,
  onCatcherChange,
}: PreAssignmentsProps) {
  const inningNumbers = Array.from({ length: innings }, (_, i) => i + 1);

  // Count catcher innings assigned in this game so far
  const thisCatcherInnings: Record<string, number> = {};
  for (const inning of inningNumbers) {
    const catcherId = catcherAssignments[inning];
    if (catcherId) {
      thisCatcherInnings[catcherId] = (thisCatcherInnings[catcherId] ?? 0) + 1;
    }
  }

  // Format catcher label with history context
  function catcherLabel(player: Player): string {
    const historyCount = catcherInningsHistory[player.id] ?? 0;
    const thisGameCount = thisCatcherInnings[player.id] ?? 0;
    const parts: string[] = [player.name];
    const tags: string[] = [];
    if (historyCount > 0) tags.push(`${historyCount}C hist`);
    if (thisGameCount >= 4) tags.push('⚠️ 4+ C');
    if (tags.length > 0) parts.push(`(${tags.join(', ')})`);
    return parts.join(' ');
  }

  return (
    <div className={styles.preAssignments}>
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
                    {catcherLabel(p)}
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
