import { useMemo } from 'react';
import { useLineup } from '../../../hooks/useLineup';
import { useGameConfig } from '../../../hooks/useGameConfig';
import { useGameHistory } from '../../../hooks/useGameHistory';
import { usePCAssignment } from '../../../hooks/usePCAssignment';
import { computeLastGamePitchers } from '../../../logic/game-history';
import { hasPlayerPitching } from '../../../types';
import { PCTimeline, LastGamePitchers } from '../pc-timeline';
import styles from './PCAssignmentStep.module.css';

interface PCAssignmentStepProps {
  onComplete: () => void;
}

export function PCAssignmentStep({ onComplete }: PCAssignmentStepProps) {
  const {
    presentPlayers,
    innings,
    pitcherAssignments,
    catcherAssignments,
    setPitcher,
    setCatcher,
  } = useLineup();
  const { config } = useGameConfig();
  const { history } = useGameHistory();

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
    allPitchersAssigned,
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

  const canAdvance = !playerPitching || allPitchersAssigned;

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Pitcher &amp; Catcher</h2>

      {playerPitching ? (
        <>
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
          />

          <LastGamePitchers
            lastGamePitcherIds={lastGamePitcherIds}
            players={presentPlayers}
          />
        </>
      ) : (
        <p className={styles.aaNote}>
          AA division — coach pitch. No player pitcher or catcher assignment needed.
        </p>
      )}

      <div className={styles.footer}>
        <button
          type="button"
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
