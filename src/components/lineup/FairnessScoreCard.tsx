import type { LineupScore } from '../../logic/lineup-scorer';
import styles from './FairnessScoreCard.module.css';

interface FairnessScoreCardProps {
  score: LineupScore;
}

function getScoreClass(total: number): string {
  if (total >= 80) return styles.scoreGood;
  if (total >= 60) return styles.scoreOk;
  return styles.scoreLow;
}

const DIMENSIONS: { key: keyof Omit<LineupScore, 'total'>; label: string }[] = [
  { key: 'benchEquity', label: 'Bench Equity' },
  { key: 'infieldBalance', label: 'Infield Balance' },
  { key: 'positionVariety', label: 'Position Variety' },
];

export function FairnessScoreCard({ score }: FairnessScoreCardProps) {
  const scoreClass = getScoreClass(score.total);

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Fairness Score</h3>
      <div className={`${styles.totalScore} ${scoreClass}`}>
        {Math.round(score.total)}<span className={styles.totalMax}>/100</span>
      </div>
      <div className={styles.dimensions}>
        {DIMENSIONS.map(({ key, label }) => {
          const value = Math.round(score[key]);
          return (
            <div key={key} className={styles.dimension}>
              <span className={styles.dimensionLabel}>{label}</span>
              <span className={`${styles.dimensionValue} ${getScoreClass(value)}`}>
                {value}
              </span>
              <div className={styles.bar}>
                <div
                  className={`${styles.barFill} ${getScoreClass(value)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
