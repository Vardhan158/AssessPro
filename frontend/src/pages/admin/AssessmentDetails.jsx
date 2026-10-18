import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2, Upload, Sparkles, CheckCircle2, AlertCircle, FileText, Users, Award, Shield } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

const blank = { text: "", options: [{ optionId: "A", text: "" }, { optionId: "B", text: "" }], correctOptionId: "A", marks: 1 };

export default function AssessmentDetails() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [assignmentSummary, setAssignmentSummary] = useState(null);

  const load = useCallback(async () => {
    const r = await api.get(`/admin/assessments/${assessmentId}`);
    setData(r.data);
    const c = await api.get(`/admin/assessments/${assessmentId}/assignment-candidates`);
    setCandidates(c.data.candidates || []);
    setAssigned((c.data.assignedStudentIds || []).map(String));
    const s = await api.get(`/admin/assessments/${assessmentId}/assignment-summary`);
    setAssignmentSummary(s.data.summary);
  }, [assessmentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load().catch((e) => setMessage({ type: "error", text: e.response?.data?.message || "Unable to load assessment" }));
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const questions = useMemo(() => data?.questions || [], [data?.questions]);
  const allocated = useMemo(() => questions.reduce((s, q) => s + Number(q.marks || 0), 0), [questions]);

  const notify = (type, text) => setMessage({ type, text });

  const updatePreview = (index, field, value) =>
    setPreview((p) => ({ ...p, questions: p.questions.map((q, i) => (i === index ? { ...q, [field]: field === "marks" ? Number(value) : value } : q)) }));

  const saveQuestion = async (e) => {
    e.preventDefault();
    try {
      if (allocated - (editing?.marks || 0) + Number(form.marks) > data.assessment.totalMarks)
        throw new Error("Allocated marks cannot exceed the assessment total.");
      const url = editing ? `/admin/assessments/${assessmentId}/questions/${editing._id}` : `/admin/assessments/${assessmentId}/questions`;
      await api[editing ? "patch" : "post"](url, form);
      setForm(blank);
      setEditing(null);
      await load();
      notify("success", "Question saved successfully.");
    } catch (e) {
      notify("error", e.response?.data?.message || e.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/assessments/${assessmentId}/questions/${id}`);
      await load();
      notify("success", "Question deleted.");
    } catch (e) {
      notify("error", e.response?.data?.message || "Delete failed");
    }
  };

  const previewFile = async (file, input) => {
    setMessage(null);
    if (!file) return;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
      if (input) input.value = "";
      return notify("error", "Choose a valid PDF or DOCX file.");
    }
    if (file.size > 10 * 1024 * 1024) {
      if (input) input.value = "";
      return notify("error", "File must be 10 MB or smaller.");
    }
    setFileLoading(true);
    try {
      const body = new FormData();
      body.append("file", file, file.name);
      const response = await api.post(`/admin/assessments/${assessmentId}/questions/import/preview`, body);
      setPreview(response.data);
    } catch (e) {
      setPreview(null);
      notify("error", e.response?.data?.message || "Extraction failed");
    } finally {
      setFileLoading(false);
      if (input) input.value = "";
    }
  };

  const importQuestions = async () => {
    try {
      await api.post(`/admin/assessments/${assessmentId}/questions/import`, { questions: preview.questions });
      setPreview(null);
      await load();
      notify("success", "Questions imported successfully.");
    } catch (e) {
      notify("error", e.response?.data?.message || "Import failed");
    }
  };

  const saveAssignments = async () => {
    try {
      await api.put(`/admin/assessments/${assessmentId}/assignments`, { studentIds: assigned });
      await load();
      notify("success", "Assignments saved successfully.");
    } catch (e) {
      notify("error", e.response?.data?.message || "Assignment failed");
    }
  };

  const open = async () => {
    try {
      await api.patch(`/admin/assessments/${assessmentId}/status`, { status: "OPEN" });
      await load();
      notify("success", "Assessment opened.");
    } catch (e) {
      notify("error", e.response?.data?.message || "Assessment is not ready.");
    }
  };

  if (!data) return <div className="min-h-screen bg-slate-950 p-8 text-slate-400 text-sm">Loading assessment configuration...</div>;

  const { assessment, readiness } = data;

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-indigo-500 selection:text-white p-6 sm:p-8">
      {/* Dynamic Animated Ambient Orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin Dashboard
        </button>

        {/* Assessment Overview Header */}
        <header className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Assessment Builder</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{assessment.title}</h1>
              <p className="font-mono text-sm font-bold text-indigo-400 mt-1">{assessment.code}</p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs font-mono">
              <span className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2">
                Questions: <b className="text-white">{questions.length}</b>
              </span>
              <span className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2">
                Allocated: <b className="text-white">{allocated}/{assessment.totalMarks}</b>
              </span>
              <span className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2">
                Duration: <b className="text-white">{assessment.durationMinutes} min</b>
              </span>
              <span className="rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-2 text-indigo-300 font-bold uppercase">
                {assessment.status}
              </span>
            </div>
          </div>
        </header>

        {/* Notifications */}
        {message && (
          <div
            className={`rounded-2xl border p-4 text-xs font-semibold flex items-center gap-2.5 shadow-md ${
              message.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Readiness Section */}
        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-indigo-400" /> Readiness Verification
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs font-semibold">
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${readiness.hasQuestions ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
              <span>{readiness.hasQuestions ? "✓" : "✗"} Questions Added</span>
            </div>
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${readiness.marksMatch ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
              <span>{readiness.marksMatch ? "✓" : "✗"} Marks Match ({allocated}/{assessment.totalMarks})</span>
            </div>
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${readiness.scheduleValid ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
              <span>{readiness.scheduleValid ? "✓" : "✗"} Valid Schedule</span>
            </div>
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${readiness.eligible ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
              <span>{readiness.eligible ? "✓" : "✗"} Candidate Eligibility</span>
            </div>
          </div>
          <button
            onClick={open}
            disabled={assessment.status !== "DRAFT" || !readiness.hasQuestions || !readiness.marksMatch || !readiness.scheduleValid || !readiness.eligible}
            className="mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 cursor-pointer"
          >
            Open Exam
          </button>
        </section>

        {/* Questions Builder & Import Section */}
        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-indigo-400" /> Question Repository ({questions.length})
            </h2>
            <label className="cursor-pointer rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors flex gap-2 items-center shadow-md">
              <Upload className="h-4 w-4" />
              <span>{fileLoading ? "Extracting..." : "Import PDF / Word"}</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                disabled={assessment.status !== "DRAFT" || fileLoading}
                onChange={(e) => previewFile(e.target.files?.[0], e.target)}
              />
            </label>
          </div>

          {/* Import Preview Card */}
          {preview && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs space-y-3">
              <p className="font-bold text-indigo-300">Preview: {preview.questions.length} questions detected</p>
              {preview.ocrRequired ? (
                <p className="text-rose-300 font-semibold">This PDF is image-only; OCR / manual entry is required.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {preview.questions.map((q, i) => (
                    <div key={i} className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
                      <input
                        value={q.text}
                        onChange={(e) => updatePreview(i, "text", e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white"
                      />
                      <p className="text-[11px] text-slate-400 font-mono">
                        Options: {q.options.map((o) => o.text).join(" | ") || "Missing"} · Correct: {q.correctOptionId || "Missing"} · Marks: {q.marks || "Missing"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={importQuestions}
                disabled={preview.ocrRequired || !preview.questions.length}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40 cursor-pointer shadow-md"
              >
                Confirm Import Questions
              </button>
            </div>
          )}

          {/* Manual Question Form */}
          <form onSubmit={saveQuestion} className="space-y-3 border-b border-slate-800 pb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {editing ? "Edit Question" : "Add Question Manually"}
            </p>
            <textarea
              required
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Question text..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 outline-none focus:border-indigo-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {form.options.map((o, i) => (
                <input
                  key={o.optionId}
                  required
                  value={o.text}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      options: form.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                    })
                  }
                  placeholder={`Option ${o.optionId}`}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
                />
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={form.marks}
                onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })}
                className="w-28 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
                placeholder="Marks"
              />
              <select
                value={form.correctOptionId}
                onChange={(e) => setForm({ ...form, correctOptionId: e.target.value })}
                className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-500 font-bold"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
              <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-md">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Question List */}
          <div className="divide-y divide-slate-800/80">
            {questions.map((q, idx) => (
              <div key={q._id} className="flex items-center justify-between py-3.5 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-white">Q{idx + 1}. {q.text}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {q.marks} marks · Correct: <b className="text-indigo-400">{q.correctOptionId}</b>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(q);
                      setForm({ text: q.text, options: q.options, correctOptionId: q.correctOptionId, marks: q.marks });
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 hover:bg-slate-700 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(q._id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-slate-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Student Assignment Checklist Section */}
        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-indigo-400" /> Student Candidate Assignment
            </h2>
            <span className="text-xs font-mono font-bold text-indigo-400">Assigned: {assigned.length}</span>
          </div>

          {assignmentSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
              <span className="p-2.5 rounded-xl border border-slate-800 bg-slate-950">Assigned: <b>{assignmentSummary.assigned}</b></span>
              <span className="p-2.5 rounded-xl border border-slate-800 bg-slate-950">Eligible: <b>{assignmentSummary.eligible}</b></span>
              <span className="p-2.5 rounded-xl border border-slate-800 bg-slate-950">Ineligible: <b>{assignmentSummary.ineligible}</b></span>
              <span className="p-2.5 rounded-xl border border-slate-800 bg-slate-950">Pending: <b>{assignmentSummary.invitationPending}</b></span>
              <span className="p-2.5 rounded-xl border border-slate-800 bg-slate-950">Attempted: <b>{assignmentSummary.alreadyAttempted}</b></span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
            {candidates.map((c) => (
              <label key={c._id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs text-slate-300 cursor-pointer hover:bg-slate-900">
                <input
                  type="checkbox"
                  checked={assigned.includes(String(c._id))}
                  disabled={assessment.status !== "DRAFT"}
                  onChange={() =>
                    setAssigned((x) => (x.includes(String(c._id)) ? x.filter((id) => id !== String(c._id)) : [...x, String(c._id)]))
                  }
                  className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500/20"
                />
                <span className="font-medium text-slate-200">{c.firstName} {c.lastName} ({c.email})</span>
              </label>
            ))}
          </div>

          <button
            onClick={saveAssignments}
            disabled={assessment.status !== "DRAFT"}
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-40 cursor-pointer"
          >
            Save Candidate Assignments
          </button>
        </section>
      </main>
    </div>
  );
}
