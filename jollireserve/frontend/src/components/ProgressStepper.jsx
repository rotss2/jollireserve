import React from 'react';
import { Icon } from './Icon';

export const ProgressStepper = ({ steps, currentStep, onStepClick, className = '' }) => {
  const getStepStatus = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepClasses = (status) => {
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
  };

  const getConnectorClasses = (index) => {
    const isCompleted = index < currentStep;
    return `flex-1 mx-4 h-0.5 transition-colors ${
      isCompleted ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
    }`;
  };

  const getStepTextClasses = (status) => {
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
  };

  const isStepClickable = (index, status) => {
    return status === 'completed' && onStepClick;
  };

  const handleStepClick = (index) => {
    if (isStepClickable(index, getStepStatus(index))) {
      onStepClick(index);
    }
  };

  return (
    <nav className={`flex items-center justify-between mb-8 ${className}`} aria-label="Progress">
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isClickable = isStepClickable(index, status);

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <button
              onClick={() => handleStepClick(index)}
              disabled={!isClickable}
              className={getStepClasses(status)}
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
              <p className={`text-sm font-medium ${getStepTextClasses(status)}`}>
                {step.title}
              </p>
              {step.subtitle && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {step.subtitle}
                </p>
              )}
            </div>

            {/* Connector Line - Not for last step */}
            {index < steps.length - 1 && (
              <div className={getConnectorClasses(index)} />
            )}
          </div>
        );
      })}
    </nav>
  );
};

// Compact version for mobile
export const CompactProgressStepper = ({ steps, currentStep, className = '' }) => {
  const getStepStatus = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        
        return (
          <React.Fragment key={step.id}>
            {/* Step Dot */}
            <div
              className={`
                w-2 h-2 rounded-full transition-colors
                ${status === 'completed' ? 'bg-[var(--color-success)]' : 
                  status === 'current' ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-border)]'}
              `}
              title={step.title}
            />
            
            {/* Connector */}
            {index < steps.length - 1 && (
              <div className={`
                w-8 h-0.5 transition-colors
                ${index < currentStep ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'}
              `} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Vertical stepper for mobile
export const VerticalProgressStepper = ({ steps, currentStep, onStepClick, className = '' }) => {
  const getStepStatus = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepClasses = (status) => {
    const baseClasses = 'relative flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm transition-all';
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-[var(--color-success)] text-white`;
      case 'current':
        return `${baseClasses} bg-[var(--color-brand)] text-white ring-4 ring-[var(--color-brand-light)]`;
      case 'upcoming':
        return `${baseClasses} bg-[var(--color-canvas-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]`;
      default:
        return baseClasses;
    }
  };

  const getStepTextClasses = (status) => {
    switch (status) {
      case 'completed':
        return 'text-[var(--color-success)]';
      case 'current':
        return 'text-[var(--color-brand)] font-semibold';
      case 'upcoming':
        return 'text-[var(--color-text-muted)]';
      default:
        return 'text-[var(--color-text-muted)]';
    }
  };

  const isStepClickable = (index, status) => {
    return status === 'completed' && onStepClick;
  };

  const handleStepClick = (index) => {
    if (isStepClickable(index, getStepStatus(index))) {
      onStepClick(index);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isClickable = isStepClickable(index, status);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-start">
            {/* Step Circle */}
            <button
              onClick={() => handleStepClick(index)}
              disabled={!isClickable}
              className={getStepClasses(status)}
              aria-current={status === 'current' ? 'step' : undefined}
            >
              {status === 'completed' ? (
                <Icon name="check" size={16} />
              ) : (
                <span style={{ fontSize: 'var(--text-xs)' }}>{index + 1}</span>
              )}
            </button>

            {/* Step Content */}
            <div className="ml-4 flex-1">
              <div className="flex items-center">
                <h3 className={`text-sm font-medium ${getStepTextClasses(status)}`}>
                  {step.title}
                </h3>
                {status === 'current' && (
                  <span className="badge badge-info ml-2">Current</span>
                )}
              </div>
              
              {step.subtitle && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {step.subtitle}
                </p>
              )}

              {step.description && (
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  {step.description}
                </p>
              )}
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div className="absolute left-4 mt-8 w-0.5 h-8 bg-[var(--color-border)]" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressStepper;
