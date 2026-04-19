import React, { useEffect, useState, useRef } from "react";
import Toast from "../components/Toast";
import { api } from "../lib/api";
import { connectWS, onWSMessage } from "../lib/ws";
import { useSettings } from "../contexts/SettingsContext";
import QRCode from "qrcode";
import PaymentModal from "../components/PaymentModal";

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
  const [activeReservation, setActiveReservation] = useState(null);
  const [expandedQR, setExpandedQR] = useState(null); // reservation id with QR open
  const [partyError, setPartyError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingReservation, setPendingReservation] = useState(null);
  
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
      if (msg.type === "reservation:changed") load();
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

    // Calculate total for pre-order items
    const preOrderTotal = preOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // If there are pre-order items, show payment modal first
    if (preOrderItems.length > 0) {
      const reservationData = {
        date, time, party_size: Number(party),
        area_pref: area || null,
        special_requests: req || null,
        pre_order_items: preOrderItems
      };
      setPendingReservation(reservationData);
      setShowPaymentModal(true);
      return;
    }

    // No pre-order items, create reservation directly
    try {
      await api.createReservation({
        date, time, party_size: Number(party),
        area_pref: area || null,
        special_requests: req || null,
        pre_order_items: null,
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

  // Handle successful payment
  const handlePaymentSuccess = async () => {
    try {
      if (!pendingReservation) return;
      
      await api.createReservation(pendingReservation);
      setToast({ message: "Reservation confirmed with pre-order payment!", type: "success" });
      setDate(""); setTime(""); setReq(""); setSelectedItems({});
      setPendingReservation(null);
      setShowPaymentModal(false);
      await load();
    } catch (e) {
      setToast({ message: e.message || "Failed to create reservation", type: "error" });
      setShowPaymentModal(false);
      setPendingReservation(null);
    }
  };

  // Handle payment modal close
  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPendingReservation(null);
  };

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

      {/* Page Header */}
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-black mb-2">Reservations</h1>
        <p className="text-lg" style={{ color: "var(--text-muted)" }}>
          Book your table and manage your reservations
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Book form - Show Already Reserved if applicable */}
        {activeReservation ? (
          <div className="card card-large card-success">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-green-100 dark:bg-green-900/30"
              >
                ✅
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-700 dark:text-green-400">Reservation Confirmed!</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  You already have an active reservation
                </p>
              </div>
            </div>

            {/* Reservation Details */}
            <div className="bg-[var(--bg-subtle)] rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">Date</span>
                <span className="font-bold">{new Date(activeReservation.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">Time</span>
                <span className="font-bold">{activeReservation.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">Party Size</span>
                <span className="font-bold">{activeReservation.party_size} guests</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">Status</span>
                <span className={`badge badge-sm badge-${activeReservation.status === 'confirmed' ? 'success' : 'warning'}`}>
                  {activeReservation.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                </span>
              </div>
              {activeReservation.area_pref && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">Seating</span>
                  <span className="font-bold capitalize">{activeReservation.area_pref}</span>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                <span>⚠️</span>
                Want to make another reservation? Cancel this one first.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                className="btn btn-secondary btn-md flex-1"
                onClick={() => setActiveReservation(null)}
              >
                <span>📝</span> New Booking
              </button>
              <button 
                className="btn btn-outline btn-md flex-1"
                onClick={async () => {
                  try {
                    await api.cancelReservation(activeReservation.id);
                    setToast({ message: "Reservation cancelled", type: "success" });
                    setActiveReservation(null);
                    load();
                  } catch (err) {
                    setToast({ message: "Failed to cancel", type: "error" });
                  }
                }}
              >
                <span>❌</span> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="card card-large">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: "rgba(200, 0, 10, 0.1)" }}
              >
                📅
              </div>
              <div>
                <h2 className="text-xl font-bold">Book a Table</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Fill in your details to reserve
                </p>
              </div>
            </div>

            <div className="space-y-4">
            <div className="form-group mb-0">
              <label className="form-label">Date</label>
              <input 
                className="input" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
              />
            </div>
            
            <div className="form-group mb-0">
              <label className="form-label">Time</label>
              <input 
                className="input" 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)} 
              />
            </div>
            
            <div className="form-group mb-0">
              <label className="form-label">
                Party Size (Max: {maxPartySize})
              </label>
              <input 
                className={`input ${partyError ? "input-error" : ""}`}
                type="number" 
                min="1" 
                max={maxPartySize} 
                value={party} 
                onChange={(e) => setParty(e.target.value)} 
                placeholder={`Number of guests`}
              />
              {partyError && (
                <div className="form-error">
                  <span>⚠️</span> {partyError}
                </div>
              )}
            </div>
            
            <div className="form-group mb-0">
              <label className="form-label">Seating Area</label>
              <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">Select area (optional)</option>
                <option value="indoor">🪴 Indoor</option>
                <option value="outdoor">☀️ Outdoor</option>
                <option value="vip">⭐ VIP</option>
              </select>
            </div>
            
            <div className="form-group mb-0">
              <label className="form-label">Special Requests</label>
              <input 
                className="input" 
                value={req} 
                onChange={(e) => setReq(e.target.value)} 
                placeholder="Any special requests? (optional)" 
              />
              <div className="form-hint">E.g., birthday celebration, dietary restrictions</div>
            </div>
            
            {/* Pre-order Menu Section */}
            {menuItems.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                  🍽️ Pre-order Food (Optional)
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {menuItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded" style={{ background: "var(--bg-subtle)" }}>
                      {/* Item Image */}
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "var(--bg-input)" }}>
                          <span className="text-lg">🍽️</span>
                        </div>
                      )}
                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          ₱{item.price} · {item.category}
                        </div>
                      </div>
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 flex-shrink-0">
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
            
            <button 
              className="btn btn-primary btn-lg w-full mt-4" 
              onClick={createReservation}
              disabled={!!partyError}
            >
              <span>✓</span> Confirm Reservation
            </button>
          </div>
        </div>
        )}

        {/* My reservations */}
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
                <h2 className="text-xl font-bold">My Reservations</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {list.length} {list.length === 1 ? "reservation" : "reservations"}
                </p>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={load}>
              🔄 Refresh
            </button>
          </div>

          <div className="space-y-3">
            {list.length === 0 && (
              <div className="empty-state py-8">
                <div className="empty-state-icon">📭</div>
                <h3 className="empty-state-title">No reservations yet</h3>
                <p className="empty-state-desc">
                  Create your first booking to see it here.
                </p>
              </div>
            )}

            {list.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border transition-all hover:border-[var(--red)]/30" style={{ background: "var(--bg-input)", borderColor: "var(--border)" }}>
                {/* Top row - Date & Status */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="font-bold">{r.date} · {r.time}</div>
                  <span className="badge badge-sm badge-secondary">Party of {r.party_size}</span>
                  {r.status === "confirmed" && <span className="badge badge-sm badge-success">Confirmed</span>}
                  {r.status === "pending" && <span className="badge badge-sm badge-warning">Pending</span>}
                  {r.status === "cancelled" && <span className="badge badge-sm badge-error">Cancelled</span>}
                  {r.status === "checked_in" && <span className="badge badge-sm badge-info">Checked In</span>}
                  {r.table_name && (
                    <span className="badge badge-sm badge-secondary">
                      Table {r.table_name}
                    </span>
                  )}
                </div>

                {r.special_requests && (
                  <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                    Request: {r.special_requests}
                  </div>
                )}

                {/* Pre-order Items with Images */}
                {r.pre_order_items && r.pre_order_items.length > 0 && (
                  <div className="mt-2 mb-2">
                    <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                      🍽️ Pre-ordered Items:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.pre_order_items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: "var(--bg-subtle)" }}>
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name}
                              className="w-6 h-6 rounded object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="text-sm">🍽️</span>
                          )}
                          <span className="text-xs">{item.name} × {item.quantity}</span>
                        </div>
                      ))}
                    </div>
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

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => receipt(r.id)}
                  >
                    <span>📄</span> Receipt
                  </button>
                  {r.status !== "cancelled" && r.status !== "checked_in" && (
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => cancel(r.id)}
                    >
                      <span>✕</span> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Modal for Pre-orders */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handlePaymentClose}
        amount={pendingReservation?.pre_order_items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0}
        itemName="Pre-order Food"
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}