import { Fragment, useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import StudentManagementPage from "./StudentManagementPage";
import QuestionBankPage from "./QuestionBankPage";
import AssessmentManagementPage from "./AssessmentManagementPage";
import ScheduleAssignmentsPage from "./ScheduleAssignmentsPage";
import LiveMonitoringPage from "./LiveMonitoringPage";
import IncidentReviewPage from "./IncidentReviewPage";
import ResultsAnalyticsPage from "./ResultsAnalyticsPage";
import ReportsExportsPage from "./ReportsExportsPage";
import AdminOverviewPage from "./AdminOverviewPage";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShieldAlert,
  PlusCircle,
  Users,
  Award,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  UserPlus,
  Search,
  RotateCw,
  Activity,
  FileText,
  Clock,
  Zap,
  Sparkles,
  ChevronRight,
  Send,
  X,
  ExternalLink,
  UploadCloud,
  FileSpreadsheet,
  Download,
  BookOpen,
  Check,
  Filter,
  Trash2,
  ListPlus,
  UserCheck,
  SendHorizontal,
  Eye,
  BarChart2,
  Share2,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  AlertCircle,
  Monitor,
  LayoutDashboard,
  Calendar,
  FileDown,
  Info
} from "lucide-react";

export default function AdminDashboard() {
  const [assessments, setAssessments] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [results, setResults] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname === "/admin/reports" ? "reports" : "dashboard"); // 'dashboard' | 'candidates' | 'question-bank' | 'assessments' | 'schedule' | 'live-monitoring' | 'incidents' | 'results' | 'reports' | 'audit'
  const routeTabs = { "/admin/dashboard": "dashboard", "/admin/students": "candidates", "/admin/questions": "question-bank", "/admin/assessments": "assessments", "/admin/schedule": "schedule", "/admin/monitoring": "live-monitoring", "/admin/incidents": "incidents", "/admin/results": "results", "/admin/reports": "reports" };
  useEffect(() => setActiveTab(routeTabs[location.pathname] || "dashboard"), [location.pathname]);
  useEffect(() => {
    if (location.pathname === "/admin/questions") setShowQuestionBankModal(true);
  }, [location.pathname]);
  const [assessmentSearch, setAssessmentSearch] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [reportAssessmentFilter, setReportAssessmentFilter] = useState("ALL");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("ALL");
  const [reportSearch, setReportSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Step 6: 5-Step Assessment Creation Wizard State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDuration, setNewDuration] = useState(60);
  const [newTotalQuestions, setNewTotalQuestions] = useState(50);
  const [newMarks, setNewMarks] = useState(100);
  const [newPassingMarks, setNewPassingMarks] = useState(60);
  const [newNegativeMarking, setNewNegativeMarking] = useState(0);
  const [newAllowedAttempts, setNewAllowedAttempts] = useState(1);
  const [newOpenAt, setNewOpenAt] = useState(new Date().toISOString().slice(0, 16));
  const [newCloseAt, setNewCloseAt] = useState(new Date(Date.now() + 86400 * 1000 * 7).toISOString().slice(0, 16));
  const [wizardSelectedBankQuestions, setWizardSelectedBankQuestions] = useState([]);
  const [wizardSelectedStudentIds, setWizardSelectedStudentIds] = useState([]);
  const [assessmentFeedback, setAssessmentFeedback] = useState(null);

  // Step 8: Live Examination Monitoring Modal State
  const [showLiveMonitoringModal, setShowLiveMonitoringModal] = useState(false);
  const [liveMonitoringData, setLiveMonitoringData] = useState(null);
  const [loadingLiveMonitoring, setLoadingLiveMonitoring] = useState(false);

  // Candidate Management Form (Manual + Excel)
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [candidateTab, setCandidateTab] = useState("upload");
  const [candFirstName, setCandFirstName] = useState("");
  const [candLastName, setCandLastName] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [candPhone, setCandPhone] = useState("");
  const [candCollege, setCandCollege] = useState("");
  const [candBranch, setCandBranch] = useState("");
  const [candYear, setCandYear] = useState("4th Year");
  const [registeredCandidate, setRegisteredCandidate] = useState(null);

  // Excel Bulk Import State
  const [csvFile, setCsvFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState(null);

  // Question Bank State
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankCategoryFilter, setBankCategoryFilter] = useState("ALL");
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState("ALL");
  const [bankSearch, setBankSearch] = useState("");
  const wizardSelectedMarks = wizardSelectedBankQuestions.reduce((sum, id) => sum + Number(bankQuestions.find((q) => q._id === id)?.marks || 0), 0);

  // New Question Form
  const [qText, setQText] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qCorrect, setQCorrect] = useState("opt_a");
  const [qMarks, setQMarks] = useState(2);
  const [qCategory, setQCategory] = useState("General");
  const [qDifficulty, setQDifficulty] = useState("MEDIUM");
  const [qExplanation, setQExplanation] = useState("");
  const [qFeedback, setQFeedback] = useState(null);

  // Assign Students Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssessmentForAssign, setSelectedAssessmentForAssign] = useState(null);
  const [assignCandidateList, setAssignCandidateList] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assignFeedback, setAssignFeedback] = useState(null);

  // Import Questions Modal
  const [showImportBankModal, setShowImportBankModal] = useState(false);
  const [selectedAssessmentForQuestions, setSelectedAssessmentForQuestions] = useState(null);
  const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState([]);
  const [importBankFeedback, setImportBankFeedback] = useState(null);

  // Candidate Attempt Review & Result Publishing Modals
  const [showAttemptReviewModal, setShowAttemptReviewModal] = useState(false);
  const [attemptReviewData, setAttemptReviewData] = useState(null);
  const [incidentReviewDraft, setIncidentReviewDraft] = useState({});
  const [loadingReview, setLoadingReview] = useState(false);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedAssessmentForPublish, setSelectedAssessmentForPublish] = useState(null);
  const [publishShowScore, setPublishShowScore] = useState(true);
  const [publishShowAnswers, setPublishShowAnswers] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchAdminData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [assRes, incRes, resRes, candRes] = await Promise.all([
        api.get("/admin/assessments"),
        api.get("/admin/incidents"),
        api.get("/admin/results"),
        api.get("/admin/candidates"),
      ]);

      if (assRes.data.success) setAssessments(assRes.data.assessments || []);
      if (incRes.data.success) setIncidents(incRes.data.incidents || []);
      if (resRes.data.success) setResults(resRes.data.attempts || []);
      if (candRes.data.success) setCandidates(candRes.data.candidates || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchQuestionBank = useCallback(async () => {
    try {
      const res = await api.get("/admin/question-bank");
      if (res.data.success) setBankQuestions(res.data.questions || []);
    } catch (err) {
      console.error("Failed to fetch Question Bank:", err);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchAdminData(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchAdminData]);

  useEffect(() => {
    if (showQuestionBankModal || showImportBankModal || showCreateModal || activeTab === "question-bank") {
      fetchQuestionBank();
    }
  }, [showQuestionBankModal, showImportBankModal, showCreateModal, activeTab, fetchQuestionBank]);

  // Step 8: Open Live Examination Monitoring
  const handleOpenLiveMonitoring = async (assessment) => {
    setLoadingLiveMonitoring(true);
    setShowLiveMonitoringModal(true);
    setLiveMonitoringData(null);

    try {
      const res = await api.get(`/admin/assessments/${assessment._id}/live-monitoring`);
      if (res.data.success) {
        setLiveMonitoringData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch live monitoring details:", err);
    } finally {
      setLoadingLiveMonitoring(false);
    }
  };

  // Step 6: Create Assessment Wizard Submission
  const handleFinalWizardSubmit = async (status = "DRAFT") => {
    setAssessmentFeedback(null);
    if (!newTitle.trim() || !newCode.trim()) {
      setAssessmentFeedback({ type: "error", text: "Assessment Name and Code are required." });
      setWizardStep(1);
      return;
    }
    if (!Number.isInteger(newTotalQuestions) || newTotalQuestions < 1 || newTotalQuestions > bankQuestions.length) return setAssessmentFeedback({ type: "error", text: `Total Questions must be between 1 and the ${bankQuestions.length} eligible questions available.` });
    if (wizardSelectedBankQuestions.length !== newTotalQuestions) return setAssessmentFeedback({ type: "error", text: `Select exactly ${newTotalQuestions} questions before saving.` });
    if (newDuration <= 0) return setAssessmentFeedback({ type: "error", text: "Duration must be greater than zero." });
    if (newPassingMarks > wizardSelectedMarks) return setAssessmentFeedback({ type: "error", text: "Passing Marks cannot exceed Total Marks." });
    if (newAllowedAttempts < 1) return setAssessmentFeedback({ type: "error", text: "Maximum Allowed Attempts must be at least 1." });
    if (!newOpenAt || !newCloseAt || new Date(newCloseAt) <= new Date(newOpenAt)) return setAssessmentFeedback({ type: "error", text: "End Schedule must be later than Start Schedule." });

    try {
      const createRes = await api.post("/admin/assessments", {
        title: newTitle.trim(),
        code: newCode.trim().toUpperCase(),
        description: newDescription.trim(),
        durationMinutes: newDuration,
        totalQuestions: newTotalQuestions,
        totalMarks: wizardSelectedMarks,
        passingMarks: newPassingMarks,
        negativeMarking: newNegativeMarking,
        allowedAttempts: newAllowedAttempts,
        allowedEligibilityTags: ["ALL"],
        openAt: new Date(newOpenAt),
        closeAt: new Date(newCloseAt),
        status: "DRAFT",
        integrityPolicy: { maxTabSwitches: 3, cameraRequired: true, microphoneRequired: false, shuffleQuestions: true, shuffleOptions: true },
      });

      if (createRes.data.success) {
        const assessmentId = createRes.data.assessment._id;

        if (wizardSelectedBankQuestions.length > 0) {
          await api.post(`/admin/assessments/${assessmentId}/import-from-bank`, {
            questionIds: wizardSelectedBankQuestions
          });
        }

        if (wizardSelectedStudentIds.length > 0) {
          await api.put(`/admin/assessments/${assessmentId}/assignments`, {
            studentIds: wizardSelectedStudentIds
          });
        }

        if (status === "OPEN" || status === "PUBLISHED") {
          await api.patch(`/admin/assessments/${assessmentId}/status`, { status });
        }

        setShowCreateModal(false);
        setWizardStep(1);
        setNewTitle("");
        setNewCode("");
        setNewDescription("");
        setWizardSelectedBankQuestions([]);
        setWizardSelectedStudentIds([]);
        fetchAdminData();
      }
    } catch (err) {
      setAssessmentFeedback({
        type: "error",
        text: err.response?.data?.message || "Failed to create assessment",
      });
    }
  };

  // Export Results Handler
  const handleExportCSVReport = () => {
    if (filteredResults.length === 0) return alert("No results match the selected report filters.");
    const headers = ["Student ID", "Candidate Name", "Email", "College", "Assessment Title", "Assessment Code", "Score", "Total Marks", "Percentage", "Result Status", "Submission Method", "Completion Time (Mins)", "Proctor Incidents Count", "Submitted At"];
    const rows = filteredResults.map(r => [
      r.studentId || r.userId?.email || 'N/A', `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`,
      r.userId?.email || '', r.collegeName || '-', r.assessmentId?.title || '', r.assessmentId?.code || '',
      r.score != null ? r.score : 0, r.assessmentId?.totalMarks || 100, `${r.percentage || 0}%`,
      r.passed ? "PASSED" : "FAILED", r.status || 'SUBMITTED', r.durationMins || 0, r.incidentCount || 0,
      r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'
    ]);
    const escapeXml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const widths = headers.map((header, index) => Math.min(50, Math.max(header.length + 2, ...rows.map(row => String(row[index] ?? '').length + 2))));
    const columnXml = widths.map(width => `<Column ss:Width="${width * 7}"/>`).join('');
    const rowXml = (values, header = false) => `<Row>${values.map(value => `<Cell${header ? ' ss:StyleID="Header"' : ''}><Data ss:Type="${typeof value === 'number' ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>`).join('')}</Row>`;
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/></Style></Styles><Worksheet ss:Name="Assessment Results"><Table>${columnXml}${rowXml(headers, true)}${rows.map(row => rowXml(row)).join('')}</Table><AutoFilter x:Range="R1C1:R${rows.length + 1}C${headers.length}"/><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet></Workbook>`;
    const blob = new Blob([workbook], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `assessment_results_report_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Register Candidate Manually
  const handleRegisterCandidate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/admin/candidates/manual", {
        firstName: candFirstName,
        lastName: candLastName,
        email: candEmail,
        phone: candPhone,
        collegeName: candCollege,
        branch: candBranch,
        yearOfStudy: candYear || "4th Year",
      });

      if (res.data.success) {
        setRegisteredCandidate(res.data.candidate);
        setCandFirstName("");
        setCandLastName("");
        setCandEmail("");
        setCandPhone("");
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Candidate registration failed");
    }
  };

  // Candidate Bulk Excel Upload Preview
  const handlePreviewExcelUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return alert("Please select a CSV file to upload.");

    setUploading(true);
    setImportPreview(null);
    setImportSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await api.post("/admin/candidates/bulk-upload/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        setImportPreview(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to parse candidate CSV file.");
    } finally {
      setUploading(false);
    }
  };

  // Candidate Bulk Excel Upload Confirm
  const handleConfirmBulkImport = async () => {
    if (!importPreview || !importPreview.results) return;
    const validRows = importPreview.results.filter(r => r.status === "VALID").map(r => r.data);
    if (validRows.length === 0) return alert("No valid rows to import.");

    setUploading(true);
    try {
      const res = await api.post("/admin/candidates/bulk-upload/confirm", { validRows });
      if (res.data.success) {
        setImportSuccessMsg(`Successfully registered ${res.data.importedCount} candidates!`);
        setImportPreview(null);
        setCsvFile(null);
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to confirm bulk candidate import.");
    } finally {
      setUploading(false);
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = "First Name,Last Name,Email,Phone,College Name,Branch,Year of Study\nJohn,Doe,john.doe@example.com,9876543210,Institute of Technology,Computer Science,4th Year\nJane,Smith,jane.smith@example.com,9876543211,National Engineering College,Information Technology,3rd Year";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Create Question in Question Bank
  const handleCreateBankQuestion = async (e) => {
    e.preventDefault();
    setQFeedback(null);
    if (!qText.trim() || !qOptA.trim() || !qOptB.trim()) {
      setQFeedback({ type: "error", text: "Question text and options A and B are required." });
      return;
    }

    const options = [
      { optionId: "opt_a", text: qOptA.trim() },
      { optionId: "opt_b", text: qOptB.trim() }
    ];
    if (qOptC.trim()) options.push({ optionId: "opt_c", text: qOptC.trim() });
    if (qOptD.trim()) options.push({ optionId: "opt_d", text: qOptD.trim() });

    try {
      const res = await api.post("/admin/question-bank", {
        text: qText.trim(),
        options,
        correctOptionId: qCorrect,
        marks: qMarks,
        category: qCategory.trim() || "General",
        difficulty: qDifficulty,
        explanation: qExplanation.trim()
      });

      if (res.data.success) {
        setQFeedback({ type: "success", text: "Question added to Question Bank!" });
        setQText("");
        setQOptA("");
        setQOptB("");
        setQOptC("");
        setQOptD("");
        setQExplanation("");
        fetchQuestionBank();
      }
    } catch (err) {
      setQFeedback({ type: "error", text: err.response?.data?.message || "Failed to add question" });
    }
  };

  // Delete Question from Bank
  const handleDeleteBankQuestion = async (id) => {
    if (!confirm("Are you sure you want to remove this question from the Question Bank?")) return;
    try {
      await api.delete(`/admin/question-bank/${id}`);
      fetchQuestionBank();
    } catch {
      alert("Failed to delete question");
    }
  };

  // Open Assign Students Modal
  const handleOpenAssignModal = async (assessment) => {
    setSelectedAssessmentForAssign(assessment);
    setShowAssignModal(true);
    setAssignFeedback(null);

    try {
      const res = await api.get(`/admin/assessments/${assessment._id}/assignment-candidates`);
      if (res.data.success) {
        setAssignCandidateList(res.data.candidates || []);
        setSelectedStudentIds(res.data.assignedStudentIds || []);
      }
    } catch (err) {
      console.error("Failed to load candidate assignments:", err);
    }
  };

  // Submit Assigned Students
  const handleSaveAssignments = async () => {
    if (!selectedAssessmentForAssign) return;
    try {
      const res = await api.put(`/admin/assessments/${selectedAssessmentForAssign._id}/assignments`, {
        studentIds: selectedStudentIds
      });
      if (res.data.success) {
        setAssignFeedback({ type: "success", text: `Assigned ${selectedStudentIds.length} students successfully!` });
        fetchAdminData();
        setTimeout(() => setShowAssignModal(false), 1200);
      }
    } catch (err) {
      setAssignFeedback({ type: "error", text: err.response?.data?.message || "Failed to save student assignments" });
    }
  };

  // Open Import Bank Questions Modal
  const handleOpenImportBankModal = (assessment) => {
    setSelectedAssessmentForQuestions(assessment);
    setShowImportBankModal(true);
    setSelectedBankQuestionIds([]);
    setImportBankFeedback(null);
    fetchQuestionBank();
  };

  // Submit Question Bank Import to Assessment
  const handleConfirmImportBankQuestions = async () => {
    if (!selectedAssessmentForQuestions || selectedBankQuestionIds.length === 0) return;
    try {
      const res = await api.post(`/admin/assessments/${selectedAssessmentForQuestions._id}/import-from-bank`, {
        questionIds: selectedBankQuestionIds
      });
      if (res.data.success) {
        setImportBankFeedback({ type: "success", text: `Imported ${res.data.count} questions into assessment!` });
        fetchAdminData();
        setTimeout(() => setShowImportBankModal(false), 1200);
      }
    } catch (err) {
      setImportBankFeedback({ type: "error", text: err.response?.data?.message || "Failed to import questions" });
    }
  };

  // Candidate Attempt Review
  const handleOpenAttemptReview = async (attemptId) => {
    setLoadingReview(true);
    setShowAttemptReviewModal(true);
    setAttemptReviewData(null);

    try {
      const res = await api.get(`/admin/results/attempt/${attemptId}/details`);
      if (res.data.success) {
        setAttemptReviewData(res.data);
        setIncidentReviewDraft(Object.fromEntries((res.data.incidents || []).map((incident) => [incident._id, { status: ["PENDING", "REVIEWED", "NEEDS_INVESTIGATION"].includes(incident.status) ? incident.status : "PENDING", notes: incident.reviewerNotes || "" }])));
      }
    } catch (err) {
      console.error("Failed to load attempt review details:", err);
    } finally {
      setLoadingReview(false);
    }
  };

  const handleSaveIncidentReview = async (incidentId) => {
    const draft = incidentReviewDraft[incidentId];
    if (!draft) return;
    try {
      const res = await api.patch(`/admin/incidents/${incidentId}/decision`, { status: draft.status, decisionNote: draft.notes });
      if (res.data.success) {
        setAttemptReviewData((previous) => ({ ...previous, incidents: previous.incidents.map((incident) => incident._id === incidentId ? res.data.incident : incident) }));
      }
    } catch (err) {
      console.error("Failed to save incident review:", err);
    }
  };

  // Open Publish Results Modal
  const handleOpenPublishModal = (assessment) => {
    setSelectedAssessmentForPublish(assessment);
    setShowPublishModal(true);
    setPublishFeedback(null);
  };

  // Confirm Publish Results
  const handleConfirmPublishResults = async () => {
    if (!selectedAssessmentForPublish) return;
    try {
      const res = await api.patch(`/admin/results/${selectedAssessmentForPublish._id}/publish`, {
        showScore: publishShowScore,
        showAnswers: publishShowAnswers
      });
      if (res.data.success) {
        setPublishFeedback({ type: "success", text: "Results published successfully to candidate portal!" });
        fetchAdminData();
        setTimeout(() => setShowPublishModal(false), 1200);
      }
    } catch (err) {
      setPublishFeedback({ type: "error", text: err.response?.data?.message || "Failed to publish results" });
    }
  };

  // Toggle Assessment Status
  const handleToggleStatus = async (assessment) => {
    let nextStatus = "OPEN";
    if (assessment.status === "DRAFT") nextStatus = "OPEN";
    else if (assessment.status === "OPEN" || assessment.status === "PUBLISHED") nextStatus = "CLOSED";

    try {
      await api.patch(`/admin/assessments/${assessment._id}/status`, { status: nextStatus });
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update assessment status");
    }
  };

  const activeAttempts = results.filter((attempt) => attempt.status === "IN_PROGRESS").length;
  const completedAttempts = results.filter((attempt) =>
    ["SUBMITTED", "AUTO_SUBMITTED", "TIMED_OUT", "FORCE_SUBMITTED", "SCORED"].includes(attempt.status)
  ).length;
  const pendingIncidents = incidents.filter((incident) => ["LOGGED", "FLAGGED"].includes(incident.status)).length;
  const ManagementPage = activeTab === "schedule" ? ScheduleAssignmentsPage : activeTab === "live-monitoring" ? LiveMonitoringPage : AssessmentManagementPage;
  const ResultsPage = activeTab === "results" ? ResultsAnalyticsPage : Fragment;
  const ReportsPage = activeTab === "reports" ? ReportsExportsPage : Fragment;

  const reportAssessments = [...new Map(results.filter((result) => result.assessmentId?._id).map((result) => [result.assessmentId._id, result.assessmentId])).values()];
  const filteredResults = results.filter((result) => {
    const matchesAssessment = reportAssessmentFilter === "ALL" || result.assessmentId?._id === reportAssessmentFilter;
    const submittedAt = result.submittedAt ? new Date(result.submittedAt) : null;
    const matchesStart = !reportStartDate || (submittedAt && submittedAt >= new Date(`${reportStartDate}T00:00:00`));
    const matchesEnd = !reportEndDate || (submittedAt && submittedAt <= new Date(`${reportEndDate}T23:59:59.999`));
    const status = result.passed == null ? "PENDING" : result.passed ? "PASSED" : "FAILED";
    const matchesStatus = reportStatusFilter === "ALL" || status === reportStatusFilter;
    const candidateName = `${result.userId?.firstName || ""} ${result.userId?.lastName || ""} ${result.studentId || ""}`.toLowerCase();
    return matchesAssessment && matchesStart && matchesEnd && matchesStatus && candidateName.includes(reportSearch.toLowerCase().trim());
  });

  const [candidateStatusFilter, setCandidateStatusFilter] = useState("ALL"); // 'ALL' | 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

  const visibleAssessments = assessments.filter((assessment) =>
    `${assessment.title} ${assessment.code}`.toLowerCase().includes(assessmentSearch.toLowerCase())
  );

  const visibleCandidates = candidates.filter((candidate) => {
    const matchesSearch = `${candidate.firstName} ${candidate.lastName} ${candidate.email} ${candidate.studentId} ${candidate.collegeName}`
      .toLowerCase()
      .includes(candidateSearch.toLowerCase());
    const matchesStatus =
      candidateStatusFilter === "ALL" ||
      (candidateStatusFilter === "INVITED" && (candidate.status === "PENDING_ACTIVATION" || candidate.status === "INVITED")) ||
      (candidateStatusFilter === "ACTIVE" && candidate.status === "ACTIVE") ||
      (candidateStatusFilter === "SUSPENDED" && candidate.status === "SUSPENDED") ||
      (candidateStatusFilter === "DEACTIVATED" && (candidate.status === "INACTIVE" || candidate.status === "DEACTIVATED"));
    return matchesSearch && matchesStatus;
  });

  const filteredBankQuestions = bankQuestions.filter((q) => {
    const matchesCategory = bankCategoryFilter === "ALL" || q.category === bankCategoryFilter;
    const matchesDifficulty = bankDifficultyFilter === "ALL" || q.difficulty === bankDifficultyFilter;
    const matchesSearch = q.text.toLowerCase().includes(bankSearch.toLowerCase()) || q.category.toLowerCase().includes(bankSearch.toLowerCase());
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-indigo-500 selection:text-white flex">
      {/* Dynamic Animated Ambient Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>

      {/* FINAL ADMIN SIDEBAR NAVIGATION */}
      <aside className="fixed inset-y-0 left-0 z-30 h-screen w-64 border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-2xl p-5 flex flex-col justify-between shadow-2xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-white/20">
              <ShieldAlert className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">AssessPro</span>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
                  Admin
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Interview Evaluation</p>
            </div>
          </div>

          <nav className="space-y-1 overflow-y-auto max-h-[70vh]">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/admin/students")}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "candidates" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-indigo-400" />
                <span>Student Management</span>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{candidates.length}</span>
            </button>

            <button
              onClick={() => navigate("/admin/questions")}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "question-bank" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                <span>Question Bank</span>
              </div>
              <span className="rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold">{bankQuestions.length}</span>
            </button>

            <button
              onClick={() => navigate("/admin/assessments")}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "assessments" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-violet-400" />
                <span>Assessment Management</span>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{assessments.length}</span>
            </button>

            <button
              onClick={() => navigate("/admin/schedule")}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "schedule" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-sky-400" />
                <span>Schedule & Assignments</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/admin/monitoring")}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "live-monitoring" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-emerald-400" />
                <span>Live Monitoring</span>
              </div>
            </button>

            <button
              onClick={() => navigate("/admin/incidents")}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "incidents" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Incident Review</span>
              </div>
              <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">{incidents.length}</span>
            </button>

            <button
              onClick={() => navigate("/admin/results")}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "results" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Results & Analytics</span>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{results.length}</span>
            </button>

            <button
              onClick={() => navigate("/admin/reports")}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${activeTab === "reports" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"}`}
            >
              <div className="flex items-center gap-3">
                <FileDown className="h-4 w-4 text-cyan-400" />
                <span>Reports & Exports</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="truncate text-xs">
            <p className="font-bold text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-slate-400 truncate text-[11px] font-mono">{user?.email}</p>
          </div>
          <button onClick={logout} title="Logout & end session securely" className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 ml-64 min-h-screen w-[calc(100%-16rem)] overflow-y-auto p-6 sm:p-8 space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Assessment Governance Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeTab === "dashboard" ? "Admin Control Dashboard" :
               activeTab === "candidates" ? "Student Onboarding & Management" :
               activeTab === "assessments" || activeTab === "schedule" ? "Assessment Management & Scheduling" :
               activeTab === "live-monitoring" ? "Live Examination Telemetry" :
               activeTab === "incidents" ? "Security & Incident Audit Review" : "Candidate Evaluation & Analytics"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => fetchAdminData(true)} disabled={refreshing} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">
              <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button onClick={() => { setShowCreateModal(true); setWizardStep(1); }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 transition-all cursor-pointer">
              <PlusCircle className="h-4 w-4" />
              <span>Create Exam</span>
            </button>
          </div>
        </div>

        <AdminOverviewPage>
        {/* SUMMARY METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Students</p>
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{candidates.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Registered candidates</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assessments</p>
              <Award className="h-5 w-5 text-violet-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{assessments.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Total created exams</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Exams</p>
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{assessments.reduce((count, assessment) => count + Number(assessment.activeAttemptCount || 0), 0)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Ongoing student attempts</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Reviews</p>
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{pendingIncidents}</p>
            <p className="text-[11px] text-slate-400 mt-1">Flagged proctor incidents</p>
          </div>
        </div>

        {/* QUICK ACTIONS BAR */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => { setShowCandidateModal(true); setCandidateTab("upload"); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 p-3 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4 text-indigo-400" />
              <span>Add Students</span>
            </button>

            <button
              onClick={() => { setShowQuestionBankModal(true); fetchQuestionBank(); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600/20 border border-cyan-500/30 p-3 text-xs font-bold text-cyan-300 hover:bg-cyan-600/30 transition-all cursor-pointer"
            >
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <span>Question Bank</span>
            </button>

            <button
              onClick={() => { setShowCreateModal(true); setWizardStep(1); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600/20 border border-violet-500/30 p-3 text-xs font-bold text-violet-300 hover:bg-violet-600/30 transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-violet-400" />
              <span>Create Exam</span>
            </button>

            <button
              onClick={() => setActiveTab("results")}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>View Results</span>
            </button>
          </div>
        </div>

        </AdminOverviewPage>

        {/* TAB 1: ASSESSMENTS / SCHEDULE MANAGEMENT */}
        {(activeTab === "assessments" || activeTab === "schedule" || activeTab === "dashboard" || activeTab === "live-monitoring") && (
          <ManagementPage>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assessment name or code..."
                  value={assessmentSearch}
                  onChange={(e) => setAssessmentSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-4 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {visibleAssessments.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 text-xs">
                  No assessments found matching your search.
                </div>
              ) : (
                visibleAssessments.map((a) => (
                  <div key={a._id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-slate-700 transition-all">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                          {a.code}
                        </span>
                        <h3 className="text-base font-bold text-white">{a.title}</h3>
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          a.status === "RESULTS_PUBLISHED" ? "bg-violet-500/20 border-violet-500/30 text-violet-300" :
                          a.status === "OPEN" || a.status === "PUBLISHED" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
                          a.status === "DRAFT" ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "bg-slate-700/50 border-slate-600 text-slate-400"
                        }`}>
                          {a.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.durationMinutes} mins</span>
                        <span>Total Marks: <strong className="text-white">{a.totalMarks}</strong></span>
                        <span>Passing Marks: <strong className="text-white">{a.passingMarks || 60}</strong></span>
                        <span>Questions: <strong className="text-indigo-300">{a.questionCount || 0}</strong></span>
                        <span>Assigned Students: <strong className="text-emerald-300">{a.assignedStudentCount || 0}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleOpenLiveMonitoring(a)}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        <span>Live Monitoring</span>
                      </button>

                      <button
                        onClick={() => handleOpenImportBankModal(a)}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Add Questions</span>
                      </button>

                      <button
                        onClick={() => handleOpenAssignModal(a)}
                        className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Assign Students</span>
                      </button>

                      <button
                        onClick={() => handleOpenPublishModal(a)}
                        className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Publish Results</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(a)}
                        className={`rounded-xl px-3 py-2 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                          a.status === "DRAFT" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-amber-600 hover:bg-amber-500"
                        }`}
                      >
                        <SendHorizontal className="h-3.5 w-3.5" />
                        <span>{a.status === "DRAFT" ? "Publish Exam" : "Close Exam"}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </ManagementPage>
        )}

        {/* TAB 2: CANDIDATES LIST */}
        {activeTab === "candidates" && (
          <StudentManagementPage>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-3 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search candidate name, email, or student ID..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-4 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={candidateStatusFilter}
                    onChange={(e) => setCandidateStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-900 py-2 px-3 text-xs text-slate-200 font-bold outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="INVITED">Invited (Pending)</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="DEACTIVATED">Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowCandidateModal(true); setCandidateTab("upload"); }}
                  className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                  <span>Import Students</span>
                </button>

                <button
                  onClick={() => { setShowCandidateModal(true); setCandidateTab("manual"); }}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Candidate</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 font-bold">Student ID</th>
                    <th className="p-3.5 font-bold">Name</th>
                    <th className="p-3.5 font-bold">Email</th>
                    <th className="p-3.5 font-bold">College / Branch</th>
                    <th className="p-3.5 font-bold">Account Status</th>
                    <th className="p-3.5 font-bold">Invitation Status</th>
                    <th className="p-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visibleCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">No candidates registered yet.</td>
                    </tr>
                  ) : (
                    visibleCandidates.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-indigo-400">{c.studentId}</td>
                        <td className="p-3.5 font-bold text-white">{c.firstName} {c.lastName}</td>
                        <td className="p-3.5 text-slate-300 font-mono">{c.email}</td>
                        <td className="p-3.5 text-slate-400">{c.collegeName} ({c.branch}) - {c.yearOfStudy}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                            c.status === "SUSPENDED" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.invitationStatus === "SENT" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                            c.invitationStatus === "FAILED" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}>
                            {c.invitationStatus || "PENDING"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {c.status === "PENDING_ACTIVATION" && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.post(`/admin/candidates/${c.id}/resend-invitation`);
                                  alert(res.data.message || "Invitation re-sent!");
                                  fetchAdminData();
                                } catch (err) {
                                  alert(err.response?.data?.message || "Failed to resend invitation");
                                }
                              }}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer mr-2"
                            >
                              Resend Link
                            </button>
                          )}

                          {c.status !== "PENDING_ACTIVATION" && <button
                            onClick={async () => {
                              const nextStatus = c.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                              try {
                                await api.patch(`/admin/candidates/${c.id}/status`, { status: nextStatus });
                                fetchAdminData();
                              } catch (err) {
                                alert(err.response?.data?.message || "Failed to update candidate status");
                              }
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                              c.status === "ACTIVE" ? "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                          >
                            {c.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </StudentManagementPage>
        )}

        {/* TAB 3: PROCTOR ALERTS / INCIDENT REVIEW */}
        {activeTab === "incidents" && (
          <IncidentReviewPage>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Security & Proctor Incident Review</h2>
                <p className="text-xs text-slate-400">Examine candidate integrity event timelines and record administrative decisions</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-bold flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>Assessment Integrity Notice: Recorded browser events serve as audit logs for review and are not automatically treated as proof of misconduct.</span>
            </div>

            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 text-xs">
                  No proctoring violations or incidents logged.
                </div>
              ) : (
                incidents.map((inc) => (
                  <div key={inc._id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-sm">{inc.userId?.firstName} {inc.userId?.lastName} ({inc.userId?.email})</span>
                          <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{inc.assessmentId?.code}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            inc.status === "CLEARED" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                            inc.status === "DOCUMENTED" ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" :
                            inc.status === "ESCALATED" ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          }`}>
                            {inc.status}
                          </span>
                        </div>
                        <p className="text-slate-300 font-mono text-[11px]"><strong className="text-amber-300">{inc.type}</strong> — {inc.details || inc.description}</p>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{new Date(inc.createdAt || inc.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <button
                        onClick={async () => {
                          try {
                            await api.patch(`/admin/incidents/${inc._id}/decision`, { status: "CLEARED", decisionNote: "Event reviewed and cleared by admin." });
                            fetchAdminData();
                          } catch { alert("Failed to record decision"); }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-bold cursor-pointer"
                      >
                        Clear Incident
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            await api.patch(`/admin/incidents/${inc._id}/decision`, { status: "DOCUMENTED", decisionNote: "Event documented for candidate record." });
                            fetchAdminData();
                          } catch { alert("Failed to record decision"); }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 font-bold cursor-pointer"
                      >
                        Document
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            await api.patch(`/admin/incidents/${inc._id}/decision`, { status: "ESCALATED", decisionNote: "Escalated for senior review." });
                            fetchAdminData();
                          } catch { alert("Failed to record decision"); }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-bold cursor-pointer"
                      >
                        Escalate
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </IncidentReviewPage>
        )}

        {/* TAB 4: RESULTS LOG & ANALYTICS */}
        {(activeTab === "results" || activeTab === "reports") && (
          <ResultsPage>
          <ReportsPage>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">{activeTab === "reports" ? "Reports & Exports" : "Results & Candidate Analytics"}</h2>
                <p className="text-xs text-slate-400">Review, filter, and export candidate assessment results</p>
              </div>

              <button
                onClick={handleExportCSVReport}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Download className="h-4 w-4" />
                <span>Export Report (Excel/CSV)</span>
              </button>
            </div>

            {activeTab === "reports" && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Total Candidates', results.length], ['Completed Assessments', completedAttempts], ['Passed', results.filter((r) => r.passed).length], ['Failed', results.filter((r) => r.passed === false).length]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-[10px] uppercase font-bold text-slate-400">{label}</p><p className="mt-1 text-2xl font-extrabold text-white">{value}</p></div>)}
            </div>}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <select value={reportAssessmentFilter} onChange={(e) => setReportAssessmentFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                <option value="ALL">All assessments</option>
                {reportAssessments.map((assessment) => <option key={assessment._id} value={assessment._id}>{assessment.title} ({assessment.code})</option>)}
              </select>
              <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} aria-label="Report start date" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200" />
              <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} aria-label="Report end date" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200" />
              <select value={reportStatusFilter} onChange={(e) => setReportStatusFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                <option value="ALL">All result statuses</option><option value="PASSED">Passed</option><option value="FAILED">Failed</option><option value="PENDING">Pending</option>
              </select>
              <input value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} placeholder="Search candidate or student ID" className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200" />
              <p className="md:col-span-2 text-[11px] text-slate-400 self-center">Showing {filteredResults.length} of {results.length} results.</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 font-bold">Candidate</th>
                    <th className="p-3.5 font-bold">Assessment</th>
                    <th className="p-3.5 font-bold">Score / Total</th>
                    <th className="p-3.5 font-bold">Result</th>
                    <th className="p-3.5 font-bold">Completion Time</th>
                    <th className="p-3.5 font-bold">Proctor Incidents</th>
                    <th className="p-3.5 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">No candidate attempts submitted yet.</td>
                    </tr>
                  ) : (
                    filteredResults.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-white">
                          <p>{r.userId?.firstName} {r.userId?.lastName}</p>
                          <p className="text-[10px] font-mono text-indigo-400">{r.studentId || r.userId?.email}</p>
                        </td>
                        <td className="p-3.5 text-indigo-300 font-medium">
                          <p>{r.assessmentId?.title}</p>
                          <span className="text-[10px] font-mono text-slate-400">{r.assessmentId?.code}</span>
                        </td>
                        <td className="p-3.5 font-bold text-white">
                          {r.score != null ? `${r.score} / ${r.assessmentId?.totalMarks || 100} (${r.percentage}%)` : "Pending"}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            r.passed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}>
                            {r.passed ? "PASSED" : "FAILED"}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300 font-mono">
                          {r.durationMins ? `${r.durationMins} mins` : "-"}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.incidentCount > 0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-slate-800 text-slate-400"
                          }`}>
                            {r.incidentCount || 0} Incident(s)
                          </span>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleOpenAttemptReview(r._id)}
                            className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Review Attempt</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </ReportsPage>
          </ResultsPage>
        )}
      </main>

      {/* LIVE EXAMINATION MONITORING MODAL */}
      {showLiveMonitoringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Monitor className="h-5 w-5 text-emerald-400" />
                Live Examination Monitoring — {liveMonitoringData?.assessment?.title}
              </h3>
              <button onClick={() => setShowLiveMonitoringModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingLiveMonitoring || !liveMonitoringData ? (
              <p className="p-8 text-center text-slate-400 text-xs">Loading live examination telemetry...</p>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned</p>
                    <p className="text-xl font-extrabold text-white mt-1">{liveMonitoringData.summary?.totalAssigned || 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Started</p>
                    <p className="text-xl font-extrabold text-indigo-400 mt-1">{liveMonitoringData.summary?.startedCount || 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Not Started</p>
                    <p className="text-xl font-extrabold text-slate-400 mt-1">{liveMonitoringData.summary?.notStartedCount || 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">In Progress</p>
                    <p className="text-xl font-extrabold text-sky-400 mt-1">{liveMonitoringData.summary?.inProgressCount || 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Submitted</p>
                    <p className="text-xl font-extrabold text-emerald-400 mt-1">{liveMonitoringData.summary?.submittedCount || 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Timed Out</p>
                    <p className="text-xl font-extrabold text-amber-400 mt-1">{liveMonitoringData.summary?.timedOutCount || 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Review Req.</p>
                    <p className="text-xl font-extrabold text-rose-400 mt-1">{liveMonitoringData.summary?.reviewRequiredCount || 0}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Candidate</th>
                        <th className="p-3">Live Status</th>
                        <th className="p-3">Tab Switches</th>
                        <th className="p-3">Incidents</th>
                        <th className="p-3">Started At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {liveMonitoringData.candidates.map((cand) => (
                        <tr key={cand.userId} className="hover:bg-slate-900/50">
                          <td className="p-3">
                            <p className="font-bold text-white">{cand.name}</p>
                            <p className="text-[11px] font-mono text-slate-400">{cand.studentId} | {cand.email}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              cand.liveStatus === "In Progress" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" :
                              cand.liveStatus === "Submitted" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                              cand.liveStatus === "Review Required" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                              cand.liveStatus === "Timed Out" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-slate-800 text-slate-400"
                            }`}>
                              {cand.liveStatus}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-300">{cand.tabSwitches} Switches</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cand.incidentCount > 0 ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"}`}>
                              {cand.incidentCount} Logged
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-400">{cand.startedAt ? new Date(cand.startedAt).toLocaleTimeString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-400 text-center italic">
                  Note: Administrators can inspect telemetry and incident timelines, but student answer choices remain strictly read-only and immutable.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE ASSESSMENT WIZARD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-5 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-400" />
                Create New Assessment — Step {wizardStep} of 5
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
              <div className={`p-2 rounded-xl border ${wizardStep === 1 ? "bg-indigo-600 text-white border-indigo-400" : wizardStep > 1 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-slate-950 text-slate-500 border-slate-800"}`}>
                1. Basic Details
              </div>
              <div className={`p-2 rounded-xl border ${wizardStep === 2 ? "bg-indigo-600 text-white border-indigo-400" : wizardStep > 2 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-slate-950 text-slate-500 border-slate-800"}`}>
                2. Exam Rules
              </div>
              <div className={`p-2 rounded-xl border ${wizardStep === 3 ? "bg-indigo-600 text-white border-indigo-400" : wizardStep > 3 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-slate-950 text-slate-500 border-slate-800"}`}>
                3. Questions
              </div>
              <div className={`p-2 rounded-xl border ${wizardStep === 4 ? "bg-indigo-600 text-white border-indigo-400" : wizardStep > 4 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-slate-950 text-slate-500 border-slate-800"}`}>
                4. Assign
              </div>
              <div className={`p-2 rounded-xl border ${wizardStep === 5 ? "bg-indigo-600 text-white border-indigo-400" : "bg-slate-950 text-slate-500 border-slate-800"}`}>
                5. Review
              </div>
            </div>

            {assessmentFeedback && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                assessmentFeedback.type === "error" ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}>
                {assessmentFeedback.text}
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-white">Enter the assessment title, code, description, and target purpose</p>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Assessment Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Technical Round 1"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Assessment Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. TECH-2026"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Description / Candidate Instructions</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of skills evaluated and candidate instructions..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-white">Configure timing, total questions, marking scheme, and rules</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Total Questions</label>
                    <input
                      type="number"
                      min="1"
                      value={newTotalQuestions}
                      onChange={(e) => setNewTotalQuestions(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Total Marks</label>
                    <input
                      type="number"
                      min="1"
                      value={wizardSelectedMarks}
                      readOnly
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Passing Marks</label>
                    <input
                      type="number"
                      min="1"
                      value={newPassingMarks}
                      onChange={(e) => setNewPassingMarks(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Negative Marking Per Error</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={newNegativeMarking}
                      onChange={(e) => setNewNegativeMarking(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Maximum Allowed Attempts</label>
                    <input
                      type="number"
                      min="1"
                      value={newAllowedAttempts}
                      onChange={(e) => setNewAllowedAttempts(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Start Schedule Date/Time</label>
                    <input
                      type="datetime-local"
                      value={newOpenAt}
                      onChange={(e) => setNewOpenAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">End Schedule Date/Time</label>
                    <input
                      type="datetime-local"
                      value={newCloseAt}
                      onChange={(e) => setNewCloseAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white">Select questions from Central Question Bank for this paper</p>
                  <span className="font-bold text-cyan-300">{wizardSelectedBankQuestions.length} Selected</span>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 divide-y divide-slate-800">
                  {bankQuestions.length === 0 ? (
                    <p className="p-6 text-center text-slate-400">No questions available in bank. You can also import questions later.</p>
                  ) : (
                    bankQuestions.map((q) => {
                      const isSelected = wizardSelectedBankQuestions.includes(q._id);
                      return (
                        <label key={q._id} className="flex items-center justify-between p-3 hover:bg-slate-900 cursor-pointer">
                          <div>
                            <p className="font-bold text-white">{q.text}</p>
                            <p className="text-slate-400 text-[11px]">{q.category} • {q.difficulty} • <span className="text-emerald-400">{q.marks} Marks</span></p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) setWizardSelectedBankQuestions(wizardSelectedBankQuestions.filter(id => id !== q._id));
                              else setWizardSelectedBankQuestions([...wizardSelectedBankQuestions, q._id]);
                            }}
                            className="h-4 w-4 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white">Select eligible students for this assessment</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (wizardSelectedStudentIds.length === candidates.length) setWizardSelectedStudentIds([]);
                        else setWizardSelectedStudentIds(candidates.map(c => c.id));
                      }}
                      className="font-bold text-indigo-400 hover:underline cursor-pointer"
                    >
                      {wizardSelectedStudentIds.length === candidates.length ? "Deselect All" : "Select All"}
                    </button>
                    <span className="font-bold text-emerald-300">{wizardSelectedStudentIds.length} of {candidates.length} Selected</span>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 divide-y divide-slate-800">
                  {candidates.map((c) => {
                    const isSelected = wizardSelectedStudentIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center justify-between p-3 hover:bg-slate-900 cursor-pointer">
                        <div>
                          <p className="font-bold text-white">{c.firstName} {c.lastName}</p>
                          <p className="text-slate-400 text-[11px] font-mono">{c.email} | Student ID: {c.studentId}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) setWizardSelectedStudentIds(wizardSelectedStudentIds.filter(id => id !== c.id));
                            else setWizardSelectedStudentIds([...wizardSelectedStudentIds, c.id]);
                          }}
                          className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {wizardStep === 5 && (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-white">Review assessment rules and confirm publication</p>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <p className="text-sm font-bold text-white">{newTitle} ({newCode})</p>
                  <p className="text-slate-400">{newDescription || "No description provided."}</p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 font-mono text-[11px]">
                    <div>Duration: <strong className="text-white">{newDuration} Mins</strong></div>
                    <div>Total Marks: <strong className="text-white">{wizardSelectedMarks}</strong></div>
                    <div>Passing Marks: <strong className="text-white">{newPassingMarks}</strong></div>
                    <div>Negative Marking: <strong className="text-white">{newNegativeMarking > 0 ? `-${newNegativeMarking}` : "No"}</strong></div>
                    <div>Questions: <strong className="text-cyan-300">{wizardSelectedBankQuestions.length} Selected</strong></div>
                    <div>Assigned: <strong className="text-emerald-300">{wizardSelectedStudentIds.length} Students</strong></div>
                    <div>Maximum Attempts: <strong className="text-white">{newAllowedAttempts}</strong></div>
                    <div>Starts: <strong className="text-white">{newOpenAt ? new Date(newOpenAt).toLocaleString() : "Not set"}</strong></div>
                    <div>Ends: <strong className="text-white">{newCloseAt ? new Date(newCloseAt).toLocaleString() : "Not set"}</strong></div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-bold text-[11px]">
                  ✓ Assessment configuration verified. Clicking "Save & Publish" will lock rules for exam fairness and schedule availability for assigned candidates.
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 font-bold text-slate-300 hover:bg-slate-700 cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
              ) : <div />}

              <div className="flex gap-2">
                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1 && (!newTitle.trim() || !newCode.trim())) {
                        return alert("Title and Code are required.");
                      }
                      if (wizardStep === 2) {
                        if (!Number.isInteger(newTotalQuestions) || newTotalQuestions < 1 || newTotalQuestions > bankQuestions.length) {
                          return setAssessmentFeedback({ type: "error", text: `Total Questions must be between 1 and the ${bankQuestions.length} eligible questions available.` });
                        }
                        if (newDuration <= 0) return setAssessmentFeedback({ type: "error", text: "Duration must be greater than zero." });
                        if (newAllowedAttempts < 1) return setAssessmentFeedback({ type: "error", text: "Maximum Allowed Attempts must be at least 1." });
                        if (!newOpenAt || !newCloseAt || new Date(newCloseAt) <= new Date(newOpenAt)) return setAssessmentFeedback({ type: "error", text: "End Schedule must be later than Start Schedule." });
                      }
                      if (wizardStep === 3 && wizardSelectedBankQuestions.length !== newTotalQuestions) {
                        return setAssessmentFeedback({ type: "error", text: `Select exactly ${newTotalQuestions} questions before continuing.` });
                      }
                      setAssessmentFeedback(null);
                      setWizardStep(wizardStep + 1);
                    }}
                    className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleFinalWizardSubmit("DRAFT")}
                      className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFinalWizardSubmit("OPEN")}
                      className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Confirm & Publish Exam</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANDIDATE ATTEMPT REVIEW & INCIDENT AUDIT MODAL */}
      {showAttemptReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-400" />
                Candidate Score & Incident Audit
              </h3>
              <button onClick={() => setShowAttemptReviewModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingReview || !attemptReviewData ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading candidate attempt evaluation...</div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold text-white">{attemptReviewData.attempt.userId?.firstName} {attemptReviewData.attempt.userId?.lastName}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{attemptReviewData.studentProfile?.studentId} | {attemptReviewData.studentProfile?.collegeName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                      attemptReviewData.attempt.passed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}>
                      {attemptReviewData.attempt.passed ? "PASSED" : "FAILED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-900 text-center">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Score</p>
                      <p className="text-lg font-bold text-white">{attemptReviewData.attempt.score} / {attemptReviewData.attempt.assessmentId?.totalMarks}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Percentage</p>
                      <p className="text-lg font-bold text-indigo-400">{attemptReviewData.attempt.percentage}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Submission Method</p>
                      <p className="text-xs font-bold text-slate-300 mt-1">{attemptReviewData.attempt.status}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-white">Question-wise Answer Review ({attemptReviewData.questions?.length || 0})</p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {(attemptReviewData.questions || []).map((question) => (
                      <div key={question.questionId} className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-slate-100">Q{question.index}. {question.text}</p>
                          <span className={`shrink-0 text-[10px] font-bold ${question.status === "CORRECT" ? "text-emerald-400" : question.status === "INCORRECT" ? "text-rose-400" : "text-slate-400"}`}>{question.status}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Selected: <span className="text-slate-200">{question.selectedAnswer || "Unanswered"}</span></p>
                        <p className="text-[11px] text-slate-400">Correct: <span className="text-emerald-300">{question.correctAnswer || "-"}</span> · Marks: <span className="text-white">{question.marksAwarded} / {question.marks}</span></p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-white">Proctoring Anomaly Audit Logs ({attemptReviewData.incidents?.length || 0})</p>
                    <div className="text-[10px] text-slate-400">Pending {attemptReviewData.incidents?.filter((i) => (incidentReviewDraft[i._id]?.status || "PENDING") === "PENDING").length || 0} · Reviewed {attemptReviewData.incidents?.filter((i) => incidentReviewDraft[i._id]?.status === "REVIEWED").length || 0} · Investigation {attemptReviewData.incidents?.filter((i) => incidentReviewDraft[i._id]?.status === "NEEDS_INVESTIGATION").length || 0}</div>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {attemptReviewData.incidents?.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">No proctoring violations recorded for this candidate attempt.</p>
                    ) : (
                      attemptReviewData.incidents.map((inc) => (
                        <div key={inc._id} className="rounded-xl border border-amber-500/30 bg-slate-950 p-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-amber-300">{inc.type}</p>
                            <p className="text-slate-300 text-[11px]">{inc.details || inc.description}</p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{new Date(inc.timestamp || inc.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <select value={incidentReviewDraft[inc._id]?.status || "PENDING"} onChange={(e) => setIncidentReviewDraft((previous) => ({ ...previous, [inc._id]: { ...previous[inc._id], status: e.target.value } }))} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200">
                              <option value="PENDING">Pending</option><option value="REVIEWED">Reviewed</option><option value="NEEDS_INVESTIGATION">Needs Investigation</option>
                            </select>
                            <input value={incidentReviewDraft[inc._id]?.notes || ""} onChange={(e) => setIncidentReviewDraft((previous) => ({ ...previous, [inc._id]: { ...previous[inc._id], notes: e.target.value } }))} placeholder="Review note" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200" />
                            <button onClick={() => handleSaveIncidentReview(inc._id)} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-500">Save Review</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PUBLISH RESULTS MODAL */}
      {showPublishModal && selectedAssessmentForPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="h-5 w-5 text-violet-400" />
                Publish Results — {selectedAssessmentForPublish.title}
              </h3>
              <button onClick={() => setShowPublishModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {publishFeedback && (
              <div className={`p-2.5 rounded-xl font-bold text-xs ${
                publishFeedback.type === "error" ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}>
                {publishFeedback.text}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">Select what candidate scorecard details will be published on the Student Portal:</p>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer">
                <div>
                  <p className="font-bold text-white">Publish Score & Pass/Fail Status</p>
                  <p className="text-[11px] text-slate-400">Students see total marks, score, percentage, and result status</p>
                </div>
                <input
                  type="checkbox"
                  checked={publishShowScore}
                  onChange={(e) => setPublishShowScore(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer">
                <div>
                  <p className="font-bold text-white">Publish Detailed Answer Key</p>
                  <p className="text-[11px] text-slate-400">Students see question-by-question breakdown and correct answers</p>
                </div>
                <input
                  type="checkbox"
                  checked={publishShowAnswers}
                  onChange={(e) => setPublishShowAnswers(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                />
              </label>

              <button
                onClick={handleConfirmPublishResults}
                className="w-full rounded-xl bg-violet-600 py-2.5 font-bold text-white hover:bg-violet-500 transition-colors cursor-pointer"
              >
                Publish Final Results to Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STUDENTS MODAL */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                Add Students to Platform
              </h3>
              <button onClick={() => setShowCandidateModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setCandidateTab("upload")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  candidateTab === "upload" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Option A: Upload Excel/CSV</span>
              </button>

              <button
                onClick={() => setCandidateTab("manual")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  candidateTab === "manual" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <UserPlus className="h-4 w-4" />
                <span>Option B: Add Manually</span>
              </button>
            </div>

            {candidateTab === "upload" && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div>
                    <p className="font-bold text-white">Download Student Template</p>
                    <p className="text-[11px] text-slate-400">CSV file format with sample headers and candidate structure</p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 font-bold text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download CSV Template</span>
                  </button>
                </div>

                {importSuccessMsg ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                    <p className="font-bold text-emerald-300">{importSuccessMsg}</p>
                    <button
                      onClick={() => setImportSuccessMsg(null)}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-white font-bold cursor-pointer"
                    >
                      Import More Candidates
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePreviewExcelUpload} className="space-y-3">
                    <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/60 p-6 text-center space-y-2">
                      <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-200">Select candidate Excel (.xlsx) or CSV file to parse</p>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={(e) => setCsvFile(e.target.files[0])}
                        className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-indigo-600 file:text-white file:font-bold cursor-pointer"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploading || !csvFile}
                      className="w-full rounded-xl bg-indigo-600 py-2.5 text-white font-bold disabled:opacity-50 hover:bg-indigo-500 transition-colors cursor-pointer"
                    >
                      {uploading ? "Analyzing Uploaded File..." : "Analyze File & Preview"}
                    </button>
                  </form>
                )}

                {importPreview && (
                  <div className="space-y-3 border-t border-slate-800 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white">Import Analysis Summary</p>
                      <div className="flex gap-2 text-[11px] font-bold">
                        <span className="text-emerald-400">Valid: {importPreview.summary.validCount}</span>
                        <span className="text-amber-400">Duplicates: {importPreview.summary.duplicateCount}</span>
                        <span className="text-rose-400">Invalid: {importPreview.summary.invalidCount}</span>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-900 text-slate-400 sticky top-0">
                          <tr>
                            <th className="p-2">Row</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {importPreview.results.map((r) => (
                            <tr key={r.rowNumber}>
                              <td className="p-2 font-mono text-slate-400">#{r.rowNumber}</td>
                              <td className="p-2 text-white">{r.data.firstName} {r.data.lastName}</td>
                              <td className="p-2 text-slate-300">{r.data.email}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  r.status === "VALID" ? "bg-emerald-500/20 text-emerald-300" :
                                  r.status === "DUPLICATE" ? "bg-amber-500/20 text-amber-300" : "bg-rose-500/20 text-rose-300"
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {importPreview.summary.validCount > 0 && (
                      <button
                        onClick={handleConfirmBulkImport}
                        disabled={uploading}
                        className="w-full rounded-xl bg-emerald-600 py-2.5 text-white font-bold hover:bg-emerald-500 transition-colors cursor-pointer"
                      >
                        Confirm & Import {importPreview.summary.validCount} Valid Students
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {candidateTab === "manual" && (
              <div>
                {registeredCandidate ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3 text-xs">
                    <p className="font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Candidate Registered Successfully!
                    </p>
                    <p className="font-mono text-slate-300">Student ID: <strong className="text-white">{registeredCandidate.studentId}</strong></p>
                    <button
                      onClick={() => setRegisteredCandidate(null)}
                      className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      Register Another Candidate
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterCandidate} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                      <input
                        type="email"
                        placeholder="candidate@institute.edu"
                        value={candEmail}
                        onChange={(e) => setCandEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">First Name *</label>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={candFirstName}
                          onChange={(e) => setCandFirstName(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Last Name *</label>
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={candLastName}
                          onChange={(e) => setCandLastName(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">College Name</label>
                        <input
                          type="text"
                          placeholder="Institute of Technology"
                          value={candCollege}
                          onChange={(e) => setCandCollege(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Branch</label>
                        <input
                          type="text"
                          placeholder="Computer Science"
                          value={candBranch}
                          onChange={(e) => setCandBranch(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Academic Year</label>
                      <select
                        value={candYear}
                        onChange={(e) => setCandYear(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year (Final Year)</option>
                        <option value="Post Graduate">Post Graduate</option>
                      </select>
                    </div>

                    <div className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[11px] font-medium flex items-center gap-2">
                      <Info className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>Note: Student ID will be generated automatically (`STU-XXXXXX`) after registration.</span>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-indigo-600 py-2.5 font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition-colors cursor-pointer"
                    >
                      Register Candidate & Issue Activation Link
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUESTION BANK MODAL */}
      {showQuestionBankModal && (
        <QuestionBankPage>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-5 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-cyan-400" />
                Central Question Bank Repository
              </h3>
              <button onClick={() => setShowQuestionBankModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBankQuestion} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 text-xs">
              <p className="font-bold text-white text-sm">Add New MCQ to Question Bank</p>

              {qFeedback && (
                <div className={`p-2.5 rounded-xl font-bold ${
                  qFeedback.type === "error" ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                }`}>
                  {qFeedback.text}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-300 mb-1">Question Text *</label>
                <input
                  type="text"
                  placeholder="e.g. Which data structure follows FIFO?"
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-100 outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Option A *</label>
                  <input
                    type="text"
                    placeholder="Stack"
                    value={qOptA}
                    onChange={(e) => setQOptA(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Option B *</label>
                  <input
                    type="text"
                    placeholder="Queue"
                    value={qOptB}
                    onChange={(e) => setQOptB(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Option C</label>
                  <input
                    type="text"
                    placeholder="Tree"
                    value={qOptC}
                    onChange={(e) => setQOptC(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Option D</label>
                  <input
                    type="text"
                    placeholder="Graph"
                    value={qOptD}
                    onChange={(e) => setQOptD(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Correct Answer *</label>
                  <select
                    value={qCorrect}
                    onChange={(e) => setQCorrect(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 outline-none focus:border-cyan-500"
                  >
                    <option value="opt_a">Option A</option>
                    <option value="opt_b">Option B</option>
                    <option value="opt_c">Option C</option>
                    <option value="opt_d">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Marks *</label>
                  <input
                    type="number"
                    min="1"
                    value={qMarks}
                    onChange={(e) => setQMarks(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Subject / Tag</label>
                  <input
                    type="text"
                    placeholder="Data Structures"
                    value={qCategory}
                    onChange={(e) => setQCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 outline-none focus:border-cyan-500"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-cyan-600 py-2.5 font-bold text-white shadow-lg hover:bg-cyan-500 transition-colors cursor-pointer"
              >
                Save Question to Question Bank
              </button>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white text-sm">Approved Questions ({filteredBankQuestions.length})</p>
                <input
                  type="text"
                  placeholder="Filter questions..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 outline-none"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredBankQuestions.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-4">No questions found in bank.</p>
                ) : (
                  filteredBankQuestions.map((q) => (
                    <div key={q._id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white">{q.text}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">{q.category}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">{q.difficulty}</span>
                          <span className="text-[10px] font-bold text-emerald-400">{q.marks} Marks</span>
                        </div>
                        <div className="text-slate-400 flex gap-3 text-[11px]">
                          {q.options?.map((o) => (
                            <span key={o.optionId} className={o.optionId === q.correctOptionId ? "text-emerald-300 font-bold" : ""}>
                              {o.optionId.toUpperCase().replace("OPT_", "")}. {o.text} {o.optionId === q.correctOptionId && "✓"}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteBankQuestion(q._id)} className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        </QuestionBankPage>
      )}

      {/* ASSIGN STUDENTS MODAL */}
      {showAssignModal && selectedAssessmentForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-400" />
                Assign Eligible Students — {selectedAssessmentForAssign.title}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {assignFeedback && (
              <div className={`p-2.5 rounded-xl font-bold text-xs ${
                assignFeedback.type === "error" ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}>
                {assignFeedback.text}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-300">
              <p>Select students eligible to attempt this exam:</p>
              <button
                onClick={() => {
                  if (selectedStudentIds.length === assignCandidateList.length) setSelectedStudentIds([]);
                  else setSelectedStudentIds(assignCandidateList.map(c => c._id));
                }}
                className="font-bold text-indigo-400 hover:underline cursor-pointer"
              >
                {selectedStudentIds.length === assignCandidateList.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800">
              {assignCandidateList.map((cand) => {
                const isChecked = selectedStudentIds.includes(cand._id);
                return (
                  <label key={cand._id} className="flex items-center justify-between p-3 text-xs hover:bg-slate-900/50 cursor-pointer">
                    <div>
                      <p className="font-bold text-white">{cand.firstName} {cand.lastName}</p>
                      <p className="text-slate-400 text-[11px] font-mono">{cand.email} | ID: {cand.studentId}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) setSelectedStudentIds(selectedStudentIds.filter(id => id !== cand._id));
                        else setSelectedStudentIds([...selectedStudentIds, cand._id]);
                      }}
                      className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-indigo-300">{selectedStudentIds.length} of {assignCandidateList.length} students selected</span>
              <button
                onClick={handleSaveAssignments}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                Save Assigned Student List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT FROM QUESTION BANK MODAL */}
      {showImportBankModal && selectedAssessmentForQuestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-cyan-400" />
                Select Questions from Bank — {selectedAssessmentForQuestions.title}
              </h3>
              <button onClick={() => setShowImportBankModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {importBankFeedback && (
              <div className={`p-2.5 rounded-xl font-bold text-xs ${
                importBankFeedback.type === "error" ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}>
                {importBankFeedback.text}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800">
              {bankQuestions.map((q) => {
                const isChecked = selectedBankQuestionIds.includes(q._id);
                return (
                  <label key={q._id} className="flex items-center justify-between p-3 text-xs hover:bg-slate-900/50 cursor-pointer">
                    <div>
                      <p className="font-bold text-white">{q.text}</p>
                      <p className="text-slate-400 text-[11px]">{q.category} • {q.difficulty} • <span className="text-emerald-400">{q.marks} Marks</span></p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) setSelectedBankQuestionIds(selectedBankQuestionIds.filter(id => id !== q._id));
                        else setSelectedBankQuestionIds([...selectedBankQuestionIds, q._id]);
                      }}
                      className="h-4 w-4 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-cyan-300">{selectedBankQuestionIds.length} questions selected</span>
              <button
                onClick={handleConfirmImportBankQuestions}
                disabled={selectedBankQuestionIds.length === 0}
                className="rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Add Selected Questions to Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
