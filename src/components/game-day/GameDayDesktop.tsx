import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRoster } from '../../hooks/useRoster';
import { useLineup } from '../../hooks/useLineup';
import { useLineupEditor } from '../../hooks/useLineupEditor';
import { useBattingOrder } from '../../hooks/useBattingOrder';
import { useGameHistory } from '../../hooks/useGameHistory';
import { useGameConfig } from '../../hooks/useGameConfig';
import { computeRecentPCHistory } from '../../logic/game-history';
import { scoreLineup } from '../../logic/lineup-scorer';
import { AttendanceList } from '../game-setup/AttendanceList';
import { DraggableLineupGrid } from '../lineup/DraggableLineupGrid';
import { FairnessScoreCard } from '../lineup/FairnessScoreCard';
import { FairnessSummary } from '../lineup/FairnessSummary';
import type { PlayerFairness } from '../lineup/FairnessSummary';
import { ValidationPanel } from '../lineup/ValidationPanel';
import { SortableBattingOrder } from '../batting-order/SortableBattingOrder';
import type { Player, Position, Lineup } from '../../types/index';
import { POSITIONS, INFIELD_POSITIONS } from '../../types/index';
import type { GenerateLineupInput } from '../../logic/lineup-types';
import styles from './GameDayDesktop.module.css';

// ---------------------------------------------------------------------------
// Helpers (inlined from PCAssignmentStep — small utility functions)
// ---------------------------------------------------------------------------

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

function slotsFromAssignments(
  assignments: Record<number, string>,
  slotCount: number,
): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  const innings = Object.keys(assignments).map(Number).sort((a, b) => a - b);
  for (const inn of innings) {
    const id = assignments[inn];
    if (id && !seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }
  const slots = Array(slotCount).fill('');
  for (let i = 0; i < Math.min(unique.length, slotCount); i++) {
    slots[i] = unique[i];
  }
  return slots;
}

function computeFairnessSummary(
  lineup: Lineup,
  innings: number,
  players: Player[],
): PlayerFairness[] {
  const presentPlayers = players.filter(p => p.isPresent);
  const inningNumbers = Array.from({ length: innings }, (_, i) => i + 1);

  return presentPlayers
    .map(player => {
      let infieldInnings = 0;
      let benchInnings = 0;

      for (const inn of inningNumbers) {
        const assignment = lineup[inn];
        if (!assignment) continue;

        const assignedPositions = POSITIONS.filter(
          (pos: Position) => assignment[pos] === player.id,
        );

        if (assignedPositions.length === 0) {
          benchInnings++;
        } else if (
          assignedPositions.some((pos: Position) =>
            (INFIELD_POSITIONS as readonly string[]).includes(pos),
          )
        ) {
          infieldInnings++;
        }
      }

      return {
        playerId: player.id,
        name: player.name,
        infieldInnings,
        benchInnings,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getPlayerName(playerId: string, players: Player[]): string {
  const player = players.find(p => p.id === playerId);
  return player?.name ?? 'Unknown';
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.cardLabel}>{label}</h3>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// GameDayDesktop
// ---------------------------------------------------------------------------

export function GameDayDesktop() {
  // --- Hooks ---
  const { players, togglePresent } = useRoster();
  const {
    setPitcher,
    setCatcher,
    presentPlayers,
    innings,
    pitcherAssignments,
    catcherAssignments,
    positionBlocks,
    generatedLineups,
    selectedLineup,
    generate,
  } = useLineup();
  const { config } = useGameConfig();
  const { history } = useGameHistory();
  const {
    currentOrder,
    presentPlayers: battingPresentPlayers,
    generate: generateBattingOrder,
  } = useBattingOrder();

  // --- P/C Slot State ---
  const pitcherCount = config.pitchersPerGame;
  const catcherCount = config.catchersPerGame;

  const [selectedPitchers, setSelectedPitchers] = useState<string[]>(
    () => slotsFromAssignments(pitcherAssignments, pitcherCount),
  );
  const [selectedCatchers, setSelectedCatchers] = useState<string[]>(
    () => slotsFromAssignments(catcherAssignments, catcherCount),
  );

  // Resize slot arrays when config changes
  useEffect(() => {
    setSelectedPitchers(prev => {
      if (prev.length === pitcherCount) return prev;
      const next = Array(pitcherCount).fill('');
      for (let i = 0; i < Math.min(prev.length, pitcherCount); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [pitcherCount]);

  useEffect(() => {
    setSelectedCatchers(prev => {
      if (prev.length === catcherCount) return prev;
      const next = Array(catcherCount).fill('');
      for (let i = 0; i < Math.min(prev.length, catcherCount); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [catcherCount]);

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

  const allAssigned = useMemo(() => {
    const set = new Set<string>();
    for (const id of selectedPitchers) if (id) set.add(id);
    for (const id of selectedCatchers) if (id) set.add(id);
    return set;
  }, [selectedPitchers, selectedCatchers]);

  const handlePitcherChange = (slotIndex: number, playerId: string) => {
    setSelectedPitchers(prev => {
      const next = [...prev];
      next[slotIndex] = playerId;
      return next;
    });
    if (playerId) {
      setSelectedCatchers(prev => {
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
    setSelectedCatchers(prev => {
      const next = [...prev];
      next[slotIndex] = playerId;
      return next;
    });
    if (playerId) {
      setSelectedPitchers(prev => {
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

  const pitcherOptionsFor = (slotIndex: number) =>
    presentPlayers.filter((p: Player) => {
      if (p.id === selectedPitchers[slotIndex]) return true;
      return !allAssigned.has(p.id);
    });

  const catcherOptionsFor = (slotIndex: number) =>
    presentPlayers.filter((p: Player) => {
      if (p.id === selectedCatchers[slotIndex]) return true;
      return !allAssigned.has(p.id);
    });

  const getPlayerStatus = (playerId: string): string => {
    const pIdx = selectedPitchers.indexOf(playerId);
    if (pIdx >= 0) return pitcherCount > 1 ? `Pitcher ${pIdx + 1}` : 'Pitcher';
    const cIdx = selectedCatchers.indexOf(playerId);
    if (cIdx >= 0) return catcherCount > 1 ? `Catcher ${cIdx + 1}` : 'Catcher';
    return '';
  };

  // --- Lineup Editor ---
  const validationInput: GenerateLineupInput = useMemo(() => ({
    presentPlayers,
    innings,
    pitcherAssignments,
    catcherAssignments,
    positionBlocks,
  }), [presentPlayers, innings, pitcherAssignments, catcherAssignments, positionBlocks]);

  const editor = useLineupEditor(selectedLineup, validationInput);

  const lineupScore = useMemo(() => {
    if (!editor.lineup) return null;
    return scoreLineup(editor.lineup, validationInput);
  }, [editor.lineup, validationInput]);

  useEffect(() => {
    editor.setBattingOrder(currentOrder);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder]);

  // --- Auto-generate lineup ---
  const [generateError, setGenerateError] = useState('');
  const hasAutoGenerated = useRef(false);

  useEffect(() => {
    if (hasAutoGenerated.current) return;
    if (generatedLineups.length === 0 && presentPlayers.length >= 9) {
      hasAutoGenerated.current = true;
      const result = generate();
      if (!result.success && result.errors.length > 0) {
        setGenerateError(result.errors[0]);
      } else if (result.success) {
        generateBattingOrder();
      }
    }
  }, [generatedLineups.length, generate, generateBattingOrder, presentPlayers.length]);

  const handleRegenerate = useCallback(() => {
    setGenerateError('');
    const result = generate();
    if (!result.success && result.errors.length > 0) {
      setGenerateError(result.errors[0]);
    } else if (result.success) {
      generateBattingOrder();
      setStaleWarning(false);
    }
  }, [generate, generateBattingOrder]);

  // --- Stale Warning ---
  // Track whether inputs changed after lineup was generated
  const [staleWarning, setStaleWarning] = useState(false);
  const lastGenerationSnapshot = useRef<string | null>(null);

  // Snapshot inputs when lineup is generated
  useEffect(() => {
    if (generatedLineups.length > 0) {
      lastGenerationSnapshot.current = JSON.stringify({
        presentIds: presentPlayers.map(p => p.id).sort(),
        pitchers: selectedPitchers,
        catchers: selectedCatchers,
      });
    }
  }, [generatedLineups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect changes after generation
  useEffect(() => {
    if (!lastGenerationSnapshot.current || generatedLineups.length === 0) return;
    const currentSnapshot = JSON.stringify({
      presentIds: presentPlayers.map(p => p.id).sort(),
      pitchers: selectedPitchers,
      catchers: selectedCatchers,
    });
    if (currentSnapshot !== lastGenerationSnapshot.current) {
      setStaleWarning(true);
    }
  }, [presentPlayers, selectedPitchers, selectedCatchers, generatedLineups.length]);

  // --- Previous batting order from history ---
  const previousBattingOrder =
    history.length > 0 ? history[history.length - 1].battingOrder : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={styles.desktop}>
      <div className={styles.columns}>
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
          <Card label="Attendance">
            <AttendanceList players={players} onToggle={togglePresent} />
          </Card>

          <Card label="Pitcher &amp; Catcher">
            <div className={styles.slotSection}>
              <h4 className={styles.slotHeading}>Pitchers</h4>
              <div className={styles.slotGrid}>
                {selectedPitchers.map((selectedId, idx) => (
                  <div className={styles.dropdownGroup} key={`pitcher-${idx}`}>
                    <label
                      className={styles.dropdownLabel}
                      htmlFor={`desktop-pitcher-select-${idx}`}
                    >
                      {pitcherCount > 1 ? `Pitcher ${idx + 1}` : 'Pitcher'}
                    </label>
                    <select
                      id={`desktop-pitcher-select-${idx}`}
                      className={styles.playerSelect}
                      value={selectedId}
                      onChange={e => handlePitcherChange(idx, e.target.value)}
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
              <h4 className={styles.slotHeading}>Catchers</h4>
              <div className={styles.slotGrid}>
                {selectedCatchers.map((selectedId, idx) => (
                  <div className={styles.dropdownGroup} key={`catcher-${idx}`}>
                    <label
                      className={styles.dropdownLabel}
                      htmlFor={`desktop-catcher-select-${idx}`}
                    >
                      {catcherCount > 1 ? `Catcher ${idx + 1}` : 'Catcher'}
                    </label>
                    <select
                      id={`desktop-catcher-select-${idx}`}
                      className={styles.playerSelect}
                      value={selectedId}
                      onChange={e => handleCatcherChange(idx, e.target.value)}
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
                          <span className={styles.pcWarning}>
                            <span className={styles.pcWarningIcon}>!</span>
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
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightColumn}>
          {staleWarning && (
            <div className={styles.staleWarning} role="alert">
              <span>
                Attendance or P/C assignments changed since lineup was generated.
                Consider regenerating.
              </span>
              <button
                className={styles.dismissButton}
                onClick={() => setStaleWarning(false)}
              >
                Dismiss
              </button>
            </div>
          )}

          <Card label="Lineup">
            <div className={styles.section}>
              <button
                type="button"
                className={styles.regenerateButton}
                onClick={handleRegenerate}
              >
                {generatedLineups.length === 0 ? 'Generate Lineup' : 'Regenerate Lineup'}
              </button>
              {generateError && (
                <p className={styles.generateError}>{generateError}</p>
              )}
            </div>

            {editor.lineup && (
              <div className={styles.section}>
                {editor.hasEdits && (
                  <span className={styles.editsBadge}>Edited</span>
                )}
                <DraggableLineupGrid
                  lineup={editor.lineup}
                  innings={innings}
                  players={players}
                  errors={editor.validationErrors}
                  onSwap={editor.swapPositions}
                />
                {lineupScore && <FairnessScoreCard score={lineupScore} />}
                <FairnessSummary
                  summary={computeFairnessSummary(editor.lineup, innings, players)}
                />
                <ValidationPanel errors={editor.validationErrors} preErrors={[]} />
              </div>
            )}
          </Card>

          <Card label="Batting Order">
            {editor.battingOrder && (
              <SortableBattingOrder
                order={editor.battingOrder}
                players={battingPresentPlayers}
                onReorder={editor.reorderBattingOrder}
              />
            )}
            {!editor.battingOrder && (
              <p className={styles.emptyMessage}>
                Batting order will be generated with the lineup.
              </p>
            )}

            {/* Previous batting order comparison */}
            {previousBattingOrder && editor.battingOrder && (
              <div className={styles.section}>
                <p className={styles.comparisonLabel}>
                  Last game&apos;s batting order for reference
                </p>
                <div className={styles.comparison}>
                  <div className={styles.comparisonColumn}>
                    <h4 className={styles.comparisonTitle}>Previous Game</h4>
                    <ol className={styles.comparisonList}>
                      {previousBattingOrder.map((playerId, index) => (
                        <li key={`prev-${index}`}>
                          {getPlayerName(playerId, players)}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className={styles.comparisonColumn}>
                    <h4 className={styles.comparisonTitle}>Current Game</h4>
                    <ol className={styles.comparisonList}>
                      {editor.battingOrder.map((playerId, index) => (
                        <li key={`curr-${index}`}>
                          {getPlayerName(playerId, players)}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
