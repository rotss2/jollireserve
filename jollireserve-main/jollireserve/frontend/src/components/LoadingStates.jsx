import React from 'react';

// Skeleton Loader Component
export const SkeletonLoader = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '', 
  rounded = 'rounded' 
}) => (
  <div 
    className={`
      ${width} ${height} ${rounded} 
      bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 
      dark:from-gray-700 dark:via-gray-600 dark:to-gray-700
      animate-pulse
      ${className}
    `}
  />
);

// Card Skeleton Loader
export const CardSkeleton = ({ lines = 3, showAvatar = false }) => (
  <div className="card p-4 space-y-3">
    {showAvatar && (
      <div className="flex items-center gap-3">
        <SkeletonLoader width="w-12" height="h-12" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader width="w-3/4" height="h-4" />
          <SkeletonLoader width="w-1/2" height="h-3" />
        </div>
      </div>
    )}
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader 
          key={i} 
          width={i === 0 ? 'w-full' : i === lines - 1 ? 'w-2/3' : 'w-4/5'} 
          height="h-4" 
        />
      ))}
    </div>
  </div>
);

// Table Skeleton Loader
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="card overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-3 text-left">
                <SkeletonLoader height="h-4" width="w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-[var(--border)]">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="p-3">
                  <SkeletonLoader 
                    height="h-4" 
                    width={colIndex === 0 ? 'w-32' : 'w-20'} 
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Spinner Component
export const Spinner = ({ 
  size = 'md', 
  color = 'var(--red)', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        border-2 border-gray-200 dark:border-gray-700 
        border-t-2 rounded-full 
        animate-spin
        ${className}
      `}
      style={{ borderTopColor: color }}
    />
  );
};

// Full Page Loader
export const FullPageLoader = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-white dark:bg-[var(--bg-card)] bg-opacity-90 dark:bg-opacity-90 flex items-center justify-center z-50">
    <div className="text-center space-y-4">
      <Spinner size="xl" />
      <p className="text-lg font-medium text-[var(--text-main)]">{message}</p>
    </div>
  </div>
);

// Button Loader
export const ButtonLoader = ({ loading, children, disabled, ...props }) => (
  <button 
    {...props}
    disabled={disabled || loading}
    className={`
      ${props.className || ''}
      ${loading ? 'opacity-75 cursor-not-allowed' : ''}
      flex items-center justify-center gap-2
    `}
  >
    {loading && <Spinner size="sm" />}
    {children}
  </button>
);

// Progress Bar
export const ProgressBar = ({ 
  progress = 0, 
  color = 'var(--red)', 
  height = 'h-2',
  showPercentage = false,
  className = ''
}) => (
  <div className={`w-full ${className}`}>
    {showPercentage && (
      <div className="flex justify-between text-sm text-[var(--text-muted)] mb-1">
        <span>Progress</span>
        <span>{Math.round(progress)}%</span>
      </div>
    )}
    <div className={`w-full ${height} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
      <div 
        className={`h-full transition-all duration-300 ease-out rounded-full`}
        style={{ 
          width: `${Math.min(100, Math.max(0, progress))}%`,
          backgroundColor: color 
        }}
      />
    </div>
  </div>
);

// Loading Dots
export const LoadingDots = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className="flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${sizeClasses[size]} 
            bg-[var(--red)] 
            rounded-full 
            animate-bounce
          `}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
};

// Pulse Loader
export const PulseLoader = ({ 
  size = 'md', 
  color = 'var(--red)',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div 
        className={`absolute inset-0 rounded-full opacity-75 animate-ping`}
        style={{ backgroundColor: color }}
      />
      <div 
        className={`absolute inset-0 rounded-full animate-pulse`}
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

// List Skeleton Loader
export const ListSkeleton = ({ items = 5, showAvatar = true }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="card p-4">
        <div className="flex items-center gap-3">
          {showAvatar && (
            <SkeletonLoader width="w-10" height="h-10" rounded="rounded-full" />
          )}
          <div className="flex-1 space-y-2">
            <SkeletonLoader width="w-3/4" height="h-4" />
            <SkeletonLoader width="w-1/2" height="h-3" />
          </div>
          <SkeletonLoader width="w-20" height="h-8" rounded="rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

// Form Skeleton Loader
export const FormSkeleton = ({ fields = 4 }) => (
  <div className="card p-6 space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <SkeletonLoader width="w-1/4" height="h-4" />
        <SkeletonLoader width="w-full" height="h-10" rounded="rounded-lg" />
      </div>
    ))}
    <div className="pt-4">
      <SkeletonLoader width="w-32" height="h-10" rounded="rounded-lg" />
    </div>
  </div>
);

// Stats Card Skeleton
export const StatsCardSkeleton = () => (
  <div className="card p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonLoader width="w-16" height="h-4" />
        <SkeletonLoader width="w-24" height="h-6" />
      </div>
      <SkeletonLoader width="w-12" height="h-12" rounded="rounded-lg" />
    </div>
  </div>
);
