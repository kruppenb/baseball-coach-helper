import { useRoster } from '../../../hooks/useRoster';
import { useLineup } from '../../../hooks/useLineup';
import { useBattingOrder } from '../../../hooks/useBattingOrder';
import { DugoutCard } from '../../lineup/DugoutCard';
import styles from './PrintStep.module.css';

interface PrintStepProps {
  onPrint: () => void;
}

export function PrintStep({ onPrint }: PrintStepProps) {
  const { players } = useRoster();
  const { selectedLineup, innings } = useLineup();
  const { currentOrder } = useBattingOrder();

  const hasData = !!selectedLineup && !!currentOrder;

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Print Dugout Card</h2>
      <p className={styles.instruction}>
        Review the dugout card below, then tap Print to save and print.
      </p>

      {hasData ? (
        <>
          <DugoutCard
            lineup={selectedLineup}
            innings={innings}
            players={players}
            battingOrder={currentOrder}
          />
          <div className={styles.printRow}>
            <button
              type="button"
              className={styles.printBtn}
              onClick={onPrint}
            >
              Print Dugout Card
            </button>
          </div>
        </>
      ) : (
        <p className={styles.emptyMessage}>
          No lineup generated yet. Go back to generate a lineup first.
        </p>
      )}
    </div>
  );
}
