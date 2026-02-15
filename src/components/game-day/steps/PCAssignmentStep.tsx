import { useState, useMemo } from 'react';
import { useLineup } from '../../../hooks/useLineup';
import { useGameHistory } from '../../../hooks/useGameHistory';
import { useRoster } from '../../../hooks/useRoster';
import { computeRecentPCHistory } from '../../../logic/game-history';
import type { Player } from '../../../types';
import styles from './PCAssignmentStep.module.css';

interface PCAssignmentStepProps {
  onComplete: () => void;
}

export function PCAssignmentStep({ onComplete }: PCAssignmentStepProps) {
  const { setPitcher, setCatcher, presentPlayers, innings } = useLineup();
  const { history } = useGameHistory();
  const { players } = useRoster();

  const [selectedPitcher, setSelectedPitcher] = useState('');
  const [selectedCatcher, setSelectedCatcher] = useState('');

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

  const handlePitcherSelect = (playerId: string) => {
    setSelectedPitcher(playerId);
    // If the newly selected pitcher was the catcher, clear catcher
    if (playerId && playerId === selectedCatcher) {
      setSelectedCatcher('');
      for (let i = 1; i <= innings; i++) {
        setCatcher(i, '');
      }
    }
    for (let i = 1; i <= innings; i++) {
      setPitcher(i, playerId);
    }
  };

  const handleCatcherSelect = (playerId: string) => {
    setSelectedCatcher(playerId);
    for (let i = 1; i <= innings; i++) {
      setCatcher(i, playerId);
    }
  };

  // Exclude selected pitcher from catcher options
  const catcherOptions = presentPlayers.filter(
    (p: Player) => p.id !== selectedPitcher,
  );

  const canAdvance = selectedPitcher !== '';

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Pitcher &amp; Catcher</h2>

      <div className={styles.dropdowns}>
        <div className={styles.dropdownGroup}>
          <label className={styles.dropdownLabel} htmlFor="pitcher-select">
            Pitcher
          </label>
          <select
            id="pitcher-select"
            className={styles.playerSelect}
            value={selectedPitcher}
            onChange={(e) => handlePitcherSelect(e.target.value)}
          >
            <option value="">Select Pitcher</option>
            {presentPlayers.map((p: Player) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.dropdownGroup}>
          <label className={styles.dropdownLabel} htmlFor="catcher-select">
            Catcher
          </label>
          <select
            id="catcher-select"
            className={styles.playerSelect}
            value={selectedCatcher}
            onChange={(e) => handleCatcherSelect(e.target.value)}
          >
            <option value="">Select Catcher (optional)</option>
            {catcherOptions.map((p: Player) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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
                <td>
                  {p.id === selectedPitcher
                    ? 'Pitcher'
                    : p.id === selectedCatcher
                      ? 'Catcher'
                      : ''}
                </td>
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
