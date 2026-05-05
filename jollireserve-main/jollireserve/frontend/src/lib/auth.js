import api from "./api";
import { setToken, clearToken, getToken } from "./token";

function extractError(err) {
  // Pull the actual error message from the API response body
  return err?.response?.data?.error || err?.message || "Something went wrong";
}

export async function login(email, password) {
  try {
    const res = await api.post("/auth/login", { email, password });
    setToken(res.data.token);
    return res.data.user;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function signup(name, email, password) {
  try {
    const res = await api.post("/auth/register", { name, email, password });
    setToken(res.data.token);
    return res.data.user;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function logout() {
  clearToken();
}

export async function getMe() {
  const token = getToken();
  if (!token) return null;

  // The interceptor in api.js will handle 401/403 automatically
  const res = await api.get("/auth/me");
  return res.data.user ?? res.data;
}
