import axios from "axios";
import { getToken } from "./token";

function getApiUrl() {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:4000/api";
  return `https://${hostname}/api`;
}

function getWsUrl() {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "ws://localhost:4000/ws";
  const apiUrl = import.meta.env.VITE_API_URL || "";
  if (apiUrl) { const url = new URL(apiUrl); return `wss://${url.hostname}/ws`; }
  return `wss://${hostname}/ws`;
}

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || getApiUrl(),
  headers: { "Content-Type": "application/json" },
});

instance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ SMART INTERCEPTOR: Detects suspension but ignores login attempts
instance.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginRequest = error.config.url.includes("/auth/login");
    const isMeRequest = error.config.url.includes("/auth/me");

    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Only broadcast suspension if we are NOT trying to log in
      // and specifically if the identity check fails
      if (!isLoginRequest && isMeRequest) {
        window.dispatchEvent(new CustomEvent("user-suspended"));
      }
    }
    return Promise.reject(error);
  }
);

export { getWsUrl };

export const api = {
  // ── Auth ──────────────────────────────────────────────
  async getMe() {
    const res = await instance.get("/auth/me");
    return res.data;
  },
  async logout() {
    const res = await instance.post("/auth/logout");
    return res.data;
  },
  async getActivity() {
    const res = await instance.get("/auth/activity");
    return res.data;
  },
  async updateProfile(payload) {
    const res = await instance.post("/auth/profile", payload);
    return res.data;
  },
  async requestPasswordOTP() {
    const res = await instance.post("/auth/request-password-otp");
    return res.data;
  },
  async changePassword(payload) {
    const res = await instance.post("/auth/password", payload);
    return res.data;
  },

  // ── Reservations (user) ───────────────────────────────
  async myReservations() {
    const res = await instance.get("/reservations/mine");
    return res.data;
  },
  async createReservation(payload) {
    const res = await instance.post("/reservations", payload);
    return res.data;
  },
  async cancelReservation(id) {
    const res = await instance.post(`/reservations/${id}/cancel`);
    return res.data;
  },
  async downloadReceipt(id) {
    const res = await instance.get(`/reservations/${id}/receipt.pdf`, { responseType: "blob" });
    return res.data;
  },

  // ── Queue (user) ──────────────────────────────────────
  async queueActive() {
    const res = await instance.get("/queue/active");
    return res.data;
  },
  async queueHistory() {
    const res = await instance.get("/queue/history");
    return res.data;
  },
  async queueJoin(payload) {
    const res = await instance.post("/queue/join", payload);
    return res.data;
  },

  // ── Admin Tables ──────────────────────────────────────
  async adminTables() {
    const res = await instance.get("/admin/tables");
    return res.data;
  },
  async createTable(payload) {
    const res = await instance.post("/admin/tables", payload);
    return res.data;
  },
  async updateTable(id, payload) {
    const res = await instance.patch(`/admin/tables/${id}`, payload);
    return res.data;
  },
  async deleteTable(id) {
    const res = await instance.delete(`/admin/tables/${id}`);
    return res.data;
  },

  // ── Admin Queue ───────────────────────────────────────
  async adminQueueActive() {
    const res = await instance.get("/admin/queue/active");
    return res.data;
  },
  async adminWalkIn(payload) {
    const res = await instance.post("/admin/queue/walk-in", payload);
    return res.data;
  },
  async adminCallQueue(id) {
    const res = await instance.post(`/admin/queue/${id}/call`);
    return res.data;
  },
  async adminSeatQueue(id) {
    const res = await instance.post(`/admin/queue/${id}/seated`);
    return res.data;
  },
  async adminCancelQueue(id) {
    const res = await instance.post(`/admin/queue/${id}/cancel`);
    return res.data;
  },

  // ── Admin Reservations ────────────────────────────────
  async adminReservations() {
    const res = await instance.get("/admin/reservations");
    return res.data;
  },
  async adminCheckinReservation(id) {
    const res = await instance.post(`/reservations/${id}/checkin`);
    return res.data;
  },
  async adminCompleteReservation(id) {
    const res = await instance.post(`/admin/reservations/${id}/complete`);
    return res.data;
  },
  async adminCancelReservation(id) {
    const res = await instance.post(`/admin/reservations/${id}/cancel`);
    return res.data;
  },
  async adminDeleteReservation(id) {
    const res = await instance.delete(`/admin/reservations/${id}`);
    return res.data;
  },

  // ── Admin Users ───────────────────────────────────────
  async adminUsers() {
    const res = await instance.get("/admin/users");
    return res.data;
  },
  async adminActivity(limit = 50) {
    const res = await instance.get(`/admin/activity?limit=${limit}`);
    return res.data;
  },
  async adminUpdateUserRole(id, role) {
    const res = await instance.patch(`/admin/users/${id}/role`, { role });
    return res.data;
  },
  async adminSuspendUser(id, suspended) {
    const res = await instance.patch(`/admin/users/${id}/suspend`, { suspended });
    return res.data;
  },
  async adminResetPassword(id, password) {
    const res = await instance.patch(`/admin/users/${id}/password`, { password });
    return res.data;
  },
  async adminDeleteUser(id) {
    const res = await instance.delete(`/admin/users/${id}`);
    return res.data;
  },
  async adminUserHistory(id) {
    const res = await instance.get(`/admin/users/${id}/history`);
    return res.data;
  },

  // ── Announcements ─────────────────────────────────────
  async getAnnouncements() {
    const res = await instance.get("/admin/announcements");
    return res.data;
  },
  async createAnnouncement(payload) {
    const res = await instance.post("/admin/announcements", payload);
    return res.data;
  },
  async deleteAnnouncement(id) {
    const res = await instance.delete(`/admin/announcements/${id}`);
    return res.data;
  },

  // ── Analytics ─────────────────────────────────────────
  async analyticsSummary() {
    const res = await instance.get("/admin/analytics/summary");
    return res.data;
  },
  async analyticsByDay(from, to) {
    const res = await instance.get(`/admin/analytics/reservations-by-day?from=${from}&to=${to}`);
    return res.data;
  },
  async analyticsPeakHours(date) {
    const res = await instance.get(`/admin/analytics/peak-hours?date=${date}`);
    return res.data;
  },
  async analyticsUtil(from, to) {
    const res = await instance.get(`/admin/analytics/table-utilization?from=${from}&to=${to}`);
    return res.data;
  },

  // ── Settings ─────────────────────────────────────────
  async getSettings() {
    const res = await instance.get("/admin/settings");
    return res.data;
  },
  async adminGetSettings() {
    const res = await instance.get("/admin/settings/admin");
    return res.data;
  },
  async adminUpdateSettings(settings) {
    const res = await instance.post("/admin/settings", settings);
    return res.data;
  },

  // ── Raw passthrough ───────────────────────────────────
  get: (url, config) => instance.get(url, config),
  post: (url, data, config) => instance.post(url, data, config),
  patch: (url, data, config) => instance.patch(url, data, config),
  delete: (url, config) => instance.delete(url, config),
};

export default api;