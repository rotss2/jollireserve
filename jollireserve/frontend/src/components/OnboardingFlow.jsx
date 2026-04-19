import React, { useState, useEffect } from 'react';

// Custom SVG icons to replace lucide-react
const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// Tooltip Component
export const Tooltip = ({ 
  children, 
  content, 
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-50 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg ${positionClasses[position]}`}>
          <div className="absolute w-3 h-3 bg-gray-900 transform rotate-45"
            style={{
              [position === 'top' ? 'bottom' : position === 'bottom' ? 'top' : position === 'left' ? 'right' : 'left']: '-6px',
              [position === 'top' || position === 'bottom' ? 'left' : 'top']: '50%',
              [position === 'top' || position === 'bottom' ? 'transform' : '']: 'translateX(-50%)'
            }}
          />
          {content}
        </div>
      )}
    </div>
  );
};

// Tour Step Component
const TourStep = ({ 
  step, 
  isActive, 
  onNext, 
  onPrevious, 
  onClose, 
  totalSteps 
}) => {
  if (!isActive) return null;

  const position = step.position || 'bottom-center';
  const target = document.querySelector(step.target);

  if (!target && step.target !== 'body') return null;

  const getOverlayStyle = () => {
    if (step.target === 'body') {
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998
      };
    }

    if (!target) return {};

    const rect = target.getBoundingClientRect();
    const padding = 8;

    return {
      position: 'fixed',
      top: rect.top - padding,
      left: rect.left - padding,
      right: window.innerWidth - rect.right - padding,
      bottom: window.innerHeight - rect.bottom - padding,
      zIndex: 9998,
      pointerEvents: 'none'
    };
  };

  const getTooltipPosition = () => {
    if (step.target === 'body') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999
      };
    }

    if (!target) return {};

    const rect = target.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;

    let top = rect.bottom + 10;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Adjust if tooltip goes off screen
    if (top + tooltipHeight > window.innerHeight) {
      top = rect.top - tooltipHeight - 10;
    }

    if (left < 10) {
      left = 10;
    } else if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    return {
      position: 'fixed',
      top,
      left,
      width: tooltipWidth,
      zIndex: 9999
    };
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={getOverlayStyle()}
        className="bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Tooltip */}
      <div
        style={getTooltipPosition()}
        className="bg-white dark:bg-[var(--bg-card)] rounded-xl shadow-2xl p-6 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--red)]/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--red)]">
                {step.index + 1}
              </span>
            </div>
            <h3 className="font-bold text-lg">{step.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-[var(--bg-subtle)] rounded-full transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="mb-6">
          {step.content}
        </div>

        {step.action && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 {step.action}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step.index ? 'bg-[var(--red)]' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step.index > 0 && (
              <button
                onClick={onPrevious}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--bg-subtle)] rounded-lg transition-colors flex items-center gap-1"
              >
                <ArrowLeftIcon />
                Previous
              </button>
            )}
            
            <button
              onClick={step.index === totalSteps - 1 ? onClose : onNext}
              className="px-4 py-2 bg-[var(--red)] text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
            >
              {step.index === totalSteps - 1 ? (
                <>
                  <CheckIcon />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRightIcon />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Main Onboarding Flow Component
export const OnboardingFlow = ({ 
  isOpen, 
  onClose, 
  onComplete,
  forceShow = false 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Check if user has seen onboarding
  useEffect(() => {
    if (!forceShow) {
      const hasSeenOnboarding = localStorage.getItem('jollibee-onboarding-completed');
      if (hasSeenOnboarding) {
        setIsCompleted(true);
      }
    }
  }, [forceShow]);

  const tourSteps = [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to Jollibee Reserve! 🎉',
      content: (
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Let's take a quick tour to help you get started with our restaurant reservation system.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm">Reserve tables in seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-sm">Join live queue remotely</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-sm">Pre-order your favorite meals</span>
            </div>
          </div>
        </div>
      ),
      action: 'Click "Next" to continue the tour',
      index: 0
    },
    {
      id: 'reservations',
      target: '[data-tour="reservations"]',
      title: 'Make Reservations 📅',
      content: (
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Book your table in advance with our easy reservation system.
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Select date and time</li>
            <li>• Choose party size</li>
            <li>• Pre-order meals (optional)</li>
            <li>• Get instant confirmation</li>
          </ul>
        </div>
      ),
      action: 'Try making a reservation after the tour!',
      index: 1
    },
    {
      id: 'queue',
      target: '[data-tour="queue"]',
      title: 'Join Live Queue 🐝',
      content: (
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Don't want to reserve? Join our live queue and get real-time updates!
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• See your position in queue</li>
            <li>• Get notified when table is ready</li>
            <li>• Track wait time</li>
            <li>• Join from anywhere</li>
          </ul>
        </div>
      ),
      action: 'Perfect for spontaneous visits!',
      index: 2
    },
    {
      id: 'ai-chatbot',
      target: '[data-tour="ai-chatbot"]',
      title: 'AI Assistant 🤖',
      content: (
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Need help? Our AI assistant is here to answer your questions!
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Ask about menu items</li>
            <li>• Check reservation status</li>
            <li>• Get restaurant info</li>
            <li>• Available 24/7</li>
          </ul>
        </div>
      ),
      action: 'Click the chat icon to try it out!',
      index: 3
    },
    {
      id: 'complete',
      target: 'body',
      title: 'You\'re All Set! 🎊',
      content: (
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Congratulations! You're ready to use Jollibee Reserve.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
              ✨ Pro Tips:
            </p>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
              <li>• Pre-ordering saves time</li>
              <li>• Join queue during peak hours</li>
              <li>• Use AI chat for quick help</li>
            </ul>
          </div>
        </div>
      ),
      action: 'Start exploring the app!',
      index: 4
    }
  ];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (currentStep === tourSteps.length - 1) {
      handleComplete();
    } else {
      onClose();
    }
  };

  const handleComplete = () => {
    setIsCompleted(true);
    localStorage.setItem('jollibee-onboarding-completed', 'true');
    onComplete?.();
    onClose();
  };

  if (!isOpen || isCompleted) return null;

  return (
    <div className="fixed inset-0 z-50">
      {tourSteps.map((step) => (
        <TourStep
          key={step.id}
          step={step}
          isActive={step.index === currentStep}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onClose={handleClose}
          totalSteps={tourSteps.length}
        />
      ))}
    </div>
  );
};

// Feature Highlight Component
export const FeatureHighlight = ({ 
  children, 
  feature, 
  className = '' 
}) => {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const hasSeenFeature = localStorage.getItem(`jollibee-feature-${feature}`);

  useEffect(() => {
    if (!hasSeenFeature) {
      const timer = setTimeout(() => {
        setIsHighlighted(true);
        setTimeout(() => {
          setIsHighlighted(false);
          localStorage.setItem(`jollibee-feature-${feature}`, 'true');
        }, 3000);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [feature, hasSeenFeature]);

  return (
    <div className={`relative ${className}`}>
      {children}
      {isHighlighted && (
        <div className="absolute -inset-1 bg-[var(--red)] opacity-20 rounded-lg animate-pulse" />
      )}
    </div>
  );
};

// Quick Start Guide Component
export const QuickStartGuide = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`card p-4 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <span className="font-medium">Quick Start Guide</span>
        </div>
        <ArrowRightIcon 
          className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
        />
      </button>
      
      {isExpanded && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-[var(--red)]/10 rounded-full flex items-center justify-center text-xs font-bold text-[var(--red)] flex-shrink-0">
              1
            </span>
            <div>
              <p className="font-medium">Make a Reservation</p>
              <p className="text-gray-600 dark:text-gray-400">
                Click "Reserve a Table" to book your spot
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-[var(--red)]/10 rounded-full flex items-center justify-center text-xs font-bold text-[var(--red)] flex-shrink-0">
              2
            </span>
            <div>
              <p className="font-medium">Join Queue (Optional)</p>
              <p className="text-gray-600 dark:text-gray-400">
                For immediate seating, join the live queue
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-[var(--red)]/10 rounded-full flex items-center justify-center text-xs font-bold text-[var(--red)] flex-shrink-0">
              3
            </span>
            <div>
              <p className="font-medium">Get Notified</p>
              <p className="text-gray-600 dark:text-gray-400">
                Receive alerts when your table is ready
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
