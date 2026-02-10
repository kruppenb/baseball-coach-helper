import { useState } from 'react';
import { useLineup } from '../../hooks/useLineup';
import { useRoster } from '../../hooks/useRoster';
import { PreAssignments } from './PreAssignments';
import { PositionBlocks } from './PositionBlocks';
import { LineupGrid } from './LineupGrid';
import { LineupOptions } from './LineupOptions';
import { ValidationPanel } from './ValidationPanel';
import { FairnessSummary } from './FairnessSummary';
import type { PlayerFairness } from './FairnessSummary';
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

  const [statusMessage, setStatusMessage] = useState('');

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
          <PreAssignments
            innings={innings}
            presentPlayers={presentPlayers}
            pitcherAssignments={pitcherAssignments}
            catcherAssignments={catcherAssignments}
            onPitcherChange={setPitcher}
            onCatcherChange={setCatcher}
          />

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
            </div>
          )}

          {selectedLineup && (
            <ValidationPanel errors={validationErrors} preErrors={[]} />
          )}

          <div className={styles.section}>
            <BattingOrderSection />
          </div>
        </>
      )}
    </div>
  );
}
