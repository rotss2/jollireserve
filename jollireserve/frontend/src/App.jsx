import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Reservations from "./pages/Reservations";
import Queue from "./pages/Queue";
import Admin from "./pages/Admin";
import Scan from "./pages/Scan";
import Checkin from "./pages/Checkin";
import TV from "./pages/TV";
import QueueStatus from "./pages/Queuestatus";
import Notifications from "./components/Notifications";
import MusicPlayer from "./components/MusicPlayer";
import { MusicProvider, useMusic } from "./context/MusicContext";
import { clearToken } from "./lib/token";
import { getMe } from "./lib/auth";

function AppInner() {
  const [user, setUser] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false); // Global suspension state

  const location = useLocation();
  const navigate = useNavigate();
  const music = useMusic();
  const isTV = location.pathname === "/tv";

  function logout() {
    music?.stopMusic();
    clearToken();
    setUser(null);
  }

  // Handle Initial Load & Suspension Events
  useEffect(() => {
    const handleSuspension = () => {
      // ✅ PROTECT ADMIN: Don't lock out if the user is an admin
      if (user?.role === 'admin') return;

      setIsSuspended(true);
      logout();
    };

    window.addEventListener("user-suspended", handleSuspension);

    (async () => {
      try {
        const u = await getMe();
        setUser(u);
      } catch (err) {
        console.warn("getMe failed:", err.message);
        setUser(null);
      } finally {
        setLoadingMe(false);
      }
    })();

    return () => window.removeEventListener("user-suspended", handleSuspension);
  }, [user]);

  // ✅ REAL-TIME POLLING: Check every 5 seconds
  useEffect(() => {
    // Only poll if someone is logged in and is NOT an admin
    if (!user || user.role === 'admin' || isSuspended) return;

    const interval = setInterval(() => {
      getMe().catch(() => {
        // Errors (401/403) are caught by api.js interceptor
        // which triggers the 'user-suspended' event above
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [user, isSuspended]);

  if (loadingMe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-6">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <Notifications />
      {!isTV && <Navbar user={user} onLogout={logout} />}

      <MusicPlayer />

      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/login" element={<Login onAuthed={setUser} />} />

        <Route path="/queue" element={
          <ProtectedRoute user={user}>
            <Queue user={user} />
          </ProtectedRoute>
        } />

        <Route path="/queue/status/:id" element={<Checkin />} />
        <Route path="/scan" element={<AdminRoute user={user}><Scan /></AdminRoute>} />
        <Route path="/tv" element={<TV />} />
        <Route path="/reservations" element={
          <ProtectedRoute user={user}>
            <Reservations user={user} />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={<AdminRoute user={user}><Admin /></AdminRoute>} />
        <Route path="/checkin/:id" element={<Checkin />} />
        <Route path="*" element={<Home user={user} />} />
      </Routes>

      {/* ✅ UNESCAPABLE SUSPENSION MODAL */}
      {isSuspended && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'black'
        }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '15px', textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ color: '#d32f2f', marginBottom: '10px' }}>Account Restricted</h2>
            <p style={{ marginBottom: '25px', fontSize: '1.1rem' }}>
              your account has been suspended, Please contact our customer service
            </p>
            <button
              onClick={() => { setIsSuspended(false); navigate("/login"); }}
              style={{ padding: '10px 30px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <MusicProvider>
      <AppInner />
    </MusicProvider>
  );
}