import { useState, useCallback, useEffect, useRef } from 'react';
import { AppHeader } from './AppHeader';
import { TabBar } from './TabBar';
import { GameDayStepper } from '../game-day/GameDayStepper';
import { GameDayDesktop } from '../game-day/GameDayDesktop';
import { SettingsPage } from '../settings/SettingsPage';
import { HistoryPage } from '../history/HistoryPage';
import { NewGameDialog } from '../game-day/NewGameDialog';
import { GameLabelDialog } from '../game-day/GameLabelDialog';
import { Toast } from '../game-day/Toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useRoster } from '../../hooks/useRoster';
import { useLineup } from '../../hooks/useLineup';
import { useBattingOrder } from '../../hooks/useBattingOrder';
import { useGameHistory } from '../../hooks/useGameHistory';
import { useStepperState } from '../../hooks/useStepperState';
import type { TabId, Lineup } from '../../types';
import styles from './AppShell.module.css';

const tabs = [
  { id: 'game-day', label: 'Game Day' },
  { id: 'history', label: 'History' },
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

  // --- Display state refs (populated by GameDayDesktop's editor) ---
  const displayLineupRef = useRef<Lineup | null>(null);
  const displayBattingOrderRef = useRef<string[] | null>(null);

  const handleDisplayStateChange = useCallback(
    (lineup: Lineup | null, battingOrder: string[] | null) => {
      displayLineupRef.current = lineup;
      displayBattingOrderRef.current = battingOrder;
    },
    [],
  );

  // --- Dialog state ---
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showGameLabelDialog, setShowGameLabelDialog] = useState(false);
  const [currentGameLabel, setCurrentGameLabel] = useState('');
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
    setCurrentGameLabel('');
    displayLineupRef.current = null;
    displayBattingOrderRef.current = null;
  }, [resetAttendance, resetLineup, clearBatting, resetStepper, resetCurrentGame]);

  const handleDontSave = useCallback(() => {
    displayLineupRef.current = null;
    displayBattingOrderRef.current = null;
    performReset();
    setShowNewGameDialog(false);
  }, [performReset]);

  const handleSaveAndNew = useCallback(() => {
    const lineupToSave = displayLineupRef.current ?? selectedLineup;
    const orderToSave = displayBattingOrderRef.current ?? currentOrder;
    if (lineupToSave && orderToSave) {
      saveGame(lineupToSave, orderToSave, innings, players, {
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
  const pendingPrint = useRef(false);

  const handlePrintRequest = useCallback(() => {
    setShowGameLabelDialog(true);
  }, []);

  const handleGameLabelConfirm = useCallback((label: string) => {
    setShowGameLabelDialog(false);
    setCurrentGameLabel(label);
    const lineupToSave = displayLineupRef.current ?? selectedLineup;
    const orderToSave = displayBattingOrderRef.current ?? currentOrder;
    if (lineupToSave && orderToSave) {
      saveGame(lineupToSave, orderToSave, innings, players, {
        gameLabel: label,
        pitcherAssignments,
        catcherAssignments,
      });
    }
    pendingPrint.current = true;
  }, [selectedLineup, currentOrder, innings, players, pitcherAssignments, catcherAssignments, saveGame]);

  // Defer window.print() until after React renders the game label
  useEffect(() => {
    if (pendingPrint.current && currentGameLabel) {
      pendingPrint.current = false;
      requestAnimationFrame(() => {
        window.print();
        setToastMessage('Game saved to history');
        setShowToast(true);
      });
    }
  }, [currentGameLabel]);

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
              <GameDayDesktop onPrintRequest={handlePrintRequest} gameLabel={currentGameLabel} onDisplayStateChange={handleDisplayStateChange} />
            ) : (
              <GameDayStepper onPrintRequest={handlePrintRequest} gameLabel={currentGameLabel} onDisplayStateChange={handleDisplayStateChange} />
            )}
          </div>
        )}
        {activeTab === 'history' && (
          <div
            role="tabpanel"
            id="panel-history"
            aria-labelledby="tab-history"
          >
            <HistoryPage />
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
