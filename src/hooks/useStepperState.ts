import { useReducer, useCallback, useMemo } from 'react';
import type { StepId } from '../types';

const STEPS: StepId[] = ['attendance', 'pc-assignment', 'review', 'print'];
const STEPPER_STORAGE_KEY = 'stepperState';

interface StepperInternalState {
  currentStep: StepId;
  completedSteps: Set<StepId>;
  hasCompletedAllOnce: boolean;
  staleWarning: boolean;
}

type StepperAction =
  | { type: 'GO_TO_STEP'; step: StepId }
  | { type: 'COMPLETE_STEP'; step: StepId }
  | { type: 'CLEAR_STALE_WARNING' }
  | { type: 'RESET' };

function getInitialState(): StepperInternalState {
  try {
    const raw = localStorage.getItem(STEPPER_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as {
        currentStep: StepId;
        completedSteps: StepId[];
        hasCompletedAllOnce: boolean;
      };
      if (saved.currentStep && STEPS.includes(saved.currentStep)) {
        return {
          currentStep: saved.currentStep,
          completedSteps: new Set<StepId>(
            (saved.completedSteps ?? []).filter((s) => STEPS.includes(s)),
          ),
          hasCompletedAllOnce: saved.hasCompletedAllOnce ?? false,
          staleWarning: false,
        };
      }
    }
  } catch {
    // Corrupted storage — fall through to defaults
  }
  return {
    currentStep: 'attendance',
    completedSteps: new Set<StepId>(),
    hasCompletedAllOnce: false,
    staleWarning: false,
  };
}

function getNextStep(step: StepId): StepId | null {
  const idx = STEPS.indexOf(step);
  if (idx < 0 || idx >= STEPS.length - 1) return null;
  return STEPS[idx + 1];
}

function isBeforeReview(step: StepId): boolean {
  const idx = STEPS.indexOf(step);
  const reviewIdx = STEPS.indexOf('review');
  return idx < reviewIdx;
}

function getNextIncompleteStep(completed: Set<StepId>): StepId {
  for (const step of STEPS) {
    if (!completed.has(step)) return step;
  }
  return STEPS[STEPS.length - 1];
}

function stepperReducerCore(state: StepperInternalState, action: StepperAction): StepperInternalState {
  switch (action.type) {
    case 'GO_TO_STEP': {
      const { step } = action;
      if (state.hasCompletedAllOnce) {
        // Free navigation after completing all steps once
        const staleWarning =
          isBeforeReview(step) && state.completedSteps.has('review')
            ? true
            : state.staleWarning;
        return { ...state, currentStep: step, staleWarning };
      }

      // Linear: only allow completed steps or the next incomplete step
      const nextIncomplete = getNextIncompleteStep(state.completedSteps);
      if (state.completedSteps.has(step) || step === nextIncomplete) {
        const staleWarning =
          isBeforeReview(step) && state.completedSteps.has('review')
            ? true
            : state.staleWarning;
        return { ...state, currentStep: step, staleWarning };
      }

      // Cannot navigate to this step yet
      return state;
    }

    case 'COMPLETE_STEP': {
      const { step } = action;
      const newCompleted = new Set(state.completedSteps);
      newCompleted.add(step);

      const allComplete = STEPS.every((s) => newCompleted.has(s));
      const nextStep = getNextStep(step);

      return {
        ...state,
        completedSteps: newCompleted,
        hasCompletedAllOnce: state.hasCompletedAllOnce || allComplete,
        currentStep: nextStep ?? state.currentStep,
      };
    }

    case 'CLEAR_STALE_WARNING':
      return { ...state, staleWarning: false };

    case 'RESET':
      localStorage.removeItem(STEPPER_STORAGE_KEY);
      return {
        currentStep: 'attendance' as StepId,
        completedSteps: new Set<StepId>(),
        hasCompletedAllOnce: false,
        staleWarning: false,
      };

    default:
      return state;
  }
}

// Wrap the pure reducer with synchronous localStorage persistence.
// Writing inside the reducer (before React commits) guarantees the value
// is in storage even if the page unloads immediately after dispatch.
function stepperReducer(state: StepperInternalState, action: StepperAction): StepperInternalState {
  const next = stepperReducerCore(state, action);
  if (next !== state) {
    try {
      localStorage.setItem(STEPPER_STORAGE_KEY, JSON.stringify({
        currentStep: next.currentStep,
        completedSteps: [...next.completedSteps],
        hasCompletedAllOnce: next.hasCompletedAllOnce,
      }));
    } catch { /* quota exceeded — non-critical */ }
  }
  return next;
}

export function useStepperState() {
  const [state, dispatch] = useReducer(stepperReducer, undefined, getInitialState);

  const goToStep = useCallback((step: StepId) => {
    dispatch({ type: 'GO_TO_STEP', step });
  }, []);

  const completeStep = useCallback((step: StepId) => {
    dispatch({ type: 'COMPLETE_STEP', step });
  }, []);

  const clearStaleWarning = useCallback(() => {
    dispatch({ type: 'CLEAR_STALE_WARNING' });
  }, []);

  const resetStepper = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const canAdvance = useCallback(
    (step: StepId): boolean => state.completedSteps.has(step),
    [state.completedSteps],
  );

  const canNavigate = useMemo(() => {
    const nextIncomplete = getNextIncompleteStep(state.completedSteps);
    return (step: StepId): boolean => {
      if (state.hasCompletedAllOnce) return true;
      if (state.completedSteps.has(step)) return true;
      if (step === nextIncomplete) return true;
      return false;
    };
  }, [state.completedSteps, state.hasCompletedAllOnce]);

  return {
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    hasCompletedAllOnce: state.hasCompletedAllOnce,
    staleWarning: state.staleWarning,

    goToStep,
    completeStep,
    clearStaleWarning,
    resetStepper,
    canAdvance,
    canNavigate,
  };
}
