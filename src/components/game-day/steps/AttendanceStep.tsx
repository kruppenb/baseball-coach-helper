import { useRoster } from '../../../hooks/useRoster';
import { AttendanceList } from '../../game-setup/AttendanceList';
import styles from './AttendanceStep.module.css';

const MIN_PLAYERS = 9;

interface AttendanceStepProps {
  onComplete: () => void;
}

export function AttendanceStep({ onComplete }: AttendanceStepProps) {
  const { players, presentCount, togglePresent } = useRoster();

  const canAdvance = presentCount >= MIN_PLAYERS;

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Mark Attendance</h2>
      <p className={styles.instruction}>
        Tap players to mark them present or absent
      </p>

      <AttendanceList players={players} onToggle={togglePresent} />

      <div className={styles.footer}>
        <p className={styles.presentCount}>
          {presentCount} of {players.length} present
        </p>
        {!canAdvance && players.length > 0 && (
          <p className={styles.minMessage}>
            Need at least {MIN_PLAYERS} present players to continue.
          </p>
        )}
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
