import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  KeyRound,
  ArrowLeft,
} from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || searchParams.get("code") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenContext, setTokenContext] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Password Policy criteria check
  const passwordCriteria = [
    { label: "At least 8 characters long", met: newPassword.length >= 8 },
    {
      label: "At least 1 uppercase letter (A-Z)",
      met: /[A-Z]/.test(newPassword),
    },
    {
      label: "At least 1 lowercase letter (a-z)",
      met: /[a-z]/.test(newPassword),
    },
    { label: "At least 1 number (0-9)", met: /[0-9]/.test(newPassword) },
    {
      label: "At least 1 special character (!@#$%^&*)",
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
    },
    {
      label: "Passwords match",
      met: confirmPassword.length > 0 && newPassword === confirmPassword,
    },
  ];

  const allCriteriaMet = passwordCriteria.every((c) => c.met);

  const criteriaMetCount = passwordCriteria
    .slice(0, 5)
    .filter((c) => c.met).length;
  const strengthPercentage = (criteriaMetCount / 5) * 100;
  let strengthLabel = "Weak";
  let strengthColor = "bg-rose-500";

  if (criteriaMetCount >= 5) {
    strengthLabel = "Strong";
    strengthColor = "bg-emerald-500";
  } else if (criteriaMetCount >= 3) {
    strengthLabel = "Good";
    strengthColor = "bg-amber-500";
  } else if (criteriaMetCount >= 2) {
    strengthLabel = "Fair";
    strengthColor = "bg-orange-500";
  }

  // Token Verification Effect on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Missing password recovery token in URL");
        setVerifyingToken(false);
        return;
      }

      try {
        const res = await api.get(
          `/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
        );
        if (res.data.success) {
          setTokenContext(res.data);
          if (!res.data.valid) {
            setError(
              res.data.message || "Invalid or expired password reset token.",
            );
          }
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to verify recovery token.",
        );
      } finally {
        setVerifyingToken(false);
      }
    };

    verifyToken();
  }, [token]);

  // Redirect countdown when password reset succeeds
  useEffect(() => {
    let timer;
    if (success && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (success && countdown === 0) {
      navigate("/login");
    }
    return () => clearInterval(timer);
  }, [success, countdown, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!allCriteriaMet) {
      setError("Please satisfy all password requirements before submitting.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword,
      });

      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Password reset failed. Token may be invalid or expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950">
      <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl mb-3 shadow-inner">
            <KeyRound className="w-9 h-9 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Reset Account Password
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose a strong new password for your candidate assessment account
          </p>
        </div>

        {/* Verifying Token Spinner */}
        {verifyingToken && (
          <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs font-medium text-indigo-300 flex items-center justify-center gap-2 animate-pulse">
            <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
            Validating recovery token authorization...
          </div>
        )}

        {/* Verified User Banner */}
        {tokenContext && tokenContext.valid && (
          <div className="mb-6 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              Account Email:{" "}
              <span className="font-mono text-indigo-200 font-semibold">
                {tokenContext.email}
              </span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && !verifyingToken && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-300 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
            {(!tokenContext?.valid ||
              error.toLowerCase().includes("token")) && (
              <div className="pt-2">
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Request a New Password
                  Reset Link
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Success Screen */}
        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4 my-2">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Password Reset Successful!
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Your account password has been updated securely. You can now log
                in.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
              Redirection to sign in page in{" "}
              <span className="font-bold text-emerald-400 font-mono">
                {countdown}
              </span>{" "}
              seconds...
            </div>

            <button
              onClick={() => navigate("/login")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              Proceed to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Reset Password Form */
          !verifyingToken &&
          tokenContext?.valid && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Strength Meter */}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>Password Strength</span>
                      <span className="font-semibold">{strengthLabel}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strengthColor}`}
                        style={{ width: `${strengthPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Policy Criteria Checklist */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Password Security Policy</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Backend Requirement
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  {passwordCriteria.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      {item.met ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span
                        className={
                          item.met
                            ? "text-emerald-300 font-medium"
                            : "text-slate-500"
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !allCriteriaMet}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm mt-3 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Updating
                    Password...
                  </>
                ) : (
                  <>
                    Reset Password <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )
        )}

        {/* Footer */}
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
