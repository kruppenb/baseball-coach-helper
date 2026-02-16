import { useRoster } from '../../../hooks/useRoster';
import { useGameHistory } from '../../../hooks/useGameHistory';
import { DugoutCard } from '../../lineup/DugoutCard';
import styles from './PrintStep.module.css';

export function PrintStep() {
  const { players } = useRoster();
  const { history } = useGameHistory();

  const lastGame = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Print Dugout Card</h2>
      <p className={styles.instruction}>
        Print or screenshot the dugout card below
      </p>

      {lastGame && (
        <DugoutCard
          lineup={lastGame.lineup}
          innings={lastGame.innings}
          players={players}
          battingOrder={lastGame.battingOrder}
        />
      )}
    </div>
  );
}
