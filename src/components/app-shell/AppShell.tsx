import { useState } from 'react';
import { TabBar } from './TabBar';
import styles from './AppShell.module.css';

const tabs = [
  { id: 'roster', label: 'Roster' },
  { id: 'game-setup', label: 'Game Setup' },
  { id: 'lineup', label: 'Lineup', disabled: true },
  { id: 'history', label: 'History', disabled: true },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState('roster');

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
            <p>Roster page coming in Plan 02</p>
          </div>
        )}
        {activeTab === 'game-setup' && (
          <div
            role="tabpanel"
            id="panel-game-setup"
            aria-labelledby="tab-game-setup"
          >
            <p>Game Setup page coming in Plan 03</p>
          </div>
        )}
      </main>
    </div>
  );
}
