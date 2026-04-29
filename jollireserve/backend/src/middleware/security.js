/**
 * Security Middleware
 * Phase 1: Emergency Security Lockdown
 * 
 * Implements:
 * - Tiered rate limiting
 * - Input validation & sanitization
 * - Security headers
 * - Request size limits
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const Joi = require('joi');
const xss = require('xss');

// In-memory store for rate limiting (use Redis in production)
const requestStore = new Map();

/**
 * Clean up old entries from rate limit store periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestStore.entries()) {
    if (now - data.resetTime > 900000) { // 15 minutes
      requestStore.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Tier 1: General API Rate Limiting
 * 100 requests per 15 minutes per IP
 */
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    console.warn(`[Security] Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Tier 2: Auth Endpoints Rate Limiting
 * 10 requests per minute (prevent brute force)
 */
const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    console.warn(`[Security] Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Tier 3: Booking Creation Rate Limiting
 * 5 bookings per hour per user
 */
const bookingRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 bookings per hour
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user ? `booking:${req.user.id}` : `booking:ip:${req.ip}`;
  },
  message: {
    error: 'Booking limit reached. Maximum 5 bookings per hour.',
    code: 'BOOKING_RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    const identifier = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    console.warn(`[Security] Booking rate limit exceeded for ${identifier}`);
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Tier 4: Slow Down (progressive delay)
 * Add delay after 50 requests to discourage abuse
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests at full speed
  delayMs: 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 5000, // maximum delay of 5 seconds
});

/**
 * Security headers middleware
 * Uses Helmet with custom configuration
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (needed for styled-components, etc.)
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for compatibility
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Input sanitization middleware
 * Prevents XSS attacks by sanitizing all string inputs
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return xss(obj, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
      });
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

/**
 * Request validation middleware factory
 * Uses Joi schemas for validation
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Report all validation errors
      stripUnknown: true, // Remove unknown properties
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.warn(`[Security] Validation failed for ${req.method} ${req.path}:`, errors);
      
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // Replace body with validated value
    req.body = value;
    next();
  };
};

/**
 * Common validation schemas
 */
const validationSchemas = {
  // Reservation creation
  createReservation: Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
      .messages({
        'string.pattern.base': 'Date must be in YYYY-MM-DD format'
      }),
    time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
      .messages({
        'string.pattern.base': 'Time must be in HH:MM format'
      }),
    party_size: Joi.number().integer().min(1).max(20).required()
      .messages({
        'number.min': 'Party size must be at least 1',
        'number.max': 'Party size cannot exceed 20'
      }),
    area_pref: Joi.string().max(50).optional(),
    special_requests: Joi.string().max(500).optional(),
    pre_order_items: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().max(100).required(),
        price: Joi.number().positive().required(),
        quantity: Joi.number().integer().min(1).max(20).required()
      })
    ).optional()
  }),

  // User registration
  register: Joi.object({
    email: Joi.string().email().required().lowercase().max(255),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      }),
    name: Joi.string().min(2).max(100).required()
  }),

  // Login
  login: Joi.object({
    email: Joi.string().email().required().lowercase(),
    password: Joi.string().required()
  })
};

/**
 * NoSQL injection prevention
 * Checks for dangerous operators in request body
 */
const preventNoSQLInjection = (req, res, next) => {
  const dangerousKeys = ['$where', '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin', '$regex', '$options'];
  
  const checkObject = (obj, path = '') => {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check for dangerous keys
      if (dangerousKeys.some(dk => key.includes(dk))) {
        console.error(`[Security] NoSQL injection attempt detected: ${currentPath}`);
        throw new Error(`Invalid key: ${key}`);
      }
      
      // Check for prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        console.error(`[Security] Prototype pollution attempt detected: ${currentPath}`);
        throw new Error(`Invalid key: ${key}`);
      }
      
      // Recursively check nested objects
      if (typeof value === 'object') {
        checkObject(value, currentPath);
      }
    }
  };

  try {
    if (req.body) checkObject(req.body);
    if (req.query) checkObject(req.query);
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid request data',
      code: 'INVALID_INPUT'
    });
  }
};

/**
 * Request size limiter middleware
 * Prevents large payload attacks
 */
const requestSizeLimiter = (maxSize = '2mb') => {
  const sizeInBytes = parseInt(maxSize) * (maxSize.includes('mb') ? 1024 * 1024 : 1024);
  
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || 0);
    
    if (contentLength > sizeInBytes) {
      console.warn(`[Security] Request size exceeded: ${contentLength} bytes (max: ${sizeInBytes})`);
      return res.status(413).json({
        error: `Request entity too large. Maximum size: ${maxSize}`,
        code: 'PAYLOAD_TOO_LARGE'
      });
    }
    
    next();
  };
};

/**
 * IP whitelist middleware (for admin endpoints)
 */
const ipWhitelist = (allowedIPs) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      console.error(`[Security] Unauthorized IP access attempt: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        code: 'IP_NOT_ALLOWED'
      });
    }
    
    next();
  };
};

module.exports = {
  // Rate limiting
  generalRateLimit,
  authRateLimit,
  bookingRateLimit,
  speedLimiter,
  
  // Security headers
  securityHeaders,
  
  // Input processing
  sanitizeInput,
  preventNoSQLInjection,
  requestSizeLimiter,
  
  // Validation
  validateRequest,
  validationSchemas,
  
  // Access control
  ipWhitelist,
  
  // For testing
  requestStore
};
