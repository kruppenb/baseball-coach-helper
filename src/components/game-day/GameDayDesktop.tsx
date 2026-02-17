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
import { DugoutCard } from '../lineup/DugoutCard';
import type { Player, Position, Lineup } from '../../types/index';
import { POSITIONS, INFIELD_POSITIONS } from '../../types/index';
import type { GenerateLineupInput } from '../../logic/lineup-types';
import styles from './GameDayDesktop.module.css';

// ---------------------------------------------------------------------------
// Helpers
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

function getScoreClass(total: number): string {
  if (total >= 80) return styles.scoreGood;
  if (total >= 60) return styles.scoreOk;
  return styles.scoreLow;
}

function getBarFillClass(total: number): string {
  if (total >= 80) return styles.barFillGood;
  if (total >= 60) return styles.barFillOk;
  return styles.barFillLow;
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

interface GameDayDesktopProps {
  onPrintRequest: () => void;
}

export function GameDayDesktop({ onPrintRequest }: GameDayDesktopProps) {
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

  // --- P/C history (all players, for compact chip display) ---
  const pcHistory = useMemo(
    () => computeRecentPCHistory(history, players.map((p: Player) => p.id)),
    [history, players],
  );

  const recentPitchers = useMemo(() => {
    return players
      .filter((p: Player) => pcHistory[p.id]?.pitchedGames > 0)
      .map((p: Player) => ({
        id: p.id,
        name: p.name,
        count: pcHistory[p.id].pitchedGames,
        consecutive: pcHistory[p.id].pitchedLast2Consecutive,
        isPresent: p.isPresent,
      }))
      .sort((a, b) => b.count - a.count);
  }, [players, pcHistory]);

  const recentCatchers = useMemo(() => {
    return players
      .filter((p: Player) => pcHistory[p.id]?.caughtGames > 0)
      .map((p: Player) => ({
        id: p.id,
        name: p.name,
        count: pcHistory[p.id].caughtGames,
        isPresent: p.isPresent,
      }))
      .sort((a, b) => b.count - a.count);
  }, [players, pcHistory]);

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

  // --- Stale Warning ---
  const [staleWarning, setStaleWarning] = useState(false);
  const lastGenerationSnapshot = useRef<string | null>(null);

  useEffect(() => {
    if (generatedLineups.length > 0) {
      lastGenerationSnapshot.current = JSON.stringify({
        presentIds: presentPlayers.map(p => p.id).sort(),
        pitchers: selectedPitchers,
        catchers: selectedCatchers,
      });
    }
  }, [generatedLineups.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // --- Action state ---
  const presentCount = presentPlayers.length;
  const hasLineup = !!editor.lineup;
  const hasBattingOrder = !!editor.battingOrder;
  const canGenerate = presentCount >= 9;
  const canPrint = hasLineup && hasBattingOrder && !staleWarning;
  const [statusMessage, setStatusMessage] = useState('');

  const handleGenerate = useCallback(() => {
    setGenerateError('');
    setStatusMessage('');
    const result = generate();
    if (!result.success && result.errors.length > 0) {
      setGenerateError(result.errors[0]);
    } else if (result.success) {
      generateBattingOrder();
      setStaleWarning(false);
      setStatusMessage('Lineup and batting order generated.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  }, [generate, generateBattingOrder]);

  const handlePrint = useCallback(() => {
    onPrintRequest();
  }, [onPrintRequest]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={styles.desktop}>
      {/* ── SETUP ZONE ── */}
      <div className={styles.setupZone}>
        <Card label="Attendance">
          <AttendanceList players={players} onToggle={togglePresent} />
        </Card>

        <Card label="Pitcher &amp; Catcher">
          <div className={styles.slotSection}>
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

          <div className={styles.pcCardFooter}>
            <div className={styles.pcFooterLeft}>
              {(recentPitchers.length > 0 || recentCatchers.length > 0) && (
                <div className={styles.recentPC}>
                  <span className={styles.recentLabel}>Last 2 games</span>
                  <div className={styles.chipRow}>
                    {recentPitchers.map(({ id, name, count, consecutive, isPresent }) => (
                      <span
                        key={`p-${id}`}
                        className={`${styles.chip} ${consecutive ? styles.chipWarning : ''} ${!isPresent ? styles.chipAbsent : ''}`}
                      >
                        {name} P&times;{count}
                      </span>
                    ))}
                    {recentCatchers.map(({ id, name, count, isPresent }) => (
                      <span
                        key={`c-${id}`}
                        className={`${styles.chip} ${styles.chipCatcher} ${!isPresent ? styles.chipAbsent : ''}`}
                      >
                        {name} C&times;{count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {generateError && (
                <span className={styles.statusError}>{generateError}</span>
              )}
              {!generateError && statusMessage && (
                <span className={styles.statusText}>{statusMessage}</span>
              )}
              {!generateError && !statusMessage && !canGenerate && (
                <span className={styles.statusHint}>Need at least 9 players present</span>
              )}
            </div>
            <button
              type="button"
              className={styles.generateBtn}
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              {hasLineup ? 'Regenerate' : 'Generate Lineup'}
            </button>
          </div>
        </Card>
      </div>

      {/* ── STALE WARNING ── */}
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

      {/* ── WORKSPACE ZONE ── */}
      {editor.lineup ? (
        <div className={styles.workspaceZone}>
          <Card label="Lineup">
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

            {lineupScore && (
              <details className={styles.fairnessDetails}>
                <summary className={styles.fairnessToggle}>
                  <span className={styles.fairnessLabel}>Fairness</span>
                  <span className={`${styles.fairnessScore} ${getScoreClass(lineupScore.total)}`}>
                    {Math.round(lineupScore.total)}/100
                  </span>
                  <div className={styles.fairnessBarWrap}>
                    <div
                      className={`${styles.fairnessBarFill} ${getBarFillClass(lineupScore.total)}`}
                      style={{ width: `${lineupScore.total}%` }}
                    />
                  </div>
                </summary>
                <div className={styles.fairnessContent}>
                  <FairnessScoreCard score={lineupScore} />
                  <FairnessSummary
                    summary={computeFairnessSummary(editor.lineup, innings, players)}
                  />
                </div>
              </details>
            )}

            <ValidationPanel errors={editor.validationErrors} preErrors={[]} />

            {canPrint && (
              <div className={styles.printRow}>
                <button
                  type="button"
                  className={styles.printBtn}
                  onClick={handlePrint}
                >
                  Print Dugout Card
                </button>
              </div>
            )}
          </Card>

          <Card label="Batting Order">
            {editor.battingOrder ? (
              <SortableBattingOrder
                order={editor.battingOrder}
                players={battingPresentPlayers}
                onReorder={editor.reorderBattingOrder}
                previousOrder={previousBattingOrder}
              />
            ) : (
              <p className={styles.emptyMessage}>
                Generated with lineup.
              </p>
            )}
          </Card>
        </div>
      ) : (
        <div className={styles.emptyWorkspace}>
          {generateError && (
            <p className={styles.generateError}>{generateError}</p>
          )}
          {!generateError && (
            <p className={styles.emptyHint}>
              {canGenerate
                ? 'Ready to go \u2014 hit Generate in the Pitcher & Catcher card.'
                : `Need at least 9 players (${presentCount} present)`}
            </p>
          )}
        </div>
      )}

      {/* DugoutCard for print only (hidden on screen) */}
      {editor.lineup && editor.battingOrder && (
        <div className={styles.printOnly}>
          <DugoutCard
            lineup={editor.lineup}
            innings={innings}
            players={players}
            battingOrder={editor.battingOrder}
          />
        </div>
      )}
    </div>
  );
}
