import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import {
  Clock,
  Award,
  ShieldAlert,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  LogOut,
  FileText,
  UserCheck,
  GraduationCap,
  BookOpen,
  Tag,
  Calendar,
  Sparkles,
  BarChart2,
  Lock,
  Search,
  RotateCw,
  LayoutGrid,
  ListFilter,
  Check,
  ChevronRight,
  TrendingUp,
  Activity,
  Zap,
  LayoutDashboard,
  HelpCircle,
  User,
  HelpCircle as SupportIcon,
  Info
} from "lucide-react";

export default function StudentDashboard() {
  const [dashboardData, setDashboardData] = useState({
    profile: null,
    assessments: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'assessments' | 'results' | 'profile' | 'support'

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await api.get("/student/dashboard");
      if (res.data.success) {
        setDashboardData({
          profile: res.data.profile,
          assessments: res.data.assessments || [],
        });
        setError("");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load candidate assessments",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchDashboard]);

  const profile = dashboardData.profile;
  const assessments = dashboardData.assessments;

  // Compute stats
  const totalAssigned = assessments.filter((a) => a.isAssigned).length;
  const openEligible = assessments.filter((a) => a.canStart).length;
  const inProgressCount = assessments.filter((a) => a.canResume).length;
  const completedCount = assessments.filter((a) => a.canViewResults).length;

  const filteredAssessments = useMemo(() => {
    return assessments.filter((ass) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = ass.title?.toLowerCase().includes(query);
        const codeMatch = ass.code?.toLowerCase().includes(query);
        const descMatch = ass.description?.toLowerCase().includes(query);
        return titleMatch || codeMatch || descMatch;
      }
      return true;
    });
  }, [assessments, searchQuery]);

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-indigo-500 selection:text-white flex">
      {/* Dynamic Animated Ambient Orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>

      {/* FINAL STUDENT SIDEBAR NAVIGATION */}
      <aside className="relative z-30 w-64 border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-2xl p-5 flex flex-col justify-between shrink-0 shadow-2xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-white/20">
              <GraduationCap className="h-6 w-6" strokeWidth={2.2} />
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">AssessPro</span>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
                  Candidate
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Student Evaluation Portal</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("assessments")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "assessments" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-violet-400" />
                <span>My Assessments</span>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{assessments.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("results")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "results" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>My Results</span>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{completedCount}</span>
            </button>

            <button
              onClick={() => navigate("/student/profile")}
              className="w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-indigo-400" />
                <span>My Profile</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("support")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "support" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-4 w-4 text-cyan-400" />
                <span>Help & Support</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="truncate text-xs">
            <p className="font-bold text-slate-200 truncate">{profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}</p>
            <p className="text-slate-400 truncate text-[11px] font-mono">{profile?.email || user?.email}</p>
          </div>
          <button onClick={logout} title="End session securely" className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">

        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Candidate Assessment Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-indigo-300 via-violet-200 to-sky-300 bg-clip-text text-transparent">{profile?.firstName || user?.firstName}!</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => fetchDashboard(true)} disabled={refreshing} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">
              <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh Portal</span>
            </button>
          </div>
        </div>

        {/* METRICS SUMMARY CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/15 text-indigo-400 ring-1 ring-indigo-500/30">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{totalAssigned}</span>
              <span className="text-xs font-semibold text-slate-400">Total Allocated</span>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-400 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{completedCount}</span>
              <span className="text-xs font-semibold text-emerald-400">Submitted</span>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Upcoming</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600/15 text-sky-400 ring-1 ring-sky-500/30">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{assessments.filter(a => new Date(a.openAt) > new Date()).length}</span>
              <span className="text-xs font-semibold text-sky-400">Scheduled</span>
            </div>
          </div>
        </section>

        {/* TAB 1 & TAB 2: MY ASSESSMENTS LIST */}
        {(activeTab === "dashboard" || activeTab === "assessments") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white">My Assigned Assessments</h2>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assessment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredAssessments.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 text-xs">
                  No assigned assessments found.
                </div>
              ) : (
                filteredAssessments.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-slate-700 transition-all">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                          {a.code}
                        </span>
                        <h3 className="text-base font-bold text-white">{a.title}</h3>
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          a.canStart ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
                          a.canResume ? "bg-amber-500/20 border-amber-500/30 text-amber-300" :
                          a.canViewResults ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}>
                          {a.displayStatus}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.durationMinutes} Mins</span>
                        <span>Questions: <strong className="text-white">{a.questionCount} Questions</strong></span>
                        <span>Total Marks: <strong className="text-indigo-300">{a.totalMarks} Marks</strong></span>
                      </div>
                    </div>

                    <div>
                      {a.canStart && (
                        <button
                          onClick={() => navigate(`/student/instructions/${a.id}`)}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <PlayCircle className="h-4 w-4" />
                          <span>Start Assessment</span>
                        </button>
                      )}

                      {a.canResume && (
                        <button
                          onClick={() => navigate(`/student/exam/${a.attempt?.id}`)}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-amber-500 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCw className="h-4 w-4" />
                          <span>Resume Assessment</span>
                        </button>
                      )}

                      {a.canViewResults && (
                        <button
                          onClick={() => navigate(`/student/results/${a.id}`)}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>View Results</span>
                        </button>
                      )}

                      {!a.canStart && !a.canResume && !a.canViewResults && (
                        <span className="text-xs text-slate-500 italic">{a.disableReason || "Not Available"}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MY RESULTS */}
        {activeTab === "results" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Published Assessment Results</h2>
            <div className="grid gap-3">
              {assessments.filter(a => a.canViewResults).length === 0 ? (
                <p className="text-slate-400 text-xs py-6 text-center">No published results available yet.</p>
              ) : (
                assessments.filter(a => a.canViewResults).map(a => (
                  <div key={a.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{a.title} ({a.code})</p>
                      <p className="text-slate-400 text-[11px]">Submitted At: {a.attempt?.submittedAt ? new Date(a.attempt.submittedAt).toLocaleString() : "-"}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/student/results/${a.id}`)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                    >
                      View Outcome
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: HELP & SUPPORT */}
        {activeTab === "support" && (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-2xl space-y-4 text-xs">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <SupportIcon className="h-5 w-5 text-cyan-400" /> Examination Help & Technical Support Guide
            </h2>
            <p className="text-slate-300">Frequently asked questions and technical guidance for candidates:</p>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-1">
                <p className="font-bold text-white">1. What happens if my internet connection drops during an exam?</p>
                <p className="text-slate-400">The platform automatically queues your option selections locally. Once reconnected, your answers flush to the server automatically.</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-1">
                <p className="font-bold text-white">2. Does the timer stop if I refresh the page?</p>
                <p className="text-slate-400">No. The examination deadline is calculated continuously on the server from your start time.</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-1">
                <p className="font-bold text-white">3. How many tab switches are allowed?</p>
                <p className="text-slate-400">Tab switch limits are configured per assessment by administrators (typically 3 switches). Exceeding the limit will automatically finalize your exam attempt.</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
