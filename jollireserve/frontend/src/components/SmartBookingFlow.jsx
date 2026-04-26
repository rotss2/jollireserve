import React, { useState, useEffect, useCallback } from 'react';
import { bookingManager, BOOKING_STATES } from '../services/bookingStateManager';
import { ProgressStepper, CompactProgressStepper, VerticalProgressStepper } from './ProgressStepper';
import { ErrorBoundary } from './ErrorBoundary';
import { RealtimeStatusIndicator } from './RealtimeStatusIndicator';
import { apiService } from '../services/apiService';
import { Icon } from './Icon';

// Import step components (will be created next)
import { BookingPreference } from './bookingSteps/BookingPreference';
import { SmartRecommendation } from './bookingSteps/SmartRecommendation';
import { BookingBuilder } from './bookingSteps/BookingBuilder';
import { BookingReview } from './bookingSteps/BookingReview';
import { PaymentFlow } from './bookingSteps/PaymentFlow';
import { BookingConfirmation } from './bookingSteps/BookingConfirmation';

export const SmartBookingFlow = ({ user, onComplete, onClose, initialStep = 0 }) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [bookingState, setBookingState] = useState(null);

  // Define booking flow steps
  const steps = [
    { 
      id: 'preference', 
      component: BookingPreference, 
      title: 'Preferences',
      subtitle: 'Choose your dining style',
      description: 'Let us know your preference for the best experience'
    },
    { 
      id: 'decision', 
      component: SmartRecommendation, 
      title: 'Recommendation',
      subtitle: 'AI-powered suggestion',
      description: 'Based on current conditions and your preferences'
    },
    { 
      id: 'building', 
      component: BookingBuilder, 
      title: 'Details',
      subtitle: 'Date, time & party size',
      description: 'Provide your booking details'
    },
    { 
      id: 'review', 
      component: BookingReview, 
      title: 'Review',
      subtitle: 'Confirm your booking',
      description: 'Review all details before confirmation'
    },
    { 
      id: 'payment', 
      component: PaymentFlow, 
      title: 'Payment',
      subtitle: 'Secure payment',
      description: 'Complete your booking with payment'
    },
    { 
      id: 'confirmed', 
      component: BookingConfirmation, 
      title: 'Confirmed',
      subtitle: 'Booking successful',
      description: 'Your table has been reserved'
    }
  ];

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize booking state
  useEffect(() => {
    const initializeBooking = async () => {
      try {
        // Try to restore previous session
        const restored = await bookingManager.restoreState();
        
        if (restored) {
          const restoredStep = steps.findIndex(step => step.id === bookingManager.state);
          if (restoredStep !== -1) {
            setCurrentStep(restoredStep);
          }
        } else {
          // Initialize new booking
          await bookingManager.transitionTo(BOOKING_STATES.PREFERENCE, {
            userId: user?.id,
            userEmail: user?.email,
            createdAt: new Date().toISOString()
          });
        }
        
        setBookingState(bookingManager.getStateInfo());
        
      } catch (error) {
        console.error('Failed to initialize booking:', error);
        setError('Failed to initialize booking. Please try again.');
      }
    };

    initializeBooking();
  }, [user, steps]);

  // Subscribe to booking manager events
  useEffect(() => {
    const unsubscribeStateChange = bookingManager.subscribe('stateChange', (data) => {
      setBookingState(bookingManager.getStateInfo());
      setError(null);
    });

    const unsubscribeStateFailed = bookingManager.subscribe('stateChangeFailed', (data) => {
      setError(`Failed to proceed: ${data.error}`);
    });

    const unsubscribeBookingCreated = bookingManager.subscribe('booking:confirmed', (data) => {
      // Move to confirmation step when booking is created
      const confirmationStep = steps.findIndex(step => step.id === 'confirmed');
      if (confirmationStep !== -1) {
        setCurrentStep(confirmationStep);
      }
    });

    // Subscribe to API service events
    const unsubscribeCircuitBreaker = apiService.on('circuitBreaker:stateChange', (data) => {
      setConnectionStatus(data.state === 'OPEN' ? 'disconnected' : 'connected');
    });

    const unsubscribeRequestError = apiService.on('request:error', (data) => {
      if (data.willRetry) {
        setError('Connection issue. Retrying...');
      } else {
        setError('Connection failed. Please check your internet connection.');
      }
    });

    return () => {
      unsubscribeStateChange();
      unsubscribeStateFailed();
      unsubscribeBookingCreated();
      unsubscribeCircuitBreaker();
      unsubscribeRequestError();
    };
  }, [steps]);

  // Handle step navigation with validation
  const handleNext = useCallback(async (data = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const nextStep = steps[currentStep + 1];
      if (!nextStep) {
        // Flow completed
        onComplete?.(bookingManager.bookingData);
        return;
      }
      
      await bookingManager.transitionTo(nextStep.id, data);
      setCurrentStep(currentStep + 1);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentStep, steps, onComplete]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  }, [currentStep]);

  // Handle step click (for completed steps)
  const handleStepClick = useCallback((index) => {
    if (index < currentStep) {
      setCurrentStep(index);
      setError(null);
    }
  }, [currentStep]);

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // Handle retry
  const handleRetry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Retry current operation
      await bookingManager.persistState();
      
    } catch (error) {
      setError(`Retry failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get current step component
  const CurrentComponent = steps[currentStep]?.component;

  if (!bookingState || !CurrentComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-canvas)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand)] mx-auto mb-4"></div>
          <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--text-sm)' }}>
            Loading booking flow...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Book Your Table
            </h1>
            
            {/* Close button */}
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
          
          {/* Connection Status */}
          <div className="mt-2">
            <RealtimeStatusIndicator 
              status={connectionStatus}
              lastUpdate={new Date()}
              isConnecting={connectionStatus === 'connecting'}
              isOffline={connectionStatus === 'disconnected'}
            />
          </div>
        </div>

        {/* Progress Stepper - Responsive */}
        {isMobile ? (
          <div className="mb-6">
            <CompactProgressStepper 
              steps={steps}
              currentStep={currentStep}
            />
            <div className="text-center mt-2">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
              </span>
            </div>
          </div>
        ) : (
          <ProgressStepper 
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            className="mb-8"
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-md)] p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Icon name="error" size={20} color="var(--color-danger)" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-[var(--color-danger)]">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={handleDismissError}
                    className="inline-flex bg-[var(--color-danger-light)] rounded-md p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors"
                  >
                    <span className="sr-only">Dismiss</span>
                    <Icon name="close" size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Retry button for connection errors */}
            {error.includes('Connection') && (
              <div className="mt-3">
                <button
                  onClick={handleRetry}
                  disabled={loading}
                  className="btn-primary text-sm"
                >
                  {loading ? (
                    <>
                      <Icon name="loading" size={16} className="animate-spin mr-2" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <Icon name="refresh" size={16} className="mr-2" />
                      Retry
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Current Step Component */}
        <div 
          className="bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-6 mb-6"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <ErrorBoundary>
            <CurrentComponent
              bookingData={bookingManager.bookingData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              loading={loading}
              user={user}
              bookingState={bookingState}
            />
          </ErrorBoundary>
        </div>

        {/* Navigation Controls */}
        <NavigationControls
          currentStep={currentStep}
          totalSteps={steps.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoNext={bookingManager.canProceedTo(steps[currentStep + 1]?.id)}
          loading={loading}
          isLastStep={currentStep === steps.length - 1}
          isMobile={isMobile}
        />
      </div>
    </ErrorBoundary>
  );
};

// Navigation Controls Component
const NavigationControls = ({ 
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
      {/* Previous Button */}
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

      {/* Progress Text */}
      {!isMobile && (
        <span className="text-sm text-[var(--color-text-muted)]">
          Step {currentStep + 1} of {totalSteps}
        </span>
      )}

      {/* Next/Complete Button */}
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
};

export default SmartBookingFlow;
