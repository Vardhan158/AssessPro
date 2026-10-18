import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  CheckCircle2,
  ArrowLeft,
  Info,
  AlertOctagon,
  RefreshCw,
  Award,
} from "lucide-react";

export const hasPublishedResults = (receipt) => receipt?.resultsPublished === true;

export default function SubmissionConfirmation() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSubmissionReceipt = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/student/submission/${attemptId}`);
      if (res.data.success) {
        setReceipt(res.data.receipt);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to retrieve submission confirmation receipt",
      );
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSubmissionReceipt(), 0);
    return () => clearTimeout(timer);
  }, [fetchSubmissionReceipt]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
          Retrieving server submission confirmation...
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <AlertOctagon className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Confirmation Error</h2>
          <p className="text-xs text-slate-400">
            {error || "Unable to verify submission record"}
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

  // Status badge style mapping
  let statusBadgeStyle =
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let statusLabel = "Submitted";

  if (receipt.status === "TIMED_OUT") {
    statusBadgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    statusLabel = "Timed Out";
  } else if (receipt.status === "AUTO_SUBMITTED") {
    statusBadgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    statusLabel = "Auto-Submitted";
  } else if (receipt.status === "FORCE_SUBMITTED") {
    statusBadgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    statusLabel = "Force Submitted";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10 flex flex-col justify-center items-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Back Link */}
        <button
          onClick={() => navigate("/student/dashboard")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Candidate Dashboard
        </button>

        {/* STU-17 Submission Confirmation Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Icon & Title Banner */}
          <div className="text-center space-y-3 pb-6 border-b border-slate-800">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Examination Submitted
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Your responses have been received successfully and securely
              recorded on the evaluation server.
            </p>
          </div>

          {/* Receipt Info Grid */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-3.5 text-xs">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                Assessment Name
              </span>
              <span className="font-bold text-white text-right">
                {receipt.assessmentTitle}{" "}
                <span className="text-indigo-400 font-mono">
                  ({receipt.assessmentCode})
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                Candidate Identity
              </span>
              <span className="font-semibold text-slate-200 text-right">
                {receipt.studentName}{" "}
                <span className="text-slate-400 font-mono">
                  ({receipt.studentId})
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                Submission Status
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${statusBadgeStyle}`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                Submission Timestamp
              </span>
              <span className="font-mono text-slate-200 text-right">
                {new Date(receipt.submittedAt).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                Attempt Reference
              </span>
              <span className="font-mono text-indigo-300 text-[11px] text-right truncate max-w-[200px]">
                {receipt.attemptId}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                Finalization Detail
              </span>
              <span className="text-slate-300 text-right italic font-medium">
                {receipt.finalizedReason}
              </span>
            </div>

            {/* Publication Status & Score Display */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                Results Status
              </span>
              {receipt.score !== undefined ? (
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {receipt.score} / {receipt.totalMarks} ({receipt.percentage}%)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg font-medium text-[11px]">
                  Results Awaiting Publication
                </span>
              )}
            </div>
          </div>

          {/* Notice Callout */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Once submitted, answers become read-only and cannot be modified.
              You may safely navigate back to your dashboard or close this
              browser tab.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate("/student/dashboard")}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-700 text-center"
            >
              Return to Student Dashboard
            </button>
            {receipt.assessmentId && hasPublishedResults(receipt) && (
              <button
                onClick={() =>
                  navigate(`/student/results/${receipt.assessmentId}`)
                }
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Award className="w-4 h-4" /> View Detailed Evaluation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
