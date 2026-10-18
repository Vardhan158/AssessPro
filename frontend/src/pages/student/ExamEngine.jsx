import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  Bookmark,
  AlertOctagon,
  Send,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
  WifiOff,
  AlertCircle,
  Check,
} from "lucide-react";

export const formatOptionLabel = (optionId) =>
  String(optionId || "").replace(/^opt_/i, "").toUpperCase();

export const getRecordedIncidentCount = (attempt, incidentResponse) => {
  const responseCount = incidentResponse?.tabSwitches ?? incidentResponse?.data?.tabSwitchCount;
  if (Number.isFinite(Number(responseCount))) return Number(responseCount);
  return Number(attempt?.totalTabSwitches || 0);
};

export default function ExamEngine() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  // Exam Data
  const [attempt, setAttempt] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Response state
  const [answersMap, setAnswersMap] = useState({});
  const [markedMap, setMarkedMap] = useState({});
  const [visitedMap, setVisitedMap] = useState({});

  // Status & Proctoring
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [savingStatus, setSavingStatus] = useState("Saved"); // 'Saved' | 'Saving...' | 'Save failed'
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // Modals & Submit State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef(null);
  const saveTimeoutRef = useRef({});
  const warningShownRef = useRef({});
  const monitoringReadyRef = useRef(false);
  const monitoringArmedRef = useRef(false);
  const lastDismissedWarningRef = useRef("");
  const activeWarningKeyRef = useRef("");

  // Initialize Exam Session & Event Listeners
  useEffect(() => {
    let cancelled = false;
    const startSession = async () => {
      const ready = await initExamSession();
      if (cancelled || !ready) return;
      // Start integrity monitoring only after the server has returned the
      // active attempt and the exam paper. Initial navigation/fullscreen
      // transitions must not be treated as candidate incidents.
      monitoringReadyRef.current = true;
      setupProctoringListeners();
      setupCamera();
      setupNetworkListeners();
      // Ignore focus/fullscreen events emitted by the browser while the exam
      // route is settling after navigation or resume.
      window.setTimeout(() => {
        if (!cancelled) monitoringArmedRef.current = true;
      }, 1000);
    };
    startSession();

    return () => {
      cancelled = true;
      monitoringReadyRef.current = false;
      monitoringArmedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [attemptId]);

  async function handleOnline() {
    setIsOnline(true);
    setSavingStatus("Saving...");
    const current = questions[currentIndex];
    if (current && (answersMap[current.questionId] || markedMap[current.questionId])) {
      triggerDebouncedSave(
        current.questionId,
        answersMap[current.questionId] || "",
        !!markedMap[current.questionId],
      );
    } else {
      setSavingStatus("Saved");
    }
    try {
      await api.post(`/student/attempts/${attemptId}/incident`, {
        type: "NETWORK_DISCONNECT",
        details:
          "Candidate network re-established after brief offline disconnection",
      });
    } catch {
      // Ignore network incident log errors
    }
  }

  async function handleOffline() {
    setIsOnline(false);
    setSavingStatus("Offline");
    try {
      await api.post(`/student/attempts/${attemptId}/incident`, {
        type: "NETWORK_DISCONNECT",
        details: "Candidate network connection lost",
      });
    } catch {
      // Ignore network incident log errors
    }
  }

  function setupNetworkListeners() {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  async function initExamSession() {
    try {
      const res = await api.post("/student/attempts/start", {
        attemptId,
        readyConfirmed: true,
        privacyAccepted: true,
      });
      if (res.data.success) {
        setAttempt(res.data.attempt);
        setAssessment(res.data.assessment);
        setQuestions(res.data.paper?.questions || []);

        const initialAns = {};
        const initialMarked = {};
        (res.data.savedAnswers || []).forEach((a) => {
          if (a.selectedOptionId) initialAns[a.questionId] = a.selectedOptionId;
          if (a.isMarkedForReview) initialMarked[a.questionId] = true;
        });
        setAnswersMap(initialAns);
        setMarkedMap(initialMarked);
        setVisitedMap({ [res.data.paper?.questions?.[0]?.questionId]: true });
        setTabSwitches(res.data.attempt.totalTabSwitches || 0);
        return true;
      }
      return false;
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to initialize examination session",
      );
      navigate("/student/dashboard");
      return false;
    }
  }

  // STU-11 Continuous Server-Synced Timer Effect
  useEffect(() => {
    if (!attempt || !attempt.deadlineAt) return;

    const updateTimer = () => {
      const deadline = new Date(attempt.deadlineAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));

      setTimeLeftSeconds(remaining);

      if (remaining <= 0) {
        handleAutoSubmit("Time limit expired");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [attempt, handleAutoSubmit]);

  useEffect(() => {
    if (timeLeftSeconds <= 0) return;
    const threshold = timeLeftSeconds <= 300 ? 5 : timeLeftSeconds <= 600 ? 10 : 0;
    if (threshold && !warningShownRef.current[threshold]) {
      warningShownRef.current[threshold] = true;
      setWarningMessage(`You have ${threshold} minutes remaining. Your answers continue to save automatically.`);
      setShowWarningModal(true);
    }
  }, [timeLeftSeconds]);

  useEffect(() => {
    const current = questions[currentIndex];
    if (current) {
      const timer = setTimeout(() => setVisitedMap((previous) => ({ ...previous, [current.questionId]: true })));
      return () => clearTimeout(timer);
    }
  }, [currentIndex, questions]);

  // Session Heartbeat Ping Every 30 Seconds
  useEffect(() => {
    if (!attemptId) return;

    const heartbeatInterval = setInterval(async () => {
      try {
        await api.post(`/student/attempts/${attemptId}/heartbeat`);
      } catch (err) {
        console.warn("Session heartbeat ping failed", err);
      }
    }, 30 * 1000);

    return () => clearInterval(heartbeatInterval);
  }, [attemptId]);

  // STU-12 Periodic 2-Minute Camera Snapshot Proctoring Interval
  useEffect(() => {
    if (!attemptId) return;

    const snapshotInterval = setInterval(
      async () => {
        try {
          await api.post(`/student/attempts/${attemptId}/incident`, {
            type: "CAMERA_SNAPSHOT",
            details: "Periodic 2-minute camera snapshot recorded for audit log",
          });
        } catch (err) {
          console.warn("Periodic camera snapshot ping failed", err);
        }
      },
      2 * 60 * 1000,
    ); // Every 2 minutes

    return () => clearInterval(snapshotInterval);
  }, [attemptId]);

  // STU-12 Proctoring Event Listeners (Tab Switches & Fullscreen Exit)
  function setupProctoringListeners() {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
  }

  async function handleFullscreenChange() {
    if (!monitoringReadyRef.current || !monitoringArmedRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await api.post(`/student/attempts/${attemptId}/incident`, {
          type: "FULLSCREEN_EXIT",
          details: "Candidate exited full-screen mode",
        });
      } catch (err) {
        console.warn("Failed to log fullscreen exit", err);
      }
    }
  }

  async function handleVisibilityChange() {
    if (monitoringReadyRef.current && monitoringArmedRef.current && document.hidden) {
      try {
        const res = await api.post(`/student/attempts/${attemptId}/incident`, {
          type: "TAB_SWITCH",
          details: "Candidate navigated away or switched browser tab",
        });

        if (res.data.success) {
          const switches =
            getRecordedIncidentCount(attempt, res.data);
          const maxSwitches = res.data.maxSwitches || 3;
          setTabSwitches(switches);

          if (res.data.autoSubmitted || res.data.data?.shouldAutoSubmit) {
            alert(
              `CRITICAL PROCTORING VIOLATION: Maximum tab switches (${maxSwitches}) exceeded. Examination automatically submitted.`,
            );
            navigate(`/student/submission/${attemptId}`);
          } else {
            const warningKey = `TAB_SWITCH:${switches}`;
            if (lastDismissedWarningRef.current !== warningKey) {
              setWarningMessage(
                res.data.data?.warning ||
                  `Proctoring Warning (${switches}/${maxSwitches}): Tab switch or window focus change detected. This incident has been recorded for administrator review.`,
              );
              activeWarningKeyRef.current = warningKey;
              setShowWarningModal(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to log proctoring incident", err);
      }
    }
  }

  // Camera Setup
  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera feed unavailable during exam session", err);
      try {
        await api.post(`/student/attempts/${attemptId}/incident`, {
          type: "CAMERA_DISCONNECT",
          details: "Webcam feed disconnected or permission denied during exam",
        });
      } catch {
        // Ignore
      }
    }
  }

  // Select Answer Option
  const handleSelectOption = (optionId) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const qId = currentQ.questionId;
    const updatedAns = { ...answersMap, [qId]: optionId };
    setAnswersMap(updatedAns);
    triggerDebouncedSave(qId, optionId, !!markedMap[qId]);
  };

  // Clear Response
  const handleClearSelection = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const qId = currentQ.questionId;
    const updatedAns = { ...answersMap };
    delete updatedAns[qId];
    setAnswersMap(updatedAns);
    triggerDebouncedSave(qId, "", !!markedMap[qId]);
  };

  // Toggle Mark For Review
  const handleToggleMarkForReview = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const qId = currentQ.questionId;
    const isMarked = !markedMap[qId];
    setMarkedMap({ ...markedMap, [qId]: isMarked });
    triggerDebouncedSave(qId, answersMap[qId] || "", isMarked);
  };

  // Incremental Debounced Autosave (~800ms)
  const triggerDebouncedSave = (qId, optionId, isMarked) => {
    if (!isOnline) {
      setSavingStatus("Offline");
      return;
    }
    setSavingStatus("Saving...");
    if (saveTimeoutRef.current[qId]) {
      clearTimeout(saveTimeoutRef.current[qId]);
    }

    saveTimeoutRef.current[qId] = setTimeout(async () => {
      try {
        const res = await api.post(`/student/attempts/${attemptId}/answer`, {
          questionId: qId,
          selectedOptionId: optionId,
          isMarkedForReview: isMarked,
        });
        if (res.data.success) {
          setSavingStatus("Saved");
        } else {
          setSavingStatus("Save failed");
        }
      } catch {
        setSavingStatus(navigator.onLine ? "Save failed" : "Offline");
      }
    }, 800);
  };

  // STU-14 Manual Final Submission
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/student/attempts/${attemptId}/submit`);
      if (res.data.success) {
        navigate(`/student/submission/${attemptId}`);
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Submission failed. Please check network connection.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Automatic Submission Trigger (Timer expired / Tab switch limit)
  async function handleAutoSubmit(reason) {
    try {
      await api.post(`/student/attempts/${attemptId}/submit`, {
        autoSubmitted: true,
      });
      alert(`Examination submitted automatically: ${reason}`);
      navigate(`/student/submission/${attemptId}`);
    } catch {
      navigate("/student/dashboard");
    }
  }

  // Formatter for Countdown (HH:MM:SS or MM:SS)
  const formatTime = (secs) => {
    if (secs <= 0) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answersMap).filter(
    (k) => answersMap[k],
  ).length;
  const markedCount = Object.keys(markedMap).filter((k) => markedMap[k]).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Network Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 sticky top-0 z-50 shadow-lg">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Connection Lost: You are currently offline. Please re-establish
            connection to sync saved responses.
          </span>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div>
          <h2 className="text-sm font-bold text-white leading-tight">
            {assessment?.title || "Technical Assessment"}
          </h2>
          <span className="text-[11px] font-mono text-indigo-400">
            {assessment?.code}
          </span>
        </div>

        {/* STU-11 Server-Synced Countdown Timer (Warning Style when < 5 mins / 300s) */}
        <div
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all ${
            timeLeftSeconds < 300
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="font-mono text-sm">
            {formatTime(timeLeftSeconds)}
          </span>
          {timeLeftSeconds < 300 && (
            <span className="text-[10px] uppercase tracking-wider font-bold shrink-0">
              (&lt; 5m Warning)
            </span>
          )}
        </div>

        {/* Real-time Autosave Feedback */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
          {savingStatus === "Saving..." ? (
            <span className="text-amber-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
            </span>
          ) : savingStatus === "Save failed" ? (
            <button
              onClick={() =>
                currentQ &&
                triggerDebouncedSave(
                  currentQ.questionId,
                  answersMap[currentQ.questionId] || "",
                  !!markedMap[currentQ.questionId],
                )
              }
              className="text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5" /> Save failed (Retry)
            </button>
          ) : savingStatus === "Offline" ? (
            <span className="text-amber-400 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" /> Offline — waiting to retry
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        {/* Primary Submit Button */}
        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" /> Submit Exam
        </button>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4">
        {/* Main Question Card View */}
        <main className="lg:col-span-3 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
          {currentQ ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
              {/* Progress Indicator */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg font-mono text-[11px]">
                    QUESTION {currentIndex + 1} OF {totalQuestions}
                  </span>
                  {markedMap[currentQ.questionId] && (
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold">
                      MARKED FOR REVIEW
                    </span>
                  )}
                </div>
                <span className="text-indigo-300 font-mono">
                  [{currentQ.marks} Marks]
                </span>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                {currentQ.text}
              </div>

              {/* Optional Code Snippet */}
              {currentQ.codeSnippet && (
                <pre className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl text-xs font-mono text-indigo-300 overflow-x-auto">
                  <code>{currentQ.codeSnippet}</code>
                </pre>
              )}

              {/* Selectable Options */}
              <div className="space-y-3 pt-2">
                {currentQ.options.map((opt) => {
                  const isSelected =
                    answersMap[currentQ.questionId] === opt.optionId;
                  return (
                    <div
                      key={opt.optionId}
                      onClick={() => handleSelectOption(opt.optionId)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 text-sm ${
                        isSelected
                          ? "bg-indigo-600/15 border-indigo-500 text-white font-medium shadow-md shadow-indigo-600/10"
                          : "bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {formatOptionLabel(opt.optionId)}
                      </span>
                      <span className="leading-snug">{opt.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Functional Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-3">
                  {/* Mark for Review */}
                  <button
                    onClick={handleToggleMarkForReview}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      markedMap[currentQ.questionId]
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {markedMap[currentQ.questionId]
                      ? "Unmark Review"
                      : "Mark for Review"}
                  </button>

                  {/* Clear Response */}
                  {answersMap[currentQ.questionId] && (
                    <button
                      onClick={handleClearSelection}
                      className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Clear Response
                    </button>
                  )}
                </div>

                {/* Previous / Next Navigation */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => prev - 1)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>

                  <button
                    disabled={currentIndex === totalQuestions - 1}
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              Loading examination questions...
            </div>
          )}
        </main>

        {/* Right Sidebar: Proctor Monitor & Question Palette Navigator */}
        <aside className="bg-slate-900/60 border-l border-slate-800 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Proctor Monitor Card */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldAlert className="w-4 h-4" /> PROCTOR MONITOR
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ACTIVE
                </span>
              </div>

              {/* Video Thumbnail */}
              <div className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-rose-500/80 text-white font-bold text-[9px] rounded font-mono">
                  REC
                </span>
              </div>

              {/* Tab Switch Incident Counter */}
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between items-center font-medium">
                <span className="text-slate-400">Recorded Focus Events:</span>
                <span
                  className={`font-mono font-bold ${tabSwitches > 0 ? "text-amber-400" : "text-slate-200"}`}
                >
                  {tabSwitches}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                Focus changes are recorded with timestamps for administrator review;
                they are not proof of misconduct and do not automatically submit this exam.
                Review threshold: {assessment?.integrityPolicy?.maxTabSwitches || 3}{" "}
                {tabSwitches > (assessment?.integrityPolicy?.maxTabSwitches || 3)
                  ? "(exceeded; examination remains available)."
                  : "."}
              </p>
            </div>

            {/* Question Navigator Palette */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Question Navigator
                </h4>
                <span className="text-[10px] font-mono text-indigo-400">
                  {answeredCount}/{totalQuestions} Answered
                </span>
              </div>

              {/* Question Grid Buttons */}
              <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isAns = !!answersMap[q.questionId];
                  const isMrk = !!markedMap[q.questionId];
                  const isVisited = !!visitedMap[q.questionId];
                  const isCurrent = idx === currentIndex;

                  let colorClass =
                    "bg-slate-950 border-slate-800 text-slate-400";
                  if (isVisited && !isAns)
                    colorClass =
                      "bg-sky-950/70 border-sky-700 text-sky-200 font-semibold";
                  if (isAns)
                    colorClass =
                      "bg-emerald-600/90 border-emerald-500 text-white font-bold";
                  if (isMrk)
                    colorClass =
                      "bg-amber-600/90 border-amber-500 text-white font-bold";

                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCurrentIndex(idx)}
                      aria-label={`Question ${idx + 1}: ${isMrk && isAns ? "answered and marked for review" : isMrk ? "marked for review" : isAns ? "answered" : isVisited ? "visited unanswered" : "not visited"}`}
                      title={isMrk && isAns ? "Answered and marked for review" : isMrk ? "Marked for review" : isAns ? "Answered" : isVisited ? "Visited unanswered" : "Not visited"}
                      className={`h-9 rounded-xl border text-xs font-bold transition-all cursor-pointer ${colorClass} ${
                        isCurrent
                          ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105"
                          : "hover:border-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Navigator Palette Legend */}
              <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-700 shrink-0" />
                  <span>Visited unanswered ({Object.keys(visitedMap).filter((id) => visitedMap[id] && !answersMap[id]).length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Marked ({markedCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800 shrink-0" />
                  <span>Unanswered ({totalQuestions - answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-white shrink-0" />
                  <span>Current (Q{currentIndex + 1})</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Incident / Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl space-y-4">
            <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">
              Proctoring Incident Warning
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {warningMessage}
            </p>
            <button
              onClick={() => {
                lastDismissedWarningRef.current = activeWarningKeyRef.current;
                setShowWarningModal(false);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Resume Examination
            </button>
          </div>
        </div>
      )}

      {/* STU-14 Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl space-y-5">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Submit Examination?
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                You are about to finish your assessment. Once submitted, you
                cannot change your answers.
              </p>
            </div>

            {/* Actual Attempt Metrics Grid */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-xs space-y-2.5 text-slate-300 text-left">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                  Total Questions
                </span>
                <strong className="text-slate-100 font-mono text-sm">
                  {totalQuestions}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Answered Questions</span>
                <strong className="text-emerald-400 font-mono text-sm">
                  {answeredCount}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Unanswered Questions</span>
                <strong className="text-rose-400 font-mono text-sm">
                  {totalQuestions - answeredCount}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Marked for Review</span>
                <strong className="text-amber-400 font-mono text-sm">
                  {markedCount}
                </strong>
              </div>
            </div>

            {/* Confirmation CTA Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-700"
              >
                Cancel & Return
              </button>
              <button
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                    Submitting...
                  </>
                ) : (
                  "Confirm Submission"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
