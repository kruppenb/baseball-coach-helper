import { useState, useRef } from 'react';
import { useRoster } from '../../hooks/useRoster';
import { exportRosterCsv, downloadCsv, parseRosterCsv } from '../../logic/csv';
import { PlayerInput } from './PlayerInput';
import { PlayerList } from './PlayerList';
import styles from './RosterPage.module.css';

export function RosterPage() {
  const { players, addPlayer, renamePlayer, removePlayer, importPlayers } = useRoster();
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadCsv(exportRosterCsv(players), 'roster.csv');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

    const names = parseRosterCsv(text);
    const { added, skipped } = importPlayers(names);
    setImportStatus(`Added ${added} player${added !== 1 ? 's' : ''}, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}`);

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => setImportStatus(null), 5000);
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Roster</h2>
      <PlayerInput onAdd={addPlayer} />
      <div className={styles.csvActions}>
        <button type="button" className={styles.csvButton} onClick={handleExport}>
          Export CSV
        </button>
        <button type="button" className={styles.csvButton} onClick={handleImportClick}>
          Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      {importStatus && (
        <p className={styles.importStatus}>{importStatus}</p>
      )}
      <PlayerList
        players={players}
        onRename={renamePlayer}
        onDelete={removePlayer}
      />
    </div>
  );
}
