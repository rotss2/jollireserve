import React from 'react';

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
    const errorData = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId()
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', errorData);
    }

    // Send to monitoring service (in production)
    try {
      // This would integrate with your error monitoring service
      // like Sentry, LogRocket, or custom endpoint
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(err => {
        console.warn('Failed to log error to service:', err);
      });
    } catch (err) {
      console.warn('Error logging failed:', err);
    }
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
    } finally {
      setIsRecovering(false);
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        {/* Error Message */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          
          <p className="text-gray-600 mb-2">
            We encountered an unexpected error. Don't worry, your work has been saved locally.
          </p>
          
          {errorId && (
            <p className="text-xs text-gray-500">
              Error ID: {errorId}
            </p>
          )}
        </div>

        {/* Recovery Actions */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleRecover}
            disabled={isRecovering}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isRecovering ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Recovering...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recover My Work
              </>
            )}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onRetry}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Try Again
            </button>
            
            <button
              onClick={onReload}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Reload Page
            </button>
          </div>
          
          <button
            onClick={onGoHome}
            className="w-full text-red-600 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors"
          >
            Go to Homepage
          </button>
        </div>

        {/* Error Details (Development Only) */}
        {isDevelopment && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-left text-sm text-gray-600 hover:text-gray-800 flex items-center justify-between"
            >
              <span>Error Details (Development)</span>
              <svg 
                className={`w-4 h-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showDetails && (
              <div className="mt-3 space-y-2">
                <div className="bg-red-50 p-3 rounded text-xs">
                  <strong>Error:</strong> {error?.toString()}
                </div>
                
                {errorInfo?.componentStack && (
                  <div className="bg-yellow-50 p-3 rounded text-xs overflow-x-auto">
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
        <div className="border-t pt-4 mt-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Need help? Contact our support team
            </p>
            <div className="flex justify-center space-x-4">
              <a 
                href="mailto:support@jollibee-reserve.com" 
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Email Support
              </a>
              <span className="text-gray-400">•</span>
              <a 
                href="tel:1-800-JOLLIBEE" 
                className="text-red-600 hover:text-red-700 text-sm"
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
