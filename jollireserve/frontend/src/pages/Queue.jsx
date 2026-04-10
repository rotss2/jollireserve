import React, { useEffect, useState } from "react";
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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Join form + mascot */}
        <div className="card p-8">
          <h2 className="text-3xl font-black">Live Queue</h2>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            Join the queue and track your turn in real time.
          </p>

          {/* Bee mascot — shows after joining, or idle before */}
          <div className="flex justify-center mt-4">
            <BeeMascot
              position={myPosition}
              status={myStatus}
            />
          </div>

          <div className="mt-2 space-y-3">
            {!user && (
              <input
                className="input"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <input
              className="input"
              type="number"
              min="1"
              max={maxPartySize}
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder={`Party size (max ${maxPartySize})`}
              style={partyError ? { border: "2px solid #ef4444" } : {}}
            />
            {partyError && (
              <div className="text-xs" style={{ color: "#ef4444" }}>
                ⚠️ {partyError}
              </div>
            )}
            <button className="btn btn-red w-full py-3" onClick={join}>
              🐝 Join Queue
            </button>

            <div className="rounded-2xl p-4" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Active queue</div>
              <div className="text-5xl font-black text-[var(--red)]">{entries.length}</div>
            </div>
          </div>

          {/* QR code after joining */}
          {qrDataUrl && myEntry && (
            <div className="mt-5 rounded-2xl p-5 text-center" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
              <div className="font-bold text-sm mb-1">Your queue ticket</div>
              <div className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                Scan to check your live position on your phone
              </div>
              <img src={qrDataUrl} alt="Queue QR" className="mx-auto rounded-xl" style={{ width: 160, height: 160 }} />
              <div className="mt-2 text-xs font-semibold text-[var(--red)]">
                {myPosition ? `#${myPosition} in queue` : "Checking position…"}
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Party of {myEntry.party_size} · {myEntry.name || "Guest"}
              </div>
            </div>
          )}
        </div>

        {/* Queue board */}
        <div className="card p-8">
          <div className="flex items-center">
            <h3 className="text-xl font-black">Queue Board</h3>
            <button className="ml-auto btn btn-outline" onClick={load}>Refresh</button>
          </div>

          <div className="mt-4 space-y-3">
            {entries.length === 0 && (
              <div className="rounded-2xl p-4 text-sm" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                No active queue right now.
              </div>
            )}
            {entries.map((e, idx) => (
              <div
                key={e.id}
                className="rounded-2xl p-4"
                style={{
                  background: myEntry?.id === e.id ? "rgba(200,0,10,0.06)" : "var(--bg-card)",
                  border: myEntry?.id === e.id ? "1.5px solid var(--red)" : "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="font-black text-[var(--red)]">#{idx + 1}</div>
                  <div className="font-semibold">{e.name || "Guest"}</div>
                  <div className="text-sm" style={{ color: "var(--text-muted)" }}>Party {e.party_size}</div>
                  {myEntry?.id === e.id && (
                    <span style={{ fontSize: "0.7rem", background: "var(--red)", color: "#fff", padding: "0.1rem 0.5rem", borderRadius: "999px" }}>
                      You
                    </span>
                  )}
                  <div className="ml-auto text-xs px-2 py-1 rounded-full" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>
                    {e.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}