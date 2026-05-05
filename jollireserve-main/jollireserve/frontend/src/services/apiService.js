// Enhanced API Service with retry logic, circuit breaker, and comprehensive error handling
import { bookingManager } from './bookingStateManager';
import { 
  AppError, 
  NetworkError, 
  TimeoutError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ExternalServiceError,
  toAppError,
  errorLogger,
  withErrorHandling,
  ErrorCode 
} from '../utils/errors';

// Custom error class for API errors (maintaining backward compatibility)
export class APIError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Circuit breaker implementation
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = Date.now();
    this.monitoringCallbacks = new Set();
  }

  // Subscribe to circuit breaker state changes
  onStateChange(callback) {
    this.monitoringCallbacks.add(callback);
    return () => this.monitoringCallbacks.delete(callback);
  }

  // Notify state change
  notifyStateChange() {
    this.monitoringCallbacks.forEach(callback => {
      try {
        callback(this.state, this.failureCount);
      } catch (error) {
        console.error('Circuit breaker callback error:', error);
      }
    });
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new APIError(503, 'Circuit breaker is OPEN - service temporarily unavailable');
      }
      this.state = 'HALF_OPEN';
      this.notifyStateChange();
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      this.notifyStateChange();
    }
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      this.notifyStateChange();
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.notifyStateChange();
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt
    };
  }
}

// Enhanced API Service
export class APIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      retryableErrors: [408, 429, 500, 502, 503, 504]
    };
    this.circuitBreaker = new CircuitBreaker();
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.eventEmitter = new Map();
    
    // Setup circuit breaker monitoring
    this.circuitBreaker.onStateChange((state, failureCount) => {
      this.emit('circuitBreaker:stateChange', { state, failureCount });
    });
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.eventEmitter.has(event)) {
      this.eventEmitter.set(event, new Set());
    }
    this.eventEmitter.get(event).add(callback);
  }

  emit(event, data) {
    const callbacks = this.eventEmitter.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Add request interceptor
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // Get auth token
  getAuthToken() {
    try {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }

  // Enhanced fetch with retry logic and circuit breaker
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: 10000,
      ...options
    };

    return this.circuitBreaker.execute(async () => {
      return this.executeWithRetry(url, config);
    });
  }

  async executeWithRetry(url, config, attempt = 1) {
    // ASSUMPTION: url is always a valid string starting with http
    // If url is malformed, fetch will throw TypeError which we'll catch
    
    const requestId = this.generateRequestId();
    const errorContext = {
      operation: 'api_request',
      url,
      requestId,
      attempt,
      maxRetries: this.retryConfig.maxRetries,
      timeout: config.timeout
    };

    try {
      // Apply request interceptors
      let finalConfig = config;
      for (const interceptor of this.requestInterceptors) {
        finalConfig = await interceptor(finalConfig);
      }

      // Set up timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 10000);

      const response = await fetch(url, {
        ...finalConfig,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : '',
          'X-Client-Version': '1.0.0',
          'X-Request-ID': requestId,
          ...finalConfig.headers
        }
      });

      // Clear timeout on success
      clearTimeout(timeoutId);

      // Apply response interceptors
      let processedResponse = response;
      for (const interceptor of this.responseInterceptors) {
        processedResponse = await interceptor(processedResponse);
      }

      // Handle HTTP errors with typed errors
      if (!processedResponse.ok) {
        const errorBody = await processedResponse.clone().json().catch(() => null);
        
        // Map HTTP status to typed error
        let typedError;
        const status = processedResponse.status;
        const endpoint = url.replace(this.baseURL, '');
        
        switch (status) {
          case 400:
            typedError = new ValidationError(
              errorBody?.fields || {},
              errorBody?.message || 'Invalid request'
            );
            break;
          case 401:
            typedError = new UnauthorizedError(
              errorBody?.message || 'Session expired'
            );
            break;
          case 404:
            typedError = new NotFoundError(
              'Resource',
              errorBody?.id || endpoint,
              errorBody?.message
            );
            break;
          case 409:
            typedError = new ConflictError(
              'Resource',
              errorBody?.id,
              errorBody?.message
            );
            break;
          case 503:
          case 502:
          case 504:
            typedError = new ExternalServiceError(
              'Backend API',
              new Error(`HTTP ${status}: ${processedResponse.statusText}`),
              { endpoint, status }
            );
            break;
          default:
            typedError = new AppError(
              errorBody?.message || `Request failed with status ${status}`,
              ErrorCode.UNKNOWN,
              status,
              { endpoint, statusText: processedResponse.statusText, body: errorBody }
            );
        }
        
        throw typedError;
      }

      const result = await processedResponse.json();
      
      // Emit success event
      this.emit('request:success', { 
        url, 
        status: processedResponse.status, 
        attempt,
        requestId
      });

      return result;

    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      // Convert to typed error if not already
      const typedError = toAppError(error, errorContext);
      
      // Log error with full context (Senior Engineer Policy: Never swallow errors)
      errorLogger.error('API request failed', typedError, {
        ...errorContext,
        userAgent: navigator.userAgent,
        online: navigator.onLine
      });
      
      // Emit error event for UI handling
      const willRetry = this.shouldRetry(error) && attempt < this.retryConfig.maxRetries;
      this.emit('request:error', { 
        url, 
        error: typedError,
        originalError: error,
        attempt,
        willRetry,
        requestId,
        userMessage: typedError.toUserMessage()
      });

      // Retry on network errors or retryable HTTP errors
      if (willRetry) {
        const delay = this.retryConfig.retryDelay * 
          Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        
        errorLogger.warn(`Retrying request after ${delay}ms`, {
          url,
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries
        });
        
        await this.sleep(delay);
        return this.executeWithRetry(url, config, attempt + 1);
      }
      
      // Final error - throw typed error
      throw typedError;
    }
  }

  // Check if error is retryable
  shouldRetry(error) {
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return true; // Network errors
    }
    
    if (error instanceof APIError) {
      return this.retryConfig.retryableErrors.includes(error.status);
    }
    
    return false;
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate unique request ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Optimistic booking creation with rollback
  async createBooking(bookingData) {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Optimistic update
    const optimisticBooking = {
      ...bookingData,
      id: tempId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // Notify booking manager of optimistic update
    bookingManager.emit('booking:optimistic', optimisticBooking);

    try {
      const result = await this.request('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });

      // Replace optimistic update with real data
      bookingManager.emit('booking:confirmed', { 
        tempId, 
        realData: result 
      });

      this.emit('booking:created', result);
      return result;

    } catch (error) {
      // Rollback optimistic update
      bookingManager.emit('booking:failed', { tempId, error });
      this.emit('booking:failed', { tempId, error });
      throw error;
    }
  }

  // Update booking with optimistic updates
  async updateBooking(bookingId, updateData) {
    // Store original data for rollback
    const originalData = { ...bookingManager.bookingData };
    
    // Optimistic update
    bookingManager.bookingData = { ...bookingManager.bookingData, ...updateData };
    bookingManager.emit('booking:optimisticUpdate', { bookingId, updateData });

    try {
      const result = await this.request(`/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      this.emit('booking:updated', result);
      return result;

    } catch (error) {
      // Rollback optimistic update
      bookingManager.bookingData = originalData;
      bookingManager.emit('booking:updateFailed', { bookingId, error });
      throw error;
    }
  }

  // Cancel booking
  async cancelBooking(bookingId, reason = '') {
    try {
      const result = await this.request(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      this.emit('booking:cancelled', result);
      return result;

    } catch (error) {
      this.emit('booking:cancelFailed', { bookingId, error });
      throw error;
    }
  }

  // Get booking with cache
  async getBooking(bookingId, useCache = true) {
    const cacheKey = `booking_${bookingId}`;
    
    if (useCache) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Cache for 5 minutes
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return data;
          }
        }
      } catch (error) {
        console.warn('Cache read failed:', error);
      }
    }

    try {
      const result = await this.request(`/bookings/${bookingId}`);
      
      // Cache the result
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.warn('Cache write failed:', error);
      }

      return result;

    } catch (error) {
      throw error;
    }
  }

  // Join queue with optimistic update
  async joinQueue(queueData) {
    const tempId = `temp_queue_${Date.now()}`;
    
    // Optimistic update
    const optimisticEntry = {
      ...queueData,
      id: tempId,
      status: 'waiting',
      joinedAt: new Date().toISOString(),
      isOptimistic: true
    };

    bookingManager.emit('queue:optimistic', optimisticEntry);

    try {
      const result = await this.request('/queue/join', {
        method: 'POST',
        body: JSON.stringify(queueData)
      });

      bookingManager.emit('queue:confirmed', { 
        tempId, 
        realData: result 
      });

      this.emit('queue:joined', result);
      return result;

    } catch (error) {
      bookingManager.emit('queue:failed', { tempId, error });
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.request('/health', { 
        timeout: 5000 
      });
      return { status: 'healthy', data: result };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // Get circuit breaker status
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getState();
  }

  // Reset circuit breaker
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
}

// Singleton instance
export const apiService = new APIService();

// Setup default interceptors
apiService.addRequestInterceptor(async (config) => {
  // Add timestamp to all requests
  config.headers = {
    ...config.headers,
    'X-Request-Time': Date.now()
  };
  return config;
});

apiService.addResponseInterceptor(async (response) => {
  // Log slow responses
  const requestTime = response.headers.get('X-Request-Time');
  if (requestTime) {
    const duration = Date.now() - parseInt(requestTime);
    if (duration > 3000) { // 3 seconds
      console.warn(`Slow API response: ${duration}ms`);
    }
  }
  return response;
});

export default apiService;
