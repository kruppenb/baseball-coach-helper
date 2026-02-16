import { useState, useRef } from 'react';
import { useRoster } from '../../hooks/useRoster';
import { useGameConfig } from '../../hooks/useGameConfig';
import { useLineup } from '../../hooks/useLineup';
import { useAuth } from '../../auth/useAuth';
import { getDisplayName } from '../../auth/types';
import { exportRosterCsv, downloadCsv, parseRosterCsv } from '../../logic/csv';
import { PlayerInput } from '../roster/PlayerInput';
import { PlayerList } from '../roster/PlayerList';
import { PositionBlocks } from '../lineup/PositionBlocks';
import { SettingsPanel } from '../game-setup/SettingsPanel';
import { SyncStatusIndicator } from '../app-shell/SyncStatusIndicator';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { players, addPlayer, renamePlayer, removePlayer, importPlayers } = useRoster();
  const { config, setInnings, setPitchersPerGame, setCatchersPerGame } = useGameConfig();
  const { presentPlayers, positionBlocks, togglePositionBlock } = useLineup();
  const { user, isLoading } = useAuth();

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
    setImportStatus(
      `Added ${added} player${added !== 1 ? 's' : ''}, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}`,
    );

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => setImportStatus(null), 5000);
  };

  return (
    <div className={styles.page}>
      <h2>Settings</h2>

      {/* SETT-01: Roster */}
      <h3 className={styles.sectionTitle}>Roster</h3>
      <PlayerInput onAdd={addPlayer} />
      <PlayerList
        players={players}
        onRename={renamePlayer}
        onDelete={removePlayer}
      />

      {/* SETT-02: CSV Import / Export */}
      <h3 className={styles.sectionTitle}>CSV Import / Export</h3>
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

      {/* SETT-03: Position Blocks */}
      <h3 className={styles.sectionTitle}>Position Blocks</h3>
      <PositionBlocks
        presentPlayers={presentPlayers}
        positionBlocks={positionBlocks}
        onToggleBlock={togglePositionBlock}
      />

      {/* SETT-04: Innings Config */}
      <h3 className={styles.sectionTitle}>Innings</h3>
      <SettingsPanel
        innings={config.innings}
        onInningsChange={setInnings}
        pitchersPerGame={config.pitchersPerGame}
        onPitchersPerGameChange={setPitchersPerGame}
        catchersPerGame={config.catchersPerGame}
        onCatchersPerGameChange={setCatchersPerGame}
      />

      {/* SETT-05: Sync Status */}
      <h3 className={styles.sectionTitle}>Sync Status</h3>
      <div className={styles.syncSection}>
        <SyncStatusIndicator />
        {!isLoading && (
          <p className={styles.syncInfo}>
            {user
              ? `Signed in as ${getDisplayName(user)}`
              : 'Sign in to sync your data across devices'}
          </p>
        )}
      </div>
    </div>
  );
}
