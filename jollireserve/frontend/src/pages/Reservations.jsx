import React, { useEffect, useState, useRef } from "react";
import Toast from "../components/Toast";
import { api } from "../lib/api";
import { connectWS, onWSMessage } from "../lib/ws";
import { useSettings } from "../contexts/SettingsContext";
import QRCode from "qrcode";

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Renders a QR code canvas for a reservation
function ReservationQR({ id }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, `JR:${id}`, {
      width: 140,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "0.75rem" }}>
      <canvas ref={canvasRef} style={{ borderRadius: "0.5rem" }} />
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
        Scan to check in
      </div>
    </div>
  );
}

export default function Reservations({ user }) {
  const { settings, isValidPartySize, getPartySizeError } = useSettings();
  const maxPartySize = settings?.max_party_size || 12;
  
  const [date, setDate]   = useState("");
  const [time, setTime]   = useState("");
  const [party, setParty] = useState(2);
  const [area, setArea]   = useState("");
  const [req, setReq]     = useState("");
  const [list, setList]   = useState([]);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [expandedQR, setExpandedQR] = useState(null); // reservation id with QR open
  const [partyError, setPartyError] = useState(null);
  
  // Menu pre-order state
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({}); // { itemId: quantity }

  async function load() {
    const data = await api.myReservations();
    setList(data.reservations || []);
  }

  // Load available menu items for pre-ordering
  async function loadMenuItems() {
    try {
      const data = await api.getMenuItems?.().catch(() => ({ items: [] }));
      setMenuItems(data?.items?.filter(item => item.is_available) || []);
    } catch (e) {
      console.log("Menu items not available for pre-order");
    }
  }

  useEffect(() => {
    load();
    loadMenuItems();
    connectWS();
    const off = onWSMessage((msg) => {
      if (msg.type === "reservations:changed") load();
    });
    return () => off();
  }, []);

  // Validate party size in real-time
  useEffect(() => {
    const error = getPartySizeError(party);
    setPartyError(error);
  }, [party, settings]);

  async function createReservation() {
    // Check max party size before submitting
    if (!isValidPartySize(party)) {
      setToast({ message: getPartySizeError(party), type: "error" });
      return;
    }

    // Build pre-order items list
    const preOrderItems = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = menuItems.find(i => i.id === id);
        return item ? { id, name: item.name, price: item.price, quantity: qty } : null;
      }).filter(Boolean);

    try {
      await api.createReservation({
        date, time, party_size: Number(party),
        area_pref: area || null,
        special_requests: req || null,
        pre_order_items: preOrderItems.length > 0 ? preOrderItems : null,
      });
      setToast({ message: "Reservation confirmed!", type: "success" });
      setDate(""); setTime(""); setReq(""); setSelectedItems({});
      await load();
    } catch (e) {
      // Check if error is about max party size
      if (e?.response?.data?.max_party_size) {
        setToast({ message: e.response.data.error, type: "error" });
      } else {
        setToast({ message: e.message || "Failed to create reservation", type: "error" });
      }
    }
  }

  async function cancel(id) {
    try {
      await api.cancelReservation(id);
      setToast({ message: "Reservation cancelled.", type: "success" });
      await load();
    } catch (e) {
      setToast({ message: e.message, type: "error" });
    }
  }

  async function receipt(id) {
    try {
      const blob = await api.downloadReceipt(id);
      downloadBlob(blob, `reservation-${id}.pdf`);
    } catch (e) {
      setToast({ message: e.message, type: "error" });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Book form */}
        <div className="card p-5 md:p-8">
          <h2 className="text-2xl md:text-3xl font-black">Book a Table</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Reserve your preferred time and we'll keep things ready.
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Time</label>
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Guests (Max: {maxPartySize})
              </label>
              <input 
                className="input" 
                type="number" 
                min="1" 
                max={maxPartySize} 
                value={party} 
                onChange={(e) => setParty(e.target.value)} 
                placeholder={`Number of guests (max ${maxPartySize})`}
                style={partyError ? { border: "2px solid #ef4444" } : {}}
              />
              {partyError && (
                <div className="text-xs mt-1" style={{ color: "#ef4444" }}>
                  ⚠️ {partyError}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Area</label>
              <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">Area preference (optional)</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="vip">VIP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Special Requests</label>
              <input className="input" value={req} onChange={(e) => setReq(e.target.value)} placeholder="Optional" />
            </div>
            
            {/* Pre-order Menu Section */}
            {menuItems.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                  🍽️ Pre-order Food (Optional)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {menuItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded" style={{ background: "var(--bg-subtle)" }}>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          ₱{item.price} · {item.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          className="btn btn-sm"
                          onClick={() => setSelectedItems(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                        >-</button>
                        <span className="w-8 text-center">{selectedItems[item.id] || 0}</span>
                        <button 
                          className="btn btn-sm"
                          onClick={() => setSelectedItems(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
                {Object.values(selectedItems).some(qty => qty > 0) && (
                  <div className="mt-2 text-sm font-semibold" style={{ color: "var(--red)" }}>
                    Total: ₱{Object.entries(selectedItems).reduce((sum, [id, qty]) => {
                      const item = menuItems.find(i => i.id === id);
                      return sum + (item?.price || 0) * qty;
                    }, 0)}
                  </div>
                )}
              </div>
            )}
            
            <button className="btn btn-red w-full py-3 mt-4" onClick={createReservation}>
              Confirm Reservation
            </button>
          </div>
        </div>

        {/* My reservations */}
        <div className="card p-5 md:p-8">
          <div className="flex items-center">
            <h3 className="text-xl font-black">My Reservations</h3>
            <button className="ml-auto btn btn-outline" onClick={load}>Refresh</button>
          </div>

          <div className="mt-4 space-y-3">
            {list.length === 0 && (
              <div className="rounded-2xl p-4 text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                No reservations yet. Create your first booking today.
              </div>
            )}

            {list.map((r) => (
              <div key={r.id} className="rounded-2xl p-4" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                {/* Top row */}
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <div className="font-bold text-sm">{r.date} · {r.time}</div>
                  <span className="text-xs px-2 py-1 rounded-full bg-black/5">Party {r.party_size}</span>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>{r.status}</span>
                  {r.table_name && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                      Table {r.table_name}
                    </span>
                  )}
                </div>

                {r.special_requests && (
                  <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                    Request: {r.special_requests}
                  </div>
                )}

                {/* QR Code — only for active reservations */}
                {["confirmed", "checked_in"].includes(r.status) && (
                  <div>
                    <button
                      className="btn btn-outline w-full text-sm py-2 mt-1"
                      onClick={() => setExpandedQR(expandedQR === r.id ? null : r.id)}
                    >
                      {expandedQR === r.id ? "🔼 Hide QR Code" : "📱 Show Check-in QR"}
                    </button>
                    {expandedQR === r.id && <ReservationQR id={r.id} />}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <button className="btn btn-outline w-full sm:w-auto text-sm py-2" onClick={() => receipt(r.id)}>
                    📄 Receipt PDF
                  </button>
                  {r.status !== "cancelled" && (
                    <button className="btn btn-outline w-full sm:w-auto text-sm py-2" onClick={() => cancel(r.id)}>
                      ✕ Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}