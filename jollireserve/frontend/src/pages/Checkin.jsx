import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import Toast from "../components/Toast";
import { api } from "../lib/api";
import { getToken } from "../lib/token";

export default function Checkin() {
  const { id } = useParams();
  const url = window.location.href;
  const [toast, setToast] = useState({ message:"", type:"success" });
  const [loading, setLoading] = useState(false);

  const isLoggedIn = !!getToken();

  async function markCheckin(){
    setLoading(true);
    try{
      await api.checkinReservation(id);
      setToast({ message:"Reservation checked-in!", type:"success" });
    }catch(e){
      setToast({ message: e?.message || "Check-in failed (staff/admin only).", type:"error" });
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <Toast message={toast.message} type={toast.type} onClose={()=>setToast({message:"",type:"success"})} />

      <div className="card p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-black">QR Check-in</h2>
            <p className="text-black/60 mt-1">
              Scan this QR at the counter to open this page. Staff/Admin can mark as checked-in.
            </p>
            <div className="mt-2 text-sm">
              Reservation ID: <span className="font-mono">{id}</span>
            </div>
          </div>

          <div className="shrink-0">
            <QRCodeCanvas value={url} size={150} />
          </div>
        </div>

        <div className="mt-6 flex gap-2 flex-wrap">
          <Link className="btn btn-outline" to="/reservations">Back to Reservations</Link>
          {isLoggedIn ? (
            <button className="btn btn-red" onClick={markCheckin} disabled={loading}>
              {loading ? "Checking in..." : "Mark Checked-in (Staff/Admin)"}
            </button>
          ) : (
            <Link className="btn btn-red" to="/login">Login as Staff/Admin</Link>
          )}
        </div>

        <div className="mt-4 text-xs text-black/60">
          Tip: You can print this page or show it on your phone.
        </div>
      </div>
    </div>
  );
}
