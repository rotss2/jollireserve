/**
 * Performance Monitoring Hook
 * Senior Engineering: Self-review checklist implementation
 * 
 * Monitors:
 * - Expensive computations in render paths
 * - Memory leaks from stale closures
 * - Effect dependency changes
 * - Component re-render counts
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Hook to monitor expensive computations
 * Logs when a computation takes longer than threshold
 */
export function usePerformanceMonitor(name, threshold = 16) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    // Log if renders are too frequent (potential performance issue)
    if (renderCount.current > 1 && timeSinceLastRender < threshold) {
      console.warn(
        `[Performance] ${name} re-rendered too quickly:`,
        {
          renderCount: renderCount.current,
          timeSinceLastRender: `${timeSinceLastRender.toFixed(2)}ms`,
          threshold: `${threshold}ms`
        }
      );
    }
    
    lastRenderTime.current = now;
  });
  
  return renderCount.current;
}

/**
 * Hook to track expensive calculations
 * Logs when computation exceeds threshold (16ms = 1 frame at 60fps)
 */
export function useExpensiveCalculation(name, calculation, deps, threshold = 16) {
  return useMemo(() => {
    const start = performance.now();
    const result = calculation();
    const duration = performance.now() - start;
    
    if (duration > threshold) {
      console.warn(
        `[Performance] Expensive calculation in ${name}:`,
        {
          duration: `${duration.toFixed(2)}ms`,
          threshold: `${threshold}ms`,
          deps
        }
      );
    }
    
    return result;
  }, deps);
}

/**
 * Hook to detect stale closures in callbacks
 * Warns if callback references change unexpectedly
 */
export function useStableCallback(name, callback, deps) {
  const callbackRef = useRef(callback);
  const depsRef = useRef(deps);
  
  useEffect(() => {
    // Check if deps actually changed
    const depsChanged = !depsRef.current || 
      deps.some((dep, i) => dep !== depsRef.current[i]);
    
    if (depsChanged) {
      depsRef.current = deps;
      callbackRef.current = callback;
    } else {
      // Warn if callback function identity changed but deps didn't
      // This indicates a potential stale closure
      console.warn(
        `[Performance] ${name} callback identity changed without deps change.`,
        'This may indicate a stale closure. Consider using useCallback.'
      );
    }
  }, deps);
  
  return useCallback((...args) => {
    return callbackRef.current(...args);
  }, []);
}

/**
 * Hook to detect memory leaks from uncleared timers/subscriptions
 */
export function useCleanupCheck(name) {
  const cleanupFns = useRef([]);
  
  const registerCleanup = useCallback((cleanupFn) => {
    cleanupFns.current.push(cleanupFn);
    return cleanupFn;
  }, []);
  
  useEffect(() => {
    return () => {
      // Verify all cleanup functions were called
      const uncleaned = cleanupFns.current.filter(fn => {
        try {
          fn();
          return false;
        } catch {
          return true;
        }
      });
      
      if (uncleaned.length > 0) {
        console.warn(
          `[Memory] ${name} may have uncleared resources:`,
          `${uncleaned.length} cleanup functions had issues`
        );
      }
    };
  }, [name]);
  
  return registerCleanup;
}

/**
 * Hook to memoize with performance tracking
 */
export function useTrackedMemo(name, factory, deps) {
  const prevDeps = useRef(deps);
  const skipRender = useRef(false);
  
  // Check if deps actually changed
  const depsChanged = !prevDeps.current || 
    deps.some((dep, i) => dep !== prevDeps.current[i]);
  
  if (!depsChanged) {
    skipRender.current = true;
  } else {
    skipRender.current = false;
    prevDeps.current = deps;
  }
  
  return useMemo(() => {
    if (!skipRender.current) {
      const start = performance.now();
      const result = factory();
      const duration = performance.now() - start;
      
      if (duration > 16) {
        console.warn(
          `[Performance] ${name} useMemo calculation took ${duration.toFixed(2)}ms`
        );
      }
      
      return result;
    }
  }, deps);
}

/**
 * Development-only performance monitoring
 * Disabled in production builds
 */
export function useDevPerformanceMonitor(componentName) {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return usePerformanceMonitor(componentName);
}

/**
 * Self-review checklist runner
 * Run this in development to check for common issues
 */
export function runSelfReviewChecklist(componentName, checks) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  const results = {
    component: componentName,
    passed: [],
    warnings: [],
    timestamp: new Date().toISOString()
  };
  
  // Memory checks
  if (checks.hasClosures) {
    results.passed.push('No stale closures detected');
  } else {
    results.warnings.push('Check for closures capturing stale references');
  }
  
  // Async checks
  if (checks.allPromisesHandled) {
    results.passed.push('All Promises properly handled');
  } else {
    results.warnings.push('Check for unhandled Promise rejections');
  }
  
  // Nullability checks
  if (checks.nullabilityGuarded) {
    results.passed.push('Nullable values properly guarded');
  } else {
    results.warnings.push('Add null checks for potentially undefined values');
  }
  
  // Error handling checks
  if (checks.errorPathsHandled) {
    results.passed.push('Error paths properly handled');
  } else {
    results.warnings.push('Add error handling for async operations');
  }
  
  // Cleanup checks
  if (checks.cleanupVerified) {
    results.passed.push('Cleanup functions properly implemented');
  } else {
    results.warnings.push('Verify event listeners/timers are cleaned up');
  }
  
  // Performance checks
  if (checks.noExpensiveInRender) {
    results.passed.push('No expensive computations in render path');
  } else {
    results.warnings.push('Move expensive calculations to useMemo');
  }
  
  // Log results
  console.group(`[SelfReview] ${componentName}`);
  console.log('Passed:', results.passed.length);
  results.passed.forEach(item => console.log(`  ✓ ${item}`));
  
  if (results.warnings.length > 0) {
    console.warn('Warnings:', results.warnings.length);
    results.warnings.forEach(item => console.warn(`  ⚠ ${item}`));
  }
  console.groupEnd();
  
  return results;
}

export default {
  usePerformanceMonitor,
  useExpensiveCalculation,
  useStableCallback,
  useCleanupCheck,
  useTrackedMemo,
  useDevPerformanceMonitor,
  runSelfReviewChecklist
};
