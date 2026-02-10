import { useState, useRef } from 'react';
import styles from './PlayerInput.module.css';

interface PlayerInputProps {
  onAdd: (name: string) => { success: boolean; error?: string };
}

export function PlayerInput({ onAdd }: PlayerInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onAdd(value);
    if (result.success) {
      setValue('');
      setError(null);
      inputRef.current?.focus();
    } else {
      setError(result.error ?? 'Could not add player');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.addForm}>
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Add player (e.g. Jake R)"
          className={styles.addInput}
          aria-label="Player name"
          autoComplete="off"
        />
        <button type="submit" className={styles.addButton}>
          Add
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
