import { useState } from 'react';
import { useBattingOrder } from '../../hooks/useBattingOrder';
import { BattingOrderList } from './BattingOrderList';
import styles from './BattingOrderSection.module.css';

export function BattingOrderSection() {
  const {
    currentOrder,
    presentPlayers,
    generate,
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

      {currentOrder && (
        <BattingOrderList order={currentOrder} players={presentPlayers} />
      )}
    </section>
  );
}
