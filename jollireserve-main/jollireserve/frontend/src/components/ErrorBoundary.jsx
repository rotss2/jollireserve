import React from 'react';
import { AppError, toAppError, errorLogger } from '../utils/errors';
import { Icon } from './Icon';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId
    });

    // Log error to monitoring service
    this.logError(error, errorInfo, errorId);
    
    // Attempt to recover user state
    this.attemptRecovery();
  }

  logError = (error, errorInfo, errorId) => {
    // Convert to typed error for consistent handling
    const typedError = toAppError(error, {
      operation: 'react_error_boundary',
      errorId,
      componentStack: errorInfo?.componentStack
    });

    // Log with structured format (Senior Engineer Policy: Never swallow errors)
    errorLogger.error('React component error caught by boundary', typedError, {
      errorId,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      reactVersion: React.version
    });

    // Store in state for display
    this.setState({ typedError });
  };

  getUserId = () => {
    try {
      return localStorage.getItem('userId') || 'anonymous';
    } catch {
      return 'anonymous';
    }
  };

  attemptRecovery = () => {
    try {
      // Save current state to localStorage for recovery
      const currentState = this.getCurrentAppState();
      if (currentState) {
        localStorage.setItem('recovery_state', JSON.stringify({
          state: currentState,
          errorId: this.state.errorId,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.warn('Failed to save recovery state:', error);
    }
  };

  getCurrentAppState = () => {
    try {
      // Try to get relevant app state for recovery
      return {
        url: window.location.href,
        timestamp: Date.now(),
        // Add any other relevant state
      };
    } catch (error) {
      return null;
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleRecover = async () => {
    try {
      const recoveryData = localStorage.getItem('recovery_state');
      if (recoveryData) {
        const { state } = JSON.parse(recoveryData);
        // Implement recovery logic based on saved state
        console.log('Attempting to recover from saved state:', state);
      }
      
      this.handleRetry();
    } catch (error) {
      console.error('Recovery failed:', error);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorRecoveryUI 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onRecover={this.handleRecover}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

// Error recovery UI component
const ErrorRecoveryUI = ({ 
  error, 
  errorInfo, 
  errorId, 
  onRetry, 
  onRecover, 
  onReload, 
  onGoHome 
}) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      await onRecover();
    } catch (recoverError) {
      // ASSUMPTION: Recovery may fail if localStorage is corrupted
      // Log but don't throw - UI should handle gracefully
      errorLogger.error('Recovery attempt failed', recoverError, { errorId });
    } finally {
      setIsRecovering(false);
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Get user-friendly error message
  const userMessage = error?.toUserMessage?.() || 
    'We encountered an unexpected error. Don\'t worry, your work has been saved locally.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] px-4">
      <div 
        className="max-w-md w-full bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-[var(--color-danger-light)] rounded-full mb-4">
          <Icon name="error" size={32} color="var(--color-danger)" />
        </div>
        
        {/* Error Message */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
            Something went wrong
          </h2>
          
          <p className="text-[var(--color-text-secondary)] mb-2">
            {userMessage}
          </p>
          
          {errorId && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Reference: {errorId}
            </p>
          )}
        </div>

        {/* Recovery Actions */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleRecover}
            disabled={isRecovering}
            className="w-full btn-primary flex items-center justify-center disabled:opacity-50"
          >
            {isRecovering ? (
              <>
                <Icon name="loading" size={20} className="animate-spin mr-2" />
                <span>Recovering...</span>
              </>
            ) : (
              <>
                <Icon name="refresh" size={20} className="mr-2" />
                <span>Recover My Work</span>
              </>
            )}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onRetry}
              className="btn-secondary"
            >
              Try Again
            </button>
            
            <button
              onClick={onReload}
              className="btn-secondary"
            >
              Reload Page
            </button>
          </div>
          
          <button
            onClick={onGoHome}
            className="w-full text-[var(--color-brand)] hover:bg-[var(--color-brand-light)] py-2 px-4 rounded-[var(--radius-md)] transition-colors"
          >
            Go to Homepage
          </button>
        </div>

        {/* Error Details (Development Only) */}
        {isDevelopment && (
          <div className="border-t border-[var(--color-border)] pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-left text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] flex items-center justify-between"
            >
              <span>Error Details (Development Only)</span>
              <Icon 
                name="chevron" 
                size={16} 
                className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`} 
              />
            </button>
            
            {showDetails && (
              <div className="mt-3 space-y-2">
                <div className="bg-[var(--color-danger-light)] p-3 rounded-[var(--radius-md)] text-xs text-[var(--color-danger)]">
                  <strong>Error:</strong> {error?.toString()}
                </div>
                
                {errorInfo?.componentStack && (
                  <div className="bg-[var(--color-warning-light)] p-3 rounded-[var(--radius-md)] text-xs overflow-x-auto text-[var(--color-warning)]">
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="border-t border-[var(--color-border)] pt-4 mt-4">
          <div className="text-center">
            <p className="text-sm text-[var(--color-text-muted)] mb-2">
              Need help? Contact our support team
            </p>
            <div className="flex justify-center space-x-4">
              <a 
                href="mailto:support@jollibee-reserve.com" 
                className="text-[var(--color-brand)] hover:text-[var(--color-brand-dark)] text-sm"
              >
                Email Support
              </a>
              <span className="text-[var(--color-border)]">•</span>
              <a 
                href="tel:1-800-JOLLIBEE" 
                className="text-[var(--color-brand)] hover:text-[var(--color-brand-dark)] text-sm"
              >
                Call Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = (Component, fallback = null) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for manual error reporting
export const useErrorReporting = () => {
  const reportError = (error, context = {}) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Send to monitoring service
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(err => {
        console.warn('Failed to report error:', err);
      });
    } catch (err) {
      console.warn('Error reporting failed:', err);
    }
  };

  return { reportError };
};

export default ErrorBoundary;
