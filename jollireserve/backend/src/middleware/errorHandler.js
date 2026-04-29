/**
 * Centralized Error Handling Middleware
 * Phase 1: Emergency Security Lockdown
 * 
 * Provides:
 * - Typed error responses
 * - Structured logging
 * - User-friendly error messages
 * - Error tracking ready for Sentry
 */

const { isoNow } = require('../utils/time');

/**
 * Map error types to HTTP status codes and user messages
 */
const errorMappings = {
  // Authentication errors
  UnauthorizedError: { status: 401, message: 'Authentication required. Please log in.' },
  ForbiddenError: { status: 403, message: 'You do not have permission to perform this action.' },
  
  // Resource errors
  NotFoundError: { status: 404, message: 'The requested resource could not be found.' },
  ConflictError: { status: 409, message: 'This resource already exists or was modified.' },
  
  // Validation errors
  ValidationError: { status: 400, message: 'Invalid input. Please check your data and try again.' },
  
  // Transaction/locking errors
  TableLockedError: { status: 423, message: 'This table is currently being reserved by another user. Please try again.' },
  NoAvailableTablesError: { status: 409, message: 'No tables are available for the selected time. Please choose a different time.' },
  
  // Rate limiting
  RateLimitError: { status: 429, message: 'Too many requests. Please slow down and try again later.' },
  
  // Payment errors
  PaymentError: { status: 402, message: 'Payment processing failed. Please check your payment details and try again.' },
  PaymentTimeoutError: { status: 408, message: 'Payment request timed out. Please check if the payment was processed before trying again.' },
  
  // Network/Service errors
  NetworkError: { status: 503, message: 'Service temporarily unavailable. Please try again in a moment.' },
  ExternalServiceError: { status: 503, message: 'An external service is experiencing issues. Please try again later.' },
  
  // Generic
  Error: { status: 500, message: 'An unexpected error occurred. Please try again later.' }
};

/**
 * Generate unique error ID for tracking
 */
function generateErrorId() {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize error for logging (remove sensitive data)
 */
function sanitizeErrorForLogging(error) {
  const sanitized = {
    name: error.name,
    message: error.message,
    code: error.code,
    status: error.status || error.statusCode,
    stack: error.stack
  };
  
  // Remove potentially sensitive fields
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.authorization;
  delete sanitized.creditCard;
  delete sanitized.cvv;
  
  return sanitized;
}

/**
 * Central error handler middleware
 * This should be the LAST middleware in the chain
 */
function errorHandler(err, req, res, next) {
  const errorId = generateErrorId();
  const timestamp = isoNow();
  
  // Get error mapping or use default
  const ErrorClass = err.constructor;
  const mapping = errorMappings[ErrorClass.name] || errorMappings.Error;
  
  // Determine status code (error can override)
  const statusCode = err.status || err.statusCode || mapping.status || 500;
  
  // Build error response
  const errorResponse = {
    error: {
      message: err.userMessage || mapping.message || err.message || 'An error occurred',
      code: err.code || ErrorClass.name || 'INTERNAL_ERROR',
      error_id: errorId,
      timestamp,
      // Include validation errors if present
      ...(err.details && { details: err.details }),
      // Include suggestion if present
      ...(err.suggestion && { suggestion: err.suggestion })
    }
  };
  
  // Structured logging for monitoring
  const logEntry = {
    level: statusCode >= 500 ? 'error' : 'warn',
    timestamp,
    error_id: errorId,
    error: sanitizeErrorForLogging(err),
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      user_id: req.user?.id || null,
      correlation_id: req.get('X-Request-ID') || req.get('X-Correlation-ID') || null
    },
    response: {
      status_code: statusCode
    }
  };
  
  // Log error
  if (statusCode >= 500) {
    console.error('[ErrorHandler]', JSON.stringify(logEntry, null, 2));
  } else {
    console.warn('[ErrorHandler]', JSON.stringify(logEntry, null, 2));
  }
  
  // In production, send to error tracking service (Sentry, etc.)
  // if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
  //   Sentry.captureException(err, { 
  //     extra: { 
  //       error_id: errorId,
  //       request: logEntry.request 
  //     } 
  //   });
  // }
  
  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
function notFoundHandler(req, res, next) {
  const errorId = generateErrorId();
  
  console.warn('[NotFound]', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    error_id: errorId
  });
  
  res.status(404).json({
    error: {
      message: `Cannot ${req.method} ${req.path}`,
      code: 'ROUTE_NOT_FOUND',
      error_id: errorId,
      timestamp: isoNow()
    }
  });
}

/**
 * Async handler wrapper
 * Catches errors in async route handlers and passes to errorHandler
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom error classes for domain-specific errors
 */
class AppError extends Error {
  constructor(message, code, status = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    this.userMessage = message;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message || 'Validation failed', 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(action = 'perform this action') {
    super(`You do not have permission to ${action}`, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

class PaymentError extends AppError {
  constructor(message = 'Payment processing failed') {
    super(message, 'PAYMENT_ERROR', 402);
    this.name = 'PaymentError';
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message) {
    super(message || `${service} service unavailable`, 'EXTERNAL_SERVICE_ERROR', 503);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

module.exports = {
  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  PaymentError,
  ExternalServiceError,
  
  // Utilities
  generateErrorId,
  sanitizeErrorForLogging,
  errorMappings
};
