import { useRef } from 'react';
import styles from './TabBar.module.css';

interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const enabledTabs = tabs.filter((t) => !t.disabled);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const currentTab = tabs[index];
    const currentEnabledIndex = enabledTabs.findIndex((t) => t.id === currentTab.id);

    let newEnabledIndex = currentEnabledIndex;
    if (e.key === 'ArrowRight') {
      newEnabledIndex = (currentEnabledIndex + 1) % enabledTabs.length;
    } else if (e.key === 'ArrowLeft') {
      newEnabledIndex = (currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else {
      return;
    }

    e.preventDefault();
    const newTab = enabledTabs[newEnabledIndex];
    onTabChange(newTab.id);

    const newTabIndex = tabs.findIndex((t) => t.id === newTab.id);
    tabRefs.current[newTabIndex]?.focus();
  };

  return (
    <div role="tablist" className={styles.tabBar}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => { tabRefs.current[index] = el; }}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          disabled={tab.disabled}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
