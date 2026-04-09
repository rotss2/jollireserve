let socket;
let listeners = new Set();

function getWSUrl() {
  // If VITE_WS_URL is set explicitly, use it
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;

  // Auto-detect based on current browser hostname
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "ws://localhost:4000/ws";
  }
  // On deployed environments, use wss:// and derive backend host
  // If VITE_API_URL is set, derive WS from it; otherwise use same hostname
  const apiUrl = import.meta.env.VITE_API_URL || "";
  if (apiUrl) {
    const url = new URL(apiUrl);
    return `wss://${url.hostname}/ws`;
  }
  return `wss://${hostname}/ws`;
}

export function connectWS() {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return socket;
  }
  socket = new WebSocket(getWSUrl());
  socket.onopen = () => {
    console.log("🔌 WS connected");
  };
  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      listeners.forEach((fn) => fn(msg));
    } catch { }
  };
  socket.onclose = () => {
    console.log("🔌 WS disconnected — reconnecting in 1.2s");
    setTimeout(() => {
      try { connectWS(); } catch { }
    }, 1200);
  };
  socket.onerror = (err) => {
    console.warn("WS error", err);
  };
  return socket;
}

export function onWSMessage(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}