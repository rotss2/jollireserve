// Booking State Manager - Core state machine for booking flow
export const BOOKING_STATES = {
  INIT: 'init',
  PREFERENCE: 'preference',
  DECISION: 'decision',
  BUILDING: 'building',
  REVIEW: 'review',
  PAYMENT: 'payment',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

export const STATE_TRANSITIONS = {
  [BOOKING_STATES.INIT]: [BOOKING_STATES.PREFERENCE],
  [BOOKING_STATES.PREFERENCE]: [BOOKING_STATES.DECISION],
  [BOOKING_STATES.DECISION]: [BOOKING_STATES.BUILDING, BOOKING_STATES.PREFERENCE],
  [BOOKING_STATES.BUILDING]: [BOOKING_STATES.REVIEW, BOOKING_STATES.DECISION],
  [BOOKING_STATES.REVIEW]: [BOOKING_STATES.PAYMENT, BOOKING_STATES.BUILDING],
  [BOOKING_STATES.PAYMENT]: [BOOKING_STATES.CONFIRMED, BOOKING_STATES.REVIEW],
  [BOOKING_STATES.CONFIRMED]: [BOOKING_STATES.ACTIVE],
  [BOOKING_STATES.ACTIVE]: [BOOKING_STATES.COMPLETED]
};

export class BookingStateManager {
  constructor() {
    this.state = BOOKING_STATES.INIT;
    this.bookingData = {};
    this.listeners = new Map();
    this.validationRules = new Map();
    this.history = [];
    this.maxHistorySize = 10;
    this.setupValidationRules();
  }

  // Subscribe to state changes
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event).delete(callback);
    };
  }

  // Emit events to listeners
  emit(event, data) {
    const callbacks = this.listeners.get(event);
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

  // State transition with validation and rollback
  async transitionTo(newState, data = {}) {
    // Validate state transition
    if (!this.isValidTransition(this.state, newState)) {
      throw new Error(`Invalid transition from ${this.state} to ${newState}`);
    }

    // Validate data for new state
    const validation = await this.validateStateData(newState, data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Save history for rollback
    this.saveHistory();

    // Optimistic update with rollback capability
    const previousState = this.state;
    const previousData = { ...this.bookingData };
    
    try {
      this.state = newState;
      this.bookingData = { ...this.bookingData, ...data };
      
      // Notify listeners
      this.emit('stateChange', { 
        from: previousState, 
        to: newState, 
        data: this.bookingData 
      });
      
      // Persist to backend (if needed)
      await this.persistState();
      
      return true;
      
    } catch (error) {
      // Rollback on failure
      this.state = previousState;
      this.bookingData = previousData;
      this.history.pop(); // Remove the history entry we just added
      
      this.emit('stateChangeFailed', { 
        from: previousState, 
        to: newState, 
        error: error.message 
      });
      
      throw error;
    }
  }

  // Save state to history for rollback
  saveHistory() {
    this.history.push({
      state: this.state,
      data: { ...this.bookingData },
      timestamp: Date.now()
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  // Rollback to previous state
  rollback() {
    if (this.history.length === 0) {
      throw new Error('No history to rollback to');
    }

    const previousState = this.history.pop();
    this.state = previousState.state;
    this.bookingData = previousState.data;

    this.emit('stateRollback', { 
      state: this.state, 
      data: this.bookingData 
    });

    return previousState;
  }

  // Check if transition is valid
  isValidTransition(from, to) {
    const validTransitions = STATE_TRANSITIONS[from];
    return validTransitions && validTransitions.includes(to);
  }

  // Check if can proceed to a state
  canProceedTo(state) {
    return this.isValidTransition(this.state, state);
  }

  // Comprehensive validation system
  async validateStateData(state, data) {
    const rules = this.validationRules.get(state) || [];
    const errors = [];
    
    for (const rule of rules) {
      try {
        const result = await rule.validate(data, this.bookingData);
        if (!result.isValid) {
          errors.push(result.message);
        }
      } catch (error) {
        errors.push(`Validation error: ${error.message}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Setup validation rules for each state
  setupValidationRules() {
    // Preference state validation
    this.validationRules.set(BOOKING_STATES.PREFERENCE, [
      {
        validate: async (data) => {
          if (!data.diningPreference) {
            return { isValid: false, message: 'Please select a dining preference' };
          }
          return { isValid: true };
        }
      }
    ]);

    // Building state validation
    this.validationRules.set(BOOKING_STATES.BUILDING, [
      {
        validate: async (data) => {
          if (!data.date) {
            return { isValid: false, message: 'Date is required' };
          }
          
          const selectedDate = new Date(data.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (selectedDate < today) {
            return { isValid: false, message: 'Date cannot be in the past' };
          }
          
          return { isValid: true };
        }
      },
      {
        validate: async (data) => {
          if (!data.partySize || data.partySize < 1 || data.partySize > 12) {
            return { isValid: false, message: 'Party size must be between 1 and 12' };
          }
          return { isValid: true };
        }
      },
      {
        validate: async (data) => {
          if (!data.time) {
            return { isValid: false, message: 'Time is required' };
          }
          
          const [hours, minutes] = data.time.split(':').map(Number);
          if (isNaN(hours) || isNaN(minutes)) {
            return { isValid: false, message: 'Invalid time format' };
          }
          
          return { isValid: true };
        }
      }
    ]);

    // Payment state validation
    this.validationRules.set(BOOKING_STATES.PAYMENT, [
      {
        validate: async (data) => {
          if (!data.paymentMethod) {
            return { isValid: false, message: 'Please select a payment method' };
          }
          return { isValid: true };
        }
      }
    ]);
  }

  // Persist state to backend/localStorage
  async persistState() {
    try {
      // Save to localStorage for recovery
      const sessionData = {
        state: this.state,
        bookingData: this.bookingData,
        timestamp: Date.now()
      };
      
      localStorage.setItem('booking_session', JSON.stringify(sessionData));
      
      // Also emit for backend persistence
      this.emit('persistState', sessionData);
      
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }

  // Restore state from storage
  async restoreState() {
    try {
      const stored = localStorage.getItem('booking_session');
      if (!stored) return false;

      const sessionData = JSON.parse(stored);
      
      // Check if session is too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - sessionData.timestamp > maxAge) {
        localStorage.removeItem('booking_session');
        return false;
      }

      this.state = sessionData.state;
      this.bookingData = sessionData.bookingData;
      
      this.emit('stateRestored', { 
        state: this.state, 
        data: this.bookingData 
      });
      
      return true;
      
    } catch (error) {
      console.warn('Failed to restore state:', error);
      return false;
    }
  }

  // Clear all state
  clear() {
    this.state = BOOKING_STATES.INIT;
    this.bookingData = {};
    this.history = [];
    
    try {
      localStorage.removeItem('booking_session');
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
    
    this.emit('stateCleared');
  }

  // Get current state info
  getStateInfo() {
    return {
      state: this.state,
      data: { ...this.bookingData },
      canRollback: this.history.length > 0,
      history: [...this.history]
    };
  }

  // Add custom validation rule
  addValidationRule(state, rule) {
    if (!this.validationRules.has(state)) {
      this.validationRules.set(state, []);
    }
    this.validationRules.get(state).push(rule);
  }
}

// Singleton instance
export const bookingManager = new BookingStateManager();
