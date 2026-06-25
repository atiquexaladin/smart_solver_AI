import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation() as any;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Admin login failed");
      localStorage.setItem("ss_token", data.token);
      navigate(location?.state?.from || "/admin", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      let data: any;
      try {
        data = await res.json();
      } catch {
        data = { error: "Invalid server response" };
      }
      if (!res.ok) throw new Error(data?.error || "Failed to reset password");
      setIsForgotPassword(false);
      setEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      alert("Password reset successfully! Please sign in with your new password.");
    } catch (err: any) {
      setError(err?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#111113] p-8 shadow-2xl">
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-slate-500 text-sm mt-1">{isForgotPassword ? "Reset your password" : "Login as teacher/admin"}</p>

        {isForgotPassword ? (
          <form onSubmit={onResetPassword} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-white outline-none focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 mt-2"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setEmail("");
                setNewPassword("");
                setConfirmPassword("");
                setError(null);
              }}
              className="w-full py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Back to login
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-white outline-none focus:border-indigo-500"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 mt-2"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsForgotPassword(true);
                  setError(null);
                }}
                className="text-sm text-indigo-400 hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
          </>
        )}

        <div className="mt-6 text-center">
          <a className="text-sm text-slate-400 hover:underline" href="/chat">
            Back to student login
          </a>
        </div>
      </div>
    </div>
  );
}

