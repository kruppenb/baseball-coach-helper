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

const DIMENSIONS: { key: keyof Omit<LineupScore, 'total'>; label: string; tip: string }[] = [
  { key: 'benchEquity', label: 'Bench Equity', tip: 'How evenly bench time is spread. 100 = every player sits roughly the same amount.' },
  { key: 'infieldBalance', label: 'Infield Balance', tip: 'How evenly infield spots (1B, 2B, 3B, SS) are shared across players.' },
  { key: 'positionVariety', label: 'Position Variety', tip: 'How many different positions each player gets to try during the game.' },
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
        {DIMENSIONS.map(({ key, label, tip }) => {
          const value = Math.round(score[key]);
          return (
            <div key={key} className={styles.dimension}>
              <span className={styles.dimensionLabel}>
                {label}
                <span className={styles.infoTip} data-tip={tip}>
                  <svg className={styles.infoIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="700">i</text>
                  </svg>
                </span>
              </span>
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
