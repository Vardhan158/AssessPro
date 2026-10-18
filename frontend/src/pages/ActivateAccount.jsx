import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import {
  ShieldCheck,
  Mail,
  Lock,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  UserCheck,
  Check,
  X,
  Sparkles,
} from "lucide-react";

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract query parameters
  const paramEmail = searchParams.get("email") || "";
  const paramToken =
    searchParams.get("code") ||
    searchParams.get("token") ||
    searchParams.get("activationToken") ||
    "";

  const [email, setEmail] = useState(paramEmail);
  const [activationToken] = useState(paramToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [tokenContext, setTokenContext] = useState(null);

  // Assistance / Reissue state
  const [showReissueModal, setShowReissueModal] = useState(false);
  const [reissueEmail, setReissueEmail] = useState(paramEmail);
  const [reissueReason, setReissueReason] = useState("");
  const [reissueLoading, setReissueLoading] = useState(false);
  const [reissueMessage, setReissueMessage] = useState(null);

  // Redirect countdown
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

  // Calculate password strength percentage
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

  // Token Verification Effect
  useEffect(() => {
    if (paramToken) {
      const cleanUrl = paramEmail
        ? `/activate?email=${encodeURIComponent(paramEmail)}`
        : "/activate";
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const verifyTokenOnLoad = async () => {
      if (!activationToken) return;

      setVerifyingToken(true);
      setError("");

      try {
        const res = await api.get(
          `/auth/verify-token?token=${encodeURIComponent(activationToken)}&email=${encodeURIComponent(paramEmail)}`,
        );
        if (res.data.success) {
          setTokenContext(res.data);
          if (res.data.email) {
            setEmail(res.data.email);
            setReissueEmail(res.data.email);
          }
          if (!res.data.valid) {
            if (res.data.isAlreadyActive) {
              setError(
                "Account is already activated. You can proceed directly to sign in.",
              );
            } else if (res.data.isExpired) {
              setError(
                "Activation token has expired. You can request a replacement activation link below.",
              );
            } else {
              setError(
                res.data.message || "Invalid or unrecognized activation code.",
              );
            }
          }
        }
      } catch (err) {
        // Fallback error handling
        const msg =
          err.response?.data?.message || "Failed to verify activation token";
        setError(msg);
      } finally {
        setVerifyingToken(false);
      }
    };

    verifyTokenOnLoad();
  }, [activationToken, paramEmail, paramToken]);

  // Countdown timer when activation succeeds
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

  const handleActivate = async (e) => {
    e.preventDefault();
    setError("");

    if (!allCriteriaMet) {
      setError(
        "Please satisfy all password policy criteria before proceeding.",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/activate", {
        email,
        activationToken,
        newPassword,
      });

      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Account activation failed. Please check your details.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReissueRequest = async (e) => {
    e.preventDefault();
    setReissueLoading(true);
    setReissueMessage(null);

    try {
      const res = await api.post("/auth/request-reissue", {
        email: reissueEmail,
        reason: reissueReason,
      });

      setReissueMessage({
        type: "success",
        text:
          res.data.message ||
          "Replacement link request submitted successfully. Please check your email inbox.",
      });
    } catch (err) {
      setReissueMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Failed to request replacement activation link.",
      });
    } finally {
      setReissueLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950">
      <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl mb-3 shadow-inner">
            <ShieldCheck className="w-9 h-9 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Student Account Activation
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Official Assessment Portal: Set up your account password to activate
            candidate access
          </p>
        </div>

        {/* Verifying Token Banner */}
        {verifyingToken && (
          <div className="mb-6 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs font-medium text-indigo-300 flex items-center gap-2 animate-pulse">
            <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
            Validating activation token and candidate invitation status...
          </div>
        )}

        {/* Invitation Context Banner (When verified safely) */}
        {tokenContext && tokenContext.valid && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
                <div className="font-semibold text-sm text-emerald-900">
                Invitation Verified{" "}
                {tokenContext.firstName
                  ? `for ${tokenContext.firstName} ${tokenContext.lastName}`
                  : ""}
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                Target Email:{" "}
                <span className="font-mono text-emerald-900 font-medium">
                  {tokenContext.email}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Account Already Active Banner */}
        {tokenContext?.isAlreadyActive && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-blue-200">
                  Account Already Activated
                </div>
                <p className="text-slate-300 text-xs mt-1">
                  This candidate account is already active. You can proceed
                  directly to sign in.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all shrink-0"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* General Error Banner */}
        {error && !tokenContext?.isAlreadyActive && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div>{error}</div>
              {(tokenContext?.isExpired ||
                error.toLowerCase().includes("expired")) && (
                <button
                  type="button"
                  onClick={() => setShowReissueModal(true)}
                  className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Request a Replacement
                  Activation Link
                </button>
              )}
            </div>
          </div>
        )}

        {/* SUCCESS CARD */}
        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4 my-4">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Account Successfully Activated!
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Your password has been securely saved and your student account
                is active.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
              Automatic redirection to sign in page in{" "}
              <span className="font-bold text-emerald-400 font-mono">
                {countdown}
              </span>{" "}
              seconds...
            </div>

            <button
              onClick={() => navigate("/login")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm"
            >
              Proceed to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* FORM */
          <form onSubmit={handleActivate} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between items-center">
                <span>Student Email</span>
                {tokenContext?.valid && (
                  <span className="text-emerald-400 text-[10px] lowercase font-normal">
                    Verified Context
                  </span>
                )}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="student@institute.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={tokenContext?.valid && !!tokenContext?.email}
                  className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-sm transition-colors ${
                    tokenContext?.valid && tokenContext?.email
                      ? "border-emerald-500/30 text-emerald-300 bg-slate-950/60 font-mono cursor-not-allowed"
                      : "border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  }`}
                  required
                />
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                New Account Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Set strong new password"
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

              {/* Strength Indicator Bar */}
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
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

            {/* Password Policy Validation Feedback Checklist */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Password Requirements Policy</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Backend Security Standard
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
              disabled={
                loading ||
                !allCriteriaMet ||
                tokenContext?.isExpired ||
                tokenContext?.isAlreadyActive
              }
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm mt-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Activating
                  Account...
                </>
              ) : (
                <>
                  Activate Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Request Replacement Activation Link Option */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center space-y-3">
          <button
            type="button"
            onClick={() => setShowReissueModal(!showReissueModal)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showReissueModal
              ? "Hide Replacement Request Panel"
              : "Token expired or need assistance? Request replacement link"}
          </button>

          {/* Reissue Panel */}
          {showReissueModal && (
            <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl text-left space-y-3 transition-all">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                Request Replacement Activation Link
              </div>
              <p className="text-[11px] text-slate-400">
                If your activation token has expired or is invalid, submit your
                registered candidate email below to dispatch a replacement
                activation code.
              </p>

              {reissueMessage && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium ${
                    reissueMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  {reissueMessage.text}
                </div>
              )}

              <form onSubmit={handleReissueRequest} className="space-y-2.5">
                <input
                  type="email"
                  placeholder="registered.student@institute.edu"
                  value={reissueEmail}
                  onChange={(e) => setReissueEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Optional: Reason for assistance request"
                  value={reissueReason}
                  onChange={(e) => setReissueReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={reissueLoading}
                  className="w-full bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {reissueLoading
                    ? "Submitting Request..."
                    : "Send Replacement Link"}
                </button>
              </form>
            </div>
          )}

          <div className="text-xs text-slate-400">
            Already activated your account?{" "}
            <Link
              to="/login"
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
