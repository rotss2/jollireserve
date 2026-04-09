import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("jr_theme") === "dark";
  });

  // Apply theme immediately - CSS handles the smooth transition
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("jr_theme", dark ? "dark" : "light");
  }, [dark]);

  // Simple toggle - no RAF, no complex logic
  const toggle = useCallback(() => {
    setDark((d) => !d);
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}