/**
 * Typed Error Hierarchy
 * Senior Engineering Policy: Comprehensive Error Handling v1.0
 * 
 * Domain-specific error types for type-safe error handling,
 * structured logs, and consistent HTTP status mapping.
 */

/**
 * Base Application Error
 * All domain errors extend this class
 */
export class AppError extends Error {
  constructor(
    message,
    code,
    statusHint = 500,
    context = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusHint = statusHint;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for logging/monitoring
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusHint: this.statusHint,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Create user-friendly error message
   */
  toUserMessage() {
    return this.message;
  }
}

/**
 * Validation Error - 400 Bad Request
 * Input validation failures
 */
export class ValidationError extends AppError {
  constructor(fields = {}, message = 'Validation failed') {
    super(message, 'VALIDATION_FAILED', 400, { fields });
    this.name = 'ValidationError';
    this.fields = fields;
  }

  toUserMessage() {
    const fieldErrors = Object.entries(this.fields)
      .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
      .join('; ');
    return fieldErrors || this.message;
  }
}

/**
 * Not Found Error - 404 Not Found
 * Resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource, identifier, message = null) {
    super(
      message || `${resource} not found`,
      'NOT_FOUND',
      404,
      { resource, identifier }
    );
    this.name = 'NotFoundError';
    this.resource = resource;
    this.identifier = identifier;
  }

  toUserMessage() {
    return `The requested ${this.resource.toLowerCase()} could not be found.`;
  }
}

/**
 * Unauthorized Error - 401 Unauthorized
 * Authentication required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(reason = 'Authentication required') {
    super(reason, 'UNAUTHORIZED', 401, { reason });
    this.name = 'UnauthorizedError';
    this.reason = reason;
  }

  toUserMessage() {
    return 'Your session has expired. Please sign in again.';
  }
}

/**
 * Forbidden Error - 403 Forbidden
 * Authenticated but not authorized
 */
export class ForbiddenError extends AppError {
  constructor(action, resource) {
    super(
      `Cannot ${action} ${resource}`,
      'FORBIDDEN',
      403,
      { action, resource }
    );
    this.name = 'ForbiddenError';
    this.action = action;
    this.resource = resource;
  }

  toUserMessage() {
    return 'You do not have permission to perform this action.';
  }
}

/**
 * Network Error
 * Connection issues, timeouts
 */
export class NetworkError extends AppError {
  constructor(originalError, url = null) {
    super(
      'Network request failed',
      'NETWORK_ERROR',
      0,
      { 
        originalMessage: originalError?.message,
        url,
        type: originalError?.name
      }
    );
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.url = url;
  }

  toUserMessage() {
    return 'Could not connect. Check your connection and try again.';
  }
}

/**
 * Timeout Error
 * Request took too long
 */
export class TimeoutError extends AppError {
  constructor(timeout, url = null) {
    super(
      `Request timed out after ${timeout}ms`,
      'TIMEOUT',
      408,
      { timeout, url }
    );
    this.name = 'TimeoutError';
    this.timeout = timeout;
    this.url = url;
  }

  toUserMessage() {
    return 'The request took too long. Please try again.';
  }
}

/**
 * Conflict Error - 409 Conflict
 * Resource already exists or concurrent modification
 */
export class ConflictError extends AppError {
  constructor(resource, identifier, message = null) {
    super(
      message || `${resource} already exists`,
      'CONFLICT',
      409,
      { resource, identifier }
    );
    this.name = 'ConflictError';
    this.resource = resource;
    this.identifier = identifier;
  }

  toUserMessage() {
    return `This ${this.resource.toLowerCase()} already exists or was modified.`;
  }
}

/**
 * External Service Error
 * Third-party API failures
 */
export class ExternalServiceError extends AppError {
  constructor(service, originalError, context = {}) {
    super(
      `${service} service unavailable`,
      'EXTERNAL_SERVICE_ERROR',
      503,
      { 
        service,
        originalMessage: originalError?.message,
        ...context
      }
    );
    this.name = 'ExternalServiceError';
    this.service = service;
    this.originalError = originalError;
  }

  toUserMessage() {
    return 'Something went wrong on our end. Please try again in a moment.';
  }
}

/**
 * Rate Limit Error - 429 Too Many Requests
 * Throttling
 */
export class RateLimitError extends AppError {
  constructor(retryAfter = null) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT',
      429,
      { retryAfter }
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toUserMessage() {
    return 'Too many requests. Please wait a moment and try again.';
  }
}

/**
 * Booking Error - Domain-specific
 * Booking-related failures
 */
export class BookingError extends AppError {
  constructor(code, bookingId, context = {}) {
    const messages = {
      'BOOKING_NOT_FOUND': 'Booking not found',
      'BOOKING_CANCELLED': 'Booking has been cancelled',
      'BOOKING_CONFLICT': 'Time slot no longer available',
      'BOOKING_EXPIRED': 'Booking session expired',
      'PAYMENT_FAILED': 'Payment processing failed',
      'INVALID_STATUS': 'Invalid booking status transition'
    };
    
    super(
      messages[code] || 'Booking operation failed',
      code,
      400,
      { bookingId, ...context }
    );
    this.name = 'BookingError';
    this.bookingId = bookingId;
  }
}

/**
 * Error Code Enum for type safety
 */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONFLICT: 'CONFLICT',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  BOOKING_EXPIRED: 'BOOKING_EXPIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVALID_STATUS: 'INVALID_STATUS',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Error Factory - Convert any error to typed error
 */
export function toAppError(error, context = {}) {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }
  
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new NetworkError(error, context.url);
  }
  
  if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
    return new TimeoutError(context.timeout || 5000, context.url);
  }
  
  // HTTP status based errors
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    
    switch (status) {
      case 400:
        return new ValidationError(error.fields || {}, error.message);
      case 401:
        return new UnauthorizedError(error.message);
      case 403:
        return new ForbiddenError(context.action, context.resource);
      case 404:
        return new NotFoundError(context.resource || 'Resource', context.identifier);
      case 409:
        return new ConflictError(context.resource || 'Resource', context.identifier);
      case 429:
        return new RateLimitError(error.retryAfter);
      case 503:
        return new ExternalServiceError(context.service || 'External', error);
      default:
        return new AppError(
          error.message || 'An unexpected error occurred',
          ErrorCode.UNKNOWN,
          status,
          { originalError: error.message, ...context }
        );
    }
  }
  
  // Default: wrap in generic AppError
  return new AppError(
    error.message || 'An unexpected error occurred',
    ErrorCode.UNKNOWN,
    500,
    { originalError: error.message, ...context }
  );
}

/**
 * Logger utility for structured error logging
 */
export const errorLogger = {
  error: (message, error, context = {}) => {
    const logEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error instanceof AppError ? error.toJSON() : {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service (Sentry, LogRocket, etc.)
      console.error('[ERROR]', JSON.stringify(logEntry));
    } else {
      console.error('[ERROR]', logEntry);
    }
  },
  
  warn: (message, context = {}) => {
    console.warn('[WARN]', { message, timestamp: new Date().toISOString(), ...context });
  },
  
  info: (message, context = {}) => {
    console.info('[INFO]', { message, timestamp: new Date().toISOString(), ...context });
  }
};

/**
 * Async wrapper with error handling
 * Ensures all errors are caught and converted to typed errors
 */
export async function withErrorHandling(asyncFn, errorContext = {}) {
  try {
    return await asyncFn();
  } catch (error) {
    const typedError = toAppError(error, errorContext);
    
    // Log with context
    errorLogger.error(
      `Operation failed: ${errorContext.operation || 'unknown'}`,
      typedError,
      errorContext
    );
    
    throw typedError;
  }
}

export default {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  NetworkError,
  TimeoutError,
  ConflictError,
  ExternalServiceError,
  RateLimitError,
  BookingError,
  ErrorCode,
  toAppError,
  errorLogger,
  withErrorHandling
};
