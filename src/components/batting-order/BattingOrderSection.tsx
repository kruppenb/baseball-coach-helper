import { useState } from 'react';
import { useBattingOrder } from '../../hooks/useBattingOrder';
import { BattingOrderList } from './BattingOrderList';
import styles from './BattingOrderSection.module.css';

export function BattingOrderSection() {
  const {
    currentOrder,
    isConfirmed,
    presentPlayers,
    generate,
    confirm,
    clear,
  } = useBattingOrder();

  const [hasGenerated, setHasGenerated] = useState(currentOrder !== null);

  const handleGenerate = () => {
    generate();
    setHasGenerated(true);
  };

  const handleClear = () => {
    clear();
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Batting Order</h3>
      <p className={styles.helperText}>
        All present players bat in continuous rotation, independent of fielding.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.generateButton}
          onClick={handleGenerate}
        >
          {hasGenerated ? 'Regenerate' : 'Generate Batting Order'}
        </button>

        {currentOrder && !isConfirmed && (
          <button
            type="button"
            className={styles.confirmButton}
            onClick={confirm}
          >
            Confirm Order
          </button>
        )}

        {currentOrder && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
          >
            Clear
          </button>
        )}
      </div>

      {currentOrder && isConfirmed && (
        <p className={styles.confirmedMessage}>
          Batting order confirmed for this game.
        </p>
      )}

      {currentOrder && (
        <BattingOrderList order={currentOrder} players={presentPlayers} />
      )}
    </section>
  );
}
