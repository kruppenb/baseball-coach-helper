import { useStepperState } from '../../hooks/useStepperState';
import { StepperHeader } from './StepperHeader';
import { AttendanceStep } from './steps/AttendanceStep';
import { PCAssignmentStep } from './steps/PCAssignmentStep';
import { ReviewStep } from './steps/ReviewStep';
import { PrintStep } from './steps/PrintStep';
import type { StepId } from '../../types';
import styles from './GameDayStepper.module.css';

const STEP_ORDER: StepId[] = ['attendance', 'pc-assignment', 'review', 'print'];

interface GameDayStepperProps {
  onPrintRequest: () => void;
  gameLabel?: string;
}

export function GameDayStepper({ onPrintRequest, gameLabel }: GameDayStepperProps) {
  const {
    currentStep,
    completedSteps,
    staleWarning,
    goToStep,
    completeStep,
    clearStaleWarning,
    canNavigate,
  } = useStepperState();

  const currentIndex = STEP_ORDER.indexOf(currentStep);

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
        {currentIndex > 0 && (
          <button
            type="button"
            className={styles.backButton}
            onClick={() => goToStep(STEP_ORDER[currentIndex - 1])}
          >
            Back
          </button>
        )}

        {currentStep === 'attendance' && (
          <AttendanceStep onComplete={() => completeStep('attendance')} />
        )}
        {currentStep === 'pc-assignment' && (
          <PCAssignmentStep onComplete={() => completeStep('pc-assignment')} />
        )}
        {currentStep === 'review' && (
          <ReviewStep onComplete={() => completeStep('review')} />
        )}
        {currentStep === 'print' && (
          <PrintStep onPrint={onPrintRequest} gameLabel={gameLabel} />
        )}
      </div>
    </div>
  );
}
