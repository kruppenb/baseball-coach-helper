import { useState } from 'react';
import { useLineup } from '../../../hooks/useLineup';
import styles from './GenerateStep.module.css';

interface GenerateStepProps {
  onComplete: () => void;
}

export function GenerateStep({ onComplete }: GenerateStepProps) {
  const { generatedLineups, generate, clearLineups } = useLineup();
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleGenerate = () => {
    setStatusMessage('');
    setIsError(false);
    const result = generate();
    if (result.success) {
      setStatusMessage(
        `Generated ${result.count} option${result.count === 1 ? '' : 's'}!`,
      );
    } else if (result.errors.length > 0) {
      setStatusMessage(result.errors[0]);
      setIsError(true);
    } else {
      setStatusMessage('Could not generate any valid lineups.');
      setIsError(true);
    }
  };

  const handleClear = () => {
    clearLineups();
    setStatusMessage('');
    setIsError(false);
  };

  const hasLineups = generatedLineups.length > 0;

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Generate Lineup</h2>
      <p className={styles.instruction}>
        Generate lineup options for today's game
      </p>

      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.generateButton}
          onClick={handleGenerate}
        >
          {hasLineups ? 'Regenerate' : 'Generate Lineups'}
        </button>
        {hasLineups && (
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
        <p className={isError ? styles.statusError : styles.statusMessage}>
          {statusMessage}
        </p>
      )}

      <button
        type="button"
        className={styles.nextButton}
        onClick={onComplete}
        disabled={!hasLineups}
      >
        Next
      </button>
    </div>
  );
}
