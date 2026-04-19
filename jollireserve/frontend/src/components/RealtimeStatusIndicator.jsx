import React, { useState, useEffect } from 'react';

export const RealtimeStatusIndicator = ({ 
  status, 
  lastUpdate, 
  isConnecting, 
  isOffline,
  className = ''
}) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdate) return;
      
      const now = new Date();
      const update = new Date(lastUpdate);
      const diffInSeconds = Math.floor((now - update) / 1000);
      
      if (diffInSeconds < 60) {
        setTimeAgo('just now');
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        setTimeAgo(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimeAgo(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        setTimeAgo(`${days} day${days > 1 ? 's' : ''} ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lastUpdate]);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          text: 'Live',
          pulse: true,
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'syncing':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          text: 'Syncing',
          pulse: true,
          icon: (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )
        };
      case 'disconnected':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          text: 'Offline',
          pulse: false,
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'connecting':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          text: 'Connecting',
          pulse: true,
          icon: (
            <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )
        };
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          text: 'Unknown',
          pulse: false,
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {/* Status Dot */}
      <div className="relative flex items-center justify-center">
        <div className={`
          w-2 h-2 rounded-full ${config.color}
          ${config.pulse ? 'animate-pulse' : ''}
        `} />
        
        {/* Connecting animation */}
        {isConnecting && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${config.color} animate-ping`} />
        )}
        
        {/* Icon overlay for better visibility */}
        <div className="absolute inset-0 flex items-center justify-center">
          {config.icon}
        </div>
      </div>

      {/* Status Text */}
      <span className={`font-medium ${config.textColor}`}>
        {config.text}
      </span>

      {/* Last Update */}
      {lastUpdate && timeAgo && (
        <span className="text-gray-500">
          Updated {timeAgo}
        </span>
      )}

      {/* Offline Warning */}
      {isOffline && (
        <div className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
          Changes will sync when connected
        </div>
      )}

      {/* Reconnecting indicator */}
      {isConnecting && (
        <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs flex items-center gap-1">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Reconnecting
        </div>
      )}
    </div>
  );
};

// Compact version for mobile
export const CompactStatusIndicator = ({ status, className = '' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'syncing': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'connecting': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className={`
        w-1.5 h-1.5 rounded-full ${getStatusColor()}
        ${status === 'syncing' || status === 'connecting' ? 'animate-pulse' : ''}
      `} />
      <span className="text-xs text-gray-600 capitalize">
        {status}
      </span>
    </div>
  );
};

// Status with detailed information
export const DetailedStatusIndicator = ({ 
  status, 
  lastUpdate, 
  isConnecting, 
  isOffline,
  connectionQuality = 'good',
  retryCount = 0,
  className = ''
}) => {
  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'poor': return 'text-yellow-600';
      case 'bad': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getQualityText = () => {
    switch (connectionQuality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'poor': return 'Poor';
      case 'bad': return 'Bad';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Connection Status</h3>
        <RealtimeStatusIndicator 
          status={status}
          lastUpdate={lastUpdate}
          isConnecting={isConnecting}
          isOffline={isOffline}
        />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Quality:</span>
          <span className={`font-medium ${getQualityColor()}`}>
            {getQualityText()}
          </span>
        </div>

        {retryCount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Retry Attempts:</span>
            <span className="font-medium text-yellow-600">
              {retryCount}
            </span>
          </div>
        )}

        {lastUpdate && (
          <div className="flex justify-between">
            <span className="text-gray-600">Last Sync:</span>
            <span className="font-medium text-gray-900">
              {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          </div>
        )}

        {isOffline && (
          <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
            ⚠️ You're currently offline. Changes will be saved locally and synced when you reconnect.
          </div>
        )}

        {isConnecting && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
            🔄 Attempting to reconnect...
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeStatusIndicator;
