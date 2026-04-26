/**
 * Optimized Smart Booking Flow Component
 * Senior Engineering: Performance optimization with useMemo, useCallback, React.memo
 * 
 * Optimizations applied:
 * - Memoized step configurations
 * - Cached event handlers with useCallback
 * - Lazy loading of step components
 * - Optimized re-render prevention
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  Suspense,
  lazy
} from 'react';
import { bookingManager, BOOKING_STATES } from '../services/bookingStateManager';
import { apiService } from '../services/apiService';
import { realtimeManager } from '../services/realtimeManager';
import { networkResilienceManager } from '../services/networkResilienceManager';
import { sessionPersistenceManager } from '../services/sessionPersistenceManager';
import { ErrorBoundary } from './ErrorBoundary';
import { RealtimeStatusIndicator } from './RealtimeStatusIndicator';
import { Icon } from './Icon';
import { ProgressStepper } from './OptimizedProgressStepper';

// Lazy load step components for code splitting
// Components are loaded on-demand when needed
const BookingPreference = lazy(() => import('./bookingSteps/BookingPreference'));
const SmartRecommendation = lazy(() => import('./bookingSteps/SmartRecommendation'));
const BookingBuilder = lazy(() => import('./bookingSteps/BookingBuilder'));
const BookingReview = lazy(() => import('./bookingSteps/BookingReview'));
const PaymentFlow = lazy(() => import('./bookingSteps/PaymentFlow'));
const BookingConfirmation = lazy(() => import('./bookingSteps/BookingConfirmation'));

// Loading fallback for lazy-loaded components
const StepLoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-pulse flex flex-col items-center">
      <div className="w-16 h-16 bg-[var(--color-canvas-alt)] rounded-full mb-4" />
      <div className="w-48 h-4 bg-[var(--color-canvas-alt)] rounded" />
    </div>
  </div>
);

// Memoized Navigation Controls to prevent re-renders
const NavigationControls = React.memo(({ 
  currentStep, 
  totalSteps, 
  onPrevious, 
  onNext, 
  canGoNext, 
  loading, 
  isLastStep,
  isMobile 
}) => {
  return (
    <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between'} items-center`}>
      <button
        onClick={onPrevious}
        disabled={currentStep === 0 || loading}
        className={`
          ${isMobile ? 'w-full' : ''}
          btn-secondary flex items-center justify-center gap-2
        `}
      >
        <Icon name="back" size={16} />
        <span style={{ fontSize: 'var(--text-sm)' }}>Previous</span>
      </button>

      {!isMobile && (
        <span className="text-sm text-[var(--color-text-muted)]">
          Step {currentStep + 1} of {totalSteps}
        </span>
      )}

      <button
        onClick={onNext}
        disabled={!canGoNext || loading}
        className={`
          ${isMobile ? 'w-full' : ''}
          btn-primary flex items-center justify-center gap-2
        `}
      >
        {loading && (
          <Icon name="loading" size={16} className="animate-spin" />
        )}
        <span style={{ fontSize: 'var(--text-sm)' }}>
          {isLastStep ? 'Complete' : 'Next'}
        </span>
        {!isLastStep && (
          <Icon name="next" size={16} />
        )}
      </button>
    </div>
  );
});

NavigationControls.displayName = 'NavigationControls';

// Memoized Error Display
const ErrorDisplay = React.memo(({ error, onDismiss, onRetry, isOnline }) => {
  if (!error) return null;
  
  return (
    <div className="mb-6 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-md)] p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon name="error" size={20} color="var(--color-danger)" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
          {!isOnline && (
            <p className="text-sm text-[var(--color-danger)] mt-2">
              You appear to be offline. Changes will sync when connected.
            </p>
          )}
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={onDismiss}
            className="inline-flex bg-[var(--color-danger-light)] rounded-md p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <Icon name="close" size={20} />
          </button>
        </div>
      </div>
      
      {error.includes('Connection') && (
        <div className="mt-3">
          <button onClick={onRetry} className="btn-primary text-sm">
            <Icon name="refresh" size={16} className="mr-2" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
});

ErrorDisplay.displayName = 'ErrorDisplay';

// Main component
export const OptimizedSmartBookingFlow = ({ user, onComplete, onClose, initialStep = 0 }) => {
  // State
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [bookingState, setBookingState] = useState(null);

  // Memoized steps configuration - never changes during component lifecycle
  const steps = useMemo(() => [
    { id: BOOKING_STATES.PREFERENCE, component: BookingPreference, title: 'Preferences', subtitle: 'Choose dining style' },
    { id: BOOKING_STATES.DECISION, component: SmartRecommendation, title: 'Recommendation', subtitle: 'AI suggestion' },
    { id: BOOKING_STATES.BUILDING, component: BookingBuilder, title: 'Details', subtitle: 'Date & time' },
    { id: BOOKING_STATES.REVIEW, component: BookingReview, title: 'Review', subtitle: 'Confirm booking' },
    { id: BOOKING_STATES.PAYMENT, component: PaymentFlow, title: 'Payment', subtitle: 'Secure payment' },
    { id: BOOKING_STATES.CONFIRMED, component: BookingConfirmation, title: 'Confirmed', subtitle: 'Success!' },
  ], []); // Empty deps = only created once

  // Memoized check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    
    // Debounced resize handler for performance
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkMobile, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Initialize booking - run once on mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeBooking = async () => {
      try {
        const restored = await bookingManager.restoreState();
        
        if (isMounted) {
          if (restored) {
            const restoredStep = steps.findIndex(step => step.id === bookingManager.state);
            if (restoredStep !== -1) {
              setCurrentStep(restoredStep);
            }
          } else {
            await bookingManager.transitionTo(BOOKING_STATES.PREFERENCE, {
              userId: user?.id,
              userEmail: user?.email,
              createdAt: new Date().toISOString()
            });
          }
          setBookingState(bookingManager.getStateInfo());
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to initialize booking. Please refresh.');
        }
      }
    };

    initializeBooking();
    
    return () => { isMounted = false; };
  }, [user, steps]); // steps is memoized so this runs once

  // Memoized event subscriptions
  useEffect(() => {
    const unsubscribers = [];
    
    // Subscribe to events
    unsubscribers.push(
      bookingManager.subscribe('stateChange', () => {
        setBookingState(bookingManager.getStateInfo());
        setError(null);
      })
    );
    
    unsubscribers.push(
      apiService.on('circuitBreaker:stateChange', (data) => {
        setConnectionStatus(data.state === 'OPEN' ? 'disconnected' : 'connected');
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []); // Run once on mount

  // Memoized navigation handlers
  const handleNext = useCallback(async (data = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const nextStep = steps[currentStep + 1];
      if (!nextStep) {
        onComplete?.(bookingManager.bookingData);
        return;
      }
      
      await bookingManager.transitionTo(nextStep.id, data);
      setCurrentStep(prev => prev + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentStep, steps, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((index) => {
    if (index < currentStep) {
      setCurrentStep(index);
      setError(null);
    }
  }, [currentStep]);

  const handleDismissError = useCallback(() => setError(null), []);
  
  const handleRetry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await bookingManager.persistState();
    } catch (err) {
      setError(`Retry failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized derived values
  const CurrentStepComponent = useMemo(() => {
    return steps[currentStep]?.component;
  }, [steps, currentStep]);

  const canGoNext = useMemo(() => {
    return bookingManager.canProceedTo(steps[currentStep + 1]?.id);
  }, [currentStep, steps]);

  const isLastStep = useMemo(() => {
    return currentStep === steps.length - 1;
  }, [currentStep, steps.length]);

  // Early return for loading state
  if (!bookingState || !CurrentStepComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-canvas)]">
        <StepLoadingFallback />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Book Your Table
            </h1>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay)] rounded-full transition-all"
                aria-label="Close booking"
              >
                <Icon name="close" size={20} />
              </button>
            )}
          </div>
          <div className="mt-2">
            <RealtimeStatusIndicator 
              status={connectionStatus}
              lastUpdate={new Date()}
              isConnecting={connectionStatus === 'connecting'}
              isOffline={connectionStatus === 'disconnected'}
            />
          </div>
        </header>

        {/* Progress Stepper */}
        <ProgressStepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          className="mb-8"
        />

        {/* Error Display */}
        <ErrorDisplay 
          error={error} 
          onDismiss={handleDismissError}
          onRetry={handleRetry}
          isOnline={navigator.onLine}
        />

        {/* Current Step - Lazy Loaded with Suspense */}
        <div 
          className="bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-6 mb-6"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <Suspense fallback={<StepLoadingFallback />}>
            <CurrentStepComponent
              bookingData={bookingManager.bookingData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              loading={loading}
              user={user}
              bookingState={bookingState}
            />
          </Suspense>
        </div>

        {/* Navigation */}
        <NavigationControls
          currentStep={currentStep}
          totalSteps={steps.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoNext={canGoNext}
          loading={loading}
          isLastStep={isLastStep}
          isMobile={isMobile}
        />
      </div>
    </ErrorBoundary>
  );
};

export default OptimizedSmartBookingFlow;
