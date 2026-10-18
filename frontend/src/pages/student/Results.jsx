import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Clock,
  AlertOctagon,
  RefreshCw,
  Info,
  FileText,
} from "lucide-react";

export default function Results() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/student/results/${assessmentId}`);
      if (res.data.success) {
        setResultData(res.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to retrieve assessment results",
      );
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(), 0);
    return () => clearTimeout(timer);
  }, [fetchResults]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          Retrieving authorized evaluation results...
        </div>
      </div>
    );
  }

  if (error || !resultData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <AlertOctagon className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Results Error</h2>
          <p className="text-xs text-slate-400">
            {error || "Unable to retrieve assessment evaluation"}
          </p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const visibility = resultData.visibility;
  const assessment = resultData.assessment;
  const candidate = resultData.candidate;
  const attempt = resultData.attempt;
  const questionsBreakdown = resultData.questionsBreakdown;

  // Handle NOT_PUBLISHED or HIDDEN modes
  if (visibility === "NOT_PUBLISHED" || visibility === "HIDDEN") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {visibility === "NOT_PUBLISHED"
                ? "Awaiting Publication"
                : "Results Restricted"}
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {resultData.message ||
                "Evaluation results have not yet been published by assessment administrators."}
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1 text-left text-slate-400">
            <div>
              <strong className="text-slate-200">Assessment:</strong>{" "}
              {assessment?.title} ({assessment?.code})
            </div>
            <div>
              <strong className="text-slate-200">Candidate:</strong>{" "}
              {candidate?.name} ({candidate?.studentId})
            </div>
            <div>
              <strong className="text-slate-200">Status:</strong>{" "}
              {attempt?.status}
            </div>
          </div>

          <button
            onClick={() => navigate("/student/dashboard")}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // SCORE_ONLY or SCORE_AND_ANSWERS
  let statusBadgeLabel = "Attempt Finalized";
  let statusBadgeColor = "bg-slate-800 text-slate-300 border-slate-700";

  if (attempt?.status === "SUBMITTED") {
    statusBadgeLabel = "Submitted Manually";
    statusBadgeColor =
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (attempt?.status === "TIMED_OUT") {
    statusBadgeLabel = "Timed Out (Deadline Expired)";
    statusBadgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  } else if (attempt?.status === "AUTO_SUBMITTED") {
    statusBadgeLabel = "Auto-Submitted (Proctoring Threshold Exceeded)";
    statusBadgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
  } else if (attempt?.status === "FORCE_SUBMITTED") {
    statusBadgeLabel = "Force Submitted by Administrator";
    statusBadgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => navigate("/student/dashboard")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Student Dashboard
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Banner */}
          <div className="text-center pb-6 border-b border-slate-800 space-y-3">
            {attempt?.passed ? (
              <div className="inline-flex flex-col items-center">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-emerald-400 tracking-tight">
                  ASSESSMENT PASSED
                </h2>
              </div>
            ) : (
              <div className="inline-flex flex-col items-center">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-full mb-3">
                  <XCircle className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-rose-500 tracking-tight">
                  ASSESSMENT FAILED
                </h2>
              </div>
            )}

            {/* Status & Reason */}
            <div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadgeColor}`}
              >
                {statusBadgeLabel}
              </span>
              {attempt?.finalizedReason && (
                <p className="text-xs text-slate-400 mt-2 font-mono">
                  Finalization Detail: {attempt.finalizedReason}
                </p>
              )}
            </div>
          </div>

          {/* Results Summary Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Assessment Name
              </span>
              <span className="text-sm font-bold text-white">
                {assessment?.title} ({assessment?.code})
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Candidate Identity
              </span>
              <span className="text-sm font-bold text-slate-200">
                {candidate?.name} ({candidate?.studentId})
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Score Obtained
              </span>
              <span className="text-lg font-extrabold text-indigo-400">
                {attempt?.score} / {assessment?.totalMarks}
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Percentage Score
              </span>
              <span className="text-lg font-extrabold text-white">
                {attempt?.percentage}%
              </span>
            </div>
          </div>

          {/* STU-18 Question Breakdown (Only when explicitly permitted under SCORE_AND_ANSWERS) */}
          {visibility === "SCORE_AND_ANSWERS" && questionsBreakdown && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" /> Authorized
                Question & Selected Responses Breakdown
              </h3>

              <div className="space-y-3">
                {questionsBreakdown.map((q) => (
                  <div
                    key={q.questionId}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
                      <span>Question {q.index}</span>
                      <span>[{q.marks} Marks]</span>
                    </div>
                    <div className="font-medium text-slate-200">{q.text}</div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                      Selected Response:{" "}
                      <strong className="text-indigo-300 font-mono">
                        {q.selectedOptionId || "Unanswered"}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footnote */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Evaluation result verified and stored on server. Results follow
              administrator-configured visibility settings.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
