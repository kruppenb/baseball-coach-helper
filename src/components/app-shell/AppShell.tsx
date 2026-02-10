import { useState, useEffect } from 'react';
import { TabBar } from './TabBar';
import { RosterPage } from '../roster/RosterPage';
import { GameSetupPage } from '../game-setup/GameSetupPage';
import { LineupPage } from '../lineup/LineupPage';
import { useRoster } from '../../hooks/useRoster';
import styles from './AppShell.module.css';

export function AppShell() {
  const [activeTab, setActiveTab] = useState('roster');
  const { presentCount } = useRoster();

  const tabs = [
    { id: 'roster', label: 'Roster' },
    { id: 'game-setup', label: 'Game Setup' },
    { id: 'lineup', label: 'Lineup', disabled: presentCount < 9 },
    { id: 'history', label: 'History', disabled: true },
  ];

  useEffect(() => {
    if (activeTab === 'lineup' && presentCount < 9) {
      setActiveTab('game-setup');
    }
  }, [activeTab, presentCount]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lineup Builder</h1>
      </header>
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className={styles.content}>
        {activeTab === 'roster' && (
          <div
            role="tabpanel"
            id="panel-roster"
            aria-labelledby="tab-roster"
          >
            <RosterPage />
          </div>
        )}
        {activeTab === 'game-setup' && (
          <div
            role="tabpanel"
            id="panel-game-setup"
            aria-labelledby="tab-game-setup"
          >
            <GameSetupPage />
          </div>
        )}
        {activeTab === 'lineup' && (
          <div
            role="tabpanel"
            id="panel-lineup"
            aria-labelledby="tab-lineup"
          >
            <LineupPage />
          </div>
        )}
      </main>
    </div>
  );
}
