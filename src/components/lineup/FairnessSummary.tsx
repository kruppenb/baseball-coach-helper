import styles from './FairnessSummary.module.css';

export interface PlayerFairness {
  playerId: string;
  name: string;
  infieldInnings: number;
  benchInnings: number;
}

interface FairnessSummaryProps {
  summary: PlayerFairness[];
}

export function FairnessSummary({ summary }: FairnessSummaryProps) {
  if (summary.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.heading}>Player Summary</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.headerCell}>Player</th>
            <th className={`${styles.headerCell} ${styles.numberCell}`}>Infield</th>
            <th className={`${styles.headerCell} ${styles.numberCell}`}>Bench</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(player => (
            <tr key={player.playerId}>
              <td className={styles.cell}>{player.name}</td>
              <td className={`${styles.cell} ${styles.numberCell}`}>{player.infieldInnings}</td>
              <td className={`${styles.cell} ${styles.numberCell}`}>{player.benchInnings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
