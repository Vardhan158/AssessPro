import React, { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import {
  ShieldCheck,
  Users,
  Activity,
  LogOut,
  LockKeyhole,
  CheckCircle2,
  Sparkles,
  RotateCw,
  AlertTriangle,
  UserPlus,
  X,
  RotateCcw,
  Mail,
  Check,
  Award,
  Clock,
  Eye,
  Search,
  ExternalLink,
  Shield,
  Settings,
  Sliders,
  Save,
  KeyRound,
  LayoutDashboard,
  Server
} from "lucide-react";

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [assessmentSearch, setAssessmentSearch] = useState("");

  // Navigation Menu State
  const [activeNav, setActiveNav] = useState("dashboard"); // 'dashboard' | 'admins' | 'assessments' | 'security' | 'audit' | 'health'

  // Step 3: Create Admin Modal State
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFeedback, setAdminFeedback] = useState(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Step 4: Platform Assessment Inspection Modal State
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Step 5: Global System & Security Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    passwordMinLength: 8,
    passwordRequireSymbols: true,
    adminMfaRequired: true,
    sessionTimeoutMinutes: 60,
    auditLogRetentionDays: 90,
    maxTabSwitchesDefault: 3,
    cameraRequiredDefault: true
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState(null);

  const load = useCallback(async () => {
    try {
      const [u, a, o, r, ass, sett] = await Promise.all([
        api.get("/admin/platform/users"),
        api.get("/admin/platform/audit?limit=20"),
        api.get("/admin/platform/overview"),
        api.get("/admin/platform/readiness"),
        api.get("/admin/assessments"),
        api.get("/admin/platform/settings"),
      ]);
      setUsers(u.data.users || []);
      setLogs(a.data.logs || []);
      setOverview(o.data.overview);
      setReadiness(r.data);
      setAssessments(ass.data.assessments || []);
      if (sett.data.settings) setSettings(sett.data.settings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const toggleStatus = async (target) => {
    await api.patch(`/admin/platform/users/${target._id}/status`, {
      status: target.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
      reason: "Super-admin platform review",
    });
    load();
  };

  const handleResetAccess = async (adminId) => {
    try {
      const res = await api.post(`/admin/platform/users/${adminId}/reset-access`);
      if (res.data.success) {
        alert("Activation / Access reset link generated and dispatched!");
        load();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset administrator access");
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminFeedback(null);
    if (!adminFirstName.trim() || !adminLastName.trim() || !adminEmail.trim()) {
      setAdminFeedback({ type: "error", text: "First name, last name, and email address are required." });
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await api.post("/admin/platform/users", {
        firstName: adminFirstName.trim(),
        lastName: adminLastName.trim(),
        email: adminEmail.trim(),
        permissions: ["ASSESSMENTS_MANAGE", "QUESTION_BANK", "CANDIDATE_MANAGE", "RESULTS_MANAGE"]
      });

      if (res.data.success) {
        setAdminFeedback({ type: "success", text: "Administrator created successfully! Activation invitation link generated." });
        setAdminFirstName("");
        setAdminLastName("");
        setAdminEmail("");
        load();
        setTimeout(() => {
          setShowCreateAdminModal(false);
          setAdminFeedback(null);
        }, 1500);
      }
    } catch (err) {
      setAdminFeedback({ type: "error", text: err.response?.data?.message || "Failed to create administrator" });
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleInspectAssessment = async (assessmentId) => {
    setLoadingInspect(true);
    setShowInspectModal(true);
    setInspectData(null);

    try {
      const res = await api.get(`/admin/assessments/${assessmentId}`);
      if (res.data.success) {
        setInspectData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch assessment operational status:", err);
    } finally {
      setLoadingInspect(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsFeedback(null);

    try {
      const res = await api.put("/admin/platform/settings", settings);
      if (res.data.success) {
        setSettingsFeedback({ type: "success", text: "Global system & security settings updated and audit logged!" });
        load();
        setTimeout(() => {
          setShowSettingsModal(false);
          setSettingsFeedback(null);
        }, 1500);
      }
    } catch (err) {
      setSettingsFeedback({ type: "error", text: err.response?.data?.message || "Failed to update global settings" });
    } finally {
      setSavingSettings(false);
    }
  };

  const visibleAssessments = assessments.filter((a) =>
    `${a.title} ${a.code}`.toLowerCase().includes(assessmentSearch.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-violet-500 selection:text-white flex">
      {/* Dynamic Animated Ambient Orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>

      {/* SIDEBAR NAVIGATION (Super Admin Master Controls) */}
      <aside className="relative z-30 w-64 border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-2xl p-5 flex flex-col justify-between shrink-0 shadow-2xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/25 ring-1 ring-white/20">
              <ShieldCheck className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">AssessPro</span>
                <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300 ring-1 ring-violet-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Platform Control Center</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveNav("dashboard")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeNav === "dashboard" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => setActiveNav("admins")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeNav === "admins" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-indigo-400" />
                <span>Admin Management</span>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{users.length}</span>
            </button>

            <button
              onClick={() => setActiveNav("assessments")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeNav === "assessments" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-sky-400" />
                <span>Assessments Overview</span>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{assessments.length}</span>
            </button>

            <button
              onClick={() => setActiveNav("security")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeNav === "security" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="h-4 w-4 text-emerald-400" />
                <span>Security & Settings</span>
              </div>
            </button>

            <button
              onClick={() => setActiveNav("audit")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeNav === "audit" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-amber-400" />
                <span>Audit Logs</span>
              </div>
              <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">{logs.length}</span>
            </button>

            <button
              onClick={() => setActiveNav("health")}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeNav === "health" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Server className="h-4 w-4 text-cyan-400" />
                <span>System Health</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="truncate text-xs">
            <p className="font-bold text-slate-200 truncate">{user?.firstName || "Super"} {user?.lastName || "Admin"}</p>
            <p className="text-slate-400 truncate text-[11px] font-mono">{user?.email}</p>
          </div>
          <button onClick={logout} title="End session securely" className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 p-6 sm:p-8 overflow-y-auto space-y-8">
        {/* HERO TITLE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span>Super Admin Governance Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeNav === "dashboard" ? "Platform Overview & Operational Summaries" :
               activeNav === "admins" ? "Administrator Accounts & Access Control" :
               activeNav === "assessments" ? "Assessments Operational Monitoring" :
               activeNav === "security" ? "Security Policies & Platform Controls" :
               activeNav === "audit" ? "System Activity & Audit Logs" : "Platform Service Health"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs font-bold text-slate-300 shadow-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Reload Overview</span>
            </button>
          </div>
        </div>

        {/* 1. DASHBOARD OVERVIEW TAB */}
        {activeNav === "dashboard" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Metric icon={<Users className="h-5 w-5 text-violet-400" />} label="Platform Admins" value={overview?.totalAdminsCount ?? users.length} />
              <Metric icon={<Users className="h-5 w-5 text-indigo-400" />} label="Students" value={overview?.studentCount ?? 0} />
              <Metric icon={<Award className="h-5 w-5 text-sky-400" />} label="Assessments" value={overview?.assessmentCount ?? 0} />
              <Metric icon={<Activity className="h-5 w-5 text-emerald-400" />} label="Active Exams" value={overview?.activeExamsCount ?? 0} />
              <Metric icon={<Clock className="h-5 w-5 text-amber-400" />} label="Active Attempts" value={overview?.activeAttempts ?? 0} />
              <Metric icon={<ShieldCheck className="h-5 w-5 text-rose-400" />} label="Pending Incidents" value={overview?.pendingIncidents ?? 0} />
            </div>

            {/* Quick Management Shortcuts */}
            <div className="grid md:grid-cols-3 gap-4">
              <div onClick={() => setActiveNav("admins")} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 cursor-pointer hover:border-violet-500/50 transition-all">
                <Users className="h-6 w-6 text-violet-400 mb-2" />
                <p className="font-bold text-white text-sm">Admin Management</p>
                <p className="text-xs text-slate-400 mt-1">Create, manage, activate, or suspend administrator credentials ({overview?.totalAdminsCount ?? users.length} System Admins)</p>
              </div>

              <div onClick={() => setActiveNav("assessments")} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 cursor-pointer hover:border-sky-500/50 transition-all">
                <Award className="h-6 w-6 text-sky-400 mb-2" />
                <p className="font-bold text-white text-sm">Assessments Overview</p>
                <p className="text-xs text-slate-400 mt-1">Non-intrusive operational inspection of active test sessions</p>
              </div>

              <div onClick={() => setActiveNav("security")} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 cursor-pointer hover:border-emerald-500/50 transition-all">
                <Sliders className="h-6 w-6 text-emerald-400 mb-2" />
                <p className="font-bold text-white text-sm">Security & Settings</p>
                <p className="text-xs text-slate-400 mt-1">Global MFA policies, session expiration, and proctoring defaults</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. ADMIN MANAGEMENT TAB */}
        {(activeNav === "admins" || activeNav === "dashboard") && (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-400" /> Administrator Accounts & Access Management
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage administrator credentials, invitations, permissions, and account statuses</p>
              </div>

              <button
                onClick={() => setShowCreateAdminModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/25 hover:from-violet-500 hover:to-indigo-500 transition-all cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="h-4 w-4" />
                <span>Create Administrator</span>
              </button>
            </div>

            {loading ? (
              <p className="text-slate-400 text-xs py-4">Loading administrator accounts...</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Administrator Name</th>
                      <th className="py-3.5 px-4">Email Address</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Account Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {users.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {item.firstName} {item.lastName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono">{item.email}</td>
                        <td className="py-3.5 px-4 font-mono text-violet-300 font-bold">{item.role}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            item.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                            item.status === "PENDING_ACTIVATION" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetAccess(item._id)}
                            title="Re-issue Activation or Reset Link"
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Reset Link</span>
                          </button>

                          <button
                            disabled={item._id === user?.id}
                            onClick={() => toggleStatus(item)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer ${
                              item.status === "ACTIVE" ? "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                          >
                            {item.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* 3. ASSESSMENTS OVERVIEW TAB */}
        {(activeNav === "assessments" || activeNav === "dashboard") && (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-sky-400" /> Assessment Operational Monitoring
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Inspect scheduled, active, and completed exams without interfering with ongoing candidate test attempts</p>
              </div>

              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code or title..."
                  value={assessmentSearch}
                  onChange={(e) => setAssessmentSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleAssessments.length === 0 ? (
                <p className="text-slate-400 text-xs col-span-full py-4 text-center">No assessments found.</p>
              ) : (
                visibleAssessments.map((ass) => (
                  <div key={ass._id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                          {ass.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ass.status === "OPEN" || ass.status === "PUBLISHED" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
                          ass.status === "DRAFT" ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}>
                          {ass.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-xs line-clamp-1">{ass.title}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Questions: <strong className="text-slate-200">{ass.questionCount || 0}</strong> | Active Attempts: <strong className="text-emerald-400">{ass.activeAttemptCount || 0}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => handleInspectAssessment(ass._id)}
                      className="w-full mt-2 rounded-xl border border-sky-500/30 bg-sky-500/10 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect Operational Details</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* 4. SECURITY & SETTINGS TAB */}
        {(activeNav === "security" || activeNav === "dashboard") && (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-violet-400" /> Platform Policies & Security Controls
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Global policies for authentication, session timeout, audit log retention, and exam proctoring</p>
              </div>

              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-violet-500 transition-colors cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                <span>Configure Policies</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Password Policy</p>
                <p className="font-bold text-white">Min {settings.passwordMinLength} Chars | {settings.passwordRequireSymbols ? "Symbols Required" : "Standard"}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Administrator MFA</p>
                <p className="font-bold text-emerald-400">{settings.adminMfaRequired ? "Enforced for All Admins" : "Optional"}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Session & Audit Policy</p>
                <p className="font-bold text-white">{settings.sessionTimeoutMinutes}m Timeout | {settings.auditLogRetentionDays}d Retention</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Exam Proctoring Defaults</p>
                <p className="font-bold text-sky-400">Max {settings.maxTabSwitchesDefault} Tab Switches | {settings.cameraRequiredDefault ? "Webcam Required" : "Browser Only"}</p>
              </div>
            </div>
          </section>
        )}

        {/* 5. AUDIT LOGS TAB */}
        {(activeNav === "audit" || activeNav === "dashboard") && (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-400" /> Review System Activities & Audit Logs
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Records administrator account creation, status changes, settings updates, and publishing actions</p>
              </div>
            </div>

            {logs.length ? (
              <div className="space-y-2.5">
                {logs.map((log) => (
                  <div key={log._id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-xs gap-2">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{log.action}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            {log.actorRole || "SUPER_ADMIN"}
                          </span>
                          {log.targetResource && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                              {log.targetResource}
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Payload: {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs">No audit events recorded yet.</p>
            )}
          </section>
        )}

        {/* 6. SYSTEM HEALTH TAB */}
        {(activeNav === "health" || activeNav === "dashboard") && (
          <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-cyan-400" /> Platform Service Health & Infrastructure Readiness
            </h2>
            <p className="text-xs text-slate-400 mt-1">Certification & infrastructure compliance check before deployment release.</p>
            <div className="mt-5 grid md:grid-cols-2 gap-3">
              {(readiness?.checks || []).map((check) => (
                <div key={check.key} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-inner">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-200">{check.label}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${check.status === "PASS" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`}>
                      {check.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{check.details}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* GLOBAL SYSTEM SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 backdrop-blur-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-violet-400" />
                Global Security & System Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {settingsFeedback && (
              <div className={`p-3 rounded-xl font-bold ${
                settingsFeedback.type === "error" ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}>
                {settingsFeedback.text}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-2">
                <p className="font-bold text-white uppercase text-[10px] tracking-wider text-violet-300">1. Password & Authentication Policy</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Min Password Length</label>
                    <input
                      type="number"
                      min="6"
                      value={settings.passwordMinLength}
                      onChange={(e) => setSettings({ ...settings, passwordMinLength: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-100 outline-none focus:border-violet-500"
                      required
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={settings.passwordRequireSymbols}
                        onChange={(e) => setSettings({ ...settings, passwordRequireSymbols: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                      />
                      <span>Require Special Symbols</span>
                    </label>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300 pt-1">
                  <input
                    type="checkbox"
                    checked={settings.adminMfaRequired}
                    onChange={(e) => setSettings({ ...settings, adminMfaRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                  />
                  <span>Enforce Multi-Factor Authentication (MFA) for Administrators</span>
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="font-bold text-white uppercase text-[10px] tracking-wider text-violet-300">2. Session Timeout & Audit Retention</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Session Timeout (Mins)</label>
                    <input
                      type="number"
                      min="15"
                      value={settings.sessionTimeoutMinutes}
                      onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-100 outline-none focus:border-violet-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Audit Log Retention (Days)</label>
                    <input
                      type="number"
                      min="30"
                      value={settings.auditLogRetentionDays}
                      onChange={(e) => setSettings({ ...settings, auditLogRetentionDays: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-100 outline-none focus:border-violet-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="font-bold text-white uppercase text-[10px] tracking-wider text-violet-300">3. Examination Proctoring Defaults</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Max Tab Switch Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.maxTabSwitchesDefault}
                      onChange={(e) => setSettings({ ...settings, maxTabSwitchesDefault: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-100 outline-none focus:border-violet-500"
                      required
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={settings.cameraRequiredDefault}
                        onChange={(e) => setSettings({ ...settings, cameraRequiredDefault: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                      />
                      <span>Require Camera Feed by Default</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-800/80 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-1 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/25 hover:bg-violet-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings ? "Saving Settings..." : "Save & Confirm Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ADMINISTRATOR MODAL */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-violet-400" />
                Create New Administrator
              </h3>
              <button onClick={() => setShowCreateAdminModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {adminFeedback && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                adminFeedback.type === "error" ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}>
                {adminFeedback.text}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Connor"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="admin.sarah@platform.org"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-violet-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Assigned Platform Role</label>
                <div className="w-full rounded-xl border border-slate-800/80 bg-slate-950/80 p-2.5 text-violet-300 font-mono font-bold flex items-center justify-between">
                  <span>Role: ADMIN</span>
                  <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded font-sans uppercase font-bold">Read-Only</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-slate-800 bg-slate-950 space-y-2">
                <p className="font-bold text-white text-[11px] uppercase tracking-wider">Assigned Default Permissions</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Assessment Creation</span>
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Question Bank Manager</span>
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Candidate Onboarding</span>
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Results & Analytics</span>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-800/80 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="flex-1 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/25 hover:bg-violet-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {creatingAdmin ? "Creating..." : "Create & Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT ASSESSMENT OPERATIONAL MODAL */}
      {showInspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 backdrop-blur-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-sky-400" />
                Read-Only Assessment Operational Status
              </h3>
              <button onClick={() => setShowInspectModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingInspect || !inspectData ? (
              <p className="text-slate-400 text-center py-6">Loading assessment operational metrics...</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                      {inspectData.assessment?.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                      {inspectData.assessment?.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">{inspectData.assessment?.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Duration & Marks</p>
                    <p className="font-bold text-white mt-1">{inspectData.assessment?.durationMinutes} Mins | {inspectData.assessment?.totalMarks} Marks</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Questions Configured</p>
                    <p className="font-bold text-white mt-1">{inspectData.questions?.length || 0} Questions</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between text-emerald-300 font-bold">
                  <span>Assigned Candidates Count:</span>
                  <span>{inspectData.readiness?.assignedStudentCount || 0} Students</span>
                </div>

                <p className="text-[11px] text-slate-400 text-center italic">
                  Non-intrusive super admin inspection mode active. Student test sessions continue without interruption.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-4.5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40">
      <div className="mb-2">{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-2xl font-extrabold text-white mt-1">{value}</p>
    </div>
  );
}
