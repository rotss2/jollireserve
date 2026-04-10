import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as api from "../lib/api";
import { onWSMessage } from "../lib/ws";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    max_party_size: 12,
    max_advance_days: 30,
    restaurant_name: "JolliReserve",
    contact_email: "",
    contact_phone: ""
  });
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Listen for WebSocket settings updates
  useEffect(() => {
    if (typeof onWSMessage !== 'function') {
      console.warn("[SettingsContext] onWSMessage not available");
      return;
    }
    const unsubscribe = onWSMessage((msg) => {
      if (msg.type === "settings:changed" && msg.settings) {
        console.log("[SettingsContext] Settings updated via WebSocket:", msg.settings);
        setSettings(prev => ({ ...prev, ...msg.settings }));
      }
    });
    return () => unsubscribe?.();
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      // Safety check - api.getSettings might not be available during build
      if (typeof api?.getSettings !== 'function') {
        console.warn("[SettingsContext] api.getSettings not available, using defaults");
        setLoading(false);
        return;
      }
      const data = await api.getSettings();
      if (data?.settings) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.error("[SettingsContext] Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    setLoading(true);
    await loadSettings();
  }, [loadSettings]);

  const value = {
    settings,
    loading,
    refreshSettings,
    // Helper to check if party size is valid
    isValidPartySize: (size) => {
      const max = settings?.max_party_size || 12;
      return Number(size) <= max;
    },
    // Helper to get max party size error message
    getPartySizeError: (size) => {
      const max = settings?.max_party_size || 12;
      if (Number(size) > max) {
        return `Maximum party size is ${max} people.`;
      }
      return null;
    }
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
