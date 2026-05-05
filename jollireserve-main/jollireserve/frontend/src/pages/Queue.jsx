import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import Toast from "../components/Toast";
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
    
    // Check if user already has an active queue entry
    if (user?.email) {
      const myActiveEntry = data.entries?.find(e => 
        e.email === user.email && 
        (e.status === "waiting" || e.status === "called")
      );
      if (myActiveEntry) {
        setMyEntry(myActiveEntry);
        // Generate QR for existing entry
        const qr = await QRCode.toDataURL(
          `${window.location.origin}/queue-status?id=${myActiveEntry.id}`,
          { width: 200, margin: 2 }
        );
        setQrDataUrl(qr);
      }
    }
  }

  useEffect(() => {
    load();
    connectWS();
    const off = onWSMessage((msg) => {
      if (msg.type === "queue:changed") load();
    });
    return () => off();
  }, [user]);

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

  const getStatusBadge = (status) => {
    switch (status) {
      case "called":
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Called</span>;
      case "seated":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Seated</span>;
      case "cancelled":
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Cancelled</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Waiting</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Live Queue</h1>
          <p className="text-gray-600">Join the queue and track your turn in real time</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Join Form / My Status */}
          <div className="lg:col-span-1 space-y-4">
            {myEntry ? (
              /* Already in Queue Card */
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">You're in Queue!</h2>
                    <p className="text-sm text-gray-500">Your spot is secured</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Position</span>
                    <span className="text-2xl font-bold text-[#B91C1C]">#{myPosition || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Party Size</span>
                    <span className="font-semibold text-gray-900">{myEntry.party_size} people</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status</span>
                    {getStatusBadge(myEntry.status)}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await api.queueCancel(myEntry.id);
                      setToast({ message: "Queue spot cancelled", type: "success" });
                      setMyEntry(null);
                      setQrDataUrl("");
                      load();
                    } catch (err) {
                      setToast({ message: "Failed to cancel", type: "error" });
                    }
                  }}
                  className="w-full py-2 text-red-600 font-medium hover:text-red-700 text-sm"
                >
                  Leave Queue
                </button>
              </div>
            ) : (
              /* Join Queue Form */
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#B91C1C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Join the Queue</h2>
                    <p className="text-sm text-gray-500">Walk-in guests welcome</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {!user && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                      <input
                        type="text"
                        placeholder="Enter your name (optional)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Party Size</label>
                    <input
                      type="number"
                      min="1"
                      max={maxPartySize}
                      value={party}
                      onChange={(e) => setParty(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                    />
                    {partyError && (
                      <p className="mt-1 text-sm text-red-600">{partyError}</p>
                    )}
                  </div>
                  <button
                    onClick={join}
                    disabled={!!partyError}
                    className="w-full py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-11"
                  >
                    Join Queue
                  </button>
                </div>
              </div>
            )}

            {/* QR Code Ticket */}
            {qrDataUrl && myEntry && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Your Ticket</h3>
                <p className="text-sm text-gray-500 mb-4">Scan to check your position</p>
                <img src={qrDataUrl} alt="Queue QR" className="w-32 h-32 mx-auto rounded-lg" />
              </div>
            )}

            {/* Called Alert */}
            {myStatus === "called" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">🔔</div>
                <h3 className="font-bold text-amber-800 mb-2">You're Being Called!</h3>
                <p className="text-amber-700 text-sm mb-4">Please proceed to the counter</p>
                <button
                  onClick={stopAlarm}
                  className="w-full py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Stop Alarm
                </button>
              </div>
            )}
          </div>

          {/* Right: Queue Board */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">Queue Board</h2>
                  <p className="text-sm text-gray-500">{entries.length} {entries.length === 1 ? "group" : "groups"} waiting</p>
                </div>
                <button
                  onClick={load}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Refresh
                </button>
              </div>

              {entries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-3 text-3xl">📭</div>
                  <h3 className="text-gray-900 font-medium mb-1">No one in queue</h3>
                  <p className="text-sm text-gray-500">Be the first to join!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map((e, idx) => (
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        myEntry?.id === e.id
                          ? "border-[#B91C1C] bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        myEntry?.id === e.id
                          ? "bg-[#B91C1C] text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">{e.name || "Guest"}</span>
                          {myEntry?.id === e.id && (
                            <span className="px-2 py-0.5 bg-[#B91C1C] text-white text-xs rounded-full">You</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">Party of {e.party_size}</p>
                      </div>
                      {getStatusBadge(e.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}