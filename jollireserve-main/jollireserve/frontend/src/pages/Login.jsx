import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
      if (err.response && err.response.status === 403) {
        showToast("error", "Your account has been suspended. Please contact customer service.");
      } else {
        const msg = err.response?.data?.error || err.message;
        if (msg === "EMAIL_NOT_VERIFIED") {
          showToast("error", "Email not verified. Please check your inbox for the code.");
          setVerifyEmail(loginEmail);
          setStep("verify");
        } else {
          showToast("error", "Invalid email or password. Please check your credentials.");
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
      if (res.data.warning) {
        showToast("warning", res.data.warning);
      } else {
        showToast("success", "OTP sent to your email. Check your inbox!");
      }
    } catch (err) {
      showToast("error", err.response?.data?.error || "Signup failed. Please try again.");
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
        showToast("error", "Verification failed. Please try again.");
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
      showToast("error", "Resend failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center px-4 py-8">
      <Toast value={toast} onClose={() => setToast(null)} />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#B91C1C] flex items-center justify-center">
              <span className="text-white text-lg font-bold">J</span>
            </div>
            <span className="font-bold text-xl text-gray-900">JolliReserve</span>
          </Link>
          <p className="text-sm text-gray-500">
            Sign in to manage reservations or check your queue
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {/* Tabs */}
          {step !== "verify" && (
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setMode("login"); setStep("auth"); }}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                  mode === "login"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode("register"); setStep("auth"); }}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                  mode === "register"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Content */}
          {step === "verify" ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-600 mb-6">
                We sent a 6-digit code to <span className="font-semibold text-gray-900">{verifyEmail}</span>
              </p>
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">OTP Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors text-center text-lg tracking-widest"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-11"
                >
                  {loading ? "Verifying..." : "Verify Email"}
                </button>
              </form>
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setStep("auth")}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-sm text-[#B91C1C] hover:text-[#991B1B] disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </>
          ) : mode === "login" ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome back</h2>
              <p className="text-sm text-gray-600 mb-6">Sign in to your account to continue.</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-11"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
              <p className="text-xs text-gray-500 text-center mt-4">
                Just signed up? Verify your email before signing in.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Create account</h2>
              <p className="text-sm text-gray-600 mb-6">Fill in your details to get started.</p>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C] outline-none transition-colors h-11"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-11"
                >
                  {loading ? "Creating account..." : "Sign Up & Send OTP"}
                </button>
              </form>
              <p className="text-xs text-gray-500 text-center mt-4">
                A verification code will be sent to your email after signing up.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}