import { useState } from 'react';
import { AppHeader } from './AppHeader';
import { TabBar } from './TabBar';
import { GameDayStepper } from '../game-day/GameDayStepper';
import { GameDayDesktop } from '../game-day/GameDayDesktop';
import { SettingsPage } from '../settings/SettingsPage';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { TabId } from '../../types';
import styles from './AppShell.module.css';

const tabs = [
  { id: 'game-day', label: 'Game Day' },
  { id: 'settings', label: 'Settings' },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('game-day');
  const isDesktop = useMediaQuery('(min-width: 900px)');

  return (
    <div className={styles.shell}>
      <AppHeader />
      <main className={`${styles.content}${isDesktop ? ` ${styles.contentDesktop}` : ''}`}>
        {activeTab === 'game-day' && (
          <div
            role="tabpanel"
            id="panel-game-day"
            aria-labelledby="tab-game-day"
          >
            {isDesktop ? <GameDayDesktop /> : <GameDayStepper />}
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
