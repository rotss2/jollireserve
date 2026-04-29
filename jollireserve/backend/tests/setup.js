/**
 * Test Setup
 * Initialize test environment
 */

// Mock Firebase
jest.mock('../src/firebase', () => ({
  getDb: jest.fn(),
  dbConn: jest.fn()
}));

// Mock WebSocket broadcast
jest.mock('../src/ws', () => ({
  broadcast: jest.fn()
}));

// Mock email service
jest.mock('../src/utils/email', () => ({
  sendMail: jest.fn().mockResolvedValue(true)
}));

// Global test utilities
global.testUtils = {
  /**
   * Create mock Firestore document
   */
  createMockDoc: (data) => ({
    id: data.id || 'test-id',
    exists: true,
    data: () => data
  }),
  
  /**
   * Create mock Firestore query snapshot
   */
  createMockSnapshot: (docs) => ({
    docs: docs.map(doc => ({
      id: doc.id,
      data: () => doc
    })),
    empty: docs.length === 0,
    size: docs.length
  }),
  
  /**
   * Create mock user
   */
  createMockUser: (overrides = {}) => ({
    id: 'user-123',
    email: 'test@test.com',
    name: 'Test User',
    role: 'customer',
    ...overrides
  }),
  
  /**
   * Create mock reservation
   */
  createMockReservation: (overrides = {}) => ({
    id: 'res-123',
    user_id: 'user-123',
    date: '2026-05-01',
    time: '19:00',
    party_size: 4,
    table_id: 'table-1',
    status: 'pending',
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  /**
   * Create mock table
   */
  createMockTable: (overrides = {}) => ({
    id: 'table-1',
    name: 'Table 1',
    capacity: 4,
    area: 'main',
    is_active: true,
    ...overrides
  })
};

// Global beforeAll
beforeAll(() => {
  console.log('🧪 Test environment initialized');
});

// Global afterAll
afterAll(() => {
  console.log('✅ Tests completed');
});
