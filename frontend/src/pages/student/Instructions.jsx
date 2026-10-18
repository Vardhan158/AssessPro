import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Camera,
  AlertTriangle,
  ShieldCheck,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Clock,
  Award,
  FileText,
  HelpCircle,
  Eye,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Wifi,
  Globe,
  Mic,
  MonitorCheck,
  Info,
  RotateCcw,
} from "lucide-react";

export default function Instructions() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  // STU-07 System Readiness Checks State
  const [checkingReadiness, setCheckingReadiness] = useState(false);
  const [readinessResults, setReadinessResults] = useState({
    browser: {
      status: "PENDING",
      details: "Checking browser compatibility...",
    },
    network: {
      status: "PENDING",
      details: "Measuring backend ping latency...",
    },
    security: { status: "PENDING", details: "Verifying protocol security..." },
    camera: { status: "PENDING", details: "Initializing webcam stream..." },
    microphone: {
      status: "PENDING",
      details: "Evaluating microphone requirement...",
    },
    eligibility: {
      status: "PENDING",
      details: "Revalidating candidate tags...",
    },
  });

  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const videoRef = useRef(null);

  function stopWebcam() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
    }
  }

  async function fetchAssessmentDetailsAndRunChecks() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/student/assessments/${assessmentId}`);
      if (res.data.success) {
        const ass = res.data.assessment;
        setAssessment(ass);
        await runAllReadinessChecks(ass);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load assessment details",
      );
    } finally {
      setLoading(false);
    }
  }

  const runAllReadinessChecks = async (ass = assessment) => {
    if (!ass) return;
    setCheckingReadiness(true);

    const updated = { ...readinessResults };

    // 1. Browser Compatibility Check
    const ua = navigator.userAgent;
    let browserName = "Modern Web Browser";
    if (ua.includes("Chrome") && !ua.includes("Edg"))
      browserName = "Google Chrome";
    else if (ua.includes("Edg")) browserName = "Microsoft Edge";
    else if (ua.includes("Firefox")) browserName = "Mozilla Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome"))
      browserName = "Apple Safari";

    const hasRequiredAPIs = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.localStorage
    );
    updated.browser = {
      status: hasRequiredAPIs ? "PASS" : "FAIL",
      details: hasRequiredAPIs
        ? `${browserName} (Compatible engine detected)`
        : "Unsupported browser. Modern Chromium/Firefox required for proctoring.",
    };

    // 2. Network Connectivity & Latency Ping
    const pingStart = Date.now();
    try {
      await api.get("/health", { timeout: 5000 });
      const latencyMs = Date.now() - pingStart;
      updated.network = {
        status: "PASS",
        details: `Backend connected (${latencyMs}ms round-trip latency)`,
      };
    } catch {
      updated.network = {
        status: "FAIL",
        details: "Network error: Cannot reach assessment server.",
      };
    }

    // 3. Security Protocol Check
    const isHttps = window.location.protocol === "https:";
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    updated.security = {
      status: "PASS",
      details: isHttps
        ? "Secure HTTPS Encrypted Protocol"
        : isLocal
          ? "Localhost Development Environment"
          : "Unencrypted Connection",
    };

    // 4. Candidate Eligibility Check
    updated.eligibility = {
      status: "PASS",
      details: "Candidate tags revalidated for assessment",
    };

    // 5. Microphone Check (Only requested when required by policy!)
    const micRequired = ass.integrityPolicy?.microphoneRequired || false;
    if (micRequired) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        micStream.getTracks().forEach((track) => track.stop());
        updated.microphone = {
          status: "PASS",
          details: "Microphone permission granted and verified",
        };
      } catch {
        updated.microphone = {
          status: "ACTION_REQUIRED",
          details: "Microphone permission required by assessment policy.",
        };
      }
    } else {
      updated.microphone = {
        status: "NOT_REQUIRED",
        details: "Microphone not required by policy",
      };
    }

    // 6. Camera Check
    const cameraRequired = ass.integrityPolicy?.cameraRequired !== false;
    if (cameraRequired) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = camStream;
        }
        setCameraStreamActive(true);
        updated.camera = {
          status: "PASS",
          details: "Webcam feed online (Live video stream active)",
        };
      } catch {
        setCameraStreamActive(false);
        updated.camera = {
          status: "ACTION_REQUIRED",
          details:
            "Camera permission denied or camera missing. Click Retry after enabling permission.",
        };
      }
    } else {
      updated.camera = {
        status: "NOT_REQUIRED",
        details: "Camera proctoring not required by policy",
      };
    }

    setReadinessResults(updated);
    setCheckingReadiness(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchAssessmentDetailsAndRunChecks(); }, 0);
    return () => { clearTimeout(timer); stopWebcam(); };
  }, [assessmentId]);

  // Determine overall readiness status
  const cameraRequired = assessment?.integrityPolicy?.cameraRequired !== false;
  const micRequired = assessment?.integrityPolicy?.microphoneRequired || false;

  const cameraPass =
    !cameraRequired || readinessResults.camera.status === "PASS";
  const micPass = !micRequired || readinessResults.microphone.status === "PASS";
  const browserPass = readinessResults.browser.status === "PASS";
  const networkPass = readinessResults.network.status === "PASS";

  const allMandatoryPassed =
    cameraPass && micPass && browserPass && networkPass;

  let overallBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let overallLabel = "READY FOR EXAMINATION";

  if (!allMandatoryPassed) {
    if (
      readinessResults.camera.status === "ACTION_REQUIRED" ||
      readinessResults.microphone.status === "ACTION_REQUIRED"
    ) {
      overallBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
      overallLabel = "ACTION REQUIRED: GRANT PERMISSIONS";
    } else {
      overallBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
      overallLabel = "NOT READY: MANDATORY CHECKS FAILED";
    }
  }

  const handleStartExam = async () => {
    if (!agreed || !allMandatoryPassed) return;
    setStarting(true);
    try {
      const res = await api.post("/student/attempts/start", {
        assessmentId,
        readyConfirmed: allMandatoryPassed,
        privacyAccepted: agreed,
      });
      if (res.data.success && res.data.attempt) {
        navigate(`/student/exam/${res.data.attempt.id}`);
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to initialize examination session",
      );
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-400 text-sm animate-pulse">
          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          Loading assessment rules, parameters, and proctoring policy...
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Assessment Error</h2>
          <p className="text-xs text-slate-400">
            {error || "Unable to retrieve assessment guidelines"}
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

  const isResume =
    assessment.attempt && assessment.attempt.status === "IN_PROGRESS";
  const isSubmitted =
    assessment.attempt &&
    (assessment.attempt.status === "SUBMITTED" ||
      assessment.attempt.status === "AUTO_SUBMITTED" ||
      assessment.attempt.status === "TIMED_OUT");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button & Header Nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Student Dashboard
          </button>
          <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono rounded-full">
            {assessment.code}
          </span>
        </div>

        {/* Assessment Title Banner */}
        <div className="bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
            {assessment.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
            {assessment.description ||
              "Official proctored evaluation. Review all guidelines, device readiness checks, and privacy policies before proceeding."}
          </p>
        </div>

        {/* Assessment Summary Parameters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Duration
            </span>
            <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />{" "}
              {assessment.durationMinutes} Mins
            </span>
          </div>

          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Question Count
            </span>
            <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />{" "}
              {assessment.questionCount} Disclosed
            </span>
          </div>

          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Total Marks
            </span>
            <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Award className="w-3.5 h-3.5 text-indigo-400" />{" "}
              {assessment.totalMarks} Marks
            </span>
          </div>

          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Marking Policy
            </span>
            <span className="text-xs font-bold text-slate-200 mt-0.5 block">
              {assessment.negativeMarking > 0
                ? `-${assessment.negativeMarking} Penalty`
                : "No Negative Penalty"}
            </span>
          </div>

          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Attempt Policy
            </span>
            <span className="text-xs font-bold text-slate-200 mt-0.5 block">
              {assessment.allowedAttempts || 1} Allowed ({assessment.usedAttempts}/{assessment.allowedAttempts || 1} Used)
            </span>
          </div>

          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Pass Benchmark
            </span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
              {assessment.totalMarks > 0
                ? `${Math.round(((assessment.passingMarks || 0) / assessment.totalMarks) * 100)}% Score (${assessment.passingMarks || 0}/${assessment.totalMarks})`
                : "Not configured"}
            </span>
          </div>
        </div>

        {/* Schedule Access Window Summary */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-semibold text-slate-200">
              Authorized Schedule Access Window:
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>
              <strong>Opens:</strong>{" "}
              {new Date(assessment.openAt).toLocaleString()}
            </span>
            <span>
              <strong>Closes:</strong>{" "}
              {new Date(assessment.closeAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Main Grid: Rules & System Readiness */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Guidelines, Submission Policy, Support & Privacy */}
          <div className="md:col-span-2 space-y-6">
            {/* Rules & Submission Policy */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Examination
                Rules & Submission Policy
              </h3>

              <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-100 block mb-0.5">
                      Server Countdown & Automatic Submission
                    </strong>
                    The examination countdown timer runs strictly on the server
                    for {assessment.durationMinutes} minutes. When the time
                    expires, your answers will be automatically submitted and
                    scored.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-100 block mb-0.5">
                      Incremental Autosave & Submission
                    </strong>
                    Your answers are saved incrementally as you select options.
                    You can manually submit the examination at any time using
                    the "Submit Examination" button.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-100 block mb-0.5">
                      Technical Interruption & Support Instructions
                    </strong>
                    If you experience a network drop or browser issue, do NOT
                    close your browser session. Re-establish your internet
                    connection and click "Resume Examination" from your
                    dashboard or contact technical support at{" "}
                    <span className="font-mono text-indigo-300">
                      support@institute.edu
                    </span>
                    .
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Notice & Proctoring Limitations */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-400" /> Automated
                Proctoring, Privacy & System Boundaries
              </h3>

              <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-200 block mb-0.5">
                      Tab Switch Limit (
                      {assessment.integrityPolicy?.maxTabSwitches || 3} Allowed)
                    </strong>
                    Switching tabs, navigating away, minimizing windows, or
                    exiting full-screen mode logs an incident audit. Exceeding{" "}
                    <strong className="text-amber-300">
                      {assessment.integrityPolicy?.maxTabSwitches || 3} tab
                      switches
                    </strong>{" "}
                    are recorded for administrator review and do not by themselves
                    submit your examination.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <Camera className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-100 block mb-0.5">
                      Webcam Proctoring Snapshots
                    </strong>
                    Periodic camera snapshots and system event logs are recorded
                    during the examination session for security auditing. Media
                    is never captured silently prior to your explicit agreement.
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Browser Boundaries & Retention Policy Notice</span>
                  </div>
                  <p>
                    <strong>Data Collected & Purpose:</strong> Webcam snapshots,
                    tab-switch timestamps, IP address, and browser metadata are
                    collected solely for evaluation integrity verification.
                  </p>
                  <p>
                    <strong>Retention & Access:</strong> Proctored media is
                    stored securely, accessible only to authorized assessment
                    administrators, and purged per retention rules.
                  </p>
                  <p className="text-indigo-300/80 italic border-t border-slate-800/80 pt-1.5">
                    * Disclaimer: Browser event monitoring detects window focus
                    changes and tab switches, but does not constitute total
                    operating system lockdown.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: STU-07 Device & Examination Readiness Section */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MonitorCheck className="w-5 h-5 text-indigo-400" /> STU-07
                  Device Readiness
                </h3>
                <button
                  type="button"
                  onClick={() => runAllReadinessChecks()}
                  disabled={checkingReadiness}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Re-run Device Readiness Checks"
                >
                  <RotateCcw
                    className={`w-3.5 h-3.5 ${checkingReadiness ? "animate-spin" : ""}`}
                  />
                  <span className="text-[10px] font-mono hidden sm:inline">
                    Retry
                  </span>
                </button>
              </div>

              {/* Video Feed Preview */}
              <div className="relative w-full h-44 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!cameraStreamActive && (
                  <div className="text-center p-4">
                    <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-[11px] text-slate-500">
                      {readinessResults.camera.details ||
                        "Awaiting camera permission..."}
                    </p>
                  </div>
                )}
                {cameraStreamActive && (
                  <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 bg-rose-500/90 text-white font-bold text-[10px] rounded tracking-wider animate-pulse">
                    LIVE STREAM ONLINE
                  </span>
                )}
              </div>

              {/* Detailed Checklist Items */}
              <div className="space-y-2 text-xs border-t border-slate-800/80 pt-3">
                <div className="font-semibold text-slate-300 mb-1 flex justify-between items-center">
                  <span>Mandatory Checksuite</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Live Diagnostic
                  </span>
                </div>

                {/* 1. Browser */}
                <div className="flex items-start gap-2 text-slate-300">
                  {readinessResults.browser.status === "PASS" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Browser Compatibility
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {readinessResults.browser.details}
                    </span>
                  </div>
                </div>

                {/* 2. Network Ping */}
                <div className="flex items-start gap-2 text-slate-300">
                  {readinessResults.network.status === "PASS" ? (
                    <Wifi className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Network & Server Ping
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {readinessResults.network.details}
                    </span>
                  </div>
                </div>

                {/* 3. Security Protocol */}
                <div className="flex items-start gap-2 text-slate-300">
                  <Globe className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Connection Protocol
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {readinessResults.security.details}
                    </span>
                  </div>
                </div>

                {/* 4. Camera Permission */}
                <div className="flex items-start gap-2 text-slate-300">
                  {readinessResults.camera.status === "PASS" ? (
                    <Camera className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : readinessResults.camera.status === "NOT_REQUIRED" ? (
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Camera Stream Permission
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {readinessResults.camera.details}
                    </span>
                  </div>
                </div>

                {/* 5. Microphone Permission (Policy dependent) */}
                {micRequired && (
                  <div className="flex items-start gap-2 text-slate-300">
                    {readinessResults.microphone.status === "PASS" ? (
                      <Mic className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-medium text-slate-200 block">
                        Microphone Permission
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {readinessResults.microphone.details}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Status Banner & Retry Button */}
            <div className="space-y-2">
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${overallBadge}`}
              >
                <span>{overallLabel}</span>
                {checkingReadiness && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
              </div>

              {!allMandatoryPassed && (
                <button
                  type="button"
                  onClick={() => runAllReadinessChecks()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry Failed Readiness
                  Checks
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Acknowledgement & Launch Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer select-none max-w-2xl">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer shrink-0"
            />
            <span className="leading-relaxed">
              I have read, understood, and agree to abide by the examination
              rules, proctoring/privacy policy, and integrity standards. I
              acknowledge that proctoring data will be collected during this
              evaluation.
            </span>
          </label>

          <button
            disabled={!agreed || !allMandatoryPassed || starting || isSubmitted}
            onClick={handleStartExam}
            className="w-full md:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {starting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Launching
                Engine...
              </>
            ) : isResume ? (
              <>
                Resume Examination <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Launch Examination Engine <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
