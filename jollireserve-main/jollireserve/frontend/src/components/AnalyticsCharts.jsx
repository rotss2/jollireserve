import React, { useState, useEffect } from 'react';

// Simple Bar Chart Component
export const BarChart = ({ 
  data, 
  title, 
  color = 'var(--red)', 
  height = 200,
  className = ''
}) => {
  // Handle empty data safely
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className={`card p-4 ${className}`}>
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.value || 0), 1); // Default to 1 to prevent division by zero
  
  return (
    <div className={`card p-4 ${className}`}>
      <h3 className="font-bold text-lg mb-4">{title}</h3>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end justify-between gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full relative group">
                <div 
                  className="w-full transition-all duration-300 hover:opacity-80 rounded-t"
                  style={{ 
                    height: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: color 
                  }}
                />
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.value}
                </div>
              </div>
              <span className="text-xs text-[var(--text-muted)] mt-2 text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Simple Line Chart Component
export const LineChart = ({ 
  data, 
  title, 
  color = 'var(--red)', 
  height = 200,
  className = ''
}) => {
  // Handle empty data safely
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className={`card p-4 ${className}`}>
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.value || 0), 1); // Default to 1 to prevent division by zero
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (item.value / maxValue) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={`card p-4 ${className}`}>
      <h3 className="font-bold text-lg mb-4">{title}</h3>
      <div className="relative" style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="var(--border)"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Data line */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - (item.value / maxValue) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill={color}
                className="hover:r-3"
              />
            );
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-[var(--text-muted)]">
          {data.map((item, index) => (
            <span key={index} className="text-center">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pie Chart Component
export const PieChart = ({ 
  data, 
  title, 
  className = ''
}) => {
  // Handle empty data safely
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className={`card p-4 ${className}`}>
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Handle case where total is 0
  if (total === 0) {
    return (
      <div className={`card p-4 ${className}`}>
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No data to display</p>
        </div>
      </div>
    );
  }
  let currentAngle = 0;
  
  const colors = [
    'var(--red)',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899'
  ];

  return (
    <div className={`card p-4 ${className}`}>
      <h3 className="font-bold text-lg mb-4">{title}</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (percentage / 100) * 360;
              const endAngle = currentAngle + angle;
              
              const x1 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              currentAngle = endAngle;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
          </svg>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span>{item.label}</span>
            </div>
            <span className="font-medium">
              {item.value} ({Math.round((item.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Stats Card Component
export const StatsCard = ({ 
  title, 
  value, 
  change, 
  icon, 
  color = 'var(--red)',
  className = ''
}) => {
  const isPositive = change > 0;
  
  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-main)]">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm mt-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// Analytics Dashboard Component
export const AnalyticsDashboard = ({ 
  reservations = [], 
  queue = [], 
  className = ''
}) => {
  // Validate input data
  const safeReservations = Array.isArray(reservations) ? reservations : [];
  const safeQueue = Array.isArray(queue) ? queue : [];

  // Process data for charts
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  // Reservation trends with safe filtering
  const reservationTrends = last7Days.map(date => {
    try {
      const count = safeReservations.filter(r => {
        if (!r || !r.date) return false;
        const rDate = new Date(r.date);
        return !isNaN(rDate.getTime()) && rDate.toDateString() === date.toDateString();
      }).length;
      return {
        label: date.toLocaleDateString('en', { weekday: 'short' }),
        value: count
      };
    } catch (error) {
      console.warn('Error processing reservation trends:', error);
      return {
        label: date.toLocaleDateString('en', { weekday: 'short' }),
        value: 0
      };
    }
  });

  // Peak hours data with safe filtering
  const peakHours = Array.from({ length: 8 }, (_, i) => {
    const hour = 11 + i; // 11 AM to 6 PM
    try {
      const count = safeReservations.filter(r => {
        if (!r || !r.time) return false;
        const rHour = parseInt(r.time.split(':')[0] || '0');
        return !isNaN(rHour) && rHour === hour;
      }).length;
      return {
        label: `${hour}:00`,
        value: count
      };
    } catch (error) {
      console.warn('Error processing peak hours:', error);
      return {
        label: `${hour}:00`,
        value: 0
      };
    }
  });

  // Party size distribution with safe filtering
  const partySizes = [1, 2, 3, 4, 5, 6].map(size => ({
    label: `${size} ${size === 1 ? 'person' : 'people'}`,
    value: safeReservations.filter(r => r && typeof r.party_size === 'number' && r.party_size === size).length
  }));

  // Status distribution with safe filtering
  const statusData = [
    { label: 'Confirmed', value: safeReservations.filter(r => r && r.status === 'confirmed').length },
    { label: 'Pending', value: safeReservations.filter(r => r && r.status === 'pending').length },
    { label: 'Completed', value: safeReservations.filter(r => r && r.status === 'completed').length },
    { label: 'Cancelled', value: safeReservations.filter(r => r && r.status === 'cancelled').length }
  ].filter(item => item.value > 0);

  // Calculate stats with safe data handling
  const totalReservations = safeReservations.length;
  const activeQueue = safeQueue.filter(q => q && q.status === 'waiting').length;
  const avgPartySize = safeReservations.length > 0 
    ? (safeReservations.reduce((sum, r) => sum + (r.party_size || 0), 0) / safeReservations.length).toFixed(1)
    : '0.0';
  const todayReservations = reservationTrends[reservationTrends.length - 1]?.value || 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Reservations"
          value={totalReservations}
          change={12}
          icon="📅"
        />
        <StatsCard
          title="Active Queue"
          value={activeQueue}
          change={-5}
          icon="🐝"
          color="#3b82f6"
        />
        <StatsCard
          title="Avg Party Size"
          value={avgPartySize}
          change={8}
          icon="👥"
          color="#10b981"
        />
        <StatsCard
          title="Today's Reservations"
          value={todayReservations}
          change={15}
          icon="📊"
          color="#f59e0b"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          data={peakHours}
          title="Peak Hours (Last 7 Days)"
          height={200}
        />
        <LineChart
          data={reservationTrends}
          title="Reservation Trends (7 Days)"
          height={200}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          data={partySizes}
          title="Party Size Distribution"
          height={200}
          color="#10b981"
        />
        <PieChart
          data={statusData}
          title="Reservation Status"
        />
      </div>
    </div>
  );
};
