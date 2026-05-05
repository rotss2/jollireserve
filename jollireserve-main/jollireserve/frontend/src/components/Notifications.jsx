import React, { useEffect, useMemo, useState } from "react";
import { connectWS, onWSMessage } from "../lib/ws";

function classFor(level){
  if (level === "error") return "bg-red-100 border-red-200 text-red-900";
  if (level === "success") return "bg-emerald-100 border-emerald-200 text-emerald-900";
  return "bg-amber-100 border-amber-200 text-amber-900";
}

export default function Notifications(){
  const [items, setItems] = useState([]);

  useEffect(() => {
    connectWS();
    const off = onWSMessage((msg) => {
      if (msg?.type !== "notify") return;
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const level = msg.level || "info";
      const message = msg.message || "Updated";
      setItems((prev) => [{ id, level, message }, ...prev].slice(0, 4));
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 3200);
    });
    return () => off();
  }, []);

  if (!items.length) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-[360px]">
      {items.map((t) => (
        <div key={t.id} className={`border ${classFor(t.level)} rounded-2xl px-4 py-3 shadow-soft`}>
          <div className="text-sm font-semibold">{t.message}</div>
        </div>
      ))}
    </div>
  );
}
