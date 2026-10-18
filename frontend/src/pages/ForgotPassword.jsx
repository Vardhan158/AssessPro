import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  ShieldCheck,
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devResetToken, setDevResetToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setDevResetToken(null);
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(
        res.data.message ||
          "If an account with this email address exists in our system, password reset instructions have been sent.",
      );
      if (res.data.resetToken) {
        setDevResetToken(res.data.resetToken);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError(
          err.response?.data?.message ||
            "Rate limit exceeded for password recovery requests. Please try again later.",
        );
      } else {
        // Safe generic confirmation on error to prevent account enumeration
        setMessage(
          "If an account with this email address exists in our system, password reset instructions have been sent.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl mb-3 shadow-inner">
            <ShieldCheck className="w-9 h-9 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Password Recovery
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Enter your registered candidate email to receive password recovery
            instructions
          </p>
        </div>

        {/* Error alert (e.g. Rate limit) */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Generic Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-3">
            <div className="flex items-start gap-2.5 font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>{message}</div>
            </div>

            {/* Dev helper button if reset token returned */}
            {devResetToken && (
              <div className="pt-3 border-t border-emerald-500/20 text-center">
                <button
                  onClick={() =>
                    navigate(`/reset-password?token=${devResetToken}`)
                  }
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" /> Proceed
                  to Reset Password Page
                </button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Registered Candidate Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="candidate@institute.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? "Processing Request..." : "Send Recovery Instructions"}{" "}
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-5">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
