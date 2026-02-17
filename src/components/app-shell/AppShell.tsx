import { useState, useCallback } from 'react';
import { AppHeader } from './AppHeader';
import { TabBar } from './TabBar';
import { GameDayStepper } from '../game-day/GameDayStepper';
import { GameDayDesktop } from '../game-day/GameDayDesktop';
import { SettingsPage } from '../settings/SettingsPage';
import { NewGameDialog } from '../game-day/NewGameDialog';
import { GameLabelDialog } from '../game-day/GameLabelDialog';
import { Toast } from '../game-day/Toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useRoster } from '../../hooks/useRoster';
import { useLineup } from '../../hooks/useLineup';
import { useBattingOrder } from '../../hooks/useBattingOrder';
import { useGameHistory } from '../../hooks/useGameHistory';
import { useStepperState } from '../../hooks/useStepperState';
import type { TabId } from '../../types';
import styles from './AppShell.module.css';

const tabs = [
  { id: 'game-day', label: 'Game Day' },
  { id: 'settings', label: 'Settings' },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('game-day');
  const isDesktop = useMediaQuery('(min-width: 900px)');

  // --- Hooks for orchestration ---
  const { players, resetAttendance } = useRoster();
  const { selectedLineup, innings, pitcherAssignments, catcherAssignments, resetState: resetLineup } = useLineup();
  const { currentOrder, clear: clearBatting } = useBattingOrder();
  const { saveGame, resetCurrentGame } = useGameHistory();
  const { resetStepper } = useStepperState();

  const hasLineup = !!selectedLineup;
  const hasBattingOrder = !!currentOrder;

  // --- Dialog state ---
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showGameLabelDialog, setShowGameLabelDialog] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // --- New Game flow ---
  const handleNewGameClick = useCallback(() => {
    setShowNewGameDialog(true);
  }, []);

  const performReset = useCallback(() => {
    resetAttendance();
    resetLineup();
    clearBatting();
    resetStepper();
    resetCurrentGame();
  }, [resetAttendance, resetLineup, clearBatting, resetStepper, resetCurrentGame]);

  const handleDontSave = useCallback(() => {
    performReset();
    setShowNewGameDialog(false);
  }, [performReset]);

  const handleSaveAndNew = useCallback(() => {
    if (selectedLineup && currentOrder) {
      saveGame(selectedLineup, currentOrder, innings, players, {
        gameLabel: undefined,
        pitcherAssignments,
        catcherAssignments,
      });
    }
    performReset();
    setShowNewGameDialog(false);
  }, [selectedLineup, currentOrder, innings, players, pitcherAssignments, catcherAssignments, saveGame, performReset]);

  const handleCancelNewGame = useCallback(() => {
    setShowNewGameDialog(false);
  }, []);

  // --- Print-as-save flow ---
  const handlePrintRequest = useCallback(() => {
    setShowGameLabelDialog(true);
  }, []);

  const handleGameLabelConfirm = useCallback((label: string) => {
    setShowGameLabelDialog(false);
    if (selectedLineup && currentOrder) {
      saveGame(selectedLineup, currentOrder, innings, players, {
        gameLabel: label,
        pitcherAssignments,
        catcherAssignments,
      });
    }
    window.print();
    setToastMessage('Game saved to history');
    setShowToast(true);
  }, [selectedLineup, currentOrder, innings, players, pitcherAssignments, catcherAssignments, saveGame]);

  const handleGameLabelCancel = useCallback(() => {
    setShowGameLabelDialog(false);
  }, []);

  const handleToastDone = useCallback(() => {
    setShowToast(false);
  }, []);

  return (
    <div className={`${styles.shell}${isDesktop ? ` ${styles.shellDesktop}` : ''}`}>
      <AppHeader onNewGame={handleNewGameClick} />
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as TabId)} />
      <main className={`${styles.content}${isDesktop ? ` ${styles.contentDesktop}` : ''}`}>
        {activeTab === 'game-day' && (
          <div
            role="tabpanel"
            id="panel-game-day"
            aria-labelledby="tab-game-day"
          >
            {isDesktop ? (
              <GameDayDesktop onPrintRequest={handlePrintRequest} />
            ) : (
              <GameDayStepper onPrintRequest={handlePrintRequest} />
            )}
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

      <NewGameDialog
        open={showNewGameDialog}
        hasLineup={hasLineup && hasBattingOrder}
        onDontSave={handleDontSave}
        onSaveAndNew={handleSaveAndNew}
        onCancel={handleCancelNewGame}
      />
      <GameLabelDialog
        open={showGameLabelDialog}
        onConfirm={handleGameLabelConfirm}
        onCancel={handleGameLabelCancel}
      />
      <Toast
        message={toastMessage}
        visible={showToast}
        onDone={handleToastDone}
      />
    </div>
  );
}
