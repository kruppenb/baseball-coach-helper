import { useState, useEffect } from 'react';
import { useLineup } from '../../hooks/useLineup';
import { useRoster } from '../../hooks/useRoster';
import { useBattingOrder } from '../../hooks/useBattingOrder';
import { useGameHistory } from '../../hooks/useGameHistory';
import { PreAssignments } from './PreAssignments';
import { PositionBlocks } from './PositionBlocks';
import { LineupGrid } from './LineupGrid';
import { LineupOptions } from './LineupOptions';
import { ValidationPanel } from './ValidationPanel';
import { FairnessSummary } from './FairnessSummary';
import type { PlayerFairness } from './FairnessSummary';
import { DugoutCard } from './DugoutCard';
import { BattingOrderSection } from '../batting-order/BattingOrderSection';
import type { Lineup, Player } from '../../types/index';
import { INFIELD_POSITIONS, POSITIONS } from '../../types/index';
import styles from './LineupPage.module.css';

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
          pos => assignment[pos] === player.id,
        );

        if (assignedPositions.length === 0) {
          benchInnings++;
        } else if (
          assignedPositions.some(pos =>
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

export function LineupPage() {
  const {
    pitcherAssignments,
    catcherAssignments,
    positionBlocks,
    generatedLineups,
    selectedLineupIndex,
    presentPlayers,
    innings,
    selectedLineup,
    validationErrors,
    preAssignmentErrors,
    setPitcher,
    setCatcher,
    togglePositionBlock,
    generate,
    selectLineup,
    clearLineups,
  } = useLineup();

  const { players } = useRoster();
  const { currentOrder, confirm: confirmBatting } = useBattingOrder();
  const { finalizeGame } = useGameHistory();

  const [statusMessage, setStatusMessage] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);

  // Reset finalized state when selected lineup changes
  useEffect(() => {
    setIsFinalized(false);
  }, [selectedLineupIndex]);

  const handleGenerate = () => {
    setStatusMessage('');
    const result = generate();
    if (result.success) {
      setStatusMessage(`Generated ${result.count} option${result.count === 1 ? '' : 's'}!`);
    } else if (result.errors.length > 0) {
      setStatusMessage(result.errors[0]);
    } else {
      setStatusMessage('Could not generate any valid lineups.');
    }
  };

  const handleClear = () => {
    clearLineups();
    setStatusMessage('');
  };

  const handleFinalize = () => {
    if (!selectedLineup || !currentOrder) return;
    confirmBatting();
    finalizeGame(selectedLineup, currentOrder, innings, players);
    setIsFinalized(true);
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Lineup</h2>

      {presentPlayers.length < 9 ? (
        <div className={styles.minPlayersMessage}>
          Need at least 9 present players to generate a lineup. Currently{' '}
          {presentPlayers.length} present. Mark players as present on the Game
          Setup tab.
        </div>
      ) : (
        <>
          <details className={styles.details} open>
            <summary className={styles.summary}>
              Pitchers &amp; Catchers ({Object.values(pitcherAssignments).filter(Boolean).length + Object.values(catcherAssignments).filter(Boolean).length} assigned)
            </summary>
            <div className={styles.detailsContent}>
              <PreAssignments
                innings={innings}
                presentPlayers={presentPlayers}
                pitcherAssignments={pitcherAssignments}
                catcherAssignments={catcherAssignments}
                onPitcherChange={setPitcher}
                onCatcherChange={setCatcher}
              />
            </div>
          </details>

          <PositionBlocks
            presentPlayers={presentPlayers}
            positionBlocks={positionBlocks}
            onToggleBlock={togglePositionBlock}
          />

          <ValidationPanel errors={[]} preErrors={preAssignmentErrors} />

          <div className={styles.section}>
            <div className={styles.generateSection}>
              <button
                type="button"
                className={styles.generateButton}
                disabled={presentPlayers.length < 9}
                onClick={handleGenerate}
              >
                {generatedLineups.length > 0 ? 'Regenerate' : 'Generate Lineups'}
              </button>
              {generatedLineups.length > 0 && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={handleClear}
                >
                  Clear
                </button>
              )}
            </div>
            {statusMessage && (
              <p className={styles.statusMessage}>{statusMessage}</p>
            )}
          </div>

          {generatedLineups.length > 0 && (
            <div className={styles.section}>
              <LineupOptions
                lineups={generatedLineups}
                selectedIndex={selectedLineupIndex}
                innings={innings}
                players={presentPlayers}
                onSelect={selectLineup}
              />
            </div>
          )}

          {selectedLineup && (
            <details className={styles.details} open>
              <summary className={styles.summary}>Lineup Detail &amp; Fairness</summary>
              <div className={styles.detailsContent}>
                <LineupGrid
                  lineup={selectedLineup}
                  innings={innings}
                  players={players}
                  errors={validationErrors}
                />
                <FairnessSummary
                  summary={computeFairnessSummary(selectedLineup, innings, players)}
                />
              </div>
            </details>
          )}

          {selectedLineup && (
            <ValidationPanel errors={validationErrors} preErrors={[]} />
          )}

          <details className={styles.details} open>
            <summary className={styles.summary}>Batting Order</summary>
            <div className={styles.detailsContent}>
              <BattingOrderSection />
            </div>
          </details>

          <div className={styles.section}>
            <button
              type="button"
              className={styles.finalizeButton}
              disabled={!selectedLineup || !currentOrder || isFinalized}
              onClick={handleFinalize}
            >
              {isFinalized ? 'Game Finalized' : 'Finalize Game'}
            </button>
            {isFinalized && (
              <p className={styles.finalizedMessage}>
                Game finalized and saved to history!
              </p>
            )}
          </div>

          {selectedLineup && (
            <details className={styles.details}>
              <summary className={styles.summary}>Dugout Card (ready to print)</summary>
              <div className={styles.detailsContent}>
                <DugoutCard
                  lineup={selectedLineup}
                  innings={innings}
                  players={players}
                  battingOrder={currentOrder}
                />
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
