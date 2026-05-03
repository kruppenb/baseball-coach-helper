import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRoster } from '../../hooks/useRoster';
import { useLineup } from '../../hooks/useLineup';
import { useLineupEditor } from '../../hooks/useLineupEditor';
import { useBattingOrder } from '../../hooks/useBattingOrder';
import { useGameHistory } from '../../hooks/useGameHistory';
import { useGameConfig } from '../../hooks/useGameConfig';
import { usePCAssignment } from '../../hooks/usePCAssignment';
import { computeLastGamePitchers } from '../../logic/game-history';
import { PCTimeline, LastGamePitchers } from './pc-timeline';
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
import { getInfieldPositions, getPositions, getFielderCount, hasPlayerPitching } from '../../types/index';
import type { GenerateLineupInput } from '../../logic/lineup-types';
import styles from './GameDayDesktop.module.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeFairnessSummary(
  lineup: Lineup,
  innings: number,
  players: Player[],
  division: import('../../types/index').Division,
): PlayerFairness[] {
  const presentPlayers = players.filter(p => p.isPresent);
  const inningNumbers = Array.from({ length: innings }, (_, i) => i + 1);
  const positions = getPositions(division);

  return presentPlayers
    .map(player => {
      let infieldInnings = 0;
      let benchInnings = 0;

      for (const inn of inningNumbers) {
        const assignment = lineup[inn];
        if (!assignment) continue;

        const assignedPositions = positions.filter(
          (pos: Position) => assignment[pos] === player.id,
        );

        if (assignedPositions.length === 0) {
          benchInnings++;
        } else if (
          assignedPositions.some((pos: Position) =>
            (getInfieldPositions(division) as readonly string[]).includes(pos),
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
  gameLabel?: string;
  onDisplayStateChange: (lineup: Lineup | null, battingOrder: string[] | null) => void;
}

export function GameDayDesktop({ onPrintRequest, gameLabel, onDisplayStateChange }: GameDayDesktopProps) {
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
    preValidationWarnings,
  } = useLineup();
  const { config } = useGameConfig();
  const { history } = useGameHistory();
  const {
    currentOrder,
    presentPlayers: battingPresentPlayers,
    generate: generateBattingOrder,
  } = useBattingOrder();

  // --- P/C state (per-inning chip timeline) ---
  const playerPitching = hasPlayerPitching(config.division);
  const defaultPitcherCount = playerPitching ? config.pitchersPerGame : 0;
  const defaultCatcherCount = playerPitching ? config.catchersPerGame : 0;

  const lastGamePitcherIds = useMemo(
    () => computeLastGamePitchers(history),
    [history],
  );

  const {
    colorByPlayer,
    catcherInningsByPlayer,
    pitcherInningsByPlayer,
    pitcherOptionsFor,
    catcherOptionsFor,
    changeInningPitcher,
    changeInningCatcher,
    autofillDefaults,
    clearAll,
  } = usePCAssignment({
    presentPlayers,
    innings,
    defaultPitcherCount,
    defaultCatcherCount,
    pitcherAssignments,
    catcherAssignments,
    lastGamePitcherIds,
    setPitcher,
    setCatcher,
  });

  // --- Lineup Editor ---
  const validationInput: GenerateLineupInput = useMemo(() => ({
    presentPlayers,
    innings,
    division: config.division,
    pitcherAssignments,
    catcherAssignments,
    positionBlocks,
  }), [presentPlayers, innings, config.division, pitcherAssignments, catcherAssignments, positionBlocks]);

  const editor = useLineupEditor(selectedLineup, validationInput);

  const lineupScore = useMemo(() => {
    if (!editor.lineup) return null;
    return scoreLineup(editor.lineup, validationInput);
  }, [editor.lineup, validationInput]);

  useEffect(() => {
    editor.setBattingOrder(currentOrder);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder]);

  // Report edited lineup/batting order to AppShell for save flow
  useEffect(() => {
    onDisplayStateChange(editor.lineup, editor.battingOrder);
    return () => {
      onDisplayStateChange(null, null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.lineup, editor.battingOrder]);

  // --- Stale Warning ---
  const [staleWarning, setStaleWarning] = useState(false);
  const lastGenerationSnapshot = useRef<string | null>(null);

  const takeSnapshot = useCallback(() => {
    lastGenerationSnapshot.current = JSON.stringify({
      presentIds: presentPlayers.map(p => p.id).sort(),
      pitchers: pitcherAssignments,
      catchers: catcherAssignments,
    });
  }, [presentPlayers, pitcherAssignments, catcherAssignments]);

  useEffect(() => {
    if (!lastGenerationSnapshot.current || generatedLineups.length === 0) return;
    const currentSnapshot = JSON.stringify({
      presentIds: presentPlayers.map(p => p.id).sort(),
      pitchers: pitcherAssignments,
      catchers: catcherAssignments,
    });
    if (currentSnapshot !== lastGenerationSnapshot.current) {
      setStaleWarning(true);
    }
  }, [presentPlayers, pitcherAssignments, catcherAssignments, generatedLineups.length]);

  // --- Auto-generate lineup ---
  const [generateError, setGenerateError] = useState('');
  const [generateWarnings, setGenerateWarnings] = useState<string[]>([]);
  const hasAutoGenerated = useRef(false);

  useEffect(() => {
    if (hasAutoGenerated.current) return;
    if (generatedLineups.length === 0 && presentPlayers.length > 0) {
      hasAutoGenerated.current = true;
      const result = generate();
      setGenerateError(result.errors[0] ?? '');
      setGenerateWarnings(result.warnings);
      generateBattingOrder();
      takeSnapshot();
    }
  }, [generatedLineups.length, generate, generateBattingOrder, presentPlayers.length, takeSnapshot]);

  // --- Previous batting order from history ---
  const previousBattingOrder =
    history.length > 0 ? history[history.length - 1].battingOrder : null;

  // --- Action state ---
  const presentCount = presentPlayers.length;
  const hasLineup = !!editor.lineup;
  const hasBattingOrder = !!editor.battingOrder;
  const minPlayers = getFielderCount(config.division);
  const canGenerate = presentCount >= minPlayers;
  const canPrint = hasLineup && hasBattingOrder;
  const [statusMessage, setStatusMessage] = useState('');

  const handleGenerate = useCallback(() => {
    setGenerateError('');
    setStatusMessage('');
    setGenerateWarnings([]);
    const result = generate();
    setGenerateError(result.errors[0] ?? '');
    setGenerateWarnings(result.warnings);
    generateBattingOrder();
    takeSnapshot();
    setStaleWarning(false);
    if (result.success) {
      setStatusMessage('Lineup and batting order generated.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  }, [generate, generateBattingOrder, takeSnapshot]);

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

        {playerPitching ? (
          <Card label="Pitcher &amp; Catcher">
            <PCTimeline
              innings={innings}
              presentPlayers={presentPlayers}
              pitcherAssignments={pitcherAssignments}
              catcherAssignments={catcherAssignments}
              colorByPlayer={colorByPlayer}
              catcherInningsByPlayer={catcherInningsByPlayer}
              pitcherInningsByPlayer={pitcherInningsByPlayer}
              pitcherOptionsFor={pitcherOptionsFor}
              catcherOptionsFor={catcherOptionsFor}
              onPitcherChange={changeInningPitcher}
              onCatcherChange={changeInningCatcher}
              onAutofill={autofillDefaults}
              onClearAll={clearAll}
              compact
            />

            <LastGamePitchers
              lastGamePitcherIds={lastGamePitcherIds}
              players={presentPlayers}
            />

            <div className={styles.pcCardFooter}>
              <div className={styles.pcFooterLeft}>
                {generateError && (
                  <span className={styles.statusError}>{generateError}</span>
                )}
                {!generateError && statusMessage && (
                  <span className={styles.statusText}>{statusMessage}</span>
                )}
                {!generateError && !statusMessage && !canGenerate && (
                  <span className={styles.statusHint}>Need at least {minPlayers} players present</span>
                )}
              </div>
              <button
                type="button"
                className={styles.generateBtn}
                onClick={handleGenerate}
              >
                {hasLineup ? 'Regenerate' : 'Generate Lineup'}
              </button>
            </div>
          </Card>
        ) : (
          <Card label="Generate">
            <div className={styles.pcCardFooter}>
              <div className={styles.pcFooterLeft}>
                {generateError && (
                  <span className={styles.statusError}>{generateError}</span>
                )}
                {!generateError && statusMessage && (
                  <span className={styles.statusText}>{statusMessage}</span>
                )}
                {!generateError && !statusMessage && !canGenerate && (
                  <span className={styles.statusHint}>Need at least {minPlayers} players present</span>
                )}
              </div>
              <button
                type="button"
                className={styles.generateBtn}
                onClick={handleGenerate}
              >
                {hasLineup ? 'Regenerate' : 'Generate Lineup'}
              </button>
            </div>
          </Card>
        )}
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
            onClick={() => { takeSnapshot(); setStaleWarning(false); }}
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
              onBenchSwap={editor.benchSwap}
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
                    summary={computeFairnessSummary(editor.lineup, innings, players, config.division)}
                  />
                </div>
              </details>
            )}

            <ValidationPanel errors={editor.validationErrors} preErrors={Array.from(new Set([...preValidationWarnings, ...generateWarnings]))} />

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
                ? `Ready to go \u2014 hit Generate in the ${hasPlayerPitching(config.division) ? 'Pitcher & Catcher' : 'Attendance'} card.`
                : `Need at least ${minPlayers} players (${presentCount} present)`}
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
            gameLabel={gameLabel}
          />
        </div>
      )}
    </div>
  );
}
