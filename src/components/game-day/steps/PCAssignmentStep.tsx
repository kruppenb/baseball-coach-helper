import { useMemo } from 'react';
import { useLineup } from '../../../hooks/useLineup';
import { useGameConfig } from '../../../hooks/useGameConfig';
import { useGameHistory } from '../../../hooks/useGameHistory';
import { useRoster } from '../../../hooks/useRoster';
import { usePCAssignment } from '../../../hooks/usePCAssignment';
import { computeRecentPCHistory } from '../../../logic/game-history';
import type { Player } from '../../../types';
import { hasPlayerPitching } from '../../../types';
import styles from './PCAssignmentStep.module.css';

interface PCAssignmentStepProps {
  onComplete: () => void;
}

export function PCAssignmentStep({ onComplete }: PCAssignmentStepProps) {
  const { setPitcher, setCatcher, presentPlayers, innings, pitcherAssignments, catcherAssignments } = useLineup();
  const { config } = useGameConfig();
  const { history } = useGameHistory();
  const { players } = useRoster();

  const pitcherCount = hasPlayerPitching(config.division) ? config.pitchersPerGame : 0;
  const catcherCount = hasPlayerPitching(config.division) ? config.catchersPerGame : 0;

  const {
    selectedPitchers,
    selectedCatchers,
    pitcherOptionsFor,
    catcherOptionsFor,
    handlePitcherChange,
    handleCatcherChange,
  } = usePCAssignment({
    presentPlayers,
    innings,
    pitcherCount,
    catcherCount,
    pitcherAssignments,
    catcherAssignments,
    setPitcher,
    setCatcher,
  });

  const presentIds = useMemo(
    () => presentPlayers.map((p: Player) => p.id),
    [presentPlayers],
  );

  const pcHistory = useMemo(
    () => computeRecentPCHistory(history, presentIds),
    [history, presentIds],
  );

  const absentPlayers = useMemo(
    () => players.filter((p: Player) => !p.isPresent),
    [players],
  );

  // All pitcher slots must be filled to advance (AA: always true as fallback)
  const canAdvance = !hasPlayerPitching(config.division) || selectedPitchers.every((id) => id !== '');

  // Build status label for history table
  const getPlayerStatus = (playerId: string): string => {
    const pIdx = selectedPitchers.indexOf(playerId);
    if (pIdx >= 0) return pitcherCount > 1 ? `Pitcher ${pIdx + 1}` : 'Pitcher';
    const catcherSlots = selectedCatchers
      .map((id, i) => (id === playerId ? i + 1 : -1))
      .filter((i) => i >= 0);
    if (catcherSlots.length > 0) {
      if (catcherCount <= 1) return 'Catcher';
      return `Catcher ${catcherSlots.join(', ')}`;
    }
    return '';
  };

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Pitcher &amp; Catcher</h2>

      <div className={styles.slotSection}>
        <h3 className={styles.slotHeading}>Pitchers</h3>
        <div className={styles.slotGrid}>
          {selectedPitchers.map((selectedId, idx) => (
            <div className={styles.dropdownGroup} key={`pitcher-${idx}`}>
              <label
                className={styles.dropdownLabel}
                htmlFor={`pitcher-select-${idx}`}
              >
                {pitcherCount > 1 ? `Pitcher ${idx + 1}` : 'Pitcher'}
              </label>
              <select
                id={`pitcher-select-${idx}`}
                className={styles.playerSelect}
                value={selectedId}
                onChange={(e) => handlePitcherChange(idx, e.target.value)}
              >
                <option value="">Select Pitcher</option>
                {pitcherOptionsFor(idx).map((p: Player) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.slotSection}>
        <h3 className={styles.slotHeading}>Catchers</h3>
        <div className={styles.slotGrid}>
          {selectedCatchers.map((selectedId, idx) => (
            <div className={styles.dropdownGroup} key={`catcher-${idx}`}>
              <label
                className={styles.dropdownLabel}
                htmlFor={`catcher-select-${idx}`}
              >
                {catcherCount > 1 ? `Catcher ${idx + 1}` : 'Catcher'}
              </label>
              <select
                id={`catcher-select-${idx}`}
                className={styles.playerSelect}
                value={selectedId}
                onChange={(e) => handleCatcherChange(idx, e.target.value)}
              >
                <option value="">Select Catcher (optional)</option>
                {catcherOptionsFor(idx).map((p: Player) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <table className={styles.historyTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>P (last 2)</th>
            <th>C (last 2)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {presentPlayers.map((p: Player) => {
            const record = pcHistory[p.id];
            const isPitchedConsec = record?.pitchedLast2Consecutive;
            return (
              <tr key={p.id}>
                <td>
                  {p.name}
                  {isPitchedConsec && (
                    <span className={styles.warning}>
                      <span className={styles.warningIcon}>!</span>
                      Pitched last 2 games
                    </span>
                  )}
                </td>
                <td>{record?.pitchedGames || '-'}</td>
                <td>{record?.caughtGames || '-'}</td>
                <td>{getPlayerStatus(p.id)}</td>
              </tr>
            );
          })}
          {absentPlayers.map((p: Player) => (
            <tr key={p.id} className={styles.absentRow}>
              <td>{p.name} (absent)</td>
              <td>-</td>
              <td>-</td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.footer}>
        <button
          className={styles.nextButton}
          onClick={onComplete}
          disabled={!canAdvance}
        >
          Next
        </button>
      </div>
    </div>
  );
}
