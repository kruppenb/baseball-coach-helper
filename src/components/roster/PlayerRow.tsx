import { useState, useEffect } from 'react';
import type { Player } from '../../types';
import styles from './PlayerRow.module.css';

interface PlayerRowProps {
  player: Player;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

function autoCapitalize(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function PlayerRow({ player, onRename, onDelete }: PlayerRowProps) {
  const [editingValue, setEditingValue] = useState(player.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Sync local editing value when player.name prop changes
  useEffect(() => {
    setEditingValue(player.name);
  }, [player.name]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setEditingValue(player.name);
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    const trimmed = editingValue.trim();
    if (trimmed === '') {
      setEditingValue(player.name);
    } else {
      const capitalized = autoCapitalize(trimmed);
      setEditingValue(capitalized);
      if (capitalized !== player.name) {
        onRename(player.id, capitalized);
      }
    }
  };

  return (
    <div className={styles.playerRow}>
      <input
        type="text"
        className={styles.inlineEdit}
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        aria-label={`Edit player name: ${player.name}`}
      />
      {confirmingDelete ? (
        <div className={styles.confirmGroup}>
          <button
            className={styles.confirmButton}
            onClick={() => {
              onDelete(player.id);
              setConfirmingDelete(false);
            }}
          >
            Confirm
          </button>
          <button
            className={styles.cancelButton}
            onClick={() => setConfirmingDelete(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          className={styles.deleteButton}
          onClick={() => setConfirmingDelete(true)}
          aria-label={`Remove ${player.name}`}
        >
          Remove
        </button>
      )}
    </div>
  );
}
