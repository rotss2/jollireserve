import React, { useEffect, useState } from "react";
import Toast from "../components/Toast";
import { api } from "../lib/api";
import { connectWS, onWSMessage } from "../lib/ws";

export default function Reservations() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [party, setParty] = useState(2);
  const [area, setArea] = useState("");
  const [req, setReq] = useState("");
  const [list, setList] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    try {
      const data = await api.myReservations();
      setList(data.reservations || []);
    } catch (e) {
      console.error("Failed to load reservations", e);
    }
  }

  useEffect(() => {
    load();
    connectWS();
    const off = onWSMessage((msg) => {
      if (msg.type === "reservation:changed") load();
    });
    return () => off();
  }, []);

  async function createReservation() {
    setIsSubmitting(true);
    try {
      await api.createReservation({
        date, time, party_size: Number(party),
        area_pref: area || null,
        special_requests: req || null,
      });
      setToast({ message: "Reservation confirmed!", type: "success" });
      setDate(""); setTime(""); setReq(""); setArea(""); setParty(2);
      setCurrentStep(1);
      await load();
    } catch (e) {
      setToast({ message: e.message || "Failed to create reservation", type: "error" });
    } finally {
      setIsSubmitting(false);
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

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, 3));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  const isStep1Valid = date && time;
  const isStep2Valid = party >= 1;

  return (
    <div className="min-h-screen bg-[#FFFBF5] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Make a Reservation</h1>
          <p className="text-gray-600">Book your table in a few simple steps</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                currentStep >= step
                  ? "bg-[#B91C1C] text-white"
                  : "bg-gray-200 text-gray-500"
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-12 sm:w-20 h-1 mx-2 ${
                  currentStep > step ? "bg-[#B91C1C]" : "bg-gray-200"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              {/* Step 1: Date & Time */}
              {currentStep === 1 && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">When would you like to dine?</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={nextStep}
                      disabled={!isStep1Valid}
                      className="px-6 py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-11"
                    >
                      Continue →
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Party Details */}
              {currentStep === 2 && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Tell us about your party</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number of Guests</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={party}
                        onChange={(e) => setParty(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Seating Preference (Optional)</label>
                      <select
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11 bg-white"
                      >
                        <option value="">No preference</option>
                        <option value="indoor">Indoor</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests (Optional)</label>
                      <textarea
                        value={req}
                        onChange={(e) => setReq(e.target.value)}
                        placeholder="Any special requests? E.g., birthday celebration, dietary restrictions"
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between mt-6">
                    <button
                      onClick={prevStep}
                      className="px-6 py-3 text-gray-600 font-semibold hover:text-gray-900 transition-colors h-11"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={nextStep}
                      disabled={!isStep2Valid}
                      className="px-6 py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-11"
                    >
                      Continue →
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Review & Confirm */}
              {currentStep === 3 && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Review your reservation</h2>
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date</span>
                      <span className="font-semibold text-gray-900">{date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time</span>
                      <span className="font-semibold text-gray-900">{time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Party Size</span>
                      <span className="font-semibold text-gray-900">{party} guests</span>
                    </div>
                    {area && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Seating</span>
                        <span className="font-semibold text-gray-900 capitalize">{area}</span>
                      </div>
                    )}
                    {req && (
                      <div className="pt-4 border-t border-gray-200">
                        <span className="text-gray-600 block mb-1">Special Requests</span>
                        <span className="text-gray-900">{req}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={prevStep}
                      className="px-6 py-3 text-gray-600 font-semibold hover:text-gray-900 transition-colors h-11"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={createReservation}
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-11"
                    >
                      {isSubmitting ? "Confirming..." : "Confirm Reservation"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* My Reservations List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">My Reservations</h2>
                <button
                  onClick={load}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Refresh
                </button>
              </div>

              {list.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 text-3xl">📭</div>
                  <h3 className="text-gray-900 font-medium mb-1">No reservations yet</h3>
                  <p className="text-sm text-gray-500">Create your first booking to see it here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {list.map((r) => (
                    <div key={r.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{r.date}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-900">{r.time}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                          Party of {r.party_size}
                        </span>
                        {r.status === "confirmed" && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Confirmed</span>
                        )}
                        {r.status === "pending" && (
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Pending</span>
                        )}
                        {r.status === "cancelled" && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Cancelled</span>
                        )}
                      </div>
                      {r.status !== "cancelled" && (
                        <button
                          onClick={() => cancel(r.id)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Cancel reservation
                        </button>
                      )}
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