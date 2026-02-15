import { useState } from 'react';
import { AppHeader } from './AppHeader';
import { TabBar } from './TabBar';
import { SettingsPage } from '../settings/SettingsPage';
import type { TabId } from '../../types';
import styles from './AppShell.module.css';

const tabs = [
  { id: 'game-day', label: 'Game Day' },
  { id: 'settings', label: 'Settings' },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('game-day');

  return (
    <div className={styles.shell}>
      <AppHeader />
      <main className={styles.content}>
        {activeTab === 'game-day' && (
          <div
            role="tabpanel"
            id="panel-game-day"
            aria-labelledby="tab-game-day"
          >
            <div>Game Day Stepper (coming in Plan 02)</div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div
            role="tabpanel"
            id="panel-settings"
            aria-labelledby="tab-settings"
          >
            <SettingsPage />
          </div>
        )}
      </main>
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as TabId)} />
    </div>
  );
}
