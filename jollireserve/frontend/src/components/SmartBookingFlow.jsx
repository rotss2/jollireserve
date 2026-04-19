import React, { useState, useEffect, useCallback } from 'react';
import { bookingManager, BOOKING_STATES } from '../services/bookingStateManager';
import { ProgressStepper, CompactProgressStepper, VerticalProgressStepper } from './ProgressStepper';
import { ErrorBoundary } from './ErrorBoundary';
import { RealtimeStatusIndicator } from './RealtimeStatusIndicator';
import { apiService } from '../services/apiService';

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking flow...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">
              Book Your Table
            </h1>
            
            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close booking"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
              <span className="text-sm text-gray-600">
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
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={handleDismissError}
                    className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 transition-colors"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
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
                  className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Current Step Component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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
    <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'justify-between'} items-center`}>
      {/* Previous Button */}
      <button
        onClick={onPrevious}
        disabled={currentStep === 0 || loading}
        className={`
          ${isMobile ? 'w-full' : ''}
          px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg
          hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors flex items-center justify-center gap-2
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Previous
      </button>

      {/* Progress Text */}
      {!isMobile && (
        <span className="text-sm text-gray-500">
          Step {currentStep + 1} of {totalSteps}
        </span>
      )}

      {/* Next/Complete Button */}
      <button
        onClick={onNext}
        disabled={!canGoNext || loading}
        className={`
          ${isMobile ? 'w-full' : ''}
          px-6 py-2 bg-red-600 text-white rounded-lg
          hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors flex items-center justify-center gap-2
        `}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {isLastStep ? 'Complete' : 'Next'}
        {!isLastStep && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default SmartBookingFlow;
