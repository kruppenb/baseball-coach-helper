import { useReducer, useCallback, useMemo } from 'react';
import type { StepId } from '../types';

const STEPS: StepId[] = ['attendance', 'pc-assignment', 'generate', 'review', 'print'];

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

function isBeforeGenerate(step: StepId): boolean {
  const idx = STEPS.indexOf(step);
  const generateIdx = STEPS.indexOf('generate');
  return idx < generateIdx;
}

function getNextIncompleteStep(completed: Set<StepId>): StepId {
  for (const step of STEPS) {
    if (!completed.has(step)) return step;
  }
  return STEPS[STEPS.length - 1];
}

function stepperReducer(state: StepperInternalState, action: StepperAction): StepperInternalState {
  switch (action.type) {
    case 'GO_TO_STEP': {
      const { step } = action;
      if (state.hasCompletedAllOnce) {
        // Free navigation after completing all steps once
        const staleWarning =
          isBeforeGenerate(step) && state.completedSteps.has('generate')
            ? true
            : state.staleWarning;
        return { ...state, currentStep: step, staleWarning };
      }

      // Linear: only allow completed steps or the next incomplete step
      const nextIncomplete = getNextIncompleteStep(state.completedSteps);
      if (state.completedSteps.has(step) || step === nextIncomplete) {
        const staleWarning =
          isBeforeGenerate(step) && state.completedSteps.has('generate')
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
      return getInitialState();

    default:
      return state;
  }
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
