// Production-Ready Smart Booking System - Enterprise-grade implementation
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookingStateManager, 
  BOOKING_STATES 
} from '../services/bookingStateManager';
import { apiService } from '../services/apiService';
import { realtimeManager } from '../services/realtimeManager';
import { networkResilienceManager } from '../services/networkResilienceManager';
import { sessionPersistenceManager } from '../services/sessionPersistenceManager';
import { ErrorBoundary } from './ErrorBoundary';
import { RealtimeStatusIndicator } from './RealtimeStatusIndicator';

// Production-grade booking steps
import { BookingPreference } from './bookingSteps/BookingPreference';
import { SmartRecommendation } from './bookingSteps/SmartRecommendation';
import { BookingBuilder } from './bookingSteps/BookingBuilder';
import { BookingReview } from './bookingSteps/BookingReview';
import { PaymentFlow } from './bookingSteps/PaymentFlow';
import { BookingConfirmation } from './bookingSteps/BookingConfirmation';

const ProductionBookingSystem = ({ user, onComplete, onClose }) => {
  // Core state management
  const [bookingManager] = useState(() => new BookingStateManager());
  const [currentStep, setCurrentStep] = useState(0);
  const [bookingData, setBookingData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Advanced state
  const [systemHealth, setSystemHealth] = useState({
    api: 'unknown',
    realtime: 'unknown',
    network: 'unknown'
  });
  const [retryCount, setRetryCount] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Booking flow configuration
  const bookingSteps = useMemo(() => [
    {
      id: BOOKING_STATES.PREFERENCE,
      component: BookingPreference,
      title: 'Preferences',
      subtitle: 'Choose your dining style',
      icon: '🍽️',
      estimatedTime: '1 min'
    },
    {
      id: BOOKING_STATES.DECISION,
      component: SmartRecommendation,
      title: 'Recommendation',
      subtitle: 'AI-powered suggestion',
      icon: '🤖',
      estimatedTime: '30 sec'
    },
    {
      id: BOOKING_STATES.BUILDING,
      component: BookingBuilder,
      title: 'Details',
      subtitle: 'Date, time & party size',
      icon: '📅',
      estimatedTime: '2 min'
    },
    {
      id: BOOKING_STATES.REVIEW,
      component: BookingReview,
      title: 'Review',
      subtitle: 'Confirm your booking',
      icon: '✅',
      estimatedTime: '1 min'
    },
    {
      id: BOOKING_STATES.PAYMENT,
      component: PaymentFlow,
      title: 'Payment',
      subtitle: 'Secure payment',
      icon: '💳',
      estimatedTime: '2 min'
    },
    {
      id: BOOKING_STATES.CONFIRMED,
      component: BookingConfirmation,
      title: 'Confirmed',
      subtitle: 'Booking successful',
      icon: '🎉',
      estimatedTime: '1 min'
    }
  ], []);

  // Initialize system
  useEffect(() => {
    initializeSystem();
    return () => cleanupSystem();
  }, []);

  const initializeSystem = useCallback(async () => {
    try {
      setLoading(true);
      
      // Initialize all managers
      await initializeManagers();
      
      // Setup event listeners
      setupEventListeners();
      
      // Restore session if available
      const restored = await bookingManager.restoreState();
      if (restored) {
        const stepIndex = bookingSteps.findIndex(step => step.id === bookingManager.state);
        if (stepIndex !== -1) {
          setCurrentStep(stepIndex);
          setBookingData(bookingManager.bookingData);
        }
      }
      
      // Perform health check
      await performHealthCheck();
      
    } catch (error) {
      console.error('System initialization failed:', error);
      setError('Failed to initialize booking system. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [bookingManager, bookingSteps]);

  const initializeManagers = useCallback(async () => {
    // Start real-time connection
    if (!realtimeManager.getConnectionInfo().isConnected) {
      await realtimeManager.connect();
    }

    // Initialize network resilience
    const networkStatus = networkResilienceManager.getStatus();
    setIsOnline(networkStatus.isOnline);

    // Check session
    const sessionInfo = sessionPersistenceManager.getSessionInfo();
    if (sessionInfo && !sessionInfo.isValid) {
      await sessionPersistenceManager.createSession({ userId: user?.id });
    }
  }, [user]);

  const setupEventListeners = useCallback(() => {
    // Real-time events
    const unsubscribeRealtime = realtimeManager.on('statusChange', (status) => {
      setSystemHealth(prev => ({ ...prev, realtime: status.isConnected ? 'connected' : 'disconnected' }));
    });

    // Network events
    const unsubscribeOnline = networkResilienceManager.on('online', () => {
      setIsOnline(true);
      setError(null);
    });

    const unsubscribeOffline = networkResilienceManager.on('offline', () => {
      setIsOnline(false);
    });

    // Booking manager events
    const unsubscribeStateChange = bookingManager.subscribe('stateChange', (data) => {
      setBookingData(bookingManager.bookingData);
      setError(null);
    });

    const unsubscribeStateFailed = bookingManager.subscribe('stateChangeFailed', (data) => {
      setError(`Failed to proceed: ${data.error}`);
    });

    // API service events
    const unsubscribeCircuitBreaker = apiService.on('circuitBreaker:stateChange', (data) => {
      setSystemHealth(prev => ({ ...prev, api: data.state === 'OPEN' ? 'degraded' : 'operational' }));
    });

    // Browser events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeRealtime();
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeStateChange();
      unsubscribeStateFailed();
      unsubscribeCircuitBreaker();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [bookingManager]);

  const cleanupSystem = useCallback(() => {
    // Cleanup connections
    if (realtimeManager.getConnectionInfo().isConnected) {
      realtimeManager.disconnect();
    }
    
    // Save current state
    if (bookingData && Object.keys(bookingData).length > 0) {
      bookingManager.persistState();
    }
  }, [bookingData]);

  const performHealthCheck = useCallback(async () => {
    try {
      const apiHealth = await apiService.healthCheck();
      const realtimeInfo = realtimeManager.getConnectionInfo();
      const networkStatus = networkResilienceManager.getStatus();

      setSystemHealth({
        api: apiHealth.status,
        realtime: realtimeInfo.isConnected ? 'connected' : 'disconnected',
        network: networkStatus.isOnline ? 'online' : 'offline'
      });
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth({
        api: 'error',
        realtime: 'error',
        network: 'error'
      });
    }
  }, []);

  // Navigation handlers
  const handleNext = useCallback(async (data = {}) => {
    try {
      setLoading(true);
      setError(null);
      setRetryCount(0);

      const nextStep = bookingSteps[currentStep + 1];
      if (!nextStep) {
        // Booking completed
        await handleBookingComplete();
        return;
      }

      // Queue operation for offline support
      await networkResilienceManager.queueOperation({
        type: 'booking_step_transition',
        data: {
          from: bookingSteps[currentStep].id,
          to: nextStep.id,
          bookingData: { ...bookingData, ...data }
        }
      });

      // Transition to next step
      await bookingManager.transitionTo(nextStep.id, { ...bookingData, ...data });
      setCurrentStep(currentStep + 1);

    } catch (error) {
      console.error('Step transition failed:', error);
      setError(error.message);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [currentStep, bookingSteps, bookingData, bookingManager]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  }, [currentStep]);

  const handleRetry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Retry current operation
      await performHealthCheck();
      
      // If network is back online, retry the step
      if (isOnline) {
        await handleNext(bookingData);
      }
    } catch (error) {
      setError(`Retry failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [isOnline, handleNext, bookingData]);

  const handleBookingComplete = useCallback(async () => {
    try {
      // Create final booking
      const booking = await apiService.createBooking(bookingData);
      
      // Broadcast to other devices
      if (crossDeviceSyncManager?.isSupported) {
        crossDeviceSyncManager.broadcastBookingUpdate(booking);
      }
      
      // Save to session
      await sessionPersistenceManager.updateSession({
        lastBooking: booking,
        completedAt: new Date().toISOString()
      });
      
      onComplete?.(booking);
      
    } catch (error) {
      console.error('Booking completion failed:', error);
      setError('Failed to complete booking. Please try again.');
    }
  }, [bookingData, onComplete]);

  const handleStepClick = useCallback((index) => {
    if (index < currentStep) {
      setCurrentStep(index);
      setError(null);
    }
  }, [currentStep]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // Get current step component
  const CurrentStepComponent = bookingSteps[currentStep]?.component;

  // Calculate progress
  const progress = ((currentStep + 1) / bookingSteps.length) * 100;

  if (loading && currentStep === 0) {
    return <LoadingState message="Initializing booking system..." />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* System Status Header */}
        <SystemStatusHeader
          systemHealth={systemHealth}
          isOnline={isOnline}
          onDiagnosticsToggle={() => setShowDiagnostics(!showDiagnostics)}
          onRetry={handleRetry}
          onClose={onClose}
        />

        {/* Diagnostics Panel */}
        <AnimatePresence>
          {showDiagnostics && (
            <DiagnosticsPanel
              systemHealth={systemHealth}
              onClose={() => setShowDiagnostics(false)}
              onHealthCheck={performHealthCheck}
            />
          )}
        </AnimatePresence>

        {/* Main Booking Flow */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Progress Bar */}
          <ProgressBar
            steps={bookingSteps}
            currentStep={currentStep}
            progress={progress}
            onStepClick={handleStepClick}
          />

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <ErrorDisplay
                error={error}
                onDismiss={handleDismissError}
                onRetry={handleRetry}
                retryCount={retryCount}
                isOnline={isOnline}
              />
            )}
          </AnimatePresence>

          {/* Current Step */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
          >
            {CurrentStepComponent && (
              <CurrentStepComponent
                bookingData={bookingData}
                onNext={handleNext}
                onPrevious={handlePrevious}
                loading={loading}
                user={user}
                isOnline={isOnline}
              />
            )}
          </motion.div>

          {/* Navigation */}
          <NavigationControls
            currentStep={currentStep}
            totalSteps={bookingSteps.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
            loading={loading}
            canGoNext={bookingManager.canProceedTo(bookingSteps[currentStep + 1]?.id)}
            isLastStep={currentStep === bookingSteps.length - 1}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Supporting Components
const SystemStatusHeader = ({ systemHealth, isOnline, onDiagnosticsToggle, onRetry, onClose }) => (
  <div className="bg-white border-b border-gray-200 px-6 py-4">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-gray-900">Smart Booking System</h1>
        <RealtimeStatusIndicator
          status={systemHealth.realtime}
          lastUpdate={new Date()}
          isConnecting={systemHealth.realtime === 'connecting'}
          isOffline={!isOnline}
        />
      </div>

      <div className="flex items-center space-x-3">
        {/* Status Indicators */}
        <div className="flex items-center space-x-2">
          <StatusIndicator label="API" status={systemHealth.api} />
          <StatusIndicator label="Network" status={systemHealth.network} />
        </div>

        {/* Action Buttons */}
        <button
          onClick={onDiagnosticsToggle}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  </div>
);

const StatusIndicator = ({ label, status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
      case 'operational':
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'degraded':
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'disconnected':
      case 'offline':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
        {status}
      </span>
    </div>
  );
};

const ProgressBar = ({ steps, currentStep, progress, onStepClick }) => (
  <div className="mb-8">
    {/* Progress Bar */}
    <div className="relative">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
      
      {/* Step Indicators */}
      <div className="flex justify-between mt-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={`
                relative flex flex-col items-center group
                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {/* Step Circle */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isCurrent 
                    ? 'bg-blue-500 text-white ring-4 ring-blue-100' 
                    : 'bg-gray-200 text-gray-500'
                }
                ${isClickable ? 'hover:scale-105' : ''}
              `}>
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* Step Label */}
              <div className="mt-2 text-center">
                <p className={`text-xs font-medium ${
                  isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">{step.estimatedTime}</p>
              </div>

              {/* Tooltip */}
              {isClickable && (
                <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Go back to {step.title}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

const ErrorDisplay = ({ error, onDismiss, onRetry, retryCount, isOnline }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
  >
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <p className="text-sm text-red-700 mt-1">{error}</p>
        
        {!isOnline && (
          <p className="text-sm text-red-600 mt-2">
            You appear to be offline. Your changes will be saved and synced when you reconnect.
          </p>
        )}
        
        {retryCount > 0 && (
          <p className="text-sm text-red-600 mt-2">
            Retry attempts: {retryCount}
          </p>
        )}
      </div>
      
      <div className="ml-auto pl-3">
        <div className="flex space-x-2">
          {onRetry && isOnline && (
            <button
              onClick={onRetry}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Retry
            </button>
          )}
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

const NavigationControls = ({ 
  currentStep, 
  totalSteps, 
  onPrevious, 
  onNext, 
  loading, 
  canGoNext, 
  isLastStep 
}) => (
  <div className="flex justify-between items-center mt-8">
    <button
      onClick={onPrevious}
      disabled={currentStep === 0 || loading}
      className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span>Previous</span>
    </button>

    <div className="text-sm text-gray-500">
      Step {currentStep + 1} of {totalSteps}
    </div>

    <button
      onClick={onNext}
      disabled={!canGoNext || loading}
      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center space-x-2"
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <span>{isLastStep ? 'Complete Booking' : 'Next'}</span>
      {!isLastStep && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  </div>
);

const LoadingState = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  </div>
);

const DiagnosticsPanel = ({ systemHealth, onClose, onHealthCheck }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    className="bg-gray-50 border-b border-gray-200"
  >
    <div className="max-w-6xl mx-auto px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Diagnostics</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DiagnosticCard title="API Service" status={systemHealth.api} />
        <DiagnosticCard title="Real-time" status={systemHealth.realtime} />
        <DiagnosticCard title="Network" status={systemHealth.network} />
      </div>
      
      <div className="mt-4">
        <button
          onClick={onHealthCheck}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Run Health Check
        </button>
      </div>
    </div>
  </motion.div>
);

const DiagnosticCard = ({ title, status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'operational':
      case 'connected':
      case 'online':
        return { color: 'green', icon: '✓', text: 'Healthy' };
      case 'degraded':
      case 'connecting':
        return { color: 'yellow', icon: '⚠', text: 'Warning' };
      case 'error':
      case 'disconnected':
      case 'offline':
        return { color: 'red', icon: '✗', text: 'Error' };
      default:
        return { color: 'gray', icon: '?', text: 'Unknown' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <div className={`flex items-center space-x-2 text-${config.color}-600`}>
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium">{config.text}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductionBookingSystem;
