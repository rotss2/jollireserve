import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getToken } from "../lib/token";

export default function Scan() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const handledRef = useRef(false); // ✅ prevent double-fire without stale closure
  const [status, setStatus] = useState("starting");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [cameraErr, setCameraErr] = useState("");

  // ── Handle a decoded QR value ──────────────────────────────────────────
  const handleDecode = useCallback(async (decodedText) => {
    if (handledRef.current) return; // ✅ use ref instead of stale status state
    handledRef.current = true;

    const match = /^JR:(.+)$/.exec(decodedText.trim());
    if (!match) {
      setStatus("error");
      setMessage("Invalid QR code. Expected a JolliReserve reservation QR.");
      handledRef.current = false; // allow retry
      return;
    }

    const reservationId = match[1];

    // Stop camera before doing async work
    try { await scannerRef.current?.stop(); } catch { }

    if (!getToken()) {
      setStatus("error");
      setMessage("Please log in as staff or admin before scanning.");
      return;
    }

    try {
      setStatus("starting");
      setMessage("Checking in…");
      const res = await api.adminCheckinReservation(reservationId);
      setResult({
        id: reservationId,
        name: res?.reservation?.user_name || res?.reservation?.name || "",
      });
      setStatus("success");
      setMessage("Check-in successful! Redirecting…");
      setTimeout(() => navigate("/admin"), 1500);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Check-in failed";
      setStatus("error");
      setMessage(msg);
      handledRef.current = false; // allow retry on error
    }
  }, [navigate]);

  // ── Keep a stable ref to handleDecode so useEffect never goes stale ───
  const handleDecodeRef = useRef(handleDecode);
  useEffect(() => { handleDecodeRef.current = handleDecode; }, [handleDecode]);

  // ── Start camera on mount ──────────────────────────────────────────────
  useEffect(() => {
    const qr = new Html5Qrcode("qr-reader-box");
    scannerRef.current = qr;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (!cameras || cameras.length === 0) {
          setCameraErr("No camera found on this device.");
          setStatus("idle");
          return;
        }
        const cam =
          cameras.find((c) => /back|rear|environment/i.test(c.label)) ||
          cameras[cameras.length - 1]; // ✅ prefer last camera (usually back on mobile)
        return qr.start(
          { deviceId: { exact: cam.id } },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => handleDecodeRef.current(decoded), // ✅ always calls latest handleDecode
          () => {} // ignore per-frame errors
        );
      })
      .then(() => setStatus("scanning"))
      .catch((err) => {
        setCameraErr(
          err?.message ||
          "Camera permission denied. You can still upload a QR image below."
        );
        setStatus("idle");
      });

    return () => {
      qr.stop().catch(() => {});
    };
  }, []); // ✅ runs once — no stale closure problem anymore

  // ── File upload fallback ───────────────────────────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    handledRef.current = false; // reset for file scan
    const qr = new Html5Qrcode("qr-file-reader");
    try {
      const decoded = await qr.scanFile(file, true);
      await handleDecode(decoded);
    } catch {
      setStatus("error");
      setMessage("Could not read a QR code from that image. Try a clearer photo.");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
        .scan-root{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:2rem 1rem;font-family:'DM Sans',sans-serif;background:var(--bg-body);color:var(--text-main);}
        .scan-card{width:100%;max-width:420px;background:var(--bg-card);border:1px solid var(--border);border-radius:1.5rem;padding:1.75rem;box-shadow:var(--shadow-card);margin-top:2rem;}
        .scan-title{font-size:1.3rem;font-weight:800;margin-bottom:0.25rem;letter-spacing:-0.03em;}
        .scan-sub{font-size:0.83rem;color:var(--text-muted);margin-bottom:1.25rem;}
        #qr-reader-box{width:100%;border-radius:1rem;overflow:hidden;background:#000;}
        #qr-reader-box video{width:100%!important;border-radius:1rem;}
        .scan-status{margin-top:1.2rem;padding:0.85rem 1rem;border-radius:0.9rem;font-size:0.9rem;font-weight:600;text-align:center;}
        .scan-status.scanning{background:rgba(16,163,74,0.1);color:#16a34a;border:1px solid rgba(16,163,74,0.2);}
        .scan-status.success{background:rgba(16,163,74,0.15);color:#15803d;border:1px solid rgba(16,163,74,0.3);}
        .scan-status.error{background:rgba(232,53,42,0.1);color:#e8352a;border:1px solid rgba(232,53,42,0.2);}
        .scan-status.starting{background:rgba(0,0,0,0.04);color:var(--text-muted);border:1px solid var(--border);}
        .scan-divider{display:flex;align-items:center;gap:0.75rem;margin:1.2rem 0;color:var(--text-muted);font-size:0.78rem;}
        .scan-divider::before,.scan-divider::after{content:'';flex:1;height:1px;background:var(--border);}
        .scan-upload-btn{width:100%;padding:0.7rem;border:1.5px dashed var(--border);border-radius:0.85rem;background:transparent;color:var(--text-muted);font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:600;cursor:pointer;transition:all 0.2s;text-align:center;}
        .scan-upload-btn:hover{border-color:var(--red);color:var(--red);}
        #qr-file-reader{display:none;}
      `}</style>

      <div className="scan-root">
        <div className="scan-card">
          <div className="scan-title">📷 Scan Check-in QR</div>
          <div className="scan-sub">Staff / Admin only. Point the camera at the guest's QR code.</div>

          <div id="qr-reader-box" />
          <div id="qr-file-reader" />

          {(status !== "idle" || message) && (
            <div className={`scan-status ${status}`}>
              {status === "scanning" && "🟢 Camera active — scanning for QR code…"}
              {status === "starting" && (message || "Starting camera…")}
              {status === "success" && `✅ ${message}`}
              {status === "error" && `❌ ${message}`}
            </div>
          )}

          {cameraErr && (
            <div className="scan-status error" style={{ marginTop: "1rem" }}>
              📷 {cameraErr}
            </div>
          )}

          <div className="scan-divider">or upload a QR image</div>
          <button
            className="scan-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            📁 Upload QR Code Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </>
  );
}