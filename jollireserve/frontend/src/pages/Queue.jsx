import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import Toast from "../components/Toast";
import BeeMascot from "../components/BeeMascot";
import { api } from "../lib/api";
import { connectWS, onWSMessage } from "../lib/ws";
import { useSettings } from "../contexts/SettingsContext";

export default function Queue({ user }) {
  const { settings, isValidPartySize, getPartySizeError } = useSettings();
  const maxPartySize = settings?.max_party_size || 12;
  
  const [party, setParty]     = useState(2);
  const [name, setName]       = useState("");
  const [entries, setEntries] = useState([]);
  const [toast, setToast]     = useState({ message: "", type: "success" });
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [myEntry, setMyEntry]     = useState(null);
  const [partyError, setPartyError] = useState(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const audioRef = useRef(null);

  async function load() {
    const data = await api.queueActive();
    setEntries(data.entries || []);
  }

  useEffect(() => {
    load();
    connectWS();
    const off = onWSMessage((msg) => {
      if (msg.type === "queue:changed") load();
    });
    return () => off();
  }, []);

  // Validate party size in real-time
  useEffect(() => {
    const error = getPartySizeError(party);
    setPartyError(error);
  }, [party, settings]);

  async function join() {
    // Check max party size before submitting
    if (!isValidPartySize(party)) {
      setToast({ message: getPartySizeError(party), type: "error" });
      return;
    }

    try {
      console.log("[Queue Join] User data:", { id: user?.id, email: user?.email, name: user?.name });
      const payload = {
        party_size: Number(party),
        name: name || (user?.name || "Guest"),
        user_id: user?.id,
        email: user?.email,
      };
      console.log("[Queue Join] Sending payload:", payload);
      const data  = await api.queueJoin(payload);
      console.log("[Queue Join] Response:", data);
      const entry = data.entry;

      setMyEntry(entry);
      setToast({ message: "Joined queue! 🐝", type: "success" });
      setName("");

      const statusUrl = `${window.location.origin}/queue/status/${entry.id}`;
      const url = await QRCode.toDataURL(statusUrl, { width: 200, margin: 1 });
      setQrDataUrl(url);

      await load();
    } catch (e) {
      // Check if error is about max party size
      if (e?.response?.data?.max_party_size) {
        setToast({ message: e.response.data.error, type: "error" });
      } else {
        setToast({ message: e.message || "Failed to join queue", type: "error" });
      }
    }
  }

  const waitingList = entries.filter((e) => e.status === "waiting");
  const myPosition  = myEntry
    ? waitingList.findIndex((e) => e.id === myEntry.id) + 1
    : null;
  const myStatus = myEntry
    ? (entries.find((e) => e.id === myEntry.id)?.status || myEntry.status)
    : null;

  // Alarm sound effect - plays when user is called
  useEffect(() => {
    if (myStatus === "called" && !isAlarmPlaying) {
      // Create audio element with notification sound
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.loop = true;
      audio.volume = 0.8;
      audioRef.current = audio;
      audio.play().catch(() => {
        // Audio play failed (browser autoplay policy)
        console.log("Audio autoplay blocked - user interaction needed");
      });
      setIsAlarmPlaying(true);
      setToast({ message: "🎉 You're being called! Please proceed to the counter!", type: "success" });
    } else if (myStatus !== "called" && isAlarmPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAlarmPlaying(false);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [myStatus, isAlarmPlaying]);

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsAlarmPlaying(false);
  };

  // Get status badge variant
  const getStatusBadge = (status) => {
    switch (status) {
      case "called":
        return <span className="badge badge-sm badge-warning">Called</span>;
      case "seated":
        return <span className="badge badge-sm badge-success">Seated</span>;
      case "cancelled":
        return <span className="badge badge-sm badge-error">Cancelled</span>;
      default:
        return <span className="badge badge-sm badge-secondary">Waiting</span>;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      {/* Page Header */}
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-black mb-2">Live Queue</h1>
        <p className="text-lg" style={{ color: "var(--text-muted)" }}>
          Join the queue and track your turn in real time
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Join Form */}
        <div className="space-y-6">
          {/* Main Join Card */}
          <div className="card card-large">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: "rgba(200, 0, 10, 0.1)" }}
              >
                🐝
              </div>
              <div>
                <h2 className="text-xl font-bold">Join the Queue</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Walk-in guests welcome!
                </p>
              </div>
            </div>

            {/* Bee mascot */}
            <div className="flex justify-center mb-6">
              <BeeMascot position={myPosition} status={myStatus} />
            </div>

            {/* Form */}
            <div className="space-y-4">
              {!user && (
                <div className="form-group mb-0">
                  <label className="form-label">Your Name</label>
                  <input
                    className="input"
                    placeholder="Enter your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              
              <div className="form-group mb-0">
                <label className="form-label">Party Size</label>
                <input
                  className={`input ${partyError ? "input-error" : ""}`}
                  type="number"
                  min="1"
                  max={maxPartySize}
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  placeholder={`How many people? (max ${maxPartySize})`}
                />
                {partyError && (
                  <div className="form-error">
                    <span>⚠️</span> {partyError}
                  </div>
                )}
              </div>

              <button 
                className="btn btn-primary btn-lg w-full" 
                onClick={join}
                disabled={!!partyError}
              >
                <span>🐝</span> Join Queue
              </button>
            </div>
          </div>

          {/* QR Code Card - After Joining */}
          {qrDataUrl && myEntry && (
            <div className="card card-normal card-info">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                  🎫
                </div>
                <h3 className="text-lg font-bold mb-1">Your Queue Ticket</h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Scan to check position on your phone
                </p>
                
                <div className="bg-white p-3 rounded-xl inline-block mb-4">
                  <img src={qrDataUrl} alt="Queue QR" className="rounded-lg" style={{ width: 160, height: 160 }} />
                </div>
                
                <div className="flex justify-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-black" style={{ color: "var(--red)" }}>
                      {myPosition ? `#${myPosition}` : "-"}
                    </div>
                    <div style={{ color: "var(--text-muted)" }}>Position</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black" style={{ color: "var(--red)" }}>
                      {myEntry.party_size}
                    </div>
                    <div style={{ color: "var(--text-muted)" }}>Guests</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ALARM - Called Notification */}
          {myStatus === "called" && (
            <div className="card card-warning animate-pulse">
              <div className="text-center">
                <div className="text-5xl mb-3">🔔</div>
                <h3 className="text-xl font-bold text-amber-800 mb-2">
                  You're Being Called!
                </h3>
                <p className="text-amber-700 mb-4">
                  Please proceed to the counter immediately
                </p>
                <button 
                  className="btn btn-lg w-full font-bold" 
                  onClick={stopAlarm}
                  style={{ background: "#f59e0b", color: "#fff", border: "none" }}
                >
                  <span>🛑</span> Stop Alarm
                </button>
                {isAlarmPlaying && (
                  <p className="mt-3 text-sm text-amber-600">
                    🔊 Alarm is playing...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Queue Board */}
        <div className="card card-large">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: "var(--bg-input)" }}
              >
                📋
              </div>
              <div>
                <h2 className="text-xl font-bold">Queue Board</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {entries.length} {entries.length === 1 ? "group" : "groups"} waiting
                </p>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={load}>
              🔄 Refresh
            </button>
          </div>

          {/* Queue List */}
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-state-icon">📭</div>
                <h3 className="empty-state-title">No one in queue</h3>
                <p className="empty-state-desc">
                  Be the first to join! The queue is empty right now.
                </p>
              </div>
            ) : (
              entries.map((e, idx) => (
                <div
                  key={e.id}
                  className={`p-4 rounded-xl transition-all ${
                    myEntry?.id === e.id 
                      ? "border-2 border-[var(--red)] bg-red-50/10" 
                      : "border border-[var(--border)] hover:border-[var(--red)]/30"
                  }`}
                  style={{
                    background: myEntry?.id === e.id ? "rgba(200,0,10,0.05)" : "var(--bg-input)",
                  }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Position Number */}
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg"
                      style={{ 
                        background: myEntry?.id === e.id ? "var(--red)" : "var(--bg-card)",
                        color: myEntry?.id === e.id ? "#fff" : "var(--red)"
                      }}
                    >
                      {idx + 1}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">
                          {e.name || "Guest"}
                        </span>
                        {myEntry?.id === e.id && (
                          <span className="badge badge-sm badge-primary">You</span>
                        )}
                      </div>
                      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Party of {e.party_size}
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="flex-shrink-0">
                      {getStatusBadge(e.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}