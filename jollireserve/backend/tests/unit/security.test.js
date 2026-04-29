/**
 * Security Middleware Tests
 * Phase 1: Emergency Security - Verify security protections
 */

const request = require('supertest');
const express = require('express');
const {
  securityHeaders,
  sanitizeInput,
  preventNoSQLInjection,
  requestSizeLimiter,
  validateRequest,
  validationSchemas
} = require('../../src/middleware/security');

describe('🛡️ Security Middleware Tests', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });
  
  describe('✅ Security Headers (Helmet)', () => {
    test('should set X-Content-Type-Options to nosniff', async () => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => res.json({ ok: true }));
      
      const response = await request(app).get('/test');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
    
    test('should set X-Frame-Options to DENY', async () => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => res.json({ ok: true }));
      
      const response = await request(app).get('/test');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
    
    test('should set Content-Security-Policy', async () => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => res.json({ ok: true }));
      
      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });
  
  describe('✅ XSS Sanitization', () => {
    test('should sanitize script tags from input', async () => {
      app.use(sanitizeInput);
      app.post('/test', (req, res) => res.json({ received: req.body }));
      
      const response = await request(app)
        .post('/test')
        .send({
          name: '<script>alert("xss")</script>John',
          message: 'Hello <img src=x onerror=alert(1)>'
        });
      
      expect(response.body.received.name).not.toContain('<script>');
      expect(response.body.received.message).not.toContain('onerror');
    });
    
    test('should sanitize nested object properties', async () => {
      app.use(sanitizeInput);
      app.post('/test', (req, res) => res.json({ received: req.body }));
      
      const response = await request(app)
        .post('/test')
        .send({
          user: {
            name: '<script>alert(1)</script>',
            nested: {
              bio: '<iframe src="evil.com"></iframe>'
            }
          }
        });
      
      expect(response.body.received.user.name).not.toContain('<script>');
      expect(response.body.received.user.nested.bio).not.toContain('<iframe');
    });
    
    test('should allow safe HTML-like text', async () => {
      app.use(sanitizeInput);
      app.post('/test', (req, res) => res.json({ received: req.body }));
      
      const response = await request(app)
        .post('/test')
        .send({
          message: 'I want a table near <the window>' // Not actual HTML
        });
      
      expect(response.body.received.message).toBe('I want a table near <the window>');
    });
  });
  
  describe('✅ NoSQL Injection Prevention', () => {
    test('should block $where operator', async () => {
      app.use(preventNoSQLInjection);
      app.post('/test', (req, res) => res.json({ ok: true }));
      
      const response = await request(app)
        .post('/test')
        .send({
          $where: 'this.password.length > 0'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });
    
    test('should block $gt operator', async () => {
      app.use(preventNoSQLInjection);
      app.post('/test', (req, res) => res.json({ ok: true }));
      
      const response = await request(app)
        .post('/test')
        .send({
          age: { $gt: 0 }
        });
      
      expect(response.status).toBe(400);
    });
    
    test('should block prototype pollution attempts', async () => {
      app.use(preventNoSQLInjection);
      app.post('/test', (req, res) => res.json({ ok: true }));
      
      const response = await request(app)
        .post('/test')
        .send({
          __proto__: { isAdmin: true }
        });
      
      expect(response.status).toBe(400);
    });
    
    test('should allow normal requests', async () => {
      app.use(preventNoSQLInjection);
      app.post('/test', (req, res) => res.json({ received: req.body }));
      
      const response = await request(app)
        .post('/test')
        .send({
          name: 'John Doe',
          age: 30,
          preferences: ['indoor', 'quiet']
        });
      
      expect(response.status).toBe(200);
      expect(response.body.received.name).toBe('John Doe');
    });
  });
  
  describe('✅ Request Size Limiting', () => {
    test('should accept requests under size limit', async () => {
      app.use(requestSizeLimiter('1kb'));
      app.post('/test', (req, res) => res.json({ ok: true }));
      
      const response = await request(app)
        .post('/test')
        .send({ small: 'data' });
      
      expect(response.status).toBe(200);
    });
    
    test('should reject requests exceeding size limit', async () => {
      app.use(requestSizeLimiter('1b')); // Very small limit for testing
      app.post('/test', (req, res) => res.json({ ok: true }));
      
      const response = await request(app)
        .post('/test')
        .set('Content-Length', '1000')
        .send({ data: 'x'.repeat(1000) });
      
      expect(response.status).toBe(413);
      expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });
  
  describe('✅ Input Validation (Joi)', () => {
    test('should validate reservation schema', async () => {
      app.use(validateRequest(validationSchemas.createReservation));
      app.post('/reservations', (req, res) => res.json({ ok: true }));
      
      const response = await request(app)
        .post('/reservations')
        .send({
          date: '2026-05-01',
          time: '19:00',
          party_size: 4
        });
      
      expect(response.status).toBe(200);
    });
    
    test('should reject invalid date format', async () => {
      app.use(validateRequest(validationSchemas.createReservation));
      app.post('/reservations', (req, res) => res.json({ ok: true }));
      
      const response = await request(app)
        .post('/reservations')
        .send({
          date: '05-01-2026', // Wrong format
          time: '19:00',
          party_size: 4
        });
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
    
    test('should reject party size exceeding maximum', async () => {
      app.use(validateRequest(validationSchemas.createReservation));
      app.post('/reservations', (req, res) => res.json({ ok: true }));
      
      const response = await request(app)
        .post('/reservations')
        .send({
          date: '2026-05-01',
          time: '19:00',
          party_size: 50 // Too large
        });
      
      expect(response.status).toBe(400);
    });
    
    test('should reject invalid time format', async () => {
      app.use(validateRequest(validationSchemas.createReservation));
      app.post('/reservations', (req, res) => res.json({ ok: true }));
      
      const response = await request(app)
        .post('/reservations')
        .send({
          date: '2026-05-01',
          time: '7 PM', // Wrong format
          party_size: 4
        });
      
      expect(response.status).toBe(400);
    });
    
    test('should strip unknown properties', async () => {
      app.use(validateRequest(validationSchemas.createReservation));
      app.post('/reservations', (req, res) => res.json({ received: req.body }));
      
      const response = await request(app)
        .post('/reservations')
        .send({
          date: '2026-05-01',
          time: '19:00',
          party_size: 4,
          malicious_field: 'should be removed',
          __proto__: { admin: true }
        });
      
      expect(response.body.received.malicious_field).toBeUndefined();
    });
  });
  
  describe('🎯 Security Integration Test', () => {
    test('should apply all security layers in order', async () => {
      // Setup full security stack
      app.use(securityHeaders);
      app.use(sanitizeInput);
      app.use(preventNoSQLInjection);
      app.use(requestSizeLimiter('2mb'));
      
      app.post('/reservations', (req, res) => {
        res.json({ 
          ok: true, 
          sanitized: req.body,
          headers: res.getHeaders()
        });
      });
      
      const response = await request(app)
        .post('/reservations')
        .send({
          date: '2026-05-01',
          time: '19:00',
          party_size: 4,
          special_requests: '<script>alert(1)</script>Near window',
          metadata: {
            $gt: 'attempt',
            __proto__: { hack: true }
          }
        });
      
      // Should pass security but with sanitized data
      expect(response.status).toBe(200);
      // XSS sanitized
      expect(response.body.sanitized.special_requests).not.toContain('<script>');
      // NoSQL injection blocked
      expect(response.body.sanitized.metadata).toBeUndefined();
      // Security headers set
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
