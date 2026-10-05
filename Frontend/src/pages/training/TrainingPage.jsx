import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowUpRight, Award, CalendarDays, Check, ChevronDown, Clock3, FileBadge2, GraduationCap, LoaderCircle, Plus, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/", withCredentials: true });
const BRAND = { pink: "#8B1A4A", maroon: "#5C0F30", border: "#E8D5DF", muted: "#8B7480", page: "#F7F4F5", pale: "#FAF0F5", text: "#2D0A1A" };
const personKey = (person) => `${person.model}:${person.id}`;
const localDateTimeMin = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const requestError = (error) => error?.response?.data?.message || (error?.request ? "Could not reach the HRMS server. Check your connection and try again." : error?.message) || "The request failed. Please try again.";
const pretty = (value, dateOnly = false) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString("en-IN", dateOnly
    ? { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }
    : { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
};
const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const STATUS = {
  assigned: { label: "Assigned", color: "#5F5260", bg: "#F3EFF2" },
  in_progress: { label: "In progress", color: "#8B1A4A", bg: "#FAF0F5" },
  pending_approval: { label: "Awaiting approval", color: "#9A5B00", bg: "#FFF7E8" },
  rejected: { label: "Changes requested", color: "#A32938", bg: "#FFF0F1" },
  approved: { label: "Completed", color: "#19734A", bg: "#EDF8F1" },
};

function Field({ label, hint, children }) {
  return <label className="block text-sm font-semibold" style={{ color: BRAND.text }}>{label}{hint && <span className="ml-1 font-normal" style={{ color: BRAND.muted }}>{hint}</span>}{children}</label>;
}

function Modal({ title, subtitle, onClose, children }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24131d]/50 p-3 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b p-5 sm:p-6" style={{ borderColor: BRAND.border }}><div><h2 className="text-xl font-bold" style={{ color: BRAND.text }}>{title}</h2><p className="mt-1 text-sm" style={{ color: BRAND.muted }}>{subtitle}</p></div><button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={19} /></button></div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  </div>;
}

function TrainingDetailsEditor({ training, onSave, busy }) {
  const stagesLocked = (training.stages || []).some((stage) => stage.scheduled_at || stage.submitted_at || stage.completed_at);
  const [draft, setDraft] = useState(() => ({
    title: training.title || "", details: training.details || "", category: training.category || "General",
    mandatory: Boolean(training.mandatory), due_at: toLocalInput(training.due_at), estimated_hours: training.estimated_hours || "",
    certificate_validity_months: training.certificate_validity_months || "", skills: (training.skills || []).join(", "),
    stages: (training.stages || []).map((stage, index) => ({ objective: stage.objective || "", materials_url: stage.materials_url || "", assessment_type: stage.assessment_type || "none", pass_score: stage.pass_score || (index === 0 && stage.assessment_type === "quiz" ? 70 : 0) })),
  }));
  const patchStage = (index, values) => setDraft((current) => ({ ...current, stages: current.stages.map((stage, stageIndex) => stageIndex === index ? { ...stage, ...values } : stage) }));
  return <details className="mt-4 rounded-xl border" style={{ borderColor: BRAND.border }}>
    <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-xs font-semibold" style={{ color: BRAND.maroon }}>Edit programme details and levels<ChevronDown size={15} /></summary>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null, estimated_hours: Number(draft.estimated_hours) || 0, certificate_validity_months: Number(draft.certificate_validity_months) || 0, skills: draft.skills.split(",").map((skill) => skill.trim()).filter(Boolean) }); }} className="space-y-3 border-t p-3" style={{ borderColor: BRAND.border }}>
      <div className="grid gap-2 sm:grid-cols-2"><input required maxLength={160} aria-label="Training title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="rounded-lg border px-3 py-2 text-sm" placeholder="Programme title" /><input maxLength={80} aria-label="Category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="rounded-lg border px-3 py-2 text-sm" placeholder="Category" /></div>
      <textarea rows={2} maxLength={4000} aria-label="Learning details" value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Learning details" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-medium" style={{ color: BRAND.muted }}>Due date<input type="datetime-local" min={localDateTimeMin()} value={draft.due_at} onChange={(event) => setDraft({ ...draft, due_at: event.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2 text-xs" /></label><label className="text-xs font-medium" style={{ color: BRAND.muted }}>Estimated hours<input type="number" min="0" max="500" step="0.5" value={draft.estimated_hours} onChange={(event) => setDraft({ ...draft, estimated_hours: event.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2 text-xs" /></label><label className="text-xs font-medium" style={{ color: BRAND.muted }}>Certificate vldty (months)<input type="number" min="0" max="120" value={draft.certificate_validity_months} onChange={(event) => setDraft({ ...draft, certificate_validity_months: event.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2 text-xs" placeholder="0 = no expiry" /></label><label className="flex items-center gap-2 pt-5 text-xs font-semibold" style={{ color: BRAND.maroon }}><input type="checkbox" checked={draft.mandatory} onChange={(event) => setDraft({ ...draft, mandatory: event.target.checked })} />Mandatory training</label></div>
      <input aria-label="Skills" value={draft.skills} onChange={(event) => setDraft({ ...draft, skills: event.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Skills, separated by commas" />
      <div className="grid gap-2 lg:grid-cols-3">{draft.stages.map((stage, index) => <fieldset key={index} disabled={stagesLocked} className="space-y-2 rounded-xl border p-3 disabled:opacity-60" style={{ borderColor: BRAND.border }}><legend className="px-1 text-xs font-bold" style={{ color: BRAND.maroon }}>L{index + 1} · {index === 0 ? "Learn & follow" : index === 1 ? "Practise & assist" : "Apply & validate"}</legend><textarea maxLength={1000} rows={3} value={stage.objective} onChange={(event) => patchStage(index, { objective: event.target.value })} className="w-full rounded-lg border px-2.5 py-2 text-xs" placeholder="Learning objective" /><input maxLength={2048} type="url" value={stage.materials_url} onChange={(event) => patchStage(index, { materials_url: event.target.value })} className="w-full rounded-lg border px-2.5 py-2 text-xs" placeholder="Learning material URL (optional)" /><div className="grid grid-cols-2 gap-2"><select value={stage.assessment_type} onChange={(event) => patchStage(index, { assessment_type: event.target.value, pass_score: event.target.value === "quiz" && !stage.pass_score ? 70 : stage.pass_score })} className="rounded-lg border px-2 py-2 text-xs"><option value="none">Evidence review</option><option value="quiz">Quiz</option><option value="practical">Practical</option><option value="attendance">Attendance</option></select>{stage.assessment_type === "quiz" && <label className="text-[10px]" style={{ color: BRAND.muted }}>Pass %<input type="number" min="1" max="100" value={stage.pass_score} onChange={(event) => patchStage(index, { pass_score: Number(event.target.value) })} className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs" /></label>}</div></fieldset>)}</div>
      {stagesLocked && <p className="text-[11px]" style={{ color: BRAND.muted }}>Level objectives and assessment rules are locked after the first session or evidence submission. The programme dates and general details can still be updated.</p>}
      <div className="flex justify-end"><button disabled={busy} className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" style={{ background: BRAND.pink }}>{busy ? "Saving…" : "Save programme"}</button></div>
    </form>
  </details>;
}

export default function TrainingPage({ superAdminView = false }) {
  const { data: auth } = useAuth();
  const role = auth?.role;
  const admin = role === "admin";
  const [trainings, setTrainings] = useState([]);
  const [report, setReport] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [organisation, setOrganisation] = useState(null);
  const [form, setForm] = useState({
    title: "", details: "", category: "General", mandatory: false, due_at: "", estimated_hours: "", certificate_validity_months: "", skills: "", trainee: "", trainer: "",
    stages: [
      { objective: "Understand the core concepts and required policies.", materials_url: "", assessment_type: "quiz", pass_score: 70 },
      { objective: "Practise the process with trainer guidance.", materials_url: "", assessment_type: "practical", pass_score: 0 },
      { objective: "Demonstrate the skill independently.", materials_url: "", assessment_type: "practical", pass_score: 0 },
    ],
  });
  const [selectedStage, setSelectedStage] = useState({});
  const [stageEvidence, setStageEvidence] = useState({});
  const [stageReview, setStageReview] = useState({});
  const [templateFile, setTemplateFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [templateStatus, setTemplateStatus] = useState(null);
  const [issuer, setIssuer] = useState({ signatory_name: "", signatory_title: "" });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showCertificateSetup, setShowCertificateSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [result, people, templateResult, reportResult] = await Promise.all([
        api.get("/training"),
        admin ? api.get("/training/employees") : Promise.resolve({ data: { employees: [] } }),
        admin ? api.get("/training/template") : Promise.resolve({ data: { template: null, organisation: null } }),
        (admin || superAdminView) ? api.get("/training/report").catch(() => ({ data: { report: null } })) : Promise.resolve({ data: { report: null } }),
      ]);
      setTrainings(result.data.trainings || []);
      setEmployees(people.data.employees || []);
      setOrganisation(result.data.organisation || templateResult.data.organisation || null);
      setTemplateStatus(templateResult.data.template || null);
      setReport(reportResult.data.report || null);
      if (templateResult.data.template) setIssuer({ signatory_name: templateResult.data.template.signatory_name || "", signatory_title: templateResult.data.template.signatory_title || "" });
    } catch (e) {
      toast.error(requestError(e));
    } finally { setLoading(false); }
  }, [admin, superAdminView]);

  useEffect(() => { load(); }, [load]);

  const run = async (action, message) => {
    setBusy(true);
    try {
      const result = await action();
      toast.success(typeof message === "function" ? message(result) : message);
      await load();
    }
    catch (e) { toast.error(requestError(e)); }
    finally { setBusy(false); }
  };

  const createAssignment = (event) => {
    event.preventDefault();
    const trainee = employees.find((p) => personKey(p) === form.trainee);
    const trainer = employees.find((p) => personKey(p) === form.trainer);
    if (!trainee || !trainer) { toast.error("Select an employee for both trainee and trainer roles."); return; }
    if (trainee.id === trainer.id && trainee.model === trainer.model) { toast.error("Choose two different employees for trainee and trainer."); return; }
    if (form.due_at && new Date(form.due_at).getTime() < Date.now()) { toast.error("Choose a training due date in the future."); return; }
    run(async () => {
      await api.post("/training", {
        title: form.title.trim(), details: form.details.trim(), category: form.category, mandatory: form.mandatory,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        estimated_hours: Number(form.estimated_hours) || 0,
        certificate_validity_months: Number(form.certificate_validity_months) || 0,
        skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean), stages: form.stages,
        trainee: { id: trainee.id, model: trainee.model }, trainer: { id: trainer.id, model: trainer.model },
      });
      setForm({ title: "", details: "", category: "General", mandatory: false, due_at: "", estimated_hours: "", certificate_validity_months: "", skills: "", trainee: "", trainer: "", stages: [
        { objective: "Understand the core concepts and required policies.", materials_url: "", assessment_type: "quiz", pass_score: 70 },
        { objective: "Practise the process with trainer guidance.", materials_url: "", assessment_type: "practical", pass_score: 0 },
        { objective: "Demonstrate the skill independently.", materials_url: "", assessment_type: "practical", pass_score: 0 },
      ] }); setShowCreate(false);
    }, "Training assigned. The trainer and trainee have been notified.");
  };

  const submitEvidence = (training, stage, event) => {
    event.preventDefault();
    const key = `${training._id}:${stage.code}`;
    const values = stageEvidence[key] || {};
    if (!values.note?.trim() && !values.file) { toast.error("Add a short note or attach a file as learning evidence."); return; }
    const data = new FormData();
    data.append("note", values.note || "");
    if (values.file) data.append("evidence", values.file);
    run(() => api.post(`/training/${training._id}/stages/${stage.code}/evidence`, data), (response) => response.data.message);
  };

  const reviewEvidence = (training, stage, outcome) => {
    const key = `${training._id}:${stage.code}`;
    const values = stageReview[key] || {};
    run(() => api.patch(`/training/${training._id}/stages/${stage.code}/review`, {
      outcome, score: values.score, trainer_feedback: values.feedback || "",
    }), (response) => response.data.message);
  };

  const saveCertificateSetup = (event) => {
    event.preventDefault();
    if (!(logoFile || templateStatus?.logo_url || organisation?.logo)) { toast.error("Upload your organisation logo or add one to the company profile."); return; }
    if (!(signatureFile || templateStatus?.signature_url)) { toast.error("Upload the authorised signatory's signature."); return; }
    const data = new FormData();
    data.append("signatory_name", issuer.signatory_name);
    data.append("signatory_title", issuer.signatory_title);
    if (templateFile) data.append("template", templateFile);
    if (logoFile) data.append("logo", logoFile);
    if (signatureFile) data.append("signature", signatureFile);
    run(async () => {
      await api.post("/training/template", data);
      setTemplateFile(null); setLogoFile(null); setSignatureFile(null); setShowCertificateSetup(false);
    }, "Certificate branding saved. Approved training will generate a company-branded certificate.");
  };

  const schedule = (training) => {
    const value = selectedStage[training._id] || {};
    if (!value.stage || !value.scheduled_at) { toast.error("Choose a stage and a future session date and time."); return; }
    if (new Date(value.scheduled_at).getTime() <= Date.now()) { toast.error("Session date and time must be in the future."); return; }
    if (training.due_at && new Date(value.scheduled_at) > new Date(training.due_at)) { toast.error("Schedule this session on or before the training due date."); return; }
    run(() => api.patch(`/training/${training._id}/schedule`, { ...value, scheduled_at: new Date(value.scheduled_at).toISOString() }), (response) => `${response.data.message} The trainer and trainee have been notified.`);
  };

  const chooseImage = (event, setFile, label) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) { toast.error(`${label} must be a PNG or JPG image.`); event.target.value = ""; return; }
    if (file.size > 2 * 1024 * 1024) { toast.error(`${label} must be 2 MB or smaller.`); event.target.value = ""; return; }
    setFile(file);
  };

  const currentId = auth?.data?.employee?._id || auth?.data?.manager?._id || auth?.data?.user?._id;
  const participantCanManage = (training) => role !== "superadmin" && training.trainer?.id === currentId;
  const counts = useMemo(() => ({
    total: trainings.length,
    active: trainings.filter((t) => ["assigned", "in_progress", "rejected"].includes(t.status)).length,
    pending: trainings.filter((t) => t.status === "pending_approval").length,
    completed: trainings.filter((t) => t.status === "approved").length,
  }), [trainings]);
  const exportTrainingReport = () => {
    if (!report) return;
    const rows = [["Department", "Assigned", "Completed", "Overdue"], ...(report.byDepartment || []).map((item) => [item.department, item.assigned, item.completed, item.overdue])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "training-report.csv"; link.click();
    URL.revokeObjectURL(url);
  };
  const certificateReady = Boolean(
    templateStatus?.signatory_name && templateStatus?.signatory_title &&
    (templateStatus?.logo_url || organisation?.logo) && templateStatus?.signature_url,
  );
  const visibleTrainings = useMemo(() => trainings.filter((training) => {
    const statusMatch = filter === "all" || (filter === "active" ? ["assigned", "in_progress", "rejected"].includes(training.status) : filter === "pending" ? training.status === "pending_approval" : training.status === "approved");
    const term = search.trim().toLowerCase();
    const searchMatch = !term || `${training.title} ${training.details} ${training.participant_details?.trainee} ${training.participant_details?.trainer}`.toLowerCase().includes(term);
    return statusMatch && searchMatch;
  }), [filter, search, trainings]);

  const card = "rounded-2xl border bg-white shadow-[0_3px_16px_rgba(55,25,40,0.045)]";
  const input = "mt-1.5 w-full rounded-xl border bg-white px-3.5 py-3 text-sm font-normal outline-none transition focus:ring-2 focus:ring-[#8B1A4A]/15";

  return <main className="min-h-full px-4 py-6 sm:px-6 lg:px-9" style={{ background: BRAND.page }}>
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {organisation?.logo ? <img src={organisation.logo} alt="" className="h-12 w-12 rounded-xl border bg-white object-contain p-1" style={{ borderColor: BRAND.border }} /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})` }}><GraduationCap size={25} /></div>}
          <div><p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: BRAND.pink }}>{organisation?.name || "People development"}</p><h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: BRAND.text }}>{superAdminView ? "Training records" : admin ? "Training management" : "My learning"}</h1></div>
        </div>
        {admin && <div className="flex w-full flex-wrap gap-2 sm:w-auto"><button onClick={() => setShowCertificateSetup(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold sm:flex-none" style={{ borderColor: BRAND.border, color: BRAND.maroon }}><FileBadge2 size={17} />Certificate setup</button><button onClick={() => setShowCreate(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm sm:flex-none" style={{ background: BRAND.pink }}><Plus size={17} />New assignment</button></div>}
      </header>

      {(admin || superAdminView) && <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Assignments", counts.total, GraduationCap], ["In progress", counts.active, Clock3], ["Awaiting approval", counts.pending, ShieldCheck], ["Completed", counts.completed, Award]].map(([label, value, Icon]) => <div key={label} className={`${card} flex items-center gap-3 p-4 sm:p-5`}><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: BRAND.pale, color: BRAND.pink }}><Icon size={19} /></div><div className="min-w-0"><p className="text-xl font-bold" style={{ color: BRAND.text }}>{value}</p><p className="truncate text-xs font-medium sm:text-sm" style={{ color: BRAND.muted }}>{label}</p></div></div>)}
      </section>}

      {(admin || superAdminView) && report && <section className={`${card} mb-5 overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5" style={{ borderColor: BRAND.border }}><div><h2 className="text-sm font-bold" style={{ color: BRAND.text }}>Learning outcomes</h2><p className="mt-1 text-xs" style={{ color: BRAND.muted }}>Completion, due dates and reviewed scores for this organisation.</p></div><button onClick={exportTrainingReport} className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: BRAND.border, color: BRAND.maroon }}>Export department report</button></div>
        <div className="grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-3 lg:grid-cols-5" style={{ borderColor: BRAND.border }}>{[["Completion rate", `${report.summary.completionRate}%`], ["Mandatory", report.summary.mandatory], ["Overdue", report.summary.overdue], ["Awaiting approval", report.summary.awaitingApproval], ["Certificates expiring · 30 days", report.summary.certificatesExpiring]].map(([label, value]) => <div key={label} className="rounded-xl p-3" style={{ background: BRAND.pale }}><p className="text-lg font-bold" style={{ color: BRAND.maroon }}>{value}</p><p className="text-[11px] font-medium" style={{ color: BRAND.muted }}>{label}</p></div>)}</div>
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.4fr] sm:p-5"><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: BRAND.muted }}>Level progress</h3><div className="space-y-2">{report.byLevel.map((level) => <div key={level.level} className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs" style={{ borderColor: BRAND.border }}><strong style={{ color: BRAND.maroon }}>{level.level}</strong><span style={{ color: BRAND.muted }}>{level.passed} passed · {level.attempts} attempts · {level.averageScore === null ? "No scores" : `avg ${level.averageScore}%`}</span></div>)}</div></div><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: BRAND.muted }}>By department</h3>{report.byDepartment.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead style={{ color: BRAND.muted }}><tr><th className="px-2 py-2">Department</th><th className="px-2 py-2">Assigned</th><th className="px-2 py-2">Completed</th><th className="px-2 py-2">Overdue</th></tr></thead><tbody>{report.byDepartment.map((item) => <tr key={item.department} className="border-t" style={{ borderColor: BRAND.border }}><td className="px-2 py-2.5 font-semibold" style={{ color: BRAND.text }}>{item.department}</td><td className="px-2 py-2.5">{item.assigned}</td><td className="px-2 py-2.5">{item.completed}</td><td className="px-2 py-2.5">{item.overdue}</td></tr>)}</tbody></table></div> : <p className="rounded-lg p-4 text-xs" style={{ background: BRAND.page, color: BRAND.muted }}>No training assignment data yet.</p>}</div></div>
      </section>}

      {admin && <div className={`${card} mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5`}>
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND.pale, color: BRAND.pink }}><FileBadge2 size={19} /></div><div><p className="text-sm font-bold" style={{ color: BRAND.text }}>Certificate configuration</p><p className="text-xs" style={{ color: BRAND.muted }}>{templateStatus ? `${templateStatus.hasCustomTemplate ? "Custom PDF template" : "Professional HRMS certificate"} · ${templateStatus.signatory_name}` : "Finish setup before approving completions."}</p></div></div>
        <button onClick={() => setShowCertificateSetup(true)} className="self-start rounded-lg px-3 py-2 text-xs font-bold sm:self-auto" style={{ background: BRAND.pale, color: BRAND.pink }}>{templateStatus ? "Manage setup" : "Set up certificate"}<ArrowUpRight size={14} className="ml-1 inline" /></button>
      </div>}

      <section className={card}>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: BRAND.border }}>
          <div><h2 className="font-bold" style={{ color: BRAND.text }}>{superAdminView ? "Organisation training" : admin ? "Training assignments" : "Your training assignments"}</h2><p className="mt-0.5 text-xs" style={{ color: BRAND.muted }}>{superAdminView ? "Read-only records for your organisation." : admin ? "Review programmes, sessions and completion decisions." : "Programmes where you are the trainee or assigned trainer."}</p></div>
          <label className="relative block w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: BRAND.muted }} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search training or participant" className="w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#8B1A4A]/15" style={{ borderColor: BRAND.border }} /></label>
        </div>
        {admin && <div className="flex gap-1 overflow-x-auto border-b px-3 py-2 sm:px-5" style={{ borderColor: BRAND.border }}>{[["all", "All"], ["active", "Active"], ["pending", "Awaiting approval"], ["completed", "Completed"]].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold" style={{ color: filter === value ? BRAND.pink : BRAND.muted, background: filter === value ? BRAND.pale : "transparent" }}>{label}{value === "pending" ? ` (${counts.pending})` : ""}</button>)}</div>}

        {loading ? <div className="flex items-center justify-center gap-2 p-14 text-sm" style={{ color: BRAND.muted }}><LoaderCircle className="animate-spin" size={18} />Loading training records…</div>
          : visibleTrainings.length === 0 ? <div className="px-5 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: BRAND.pale, color: BRAND.pink }}><GraduationCap size={23} /></div><h3 className="mt-3 text-sm font-bold" style={{ color: BRAND.text }}>{search || filter !== "all" ? "No matching training records" : admin ? "No assignments yet" : "No training assigned yet"}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5" style={{ color: BRAND.muted }}>{admin ? "Create an assignment to start a structured learning programme for your employees." : "When your Admin assigns you as a trainer or trainee, the programme will appear here."}</p>{admin && <button onClick={() => setShowCreate(true)} className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: BRAND.pink }}><Plus size={16} className="mr-1 inline" />Create assignment</button>}</div>
          : <div className="divide-y" style={{ borderColor: BRAND.border }}>{visibleTrainings.map((training) => {
            const status = STATUS[training.status] || STATUS.assigned;
            const completedStages = training.stages?.filter((s) => s.completed_at).length || 0;
            const currentIsTrainee = training.trainee?.id === currentId;
            const isTrainer = participantCanManage(training);
            return <article key={training._id} className="p-4 sm:p-5 lg:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold sm:text-lg" style={{ color: BRAND.text }}>{training.title}</h3><span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: status.color, background: status.bg }}>{status.label}</span></div><p className="mt-1.5 max-w-3xl whitespace-pre-line text-sm leading-6" style={{ color: BRAND.muted }}>{training.details || "No additional programme details."}</p></div>
               
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: BRAND.muted }}>
                <span><strong style={{ color: BRAND.text }}>Trainee</strong> · {training.participant_details?.trainee || "Employee"}</span><span><strong style={{ color: BRAND.text }}>Trainer</strong> · {training.participant_details?.trainer || "Employee"}</span>
                {superAdminView && <span><strong style={{ color: BRAND.text }}>Organisation</strong> · {organisation?.name}</span>}
                <span><strong style={{ color: BRAND.text }}>Progress</strong> · {completedStages}/3 stages</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: BRAND.muted }}><span><strong style={{ color: BRAND.text }}>Category:</strong> {training.category || "General"}</span>{training.mandatory && <span className="font-bold" style={{ color: BRAND.pink }}>Mandatory</span>}{training.due_at && <span><strong style={{ color: BRAND.text }}>Due:</strong> {pretty(training.due_at)}{new Date(training.due_at) < new Date() && training.status !== "approved" ? <b className="ml-1 text-rose-700">Overdue</b> : null}</span>}{training.estimated_hours > 0 && <span><strong style={{ color: BRAND.text }}>Duration:</strong> {training.estimated_hours} hours</span>}{training.skills?.length > 0 && <span><strong style={{ color: BRAND.text }}>Skills:</strong> {training.skills.join(", ")}</span>}</div>
              {admin && !["pending_approval", "approved"].includes(training.status) && <TrainingDetailsEditor key={`${training._id}-${training.updatedAt}`} training={training} busy={busy} onSave={(payload) => run(() => api.patch(`/training/${training._id}/details`, payload), (response) => response.data.message)} />}

              <div className="mt-4 grid gap-3 md:grid-cols-3">{training.stages?.map((stage, index) => <div key={stage.code} className="relative rounded-xl border p-3.5" style={{ background: stage.completed_at ? "#F3FAF6" : "#FCFAFB", borderColor: stage.completed_at ? "#D9EDE1" : BRAND.border }}>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold" style={{ background: stage.completed_at ? "#DFF2E6" : BRAND.pale, color: stage.completed_at ? "#19734A" : BRAND.pink }}>{stage.completed_at ? <Check size={15} /> : `L${index + 1}`}</span><span className="text-sm font-bold" style={{ color: BRAND.text }}>L{index + 1} · {index === 0 ? "Learn & follow" : index === 1 ? "Practise & assist" : "Apply & validate"}</span></div><span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: stage.completed_at ? "#19734A" : stage.review_status === "submitted" ? "#9A5B00" : stage.review_status === "needs_retry" ? "#A32938" : BRAND.muted }}>{stage.completed_at ? "Passed" : stage.review_status === "submitted" ? "Awaiting review" : stage.review_status === "needs_retry" ? "Retry requested" : "Not started"}</span></div>
                <div className="mt-3 flex items-start gap-2 text-xs" style={{ color: BRAND.muted }}><CalendarDays size={14} className="mt-0.5 shrink-0" /><div>{pretty(stage.scheduled_at)}{stage.mode && <p className="mt-1">{stage.mode === "online" ? "Online" : "In person"}{stage.location ? ` · ${stage.location}` : ""}</p>}{stage.meeting_link && <a href={stage.meeting_link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold underline" style={{ color: BRAND.pink }}>Join session <ArrowUpRight size={12} /></a>}</div></div>
                {stage.objective && <p className="mt-3 text-xs leading-5" style={{ color: BRAND.muted }}>{stage.objective}</p>}
                <p className="mt-2 text-[11px] font-semibold" style={{ color: BRAND.maroon }}>Assessment: {{ none: "Evidence review", quiz: `Quiz · pass ${stage.pass_score || 0}%`, practical: "Practical", attendance: "Attendance" }[stage.assessment_type || "none"]}</p>
                {stage.materials_url && <a href={stage.materials_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline" style={{ color: BRAND.pink }}>Open learning material <ArrowUpRight size={12} /></a>}
                {stage.score !== null && stage.score !== undefined && <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.maroon }}>Score: {stage.score}%</p>}
                {stage.attempt_count > 0 && <p className="mt-1 text-[11px]" style={{ color: BRAND.muted }}>Evidence attempts: {stage.attempt_count}</p>}
                {stage.trainer_feedback && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-900"><strong>Trainer feedback:</strong> {stage.trainer_feedback}</p>}
                {stage.evidence_url && <a href={stage.evidence_url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-semibold underline" style={{ color: BRAND.pink }}>Evidence: {stage.evidence_name || "Open attachment"}</a>}
                {stage.evidence_note && <p className="mt-2 text-xs leading-5" style={{ color: BRAND.muted }}><strong style={{ color: BRAND.text }}>Learner note:</strong> {stage.evidence_note}</p>}
                {isTrainer && stage.review_status === "submitted" && <div className="mt-3 space-y-2 rounded-lg border bg-white p-2.5" style={{ borderColor: BRAND.border }}><p className="text-xs font-bold" style={{ color: BRAND.text }}>Review learner evidence</p><input type="number" min="0" max="100" placeholder={stage.pass_score ? `Score (pass ≥ ${stage.pass_score}%)` : "Score (optional)"} value={stageReview[`${training._id}:${stage.code}`]?.score ?? ""} onChange={(event) => setStageReview({ ...stageReview, [`${training._id}:${stage.code}`]: { ...stageReview[`${training._id}:${stage.code}`], score: event.target.value } })} className="w-full rounded-lg border px-2.5 py-2 text-xs" /><textarea rows={2} maxLength={2000} placeholder="Feedback for the learner" value={stageReview[`${training._id}:${stage.code}`]?.feedback || ""} onChange={(event) => setStageReview({ ...stageReview, [`${training._id}:${stage.code}`]: { ...stageReview[`${training._id}:${stage.code}`], feedback: event.target.value } })} className="w-full rounded-lg border px-2.5 py-2 text-xs" /><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => reviewEvidence(training, stage, "passed")} className="flex-1 rounded-lg px-2 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ background: "#19734A" }}>Pass level</button><button type="button" disabled={busy || !stageReview[`${training._id}:${stage.code}`]?.feedback?.trim()} onClick={() => reviewEvidence(training, stage, "needs_retry")} className="flex-1 rounded-lg border px-2 py-2 text-xs font-bold disabled:opacity-50" style={{ borderColor: "#E6C8CB", color: "#A32938" }}>Request retry</button></div></div>}
                {currentIsTrainee && !stage.completed_at && stage.review_status !== "submitted" && (index === 0 || training.stages[index - 1]?.completed_at) && !["pending_approval", "approved"].includes(training.status) && <form onSubmit={(event) => submitEvidence(training, stage, event)} className="mt-3 space-y-2 rounded-lg border bg-white p-2.5" style={{ borderColor: BRAND.border }}><p className="text-xs font-bold" style={{ color: BRAND.text }}>{stage.review_status === "needs_retry" ? "Resubmit this level" : "Submit learning evidence"}</p><textarea rows={2} maxLength={2000} placeholder="What did you complete or demonstrate?" value={stageEvidence[`${training._id}:${stage.code}`]?.note || ""} onChange={(event) => setStageEvidence({ ...stageEvidence, [`${training._id}:${stage.code}`]: { ...stageEvidence[`${training._id}:${stage.code}`], note: event.target.value } })} className="w-full rounded-lg border px-2.5 py-2 text-xs" /><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => setStageEvidence({ ...stageEvidence, [`${training._id}:${stage.code}`]: { ...stageEvidence[`${training._id}:${stage.code}`], file: event.target.files?.[0] || null } })} className="block w-full text-[11px] file:mr-2 file:rounded-md file:border-0 file:px-2 file:py-1.5 file:font-semibold" /><button disabled={busy} className="w-full rounded-lg px-2.5 py-2 text-xs font-semibold text-white disabled:opacity-50" style={{ background: BRAND.pink }}>Send to trainer</button></form>}
              </div>)}</div>

              {isTrainer && !training.stages?.every((stage) => stage.completed_at) && !["pending_approval", "approved"].includes(training.status) && <details className="mt-3 rounded-xl border" style={{ borderColor: BRAND.border }}><summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-xs font-semibold" style={{ color: BRAND.maroon }}><span className="flex items-center gap-2"><CalendarDays size={15} />Schedule or reschedule a session</span><ChevronDown size={15} /></summary><div className="grid gap-2 border-t p-3 sm:grid-cols-2 lg:grid-cols-5" style={{ borderColor: BRAND.border }}><select aria-label="Training level" value={selectedStage[training._id]?.stage || ""} onChange={(e) => setSelectedStage({ ...selectedStage, [training._id]: { ...selectedStage[training._id], stage: e.target.value } })} className="rounded-lg border px-3 py-2 text-xs"><option value="">Select level</option>{["T1", "T2", "T3"].map((stage, index) => <option key={stage} value={stage}>{`L${index + 1}`}</option>)}</select><input aria-label="Session date and time" type="datetime-local" min={localDateTimeMin()} onChange={(e) => setSelectedStage({ ...selectedStage, [training._id]: { ...selectedStage[training._id], scheduled_at: e.target.value } })} className="rounded-lg border px-3 py-2 text-xs" /><select aria-label="Delivery format" value={selectedStage[training._id]?.mode || ""} onChange={(e) => setSelectedStage({ ...selectedStage, [training._id]: { ...selectedStage[training._id], mode: e.target.value } })} className="rounded-lg border px-3 py-2 text-xs"><option value="">Format (optional)</option><option value="in_person">In person</option><option value="online">Online</option></select><input aria-label="Location or meeting link" placeholder="Location or meeting link" value={selectedStage[training._id]?.location || ""} onChange={(e) => setSelectedStage({ ...selectedStage, [training._id]: { ...selectedStage[training._id], location: e.target.value, meeting_link: /^https?:\/\//i.test(e.target.value) ? e.target.value : "" } })} className="rounded-lg border px-3 py-2 text-xs" /><button onClick={() => schedule(training)} disabled={busy} className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: BRAND.pink }}>Save session</button></div></details>}

              {isTrainer && training.status !== "pending_approval" && training.status !== "approved" && <button disabled={busy || !training.stages?.every((s) => s.completed_at)} onClick={() => run(() => api.patch(`/training/${training._id}/submit-completion`), "Completion sent to your Admin for review.")} className="mt-3 rounded-xl px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40" style={{ background: BRAND.maroon }}>Submit completion for approval</button>}

              {admin && training.status === "pending_approval" && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 sm:px-4" style={{ borderColor: "#F0DDB7", background: "#FFFCF5" }}><div className="flex items-center gap-2"><ShieldCheck size={18} style={{ color: "#9A5B00" }} /><div><p className="text-sm font-bold" style={{ color: BRAND.text }}>Completion review</p><p className="text-xs" style={{ color: BRAND.muted }}>All three stages are complete. Review before issuing the certificate.</p></div></div><div className="flex w-full gap-2 sm:w-auto"><button disabled={busy || !certificateReady} title={!certificateReady ? "Add organisation logo, signatory details and signature in Certificate setup" : "Approve and issue the certificate"} onClick={() => run(() => api.patch(`/training/${training._id}/decision`, { decision: "approved" }), "Approved. The certificate has been issued and emailed to the trainee.")} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-40 sm:flex-none" style={{ background: "#19734A" }}>Approve &amp; issue certificate</button><button disabled={busy} onClick={() => { const reason = window.prompt("Enter the review note for the trainer"); if (reason?.trim()) run(() => api.patch(`/training/${training._id}/decision`, { decision: "rejected", reason }), "Review note sent to the trainer and trainee."); }} className="flex-1 rounded-lg border bg-white px-3 py-2 text-xs font-bold sm:flex-none" style={{ borderColor: "#E6C8CB", color: "#A32938" }}>Request changes</button></div></div>}

              {training.decision_reason && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900"><strong>Review note:</strong> {training.decision_reason}</p>}
              {training.approval_history?.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold" style={{ color: BRAND.muted }}>Review history ({training.approval_history.length})</summary><div className="mt-2 space-y-1 border-l-2 pl-3 text-xs" style={{ color: BRAND.muted, borderColor: BRAND.border }}>{training.approval_history.map((entry, i) => <p key={`${entry.at}-${i}`}>{entry.decision === "approved" ? "Approved" : "Changes requested"} · {pretty(entry.at)}{entry.reason ? ` · ${entry.reason}` : ""}</p>)}</div></details>}

              {superAdminView && training.certificate?.issued_at && <div className="mt-3 flex items-center gap-2 rounded-xl px-3.5 py-3 text-xs" style={{ background: "#F3FAF6", color: "#19734A" }}><Award size={16} />Certificate issued {pretty(training.certificate.issued_at, true)} · Ref {training.certificate.file_id}</div>}
              {!superAdminView && training.certificate?.issued_at && training.status === "approved" && currentIsTrainee && training.certificate.valid_until && <p className="mt-3 text-xs font-medium" style={{ color: BRAND.muted }}>Certificate valid until {pretty(training.certificate.valid_until, true)}.</p>}
              {!superAdminView && training.certificate?.issued_at && training.status === "approved" && currentIsTrainee && <a href={`${import.meta.env.VITE_API_URL || "http://localhost:5000/"}training/${training._id}/certificate`} className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white" style={{ background: BRAND.pink }}><Award size={15} />Download certificate</a>}
            </article>;
          })}</div>}
      </section>

      {showCreate && <Modal title="Create training assignment" subtitle="Build a guided L1–L3 learning path, then assign a trainee and trainer from your organisation." onClose={() => setShowCreate(false)}>
        <form onSubmit={createAssignment} className="space-y-4">
          <Field label="Training title"><input required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Workplace safety induction" className={input} /></Field>
          <Field label="Learning objectives and details" hint="(optional)"><textarea rows={3} maxLength={4000} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Describe the skills, topics or outcomes this programme covers." className={`${input} resize-y`} /></Field>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Training category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={input}>{["General", "Compliance", "Safety", "Onboarding", "Technical", "Leadership", "Soft skills", "Product"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Due date"><input type="datetime-local" min={localDateTimeMin()} value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} className={input} /></Field>
            <Field label="Estimated hours"><input type="number" min="0" max="500" step="0.5" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} placeholder="e.g. 4" className={input} /></Field>
            <Field label="Crtify vldty(months)"><input type="number" min="0" max="120" value={form.certificate_validity_months} onChange={(e) => setForm({ ...form, certificate_validity_months: e.target.value })} placeholder="0 = no expiry" className={input} /></Field>
          </div>
          <Field label="Skills covered" hint="(comma separated)"><input maxLength={1000} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. Workplace safety, incident reporting" className={input} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: BRAND.maroon }}><input type="checkbox" checked={form.mandatory} onChange={(e) => setForm({ ...form, mandatory: e.target.checked })} />Mandatory training for this employee</label>
          <div><h3 className="text-sm font-bold" style={{ color: BRAND.text }}>Learning path</h3><p className="mt-1 text-xs" style={{ color: BRAND.muted }}>Each level has an objective, optional learning material and its own completion review.</p><div className="mt-3 grid gap-3">{form.stages.map((stage, index) => <fieldset key={index} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2" style={{ borderColor: BRAND.border }}><legend className="px-1 text-xs font-bold" style={{ color: BRAND.maroon }}>L{index + 1} · {index === 0 ? "Learn & follow" : index === 1 ? "Practise & assist" : "Apply & validate"}</legend><textarea rows={3} maxLength={1000} required value={stage.objective} onChange={(e) => setForm({ ...form, stages: form.stages.map((item, i) => i === index ? { ...item, objective: e.target.value } : item) })} placeholder="What should the learner be able to do?" className="rounded-lg border px-3 py-2 text-sm" /><div className="space-y-2"><input type="url" maxLength={2048} value={stage.materials_url} onChange={(e) => setForm({ ...form, stages: form.stages.map((item, i) => i === index ? { ...item, materials_url: e.target.value } : item) })} placeholder="Learning material URL (optional)" className="w-full rounded-lg border px-3 py-2 text-sm" /><div className="grid grid-cols-2 gap-2"><select value={stage.assessment_type} onChange={(e) => setForm({ ...form, stages: form.stages.map((item, i) => i === index ? { ...item, assessment_type: e.target.value, pass_score: e.target.value === "quiz" && !item.pass_score ? 70 : item.pass_score } : item) })} className="rounded-lg border px-3 py-2 text-xs"><option value="none">Evidence review</option><option value="quiz">Quiz</option><option value="practical">Practical</option><option value="attendance">Attendance</option></select>{stage.assessment_type === "quiz" && <label className="text-xs" style={{ color: BRAND.muted }}>Pass score %<input required type="number" min="1" max="100" value={stage.pass_score} onChange={(e) => setForm({ ...form, stages: form.stages.map((item, i) => i === index ? { ...item, pass_score: Number(e.target.value) } : item) })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>}</div></div></fieldset>)}</div></div>
          <div className="grid gap-3 sm:grid-cols-2">{[["trainee", "Employee to train"], ["trainer", "Assigned trainer"]].map(([key, label]) => <Field key={key} label={label}><select required value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={input}><option value="">Choose employee</option>{employees.map((person) => <option key={personKey(person)} value={personKey(person)}>{person.name} · {person.empid} · {person.model}</option>)}</select></Field>)}</div>
          <div className="flex items-start gap-2 rounded-xl p-3 text-xs leading-5" style={{ background: BRAND.pale, color: BRAND.maroon }}><UsersRound size={16} className="mt-0.5 shrink-0" /><p>Trainer is an active employee from this organisation. The learner submits evidence for each level; the trainer reviews and passes it or requests another attempt.</p></div>
          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: BRAND.border }}><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: BRAND.border, color: BRAND.muted }}>Cancel</button><button disabled={busy} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: BRAND.pink }}>{busy ? "Assigning…" : "Assign training"}</button></div>
        </form>
      </Modal>}

      {showCertificateSetup && <Modal title="Certificate setup" subtitle="Choose your organisation’s certificate signatory. A polished certificate is generated automatically; upload your own fillable PDF design if you have one." onClose={() => setShowCertificateSetup(false)}>
        <form onSubmit={saveCertificateSetup} className="space-y-4">
          <div className="rounded-xl border p-4" style={{ borderColor: BRAND.border, background: "#FCFAFB" }}><p className="text-sm font-bold" style={{ color: BRAND.text }}>Certificate will be issued by</p><div className="mt-3 flex items-center gap-3">{organisation?.logo ? <img src={organisation.logo} alt="" className="h-11 w-11 rounded-lg border bg-white object-contain p-1" /> : <div className="flex h-11 w-11 items-center justify-center rounded-lg text-white" style={{ background: BRAND.maroon }}><Award size={21} /></div>}<div><p className="text-sm font-bold" style={{ color: BRAND.maroon }}>{organisation?.name || "Your organisation"}</p><p className="text-xs" style={{ color: BRAND.muted }}>{organisation?.address || "Organisation address from company profile"}</p></div></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Authorised signatory name"><input required maxLength={120} value={issuer.signatory_name} onChange={(e) => setIssuer({ ...issuer, signatory_name: e.target.value })} placeholder="e.g. Priya Sharma" className={input} /></Field><Field label="Signatory designation"><input required maxLength={120} value={issuer.signatory_title} onChange={(e) => setIssuer({ ...issuer, signatory_title: e.target.value })} placeholder="e.g. Head of Human Resources" className={input} /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4" style={{ borderColor: BRAND.border }}>
              <p className="text-sm font-bold" style={{ color: BRAND.text }}>Organisation logo <span className="text-rose-700">*</span></p>
              <p className="mt-1 text-xs leading-5" style={{ color: BRAND.muted }}>Printed on the certificate. PNG or JPG, up to 2 MB.</p>
              {!logoFile && (templateStatus?.logo_url || organisation?.logo) && <img src={templateStatus?.logo_url || organisation?.logo} alt="Organisation logo preview" className="mt-3 h-12 max-w-36 rounded-lg border bg-white object-contain p-1" style={{ borderColor: BRAND.border }} />}
              <input type="file" accept="image/png,image/jpeg" onChange={(e) => chooseImage(e, setLogoFile, "Organisation logo")} className="mt-3 block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:px-3 file:py-2 file:font-semibold" />
              {logoFile && <p className="mt-2 truncate text-xs font-medium" style={{ color: BRAND.pink }}>Selected: {logoFile.name}</p>}
              {!logoFile && (templateStatus?.logo_url || organisation?.logo) && <p className="mt-2 text-xs" style={{ color: "#19734A" }}>Using the current organisation logo. Upload a replacement if needed.</p>}
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: BRAND.border }}>
              <p className="text-sm font-bold" style={{ color: BRAND.text }}>Authorised signature <span className="text-rose-700">*</span></p>
              <p className="mt-1 text-xs leading-5" style={{ color: BRAND.muted }}>Added to the signatory block. PNG or JPG, up to 2 MB.</p>
              {!signatureFile && templateStatus?.signature_url && <img src={templateStatus.signature_url} alt="Signature preview" className="mt-3 h-12 max-w-36 rounded-lg border bg-white object-contain p-1" style={{ borderColor: BRAND.border }} />}
              <input type="file" accept="image/png,image/jpeg" onChange={(e) => chooseImage(e, setSignatureFile, "Authorised signature")} className="mt-3 block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:px-3 file:py-2 file:font-semibold" />
              {signatureFile && <p className="mt-2 truncate text-xs font-medium" style={{ color: BRAND.pink }}>Selected: {signatureFile.name}</p>}
              {!signatureFile && templateStatus?.signature_url && <p className="mt-2 text-xs" style={{ color: "#19734A" }}>Current authorised signature is saved. Upload a replacement if needed.</p>}
            </div>
          </div>
          <p className="rounded-xl px-3.5 py-3 text-xs leading-5" style={{ background: BRAND.pale, color: BRAND.maroon }}>Candidate name, training title, assigned trainer, company details, completion date and certificate reference are filled from this training record automatically.</p>
          <div className="rounded-xl border border-dashed p-4" style={{ borderColor: BRAND.border }}><p className="text-sm font-bold" style={{ color: BRAND.text }}>Custom certificate design <span className="font-normal" style={{ color: BRAND.muted }}>(optional)</span></p><p className="mt-1 text-xs leading-5" style={{ color: BRAND.muted }}>Without a custom file, HRMS creates a designed landscape certificate. For your own PDF design, add fillable text fields named: <span className="font-semibold" style={{ color: BRAND.maroon }}>employee_name, training_name, trainer_name, completion_date, issue_date, company_name, signatory_name, signatory_title</span>. Other matching fields such as company_address and certificate_id are filled when present.</p><input type="file" accept="application/pdf,.pdf" onChange={(e) => setTemplateFile(e.target.files?.[0] || null)} className="mt-3 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:font-semibold" />{templateFile && <p className="mt-2 text-xs font-medium" style={{ color: BRAND.pink }}>{templateFile.name}</p>}{templateStatus?.hasCustomTemplate && !templateFile && <p className="mt-2 text-xs" style={{ color: "#19734A" }}>Custom PDF currently active. Leave file empty to keep it.</p>}<p className="mt-2 text-[11px]" style={{ color: BRAND.muted }}>PDF only · Maximum 5 MB. Updating this design will not change certificates already issued.</p></div>
          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: BRAND.border }}><button type="button" onClick={() => setShowCertificateSetup(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: BRAND.border, color: BRAND.muted }}>Cancel</button><button disabled={busy} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: BRAND.pink }}>{busy ? "Saving…" : "Save certificate setup"}</button></div>
        </form>
      </Modal>}
    </div>
  </main>;
}
