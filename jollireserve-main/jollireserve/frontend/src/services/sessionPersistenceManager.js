// Session Persistence Manager - Handles session state and recovery
export class SessionPersistenceManager {
  constructor() {
    this.sessionKey = 'jollibee_session';
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    this.heartbeatInterval = null;
    this.heartbeatFrequency = 5 * 60 * 1000; // 5 minutes
    this.warningThreshold = 10 * 60 * 1000; // 10 minutes before expiry
    this.subscribers = new Map();
    this.sessionActivity = [];
    this.maxActivityEntries = 50;
    
    // Initialize
    this.initialize();
  }

  initialize() {
    // Clean up expired sessions
    this.cleanupExpiredSessions();
    
    // Start heartbeat if session exists
    const session = this.restoreSessionState();
    if (session) {
      this.startHeartbeat();
    }
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Handle page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  // Save session state with expiration
  saveSessionState(state, options = {}) {
    const sessionData = {
      ...state,
      timestamp: Date.now(),
      expires: Date.now() + (options.maxAge || this.maxAge),
      version: '1.0',
      activity: this.sessionActivity.slice(-10) // Keep last 10 activities
    };

    try {
      // Try localStorage first
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
      
      // Fallback to sessionStorage if localStorage fails
    } catch (error) {
      try {
        sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
      } catch (sessionError) {
        console.warn('Failed to save session to both storage mechanisms:', error);
        this.emit('saveFailed', { error, state });
        return false;
      }
    }

    this.emit('sessionSaved', sessionData);
    return true;
  }

  // Restore session state if valid
  restoreSessionState() {
    try {
      // Try localStorage first
      let stored = localStorage.getItem(this.sessionKey);
      let useSessionStorage = false;
      
      if (!stored) {
        // Try sessionStorage
        stored = sessionStorage.getItem(this.sessionKey);
        useSessionStorage = true;
      }
      
      if (!stored) return null;

      const sessionData = JSON.parse(stored);
      
      // Check if session is expired
      if (Date.now() > sessionData.expires) {
        this.clearSession();
        return null;
      }

      // Validate session structure
      if (!this.validateSessionData(sessionData)) {
        console.warn('Invalid session data structure');
        this.clearSession();
        return null;
      }

      // Restore activity log
      this.sessionActivity = sessionData.activity || [];
      
      // Log session restore activity
      this.logActivity('session_restored', {
        storage: useSessionStorage ? 'sessionStorage' : 'localStorage',
        age: Date.now() - sessionData.timestamp
      });

      this.emit('sessionRestored', sessionData);
      return sessionData;
      
    } catch (error) {
      console.warn('Failed to restore session:', error);
      this.clearSession();
      return null;
    }
  }

  // Validate session data structure
  validateSessionData(data) {
    const requiredFields = ['timestamp', 'expires'];
    return requiredFields.every(field => data.hasOwnProperty(field));
  }

  // Start heartbeat to keep session alive
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      this.extendSession();
    }, this.heartbeatFrequency);
    
    this.emit('heartbeatStarted');
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.emit('heartbeatStopped');
    }
  }

  // Extend session expiration
  extendSession() {
    const session = this.restoreSessionState();
    if (!session) return;

    const newExpiry = Date.now() + this.maxAge;
    const updatedSession = {
      ...session,
      expires: newExpiry,
      lastExtended: Date.now()
    };

    try {
      localStorage.setItem(this.sessionKey, JSON.stringify(updatedSession));
      this.logActivity('session_extended', { newExpiry });
      this.emit('sessionExtended', updatedSession);
    } catch (error) {
      console.warn('Failed to extend session:', error);
    }
  }

  // Handle session timeout gracefully
  handleSessionTimeout(callback) {
    const session = this.restoreSessionState();
    if (!session) return;

    const timeUntilExpiry = session.expires - Date.now();
    
    if (timeUntilExpiry <= 0) {
      callback('expired', 0);
    } else if (timeUntilExpiry <= this.warningThreshold) {
      callback('warning', timeUntilExpiry);
      
      // Schedule final expiry check
      setTimeout(() => {
        const updatedSession = this.restoreSessionState();
        if (updatedSession && Date.now() >= updatedSession.expires) {
          callback('expired', 0);
        }
      }, timeUntilExpiry);
    }
  }

  // Get session information
  getSessionInfo() {
    const session = this.restoreSessionState();
    if (!session) return null;

    const timeUntilExpiry = session.expires - Date.now();
    const isExpired = timeUntilExpiry <= 0;
    const isWarning = timeUntilExpiry <= this.warningThreshold && !isExpired;

    return {
      isValid: !isExpired,
      isExpired,
      isWarning,
      timeUntilExpiry,
      expiresAt: session.expires,
      createdAt: session.timestamp,
      lastExtended: session.lastExtended,
      age: Date.now() - session.timestamp,
      activityCount: this.sessionActivity.length
    };
  }

  // Clear session
  clearSession() {
    try {
      localStorage.removeItem(this.sessionKey);
      sessionStorage.removeItem(this.sessionKey);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
    
    this.stopHeartbeat();
    this.sessionActivity = [];
    
    this.logActivity('session_cleared');
    this.emit('sessionCleared');
  }

  // Log session activity
  logActivity(action, data = {}) {
    const activity = {
      action,
      timestamp: Date.now(),
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.sessionActivity.push(activity);

    // Limit activity log size
    if (this.sessionActivity.length > this.maxActivityEntries) {
      this.sessionActivity = this.sessionActivity.slice(-this.maxActivityEntries);
    }

    // Update session with new activity periodically
    if (this.sessionActivity.length % 5 === 0) {
      const session = this.restoreSessionState();
      if (session) {
        this.saveSessionState(session, { maxAge: session.expires - Date.now() });
      }
    }

    this.emit('activityLogged', activity);
  }

  // Get session activity
  getActivity(limit = 10) {
    return this.sessionActivity.slice(-limit);
  }

  // Handle page visibility changes
  handleVisibilityChange() {
    if (document.hidden) {
      this.logActivity('page_hidden');
      // Reduce heartbeat frequency when page is hidden
      this.stopHeartbeat();
      this.heartbeatFrequency = 10 * 60 * 1000; // 10 minutes
      this.startHeartbeat();
    } else {
      this.logActivity('page_visible');
      // Restore normal heartbeat frequency
      this.heartbeatFrequency = 5 * 60 * 1000; // 5 minutes
      this.startHeartbeat();
    }
  }

  // Handle page unload
  handleBeforeUnload(event) {
    this.logActivity('page_unload');
    
    // Save final session state
    const session = this.restoreSessionState();
    if (session) {
      this.saveSessionState(session, { maxAge: session.expires - Date.now() });
    }
  }

  // Clean up expired sessions
  cleanupExpiredSessions() {
    try {
      // Check localStorage
      const stored = localStorage.getItem(this.sessionKey);
      if (stored) {
        const sessionData = JSON.parse(stored);
        if (Date.now() > sessionData.expires) {
          localStorage.removeItem(this.sessionKey);
          this.logActivity('cleanup_expired_localStorage');
        }
      }

      // Check sessionStorage
      const sessionStored = sessionStorage.getItem(this.sessionKey);
      if (sessionStored) {
        const sessionData = JSON.parse(sessionStored);
        if (Date.now() > sessionData.expires) {
          sessionStorage.removeItem(this.sessionKey);
          this.logActivity('cleanup_expired_sessionStorage');
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup expired sessions:', error);
    }
  }

  // Create new session
  createSession(initialState = {}) {
    const sessionData = {
      ...initialState,
      sessionId: this.generateSessionId(),
      createdAt: Date.now(),
      version: '1.0'
    };

    this.saveSessionState(sessionData);
    this.startHeartbeat();
    this.logActivity('session_created', sessionData);

    return sessionData;
  }

  // Generate unique session ID
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update session data
  updateSession(updates) {
    const session = this.restoreSessionState();
    if (!session) return false;

    const updatedSession = {
      ...session,
      ...updates,
      lastUpdated: Date.now()
    };

    this.saveSessionState(updatedSession);
    this.logActivity('session_updated', updates);

    return true;
  }

  // Check if session exists and is valid
  hasValidSession() {
    const info = this.getSessionInfo();
    return info && info.isValid;
  }

  // Get session age in human readable format
  getSessionAge() {
    const session = this.restoreSessionState();
    if (!session) return null;

    const age = Date.now() - session.timestamp;
    const hours = Math.floor(age / (1000 * 60 * 60));
    const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Get time until expiry in human readable format
  getTimeUntilExpiry() {
    const info = this.getSessionInfo();
    if (!info || info.isExpired) return 'Expired';

    const time = info.timeUntilExpiry;
    const hours = Math.floor(time / (1000 * 60 * 60));
    const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Export session data for backup
  exportSession() {
    const session = this.restoreSessionState();
    if (!session) return null;

    return {
      ...session,
      exportedAt: Date.now(),
      activity: this.sessionActivity
    };
  }

  // Import session data from backup
  importSession(sessionData, options = {}) {
    if (!this.validateSessionData(sessionData)) {
      throw new Error('Invalid session data');
    }

    // Update timestamps
    const importedSession = {
      ...sessionData,
      timestamp: Date.now(),
      expires: Date.now() + (options.maxAge || this.maxAge),
      importedAt: Date.now(),
      originalTimestamp: sessionData.timestamp
    };

    this.saveSessionState(importedSession);
    this.startHeartbeat();
    this.logActivity('session_imported', { originalTimestamp: sessionData.timestamp });

    return importedSession;
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
    
    return () => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  emit(event, data) {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  // Destroy session manager
  destroy() {
    this.stopHeartbeat();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    // Clear subscribers
    this.subscribers.clear();
    
    this.logActivity('manager_destroyed');
  }
}

// Singleton instance
export const sessionPersistenceManager = new SessionPersistenceManager();

export default sessionPersistenceManager;
