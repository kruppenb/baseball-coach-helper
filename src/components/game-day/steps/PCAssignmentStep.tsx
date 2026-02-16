import { useState, useMemo, useEffect } from 'react';
import { useLineup } from '../../../hooks/useLineup';
import { useGameConfig } from '../../../hooks/useGameConfig';
import { useGameHistory } from '../../../hooks/useGameHistory';
import { useRoster } from '../../../hooks/useRoster';
import { computeRecentPCHistory } from '../../../logic/game-history';
import type { Player } from '../../../types';
import styles from './PCAssignmentStep.module.css';

interface PCAssignmentStepProps {
  onComplete: () => void;
}

/**
 * Distribute `count` players evenly across `innings` innings.
 * Returns a map of inning number -> player id.
 * Example: 3 pitchers across 6 innings = P1 for 1-2, P2 for 3-4, P3 for 5-6
 */
function distributeAcrossInnings(
  players: string[],
  innings: number,
): Record<number, string> {
  const assignments: Record<number, string> = {};
  if (players.length === 0) return assignments;

  const inningsPerPlayer = Math.ceil(innings / players.length);

  for (let i = 1; i <= innings; i++) {
    const playerIndex = Math.min(
      Math.floor((i - 1) / inningsPerPlayer),
      players.length - 1,
    );
    assignments[i] = players[playerIndex];
  }

  return assignments;
}

export function PCAssignmentStep({ onComplete }: PCAssignmentStepProps) {
  const { setPitcher, setCatcher, presentPlayers, innings } = useLineup();
  const { config } = useGameConfig();
  const { history } = useGameHistory();
  const { players } = useRoster();

  const pitcherCount = config.pitchersPerGame;
  const catcherCount = config.catchersPerGame;

  // Slot arrays: selectedPitchers[0] = pitcher slot 1's playerId, etc.
  const [selectedPitchers, setSelectedPitchers] = useState<string[]>(
    () => Array(pitcherCount).fill(''),
  );
  const [selectedCatchers, setSelectedCatchers] = useState<string[]>(
    () => Array(catcherCount).fill(''),
  );

  // Resize slot arrays when config changes
  useEffect(() => {
    setSelectedPitchers((prev) => {
      if (prev.length === pitcherCount) return prev;
      const next = Array(pitcherCount).fill('');
      for (let i = 0; i < Math.min(prev.length, pitcherCount); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [pitcherCount]);

  useEffect(() => {
    setSelectedCatchers((prev) => {
      if (prev.length === catcherCount) return prev;
      const next = Array(catcherCount).fill('');
      for (let i = 0; i < Math.min(prev.length, catcherCount); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [catcherCount]);

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

  // All players currently assigned to any pitcher or catcher slot
  const allAssigned = useMemo(() => {
    const set = new Set<string>();
    for (const id of selectedPitchers) if (id) set.add(id);
    for (const id of selectedCatchers) if (id) set.add(id);
    return set;
  }, [selectedPitchers, selectedCatchers]);

  // Apply assignments to inning-level P/C whenever selections change
  useEffect(() => {
    const filledPitchers = selectedPitchers.filter(Boolean);
    const pitcherDist = distributeAcrossInnings(filledPitchers, innings);
    for (let i = 1; i <= innings; i++) {
      setPitcher(i, pitcherDist[i] ?? '');
    }
  }, [selectedPitchers, innings, setPitcher]);

  useEffect(() => {
    const filledCatchers = selectedCatchers.filter(Boolean);
    const catcherDist = distributeAcrossInnings(filledCatchers, innings);
    for (let i = 1; i <= innings; i++) {
      setCatcher(i, catcherDist[i] ?? '');
    }
  }, [selectedCatchers, innings, setCatcher]);

  const handlePitcherChange = (slotIndex: number, playerId: string) => {
    setSelectedPitchers((prev) => {
      const next = [...prev];
      next[slotIndex] = playerId;
      return next;
    });
    // If this player was a catcher, clear that catcher slot
    if (playerId) {
      setSelectedCatchers((prev) => {
        const idx = prev.indexOf(playerId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = '';
          return next;
        }
        return prev;
      });
    }
  };

  const handleCatcherChange = (slotIndex: number, playerId: string) => {
    setSelectedCatchers((prev) => {
      const next = [...prev];
      next[slotIndex] = playerId;
      return next;
    });
    // If this player was a pitcher, clear that pitcher slot
    if (playerId) {
      setSelectedPitchers((prev) => {
        const idx = prev.indexOf(playerId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = '';
          return next;
        }
        return prev;
      });
    }
  };

  /** Available options for a pitcher slot: present players not assigned elsewhere (except current slot) */
  const pitcherOptionsFor = (slotIndex: number) =>
    presentPlayers.filter((p: Player) => {
      if (p.id === selectedPitchers[slotIndex]) return true;
      return !allAssigned.has(p.id);
    });

  /** Available options for a catcher slot: present players not assigned elsewhere (except current slot) */
  const catcherOptionsFor = (slotIndex: number) =>
    presentPlayers.filter((p: Player) => {
      if (p.id === selectedCatchers[slotIndex]) return true;
      return !allAssigned.has(p.id);
    });

  // All pitcher slots must be filled to advance
  const canAdvance = selectedPitchers.every((id) => id !== '');

  // Build status label for history table
  const getPlayerStatus = (playerId: string): string => {
    const pIdx = selectedPitchers.indexOf(playerId);
    if (pIdx >= 0) return pitcherCount > 1 ? `Pitcher ${pIdx + 1}` : 'Pitcher';
    const cIdx = selectedCatchers.indexOf(playerId);
    if (cIdx >= 0) return catcherCount > 1 ? `Catcher ${cIdx + 1}` : 'Catcher';
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
