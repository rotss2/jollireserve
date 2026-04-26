/**
 * Optimized Progress Stepper Component
 * Senior Engineering: Performance optimization with React.memo, useMemo
 */

import React, { useMemo, memo } from 'react';
import { Icon } from './Icon';

// Memoized step component to prevent unnecessary re-renders
const Step = memo(({ step, index, status, isClickable, onClick }) => {
  const stepClasses = useMemo(() => {
    const baseClasses = 'relative flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm transition-all';
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-[var(--color-success)] text-white cursor-pointer hover:scale-105 focus-ring`;
      case 'current':
        return `${baseClasses} bg-[var(--color-brand)] text-white ring-4 ring-[var(--color-brand-light)] cursor-default`;
      case 'upcoming':
        return `${baseClasses} bg-[var(--color-canvas-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] cursor-default`;
      default:
        return baseClasses;
    }
  }, [status]);

  const textClasses = useMemo(() => {
    switch (status) {
      case 'completed':
        return 'text-[var(--color-success)] font-medium';
      case 'current':
        return 'text-[var(--color-brand)] font-semibold';
      case 'upcoming':
        return 'text-[var(--color-text-muted)]';
      default:
        return 'text-[var(--color-text-muted)]';
    }
  }, [status]);

  return (
    <div className="flex items-center flex-1">
      {/* Step Circle */}
      <button
        onClick={() => isClickable && onClick(index)}
        disabled={!isClickable}
        className={stepClasses}
        aria-current={status === 'current' ? 'step' : undefined}
        title={isClickable ? `Go back to ${step.title}` : step.title}
      >
        {status === 'completed' ? (
          <Icon name="check" size={18} />
        ) : (
          <span style={{ fontSize: 'var(--text-sm)' }}>{index + 1}</span>
        )}
      </button>

      {/* Step Label */}
      <div className="ml-3 min-w-0 flex-1">
        <p className={`text-sm font-medium ${textClasses}`}>
          {step.title}
        </p>
        {step.subtitle && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {step.subtitle}
          </p>
        )}
      </div>
    </div>
  );
});

// Memoized connector component
const Connector = memo(({ isCompleted }) => (
  <div 
    className={`flex-1 mx-4 h-0.5 transition-colors ${
      isCompleted ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
    }`}
  />
));

// Main ProgressStepper component - memoized to prevent parent re-render cascades
export const ProgressStepper = memo(({ steps, currentStep, onStepClick, className = '' }) => {
  // Memoize step status calculation
  const stepStatuses = useMemo(() => {
    return steps.map((_, index) => {
      if (index < currentStep) return 'completed';
      if (index === currentStep) return 'current';
      return 'upcoming';
    });
  }, [steps, currentStep]);

  // Memoize click handler
  const handleStepClick = React.useCallback((index) => {
    if (index < currentStep && onStepClick) {
      onStepClick(index);
    }
  }, [currentStep, onStepClick]);

  return (
    <nav className={`flex items-center justify-between mb-8 ${className}`} aria-label="Progress">
      {steps.map((step, index) => {
        const status = stepStatuses[index];
        const isClickable = status === 'completed' && onStepClick;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <Step
              step={step}
              index={index}
              status={status}
              isClickable={isClickable}
              onClick={handleStepClick}
            />
            {!isLast && <Connector isCompleted={index < currentStep} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
});

// Display name for debugging
ProgressStepper.displayName = 'ProgressStepper';
Step.displayName = 'ProgressStepperStep';
Connector.displayName = 'ProgressStepperConnector';

export default ProgressStepper;
