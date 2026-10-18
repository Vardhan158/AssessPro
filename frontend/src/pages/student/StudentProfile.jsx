import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import {
  User,
  Mail,
  Phone,
  BookOpen,
  UserCheck,
  ArrowLeft,
  LogOut,
  Info,
  Tag,
  RefreshCw,
  Building2,
} from "lucide-react";

export default function StudentProfile() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/student/profile");
      if (res.data.success) {
        setProfile(res.data.profile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchProfile(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchProfile]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          Loading candidate registration profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10 flex flex-col justify-center items-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Back Link & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" /> Logout Session
          </button>
        </div>

        {/* Main Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
            <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-inner">
              <UserCheck className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {profile?.firstName} {profile?.lastName}
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {profile?.accountStatus || "ACTIVE"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Registration ID:{" "}
                <strong className="text-indigo-300">
                  {profile?.studentId}
                </strong>
              </p>
            </div>
          </div>

          {/* Read-Only Notice Banner */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Official Institutional Record:</strong> Candidate details
              are registered and verified by platform administrators.
              Self-editing is restricted per institutional policy.
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Candidate Full
                Name
              </span>
              <span className="font-semibold text-slate-200 text-sm block">
                {profile?.firstName} {profile?.lastName}
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase block flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" /> Registered
                Email Address
              </span>
              <span className="font-semibold text-slate-200 text-sm font-mono block">
                {profile?.email}
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase block flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" /> College /
                Institution
              </span>
              <span className="font-semibold text-slate-200 text-sm block">
                {profile?.collegeName}
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase block flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Branch &
                Academic Year
              </span>
              <span className="font-semibold text-slate-200 text-sm block">
                {profile?.branch} ({profile?.yearOfStudy})
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase block flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-400" /> Contact Phone
              </span>
              <span className="font-semibold text-slate-200 text-sm font-mono block">
                {profile?.phone}
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase block flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" /> Eligibility Tags
              </span>
              <div className="flex gap-1.5 flex-wrap pt-0.5">
                {(profile?.eligibilityTags || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-mono text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-mono">
              Account Registered:{" "}
              {new Date(profile?.createdAt).toLocaleDateString()}
            </span>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
