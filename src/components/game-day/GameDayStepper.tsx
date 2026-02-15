import { useStepperState } from '../../hooks/useStepperState';
import { StepperHeader } from './StepperHeader';
import { AttendanceStep } from './steps/AttendanceStep';
import styles from './GameDayStepper.module.css';

export function GameDayStepper() {
  const {
    currentStep,
    completedSteps,
    staleWarning,
    goToStep,
    completeStep,
    clearStaleWarning,
    canNavigate,
  } = useStepperState();

  return (
    <div className={styles.stepper}>
      <StepperHeader
        currentStep={currentStep}
        completedSteps={completedSteps}
        canNavigate={canNavigate}
        onStepClick={goToStep}
      />

      {staleWarning && (
        <div className={styles.staleWarning} role="alert">
          <span>
            Attendance changed after lineup was generated. Consider
            regenerating.
          </span>
          <button
            className={styles.dismissButton}
            onClick={clearStaleWarning}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className={styles.stepContent}>
        {currentStep === 'attendance' && (
          <AttendanceStep onComplete={() => completeStep('attendance')} />
        )}
        {currentStep === 'pc-assignment' && (
          <div>P/C Assignment (Task 2)</div>
        )}
        {currentStep === 'generate' && (
          <div>Generate (coming in Plan 03)</div>
        )}
        {currentStep === 'review' && (
          <div>Review (coming in Plan 03)</div>
        )}
        {currentStep === 'print' && (
          <div>Print (coming in Plan 03)</div>
        )}
      </div>
    </div>
  );
}
