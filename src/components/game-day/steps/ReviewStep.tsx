import { useState, useEffect } from 'react';
import { useLineup } from '../../../hooks/useLineup';
import { useRoster } from '../../../hooks/useRoster';
import { useBattingOrder } from '../../../hooks/useBattingOrder';
import { useGameHistory } from '../../../hooks/useGameHistory';
import { LineupOptions } from '../../lineup/LineupOptions';
import { LineupGrid } from '../../lineup/LineupGrid';
import { FairnessSummary } from '../../lineup/FairnessSummary';
import type { PlayerFairness } from '../../lineup/FairnessSummary';
import { ValidationPanel } from '../../lineup/ValidationPanel';
import { BattingOrderList } from '../../batting-order/BattingOrderList';
import type { Lineup, Player, Position } from '../../../types/index';
import { POSITIONS, INFIELD_POSITIONS } from '../../../types/index';
import styles from './ReviewStep.module.css';

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

interface ReviewStepProps {
  onComplete: () => void;
}

export function ReviewStep({ onComplete }: ReviewStepProps) {
  const {
    generatedLineups,
    selectedLineupIndex,
    selectedLineup,
    validationErrors,
    innings,
    selectLineup,
    presentPlayers,
  } = useLineup();

  const { players } = useRoster();

  const {
    currentOrder,
    presentPlayers: battingPresentPlayers,
    generate: generateBattingOrder,
    confirm: confirmBatting,
    clear: clearBattingOrder,
  } = useBattingOrder();

  const { history, finalizeGame } = useGameHistory();

  const [isFinalized, setIsFinalized] = useState(false);
  const [hasGeneratedBatting, setHasGeneratedBatting] = useState(currentOrder !== null);

  // Reset finalized state when selected lineup changes
  useEffect(() => {
    setIsFinalized(false);
  }, [selectedLineupIndex]);

  const handleGenerateBattingOrder = () => {
    generateBattingOrder();
    setHasGeneratedBatting(true);
  };

  const handleClearBattingOrder = () => {
    clearBattingOrder();
  };

  const handleFinalize = () => {
    if (!selectedLineup || !currentOrder) return;
    confirmBatting();
    finalizeGame(selectedLineup, currentOrder, innings, players);
    setIsFinalized(true);
  };

  // Previous batting order from game history (FLOW-05)
  const previousBattingOrder =
    history.length > 0 ? history[history.length - 1].battingOrder : null;

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Review Lineup</h2>

      {/* Lineup Options section */}
      <div className={styles.section}>
        <LineupOptions
          lineups={generatedLineups}
          selectedIndex={selectedLineupIndex}
          innings={innings}
          players={presentPlayers}
          onSelect={selectLineup}
        />
      </div>

      {/* Lineup Grid, Fairness, Validation */}
      {selectedLineup && (
        <div className={styles.section}>
          <LineupGrid
            lineup={selectedLineup}
            innings={innings}
            players={players}
            errors={validationErrors}
          />
          <FairnessSummary
            summary={computeFairnessSummary(selectedLineup, innings, players)}
          />
          <ValidationPanel errors={validationErrors} preErrors={[]} />
        </div>
      )}

      {/* Batting Order section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Batting Order</h3>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.generateBattingButton}
            onClick={handleGenerateBattingOrder}
          >
            {hasGeneratedBatting ? 'Regenerate' : 'Generate Batting Order'}
          </button>
          {currentOrder && (
            <button
              type="button"
              className={styles.clearBattingButton}
              onClick={handleClearBattingOrder}
            >
              Clear
            </button>
          )}
        </div>

        {currentOrder && (
          <BattingOrderList order={currentOrder} players={battingPresentPlayers} />
        )}
      </div>

      {/* Previous Batting Order comparison (FLOW-05) */}
      {previousBattingOrder && currentOrder && (
        <div className={styles.section}>
          <p className={styles.comparisonLabel}>
            Last game's batting order for reference
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
                {currentOrder.map((playerId, index) => (
                  <li key={`curr-${index}`}>
                    {getPlayerName(playerId, players)}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Finalize section */}
      <div className={styles.section}>
        <button
          type="button"
          className={styles.finalizeButton}
          disabled={!currentOrder || isFinalized}
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

      <button
        type="button"
        className={styles.nextButton}
        onClick={onComplete}
        disabled={!isFinalized}
      >
        Next
      </button>
    </div>
  );
}
