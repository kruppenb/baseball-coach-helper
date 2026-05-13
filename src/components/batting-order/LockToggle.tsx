import styles from './LockToggle.module.css';

interface LockToggleProps {
  locked: boolean;
  onToggle: () => void;
}

export function LockToggle({ locked, onToggle }: LockToggleProps) {
  return (
    <button
      type="button"
      className={`${styles.toggle}${locked ? ` ${styles.locked}` : ''}`}
      onClick={onToggle}
      aria-pressed={locked}
      aria-label={locked ? 'Unlock batting order' : 'Lock batting order'}
      title={locked ? 'Locked — Regenerate will skip the batting order' : 'Lock batting order'}
    >
      <span aria-hidden="true">{locked ? '🔒' : '🔓'}</span>
    </button>
  );
}
