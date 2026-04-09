import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("jr_theme") === "dark";
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const rafRef = useRef(null);

  // Prevent transitions on initial load
  useEffect(() => {
    document.documentElement.classList.add("preload");
    
    // Remove preload class after a short delay to enable transitions
    const timer = setTimeout(() => {
      document.documentElement.classList.remove("preload");
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Apply theme with RAF for smooth 60-120fps
  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        localStorage.setItem("jr_theme", dark ? "dark" : "light");
      });
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [dark]);

  // Smooth toggle with double RAF for 60-120fps
  const toggle = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    requestAnimationFrame(() => {
      setDark((d) => !d);
      
      // Reset transitioning flag after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    });
  }, [isTransitioning]);

  return (
    <ThemeContext.Provider value={{ dark, toggle, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}