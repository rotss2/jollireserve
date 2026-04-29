/**
 * Admin Dashboard
 * Real-Time Operations Center
 * 
 * Features:
 * - Live table status (floor plan view)
 * - Real-time queue management
 * - Today's booking overview
 * - Revenue tracking
 * - Staff management
 * - System health monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Clock, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  RefreshCw,
  Bell,
  Search,
  Filter,
  Download
} from 'lucide-react';

// Import the Icon component from previous work
import { Icon } from '../components/Icon';

const AdminDashboard = () => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeQueue: 0,
    todayRevenue: 0,
    occupancyRate: 0,
    noShows: 0,
    avgWaitTime: 0
  });
  const [tables, setTables] = useState([]);
  const [queue, setQueue] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');

  // Mock data for now - replace with actual API calls
  const mockTables = [
    { id: 'T1', name: 'Table 1', capacity: 2, area: 'window', status: 'occupied', currentReservation: 'R123', x: 10, y: 10 },
    { id: 'T2', name: 'Table 2', capacity: 4, area: 'window', status: 'available', x: 10, y: 25 },
    { id: 'T3', name: 'Table 3', capacity: 4, area: 'main', status: 'reserved', currentReservation: 'R124', x: 35, y: 10 },
    { id: 'T4', name: 'Table 4', capacity: 6, area: 'main', status: 'available', x: 35, y: 25 },
    { id: 'T5', name: 'Table 5', capacity: 8, area: 'private', status: 'cleaning', x: 60, y: 10 },
    { id: 'T6', name: 'Table 6', capacity: 2, area: 'outdoor', status: 'available', x: 60, y: 25 },
  ];

  const mockQueue = [
    { id: 'Q1', name: 'John Smith', partySize: 4, position: 1, waitTime: 15, joinedAt: '2026-04-29T08:00:00Z', phone: '+1234567890' },
    { id: 'Q2', name: 'Sarah Johnson', partySize: 2, position: 2, waitTime: 25, joinedAt: '2026-04-29T08:05:00Z', phone: '+1234567891' },
    { id: 'Q3', name: 'Mike Brown', partySize: 6, position: 3, waitTime: 35, joinedAt: '2026-04-29T08:10:00Z', phone: '+1234567892' },
  ];

  const mockReservations = [
    { id: 'R123', customerName: 'Alice Cooper', date: '2026-04-29', time: '12:00', partySize: 4, status: 'checked_in', table: 'T1', amount: 2500 },
    { id: 'R124', customerName: 'Bob Dylan', date: '2026-04-29', time: '13:00', partySize: 2, status: 'confirmed', table: 'T3', amount: 1200 },
    { id: 'R125', customerName: 'Charlie Parker', date: '2026-04-29', time: '14:00', partySize: 6, status: 'pending', table: null, amount: 0 },
  ];

  // Initialize data
  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates (WebSocket)
    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setTables(mockTables);
      setQueue(mockQueue);
      setReservations(mockReservations);
      
      // Calculate stats
      const totalBookings = mockReservations.length;
      const activeQueue = mockQueue.length;
      const todayRevenue = mockReservations.reduce((sum, r) => sum + r.amount, 0);
      const occupiedTables = mockTables.filter(t => t.status === 'occupied').length;
      const occupancyRate = Math.round((occupiedTables / mockTables.length) * 100);
      const noShows = 2;
      const avgWaitTime = Math.round(mockQueue.reduce((sum, q) => sum + q.waitTime, 0) / mockQueue.length);
      
      setStats({
        totalBookings,
        activeQueue,
        todayRevenue,
        occupancyRate,
        noShows,
        avgWaitTime
      });
      
      setLastUpdated(new Date());
      setLoading(false);
    }, 1000);
  };

  const refreshData = useCallback(() => {
    // Simulate data refresh
    setLastUpdated(new Date());
    console.log('[AdminDashboard] Data refreshed');
  }, []);

  // Table management functions
  const updateTableStatus = (tableId, newStatus) => {
    setTables(prev => prev.map(table => 
      table.id === tableId ? { ...table, status: newStatus } : table
    ));
    
    // Add notification
    addNotification(`Table ${tableId} is now ${newStatus}`, 'info');
  };

  const callNextInQueue = () => {
    if (queue.length === 0) {
      addNotification('Queue is empty', 'warning');
      return;
    }
    
    const nextCustomer = queue[0];
    addNotification(`Called ${nextCustomer.name} to table`, 'success');
    
    // Remove from queue
    setQueue(prev => prev.slice(1).map((item, idx) => ({ ...item, position: idx + 1 })));
  };

  const removeFromQueue = (queueId) => {
    setQueue(prev => prev.filter(q => q.id !== queueId).map((item, idx) => ({ ...item, position: idx + 1 })));
    addNotification('Customer removed from queue', 'info');
  };

  const addNotification = (message, type = 'info') => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const styles = {
      available: 'bg-green-100 text-green-800 border-green-200',
      occupied: 'bg-red-100 text-red-800 border-red-200',
      reserved: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cleaning: 'bg-blue-100 text-blue-800 border-blue-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      checked_in: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // Overview Tab Content
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[var(--radius-md)] border border-[var(--color-border)] p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Today's Bookings</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.totalBookings}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[var(--color-brand-light)] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[var(--color-brand)]" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12%</span>
            <span className="text-[var(--color-text-muted)] ml-1">vs yesterday</span>
          </div>
        </div>

        <div className="bg-white rounded-[var(--radius-md)] border border-[var(--color-border)] p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Queue Length</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.activeQueue}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[var(--color-warning-light)] flex items-center justify-center">
              <Users className="w-5 h-5 text-[var(--color-warning)]" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <Clock className="w-4 h-4 text-[var(--color-text-muted)] mr-1" />
            <span className="text-[var(--color-text-muted)]">Avg wait: {stats.avgWaitTime}m</span>
          </div>
        </div>

        <div className="bg-white rounded-[var(--radius-md)] border border-[var(--color-border)] p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Today's Revenue</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">₱{stats.todayRevenue.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[var(--color-success-light)] flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[var(--color-success)]" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+8%</span>
            <span className="text-[var(--color-text-muted)] ml-1">vs yesterday</span>
          </div>
        </div>

        <div className="bg-white rounded-[var(--radius-md)] border border-[var(--color-border)] p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Occupancy Rate</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.occupancyRate}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[var(--color-info-light)] flex items-center justify-center">
              <Activity className="w-5 h-5 text-[var(--color-info)]" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <AlertCircle className="w-4 h-4 text-[var(--color-warning)] mr-1" />
            <span className="text-[var(--color-warning)]">{stats.noShows} no-shows</span>
          </div>
        </div>
      </div>

      {/* Floor Plan */}
      <div className="bg-white rounded-[var(--radius-md)] border border-[var(--color-border)] p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Floor Plan - Live Status</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
              <span>Reserved</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
              <span>Cleaning</span>
            </div>
          </div>
        </div>
        
        <div className="relative bg-gray-50 rounded-[var(--radius-lg)] p-4 min-h-[300px]">
          {/* Floor plan grid */}
          <div className="grid grid-cols-3 gap-4">
            {tables.map(table => (
              <div
                key={table.id}
                className={`
                  relative p-4 rounded-[var(--radius-md)] border-2 cursor-pointer transition-all
                  ${table.status === 'available' ? 'bg-green-50 border-green-300 hover:border-green-500' : ''}
                  ${table.status === 'occupied' ? 'bg-red-50 border-red-300 hover:border-red-500' : ''}
                  ${table.status === 'reserved' ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-500' : ''}
                  ${table.status === 'cleaning' ? 'bg-blue-50 border-blue-300 hover:border-blue-500' : ''}
                `}
                onClick={() => {
                  setSelectedTable(table);
                  setShowTableModal(true);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[var(--color-text-primary)]">{table.name}</span>
                  <StatusBadge status={table.status} />
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                  <p>Capacity: {table.capacity} guests</p>
                  <p>Area: {table.area}</p>
                  {table.currentReservation && (
                    <p className="text-[var(--color-brand)]">Reservation: {table.currentReservation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[var(--radius-md)] border border-[var(--color-border)] p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Today's Reservations</h3>
          <div className="space-y-3">
            {reservations.map(res => (
              <div key={res.id} className="flex items-center justify-between p-3 bg-[var(--color-canvas-alt)] rounded-[var(--radius-md)]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-brand-light)] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[var(--color-brand)]">
                      {res.customerName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{res.customerName}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{res.time} • {res.partySize} guests</p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={res.status} />
                  {res.amount > 0 && (
                    <p className="text-sm text-[var(--color-success)] mt-1">₱{res.amount.toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[var(--radius-md)] border border-[var(--color-border)] p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Live Queue</h3>
            <button 
              onClick={callNextInQueue}
              className="btn-primary text-sm flex items-center space-x-2"
            >
              <Icon name="next" size={16} />
              <span>Call Next</span>
            </button>
          </div>
          
          <div className="space-y-3">
            {queue.map(customer => (
              <div key={customer.id} className="flex items-center justify-between p-3 bg-[var(--color-canvas-alt)] rounded-[var(--radius-md)]">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-warning-light)] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[var(--color-warning)]">#{customer.position}</span>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{customer.name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{customer.partySize} guests • {customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-[var(--color-text-muted)]">{customer.waitTime}m wait</span>
                  <button 
                    onClick={() => removeFromQueue(customer.id)}
                    className="p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-[var(--radius-sm)]"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            {queue.length === 0 && (
              <p className="text-center text-[var(--color-text-muted)] py-8">Queue is empty</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Table Modal
  const TableModal = () => {
    if (!selectedTable) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-[var(--radius-lg)] p-6 w-full max-w-md" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{selectedTable.name}</h3>
            <button 
              onClick={() => setShowTableModal(false)}
              className="p-2 hover:bg-[var(--color-canvas-alt)] rounded-full"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Capacity</span>
              <span className="font-medium text-[var(--color-text-primary)]">{selectedTable.capacity} guests</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Area</span>
              <span className="font-medium text-[var(--color-text-primary)] capitalize">{selectedTable.area}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Current Status</span>
              <StatusBadge status={selectedTable.status} />
            </div>
            
            <div className="pt-4">
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {['available', 'occupied', 'reserved', 'cleaning'].map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      updateTableStatus(selectedTable.id, status);
                      setShowTableModal(false);
                    }}
                    className={`
                      p-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors
                      ${selectedTable.status === status 
                        ? 'bg-[var(--color-brand)] text-white' 
                        : 'bg-[var(--color-canvas-alt)] text-[var(--color-text-secondary)] hover:bg-[var(--color-brand-light)] hover:text-[var(--color-brand)]'
                      }
                    `}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Notifications Toast
  const Notifications = () => (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {notifications.map(notif => (
        <div 
          key={notif.id}
          className={`
            flex items-center space-x-2 px-4 py-3 rounded-[var(--radius-md)] text-white
            ${notif.type === 'success' ? 'bg-[var(--color-success)]' : ''}
            ${notif.type === 'error' ? 'bg-[var(--color-danger)]' : ''}
            ${notif.type === 'warning' ? 'bg-[var(--color-warning)]' : ''}
            ${notif.type === 'info' ? 'bg-[var(--color-info)]' : ''}
          `}
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          {notif.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notif.type === 'error' && <XCircle className="w-5 h-5" />}
          {notif.type === 'warning' && <AlertCircle className="w-5 h-5" />}
          {notif.type === 'info' && <Bell className="w-5 h-5" />}
          <span className="text-sm font-medium">{notif.message}</span>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-[var(--color-text-muted)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--color-border)] sticky top-0 z-40" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Admin Dashboard</h1>
              {lastUpdated && (
                <span className="text-sm text-[var(--color-text-muted)]">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={refreshData}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-light)] rounded-[var(--radius-md)] transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-[var(--color-brand-light)] rounded-[var(--radius-md)]">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-[var(--color-brand)]">Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'reservations', label: 'Reservations', icon: Calendar },
              { id: 'queue', label: 'Queue Management', icon: Users },
              { id: 'reports', label: 'Reports', icon: TrendingUp },
              { id: 'settings', label: 'Settings', icon: Icon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 border-b-2 text-sm font-medium transition-colors
                  ${activeTab === tab.id 
                    ? 'border-[var(--color-brand)] text-[var(--color-brand)]' 
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'reservations' && <div className="text-center py-12 text-[var(--color-text-muted)]">Reservations view coming soon</div>}
        {activeTab === 'queue' && <div className="text-center py-12 text-[var(--color-text-muted)]">Queue management view coming soon</div>}
        {activeTab === 'reports' && <div className="text-center py-12 text-[var(--color-text-muted)]">Reports view coming soon</div>}
        {activeTab === 'settings' && <div className="text-center py-12 text-[var(--color-text-muted)]">Settings view coming soon</div>}
      </main>

      {/* Notifications */}
      <Notifications />

      {/* Modals */}
      {showTableModal && <TableModal />}
    </div>
  );
};

export default AdminDashboard;
