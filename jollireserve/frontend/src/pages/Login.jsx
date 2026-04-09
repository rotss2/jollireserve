import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setToken } from "../lib/token";
import Toast from "../components/Toast";

export default function Login({ onAuthed }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("auth");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [verifyEmail, setVerifyEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (type, message) => setToast({ type, message });

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email: loginEmail, password: loginPassword });
      setToken(res.data.token);
      onAuthed?.(res.data.user);
      showToast("success", "Logged in!");
      navigate("/");
    } catch (err) {
      // ✅ Handle Suspension (403 Forbidden)
      if (err.response && err.response.status === 403) {
        showToast("error", "your account has been suspended, Please contact our customer service");
      } else {
        const msg = err.response?.data?.error || err.message;
        if (msg === "EMAIL_NOT_VERIFIED") {
          showToast("error", "Email not verified. Please check your inbox for the code.");
          setVerifyEmail(loginEmail);
          setStep("verify");
        } else {
          showToast("error", msg || "Invalid credentials");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { name, email: signupEmail, password: signupPassword });
      setVerifyEmail(signupEmail);
      setStep("verify");
      
      // Check if email actually sent
      if (res.data.warning) {
        showToast("warning", res.data.warning);
      } else {
        showToast("success", "OTP sent to your email. Check your inbox!");
      }
    } catch (err) {
      showToast("error", err.response?.data?.error || err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-email", { email: verifyEmail, code: otp });
      if (res.data.token) {
        setToken(res.data.token);
        onAuthed?.(res.data.user);
        showToast("success", "Email verified! Logged in.");
        navigate("/");
      } else {
        showToast("success", "Verified! You can now login.");
        setMode("login");
        setStep("auth");
        setOtp("");
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (msg === "CODE_EXPIRED") {
        showToast("error", "Code expired. Please request a new one.");
      } else if (msg === "INVALID_CODE") {
        showToast("error", "Invalid code. Please try again.");
      } else {
        showToast("error", msg || "Verification failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      await api.post("/auth/request-verification", { email: verifyEmail });
      showToast("success", "OTP resent. Check your inbox.");
    } catch (err) {
      showToast("error", err.response?.data?.error || err.message || "Resend failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');

        .jr-root {
          min-height: 100vh;
          background: transparent;
          color: var(--text-main);
          font-family: 'DM Sans', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .jr-wrapper {
          width: 100%;
          max-width: 400px;
          animation: jr-fadeUp 0.45s ease forwards;
        }

        @keyframes jr-fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .jr-header {
          text-align: center;
          margin-bottom: 2.25rem;
        }

        .jr-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 0.5rem;
        }

        .jr-brand-dot {
          width: 9px;
          height: 9px;
          background: var(--red);
          border-radius: 50%;
          box-shadow: 0 0 12px var(--red-glow);
          animation: jr-pulse 2.5s ease-in-out infinite;
        }

        @keyframes jr-pulse {
          0%, 100% { box-shadow: 0 0 10px var(--red-glow); }
          50%       { box-shadow: 0 0 22px var(--red-glow); }
        }

        .jr-brand-name {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          color: var(--text-main);
        }

        .jr-tagline {
          font-size: 0.72rem;
          color: var(--text-muted);
          letter-spacing: 0.07em;
          text-transform: uppercase;
          font-family: 'DM Mono', monospace;
        }

        .jr-tabs {
          display: flex;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 3px;
          margin-bottom: 1.25rem;
          gap: 3px;
        }

        .jr-tab {
          flex: 1;
          padding: 0.55rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          border-radius: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .jr-tab.active {
          background: var(--bg-card);
          color: var(--text-main);
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
          font-weight: 600;
        }

        .jr-tab:hover:not(.active) { color: var(--text-main); }

        .jr-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-card);
          border-radius: 20px;
          padding: 1.75rem;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .jr-card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.03em;
          margin-bottom: 0.35rem;
        }

        .jr-card-sub {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          line-height: 1.55;
        }

        .jr-card-sub span {
          color: var(--text-main);
          font-weight: 600;
        }

        .jr-field { margin-bottom: 1rem; }

        .jr-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 0.4rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-family: 'DM Mono', monospace;
          opacity: 0.7;
        }

        .jr-input {
          width: 100%;
          padding: 0.7rem 0.9rem;
          background: var(--bg-input);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          color: var(--text-main);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          font-weight: 500;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          -webkit-appearance: none;
        }

        .jr-input::placeholder { color: var(--text-faint); font-weight: 400; }
        .jr-input:focus { border-color: var(--red); box-shadow: 0 0 0 3px var(--red-glow); }

        .jr-btn {
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--red);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 0.5rem;
          letter-spacing: -0.01em;
          box-shadow: 0 2px 14px var(--red-glow);
        }

        .jr-btn:hover:not(:disabled) {
          background: var(--red2);
          box-shadow: 0 4px 22px var(--red-glow);
          transform: translateY(-1px);
        }

        .jr-btn:active:not(:disabled) { transform: translateY(0); }
        .jr-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .jr-helper {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
          margin-top: 1rem;
          line-height: 1.6;
        }

        .jr-divider { height: 1px; background: var(--border); margin: 1.4rem 0; }

        .jr-features { display: flex; flex-direction: column; gap: 0.6rem; }

        .jr-feature {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .jr-feature-dot {
          width: 5px; height: 5px; min-width: 5px;
          background: var(--red); border-radius: 50%;
        }

        .jr-verify-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 1rem;
        }

        .jr-ghost {
          background: none; border: none;
          color: var(--text-muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem; font-weight: 500;
          cursor: pointer; padding: 0;
          transition: color 0.2s;
        }

        .jr-ghost:hover:not(:disabled) { color: var(--text-main); }
        .jr-ghost:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>

      <div className="jr-root">
        <div className="jr-wrapper">
          <Toast value={toast} onClose={() => setToast(null)} />

          {/* Brand Header */}
          <div className="jr-header">
            <div className="jr-brand">
              <div className="jr-brand-dot" />
              <span className="jr-brand-name">JolliReserve</span>
            </div>
            <p className="jr-tagline">Reservation & Queue Management</p>
          </div>

          {/* Mode Tabs */}
          {step !== "verify" && (
            <div className="jr-tabs">
              <button
                className={`jr-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => { setMode("login"); setStep("auth"); }}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`jr-tab ${mode === "register" ? "active" : ""}`}
                onClick={() => { setMode("register"); setStep("auth"); }}
                type="button"
              >
                Create Account
              </button>
            </div>
          )}

          {/* Card */}
          <div className="jr-card">

            {step === "verify" ? (
              <>
                <p className="jr-card-title">Check your email</p>
                <p className="jr-card-sub">
                  We sent a 6-digit code to <span>{verifyEmail}</span>
                </p>
                <form onSubmit={handleVerify}>
                  <div className="jr-field">
                    <label className="jr-label">OTP Code</label>
                    <input
                      className="jr-input"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>
                  <button type="submit" disabled={loading} className="jr-btn">
                    {loading ? "Verifying..." : "Verify Email"}
                  </button>
                </form>
                <div className="jr-verify-actions">
                  <button className="jr-ghost" type="button" onClick={() => setStep("auth")}>
                    ← Back
                  </button>
                  <button className="jr-ghost" type="button" onClick={handleResend} disabled={loading}>
                    Resend code
                  </button>
                </div>
              </>

            ) : mode === "login" ? (
              <>
                <p className="jr-card-title">Welcome back</p>
                <p className="jr-card-sub">Sign in to your account to continue.</p>
                <form onSubmit={handleLogin}>
                  <div className="jr-field">
                    <label className="jr-label">Email</label>
                    <input
                      className="jr-input"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoComplete="email"
                    />
                  </div>
                  <div className="jr-field">
                    <label className="jr-label">Password</label>
                    <input
                      className="jr-input"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="jr-btn">
                    {loading ? "Signing in..." : "Sign In"}
                  </button>
                </form>
                <p className="jr-helper">
                  Just signed up? Verify your email before signing in.
                </p>
                <div className="jr-divider" />
                <div className="jr-features">
                  <div className="jr-feature"><div className="jr-feature-dot" />Book reservations & join queue</div>
                  <div className="jr-feature"><div className="jr-feature-dot" />Real-time queue updates</div>
                  <div className="jr-feature"><div className="jr-feature-dot" />QR check-in page</div>
                  <div className="jr-feature"><div className="jr-feature-dot" />Admin dashboard + analytics</div>
                </div>
              </>

            ) : (
              <>
                <p className="jr-card-title">Create account</p>
                <p className="jr-card-sub">Fill in your details to get started.</p>
                <form onSubmit={handleRegister}>
                  <div className="jr-field">
                    <label className="jr-label">Full Name</label>
                    <input
                      className="jr-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="jr-field">
                    <label className="jr-label">Email</label>
                    <input
                      className="jr-input"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoComplete="off"
                    />
                  </div>
                  <div className="jr-field">
                    <label className="jr-label">Password</label>
                    <input
                      className="jr-input"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="jr-btn">
                    {loading ? "Creating account..." : "Sign Up & Send OTP"}
                  </button>
                </form>
                <p className="jr-helper">
                  A verification code will be sent to your email after signing up.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}