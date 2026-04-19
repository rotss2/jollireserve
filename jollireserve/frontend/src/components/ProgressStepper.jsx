import React from 'react';

export const ProgressStepper = ({ steps, currentStep, onStepClick, className = '' }) => {
  const getStepStatus = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepClasses = (status) => {
    const baseClasses = 'relative flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm transition-all duration-200';
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-500 text-white hover:bg-green-600 cursor-pointer hover:scale-105`;
      case 'current':
        return `${baseClasses} bg-red-500 text-white ring-4 ring-red-100 cursor-default`;
      case 'upcoming':
        return `${baseClasses} bg-gray-200 text-gray-500 cursor-default`;
      default:
        return baseClasses;
    }
  };

  const getConnectorClasses = (index) => {
    const isCompleted = index < currentStep;
    return `flex-1 mx-4 h-0.5 transition-colors duration-200 ${
      isCompleted ? 'bg-green-500' : 'bg-gray-200'
    }`;
  };

  const getStepTextClasses = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 font-medium';
      case 'current':
        return 'text-red-600 font-bold';
      case 'upcoming':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
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
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                index + 1
              )}
            </button>

            {/* Step Label */}
            <div className="ml-3 min-w-0 flex-1">
              <p className={`text-sm font-medium ${getStepTextClasses(status)}`}>
                {step.title}
              </p>
              {step.subtitle && (
                <p className="text-xs text-gray-500 mt-1">
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
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        
        return (
          <React.Fragment key={step.id}>
            {/* Step Dot */}
            <div
              className={`
                w-2 h-2 rounded-full transition-colors duration-200
                ${status === 'completed' ? 'bg-green-500' : 
                  status === 'current' ? 'bg-red-500' : 'bg-gray-300'}
              `}
              title={step.title}
            />
            
            {/* Connector */}
            {index < steps.length - 1 && (
              <div className={`
                w-8 h-0.5 transition-colors duration-200
                ${index < currentStep ? 'bg-green-500' : 'bg-gray-300'}
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
    const baseClasses = 'relative flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm transition-all duration-200';
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-500 text-white`;
      case 'current':
        return `${baseClasses} bg-red-500 text-white ring-4 ring-red-100`;
      case 'upcoming':
        return `${baseClasses} bg-gray-200 text-gray-500`;
      default:
        return baseClasses;
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
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                index + 1
              )}
            </button>

            {/* Step Content */}
            <div className="ml-4 flex-1">
              <div className="flex items-center">
                <h3 className={`text-sm font-medium ${
                  status === 'completed' ? 'text-green-600' : 
                  status === 'current' ? 'text-red-600 font-bold' : 'text-gray-500'
                }`}>
                  {step.title}
                </h3>
                {status === 'current' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                    Current
                  </span>
                )}
              </div>
              
              {step.subtitle && (
                <p className="text-xs text-gray-500 mt-1">
                  {step.subtitle}
                </p>
              )}

              {step.description && (
                <p className="text-sm text-gray-600 mt-2">
                  {step.description}
                </p>
              )}
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div className="absolute left-4 mt-8 w-0.5 h-8 bg-gray-200" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressStepper;
