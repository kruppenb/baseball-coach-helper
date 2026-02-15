import { useLineup } from '../../../hooks/useLineup';
import { useRoster } from '../../../hooks/useRoster';
import { useBattingOrder } from '../../../hooks/useBattingOrder';
import { DugoutCard } from '../../lineup/DugoutCard';
import styles from './PrintStep.module.css';

export function PrintStep() {
  const { selectedLineup, innings } = useLineup();
  const { players } = useRoster();
  const { currentOrder } = useBattingOrder();

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Print Dugout Card</h2>
      <p className={styles.instruction}>
        Print or screenshot the dugout card below
      </p>

      {selectedLineup && (
        <DugoutCard
          lineup={selectedLineup}
          innings={innings}
          players={players}
          battingOrder={currentOrder}
        />
      )}
    </div>
  );
}
