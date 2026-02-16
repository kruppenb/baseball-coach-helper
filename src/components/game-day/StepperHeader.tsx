import type { StepId } from '../../types';
import styles from './StepperHeader.module.css';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'attendance', label: 'Attend' },
  { id: 'pc-assignment', label: 'P/C' },
  { id: 'review', label: 'Review' },
  { id: 'print', label: 'Print' },
];

interface StepperHeaderProps {
  currentStep: StepId;
  completedSteps: Set<StepId>;
  canNavigate: (step: StepId) => boolean;
  onStepClick: (step: StepId) => void;
}

export function StepperHeader({
  currentStep,
  completedSteps,
  canNavigate,
  onStepClick,
}: StepperHeaderProps) {
  return (
    <nav className={styles.header} aria-label="Game Day steps">
      {STEPS.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = completedSteps.has(step.id);
        const isDisabled = !canNavigate(step.id);

        const stepClasses = [
          styles.step,
          isActive ? styles.active : '',
          isCompleted ? styles.completed : '',
          isDisabled ? styles.disabled : '',
        ]
          .filter(Boolean)
          .join(' ');

        const numberClasses = [
          styles.stepNumber,
          isActive ? styles.active : '',
          isCompleted ? styles.completed : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={step.id} className={styles.stepWrapper}>
            {index > 0 && (
              <div
                className={`${styles.connector} ${isCompleted || isActive ? styles.connectorActive : ''}`}
              />
            )}
            <button
              className={stepClasses}
              onClick={() => onStepClick(step.id)}
              disabled={isDisabled}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${step.label}${isCompleted ? ' (completed)' : ''}${isActive ? ' (current)' : ''}`}
            >
              <span className={numberClasses}>
                {isCompleted ? '\u2713' : index + 1}
              </span>
              <span className={styles.stepLabel}>{step.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
