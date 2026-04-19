// Enhanced Booking System - Integration component for all new booking features
import React, { useState, useEffect } from 'react';
import { SmartBookingFlow } from './SmartBookingFlow';
import { ErrorBoundary } from './ErrorBoundary';
import { RealtimeStatusIndicator } from './RealtimeStatusIndicator';
import { bookingManager } from '../services/bookingStateManager';
import { apiService } from '../services/apiService';
import { realtimeManager } from '../services/realtimeManager';
import { networkResilienceManager } from '../services/networkResilienceManager';
import { sessionPersistenceManager } from '../services/sessionPersistenceManager';
import { crossDeviceSyncManager } from '../services/crossDeviceSyncManager';

export const EnhancedBookingSystem = ({ user, onClose }) => {
  const [systemStatus, setSystemStatus] = useState({
    realtime: 'disconnected',
    network: navigator.onLine,
    sync: 'inactive',
    session: 'unknown'
  });
  
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [bookingHistory, setBookingHistory] = useState([]);

  useEffect(() => {
    initializeSystem();
    return () => cleanupSystem();
  }, []);

  const initializeSystem = async () => {
    // Initialize real-time connection
    initializeRealtime();
    
    // Initialize network resilience
    initializeNetworkResilience();
    
    // Initialize session management
    initializeSessionManagement();
    
    // Initialize cross-device sync
    initializeCrossDeviceSync();
    
    // Load booking history
    loadBookingHistory();
  };

  const initializeRealtime = () => {
    // Subscribe to real-time status changes
    const unsubscribeStatus = realtimeManager.on('statusChange', (status) => {
      setSystemStatus(prev => ({
        ...prev,
        realtime: status.isConnected ? 'connected' : 'disconnected'
      }));
    });

    // Subscribe to booking updates
    const unsubscribeBooking = realtimeManager.subscribeToBookingUpdates((update) => {
      console.log('Real-time booking update:', update);
      // Handle real-time updates
    });

    // Subscribe to queue updates
    const unsubscribeQueue = realtimeManager.subscribeToQueueUpdates((update) => {
      console.log('Real-time queue update:', update);
      // Handle real-time queue updates
    });

    // Connect if not already connected
    if (!realtimeManager.getConnectionInfo().isConnected) {
      realtimeManager.connect();
    }

    return () => {
      unsubscribeStatus();
      unsubscribeBooking();
      unsubscribeQueue();
    };
  };

  const initializeNetworkResilience = () => {
    // Subscribe to network status changes
    const unsubscribeOnline = networkResilienceManager.on('online', () => {
      setSystemStatus(prev => ({ ...prev, network: true }));
    });

    const unsubscribeOffline = networkResilienceManager.on('offline', () => {
      setSystemStatus(prev => ({ ...prev, network: false }));
    });

    const unsubscribeOperation = networkResilienceManager.on('operation:completed', (data) => {
      console.log('Offline operation completed:', data);
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeOperation();
    };
  };

  const initializeSessionManagement = () => {
    // Check session status
    const sessionInfo = sessionPersistenceManager.getSessionInfo();
    if (sessionInfo) {
      setSystemStatus(prev => ({
        ...prev,
        session: sessionInfo.isValid ? 'active' : 'expired'
      }));
    }

    // Subscribe to session events
    const unsubscribeSession = sessionPersistenceManager.on('sessionRestored', (session) => {
      setSystemStatus(prev => ({ ...prev, session: 'active' }));
    });

    const unsubscribeExpired = sessionPersistenceManager.on('sessionCleared', () => {
      setSystemStatus(prev => ({ ...prev, session: 'expired' }));
    });

    return () => {
      unsubscribeSession();
      unsubscribeExpired();
    };
  };

  const initializeCrossDeviceSync = () => {
    if (!crossDeviceSyncManager.isSupported) {
      return;
    }

    // Subscribe to sync events
    const unsubscribeSync = crossDeviceSyncManager.on('syncCompleted', (data) => {
      setSystemStatus(prev => ({ ...prev, sync: 'completed' }));
    });

    const unsubscribeConflict = crossDeviceSyncManager.on('conflictDetected', (conflict) => {
      console.log('Sync conflict detected:', conflict);
      // Handle conflict resolution
    });

    const unsubscribeDevice = crossDeviceSyncManager.on('deviceUpdated', (data) => {
      console.log('Device updated:', data);
    });

    return () => {
      unsubscribeSync();
      unsubscribeConflict();
      unsubscribeDevice();
    };
  };

  const loadBookingHistory = async () => {
    try {
      const history = await apiService.request('/bookings/history');
      setBookingHistory(history || []);
    } catch (error) {
      console.error('Failed to load booking history:', error);
    }
  };

  const cleanupSystem = () => {
    // Cleanup real-time connection
    if (realtimeManager.getConnectionInfo().isConnected) {
      realtimeManager.disconnect();
    }

    // Cleanup cross-device sync
    if (crossDeviceSyncManager.isSupported) {
      crossDeviceSyncManager.destroy();
    }

    // Cleanup session management
    sessionPersistenceManager.destroy();
  };

  const handleBookingComplete = (bookingData) => {
    console.log('Booking completed:', bookingData);
    
    // Add to booking history
    setBookingHistory(prev => [bookingData, ...prev]);
    
    // Broadcast to other devices
    if (crossDeviceSyncManager.isSupported) {
      crossDeviceSyncManager.broadcastBookingUpdate(bookingData);
    }
    
    // Close booking flow
    onClose?.();
  };

  const handleRetryConnection = () => {
    realtimeManager.reconnect();
  };

  const handleClearOfflineData = () => {
    networkResilienceManager.clearPendingOperations();
  };

  const handleResolveConflicts = () => {
    const conflicts = networkResilienceManager.getConflicts();
    console.log('Pending conflicts:', conflicts);
    // Implement conflict resolution UI
  };

  const getSystemHealth = () => {
    const realtimeInfo = realtimeManager.getConnectionInfo();
    const networkStatus = networkResilienceManager.getStatus();
    const sessionInfo = sessionPersistenceManager.getSessionInfo();
    const syncStatus = crossDeviceSyncManager.getStatus();

    return {
      realtime: realtimeInfo,
      network: networkStatus,
      session: sessionInfo,
      sync: syncStatus,
      overall: realtimeInfo.isConnected && networkStatus.isOnline && 
               sessionInfo?.isValid && (!syncStatus.isSupported || syncStatus.connectedDevices > 0)
    };
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* System Status Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900">
                Enhanced Booking System
              </h1>
              
              {/* Real-time Status */}
              <RealtimeStatusIndicator 
                status={systemStatus.realtime}
                lastUpdate={new Date()}
                isConnecting={realtimeManager.getConnectionInfo().isConnecting}
                isOffline={!systemStatus.network}
              />
            </div>

            <div className="flex items-center space-x-2">
              {/* Network Status */}
              <div className={`px-2 py-1 rounded text-xs ${
                systemStatus.network 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {systemStatus.network ? 'Online' : 'Offline'}
              </div>

              {/* Session Status */}
              <div className={`px-2 py-1 rounded text-xs ${
                systemStatus.session === 'active' 
                  ? 'bg-blue-100 text-blue-800' 
                  : systemStatus.session === 'expired'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {systemStatus.session === 'active' ? 'Session Active' : 
                 systemStatus.session === 'expired' ? 'Session Expired' : 'No Session'}
              </div>

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Options Panel */}
        {showAdvancedOptions && (
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-sm font-medium text-gray-900 mb-3">System Diagnostics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                {/* Real-time Info */}
                <div className="bg-gray-50 rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-1">Real-time</h4>
                  <p className="text-gray-600">Status: {realtimeManager.getConnectionInfo().status}</p>
                  <p className="text-gray-600">Latency: {realtimeManager.getConnectionInfo().latency}ms</p>
                  <p className="text-gray-600">Queue: {realtimeManager.getConnectionInfo().queuedMessages}</p>
                </div>

                {/* Network Info */}
                <div className="bg-gray-50 rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-1">Network</h4>
                  <p className="text-gray-600">Pending: {networkResilienceManager.getStatus().pendingOperations}</p>
                  <p className="text-gray-600">Sync: {networkResilienceManager.getStatus().syncInProgress ? 'Active' : 'Idle'}</p>
                </div>

                {/* Session Info */}
                <div className="bg-gray-50 rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-1">Session</h4>
                  <p className="text-gray-600">Age: {sessionPersistenceManager.getSessionAge()}</p>
                  <p className="text-gray-600">Expires: {sessionPersistenceManager.getTimeUntilExpiry()}</p>
                </div>

                {/* Sync Info */}
                <div className="bg-gray-50 rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-1">Cross-Device</h4>
                  <p className="text-gray-600">Devices: {crossDeviceSyncManager.getStatus().connectedDevices}</p>
                  <p className="text-gray-600">Primary: {crossDeviceSyncManager.getStatus().isPrimary ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={handleRetryConnection}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Retry Connection
                </button>
                
                <button
                  onClick={handleClearOfflineData}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Clear Offline Data
                </button>
                
                <button
                  onClick={handleResolveConflicts}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Resolve Conflicts
                </button>
                
                <button
                  onClick={() => crossDeviceSyncManager.requestSync()}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Request Sync
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Booking Flow */}
        <div className="max-w-6xl mx-auto py-6">
          <SmartBookingFlow
            user={user}
            onComplete={handleBookingComplete}
            onClose={onClose}
          />
        </div>

        {/* Booking History Sidebar */}
        {bookingHistory.length > 0 && (
          <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
            </div>
            
            <div className="p-4 space-y-3">
              {bookingHistory.slice(0, 10).map((booking, index) => (
                <div key={booking.id || index} className="bg-gray-50 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {booking.date}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {booking.time} • {booking.partySize} guests
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default EnhancedBookingSystem;
