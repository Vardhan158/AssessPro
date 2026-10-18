import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const ROLE_ROUTES = {
  STUDENT: "/student/dashboard",
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/super-admin/dashboard",
};

const ERROR_STYLES = {
  general: {
    wrap: "border-rose-200 bg-rose-50 text-rose-900",
    icon: "text-rose-600",
    title: "Sign in unsuccessful",
    Icon: AlertCircle,
  },
  locked: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "text-amber-600",
    title: "Account temporarily locked",
    Icon: Clock3,
  },
  activation: {
    wrap: "border-indigo-200 bg-indigo-50 text-indigo-950",
    icon: "text-indigo-600",
    title: "Account activation required",
    Icon: KeyRound,
  },
};

function classifyError(status, message) {
  const text = String(message).toLowerCase();
  if (status === 423 || text.includes("locked")) return "locked";
  if (text.includes("activat")) return "activation";
  return "general";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const errorId = useId();
  const emailId = useId();
  const passwordId = useId();

  const clearError = () => {
    if (error) {
      setError("");
      setErrorType("general");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setErrorType("general");
    setSubmitting(true);

    try {
      const loggedUser = await login(email.trim(), password);
      const destination = ROLE_ROUTES[loggedUser?.role];

      if (!destination) {
        setError("Your account role is not supported. Please contact administrator.");
        return;
      }

      navigate(destination, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to sign in. Please check your credentials and try again.";

      setError(message);
      setErrorType(classifyError(err?.response?.status, message));
    } finally {
      setSubmitting(false);
    }
  };

  const alertStyle = ERROR_STYLES[errorType];
  const AlertIcon = alertStyle.Icon;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f5f7fb] font-sans antialiased text-slate-900 selection:bg-indigo-500 selection:text-white flex items-center justify-center p-3 sm:p-4 lg:p-6">
      {/* Background dot grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="grid h-full max-h-[calc(100vh-1.5rem)] w-full max-w-[1180px] grid-cols-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_70px_-15px_rgba(30,27,75,0.18)] lg:grid-cols-12">

        {/* LEFT PANEL: Brand & Platform Showcase */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] p-6 sm:p-8 lg:col-span-6 xl:col-span-7 xl:p-10 text-white h-full">
          {/* Ambient background blur orbs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"
          />

          {/* Brand Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                <GraduationCap className="h-5.5 w-5.5 text-white" strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-white">
                    AssessPro
                  </span>
                  <span className="rounded-md bg-indigo-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200 border border-indigo-400/30">
                    v2.4
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-300">
                  Student Assessment Portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 text-xs text-slate-200 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-200">System Online</span>
            </div>
          </div>

          {/* Hero Copy */}
          <div className="relative z-10 my-auto py-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-[11px] font-semibold text-indigo-200 backdrop-blur-md mb-3">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              <span>Smart & Proctored Examination Suite</span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-4xl xl:leading-[1.18]">
              A focused space to{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-violet-200 to-sky-300 bg-clip-text text-transparent">
                showcase your knowledge.
              </span>
            </h1>

            <p className="mt-3 max-w-lg text-xs sm:text-sm leading-relaxed text-slate-300">
              Welcome to your assessment portal. Experience uninterrupted tests, automated answer saving, and instant real-time evaluations.
            </p>

            {/* Live Status Card */}
            <div className="mt-6 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Zap className="h-4.5 w-4.5 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Live Exam Protection
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Auto-saves every keystroke & answer state
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  Active
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl bg-slate-800/80 p-2.5 border border-slate-700/60">
                  <p className="text-[10px] font-medium text-slate-400">Auto-Save</p>
                  <p className="mt-0.5 text-xs font-bold text-white">Enabled</p>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-2.5 border border-slate-700/60">
                  <p className="text-[10px] font-medium text-slate-400">Proctoring</p>
                  <p className="mt-0.5 text-xs font-bold text-indigo-300">Secure</p>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-2.5 border border-slate-700/60">
                  <p className="text-[10px] font-medium text-slate-400">Latency</p>
                  <p className="mt-0.5 text-xs font-bold text-emerald-300">&lt; 15ms</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="relative z-10 flex items-center justify-between gap-4 border-t border-slate-800/90 pt-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>256-bit Encrypted Session</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              <span>Students & Faculty Portal</span>
            </div>
          </div>
        </aside>

        {/* RIGHT PANEL: Sign In Form */}
        <main className="flex flex-col justify-between bg-white p-6 sm:p-8 lg:col-span-6 xl:col-span-5 xl:p-10 h-full overflow-y-auto">
          {/* Mobile Header Brand */}
          <div className="flex items-center gap-2.5 lg:hidden mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              AssessPro
            </span>
          </div>

          <div className="mx-auto w-full max-w-sm my-auto">
            {/* Header */}
            <div className="mb-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 mb-2 border border-indigo-100">
                Sign In
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Welcome Back
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Please enter your credentials to access your portal.
              </p>
            </div>

            {/* Alert Error Box */}
            {error && (
              <div
                id={errorId}
                role="alert"
                className={`mb-4 flex gap-2.5 rounded-xl border p-3 text-xs shadow-sm transition-all ${alertStyle.wrap}`}
              >
                <AlertIcon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${alertStyle.icon}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{alertStyle.title}</p>
                  <p className="mt-0.5 leading-relaxed opacity-90">{error}</p>

                  {errorType === "activation" && (
                    <Link
                      to={`/activate?email=${encodeURIComponent(email.trim())}`}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
                    >
                      Activate your candidate account
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1">
                <label
                  htmlFor={emailId}
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id={emailId}
                    type="email"
                    autoComplete="username"
                    placeholder="student@institute.edu"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    disabled={submitting}
                    required
                    aria-describedby={error ? errorId : undefined}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition duration-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={passwordId}
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-700"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError();
                    }}
                    disabled={submitting}
                    required
                    aria-describedby={error ? errorId : undefined}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition duration-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={submitting}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={submitting}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0"
                  />
                  <span className="text-[11px] font-medium">Remember this browser</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition duration-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Authenticating…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Account Activation Callout */}
            <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-center text-[11px] text-slate-600">
              <span>First time here or received an invite code? </span>
              <Link
                to="/activate"
                className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors underline decoration-indigo-300 underline-offset-2"
              >
                Activate your account
              </Link>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-3">
            <span>© {new Date().getFullYear()} AssessPro Platform</span>
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Protected Session
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
