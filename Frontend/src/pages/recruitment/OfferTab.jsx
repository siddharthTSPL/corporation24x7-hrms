import React, { useState } from "react";
import toast from "react-hot-toast";
import { FaFileAlt, FaEdit, FaCheckCircle, FaLock, FaEnvelope, FaWhatsapp, FaDownload, FaRedo, FaCalendarPlus, FaUserCheck, FaUndo, FaCommentDots } from "react-icons/fa";
import {
  useOfferBundle,
  useGenerateOffer,
  useMarkOfferReviewDone,
  useFinalizeOffer,
  useReopenOffer,
  useSendOfferEmail,
  useSendOfferWhatsapp,
  useResendOffer,
  useExtendOfferValidity,
  useJoinCandidate,
  useGenerateAppointment,
  useFinalizeAppointment,
  useSendAppointmentEmail,
  useSendAppointmentWhatsapp,
} from "../../auth/server-state/adminrecruitment/adrecruitment.hook";
import { fetchOfferPdf, fetchAppointmentPdf } from "../../auth/api/adminapi/recruitment/recruitment.api";
import OfferEditor from "./OfferEditor";

const inputCls = "w-full px-3 py-2 bg-[#fdf5f9] border border-[#eedde8] rounded-lg text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all";
const labelCls = "block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5";
const primaryBtn = "flex items-center justify-center gap-2 px-4 py-2 bg-[#730042] text-white text-xs font-semibold rounded-xl hover:bg-[#4a0029] disabled:opacity-60 disabled:cursor-not-allowed transition-all";
const ghostBtn = "flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-[#730042] hover:text-[#730042] disabled:opacity-60 disabled:cursor-not-allowed transition-all";

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
};
const ymd = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "");
const inr = (n) => (n ? `₹ ${Number(n).toLocaleString("en-IN")}` : "—");
const plusDays = (d) => new Date(Date.now() + d * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const STATUS_STYLE = {
  DRAFT: "bg-slate-100 text-slate-600",
  REVIEW_DONE: "bg-blue-50 text-blue-700",
  FINAL: "bg-violet-50 text-violet-700",
  SENT: "bg-orange-50 text-orange-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-600",
  EXPIRED: "bg-amber-50 text-amber-700",
};

const STATUS_LABEL = { DRAFT: "Draft", REVIEW_DONE: "Reviewed", FINAL: "Final", SENT: "Sent", ACCEPTED: "Accepted", REJECTED: "Rejected", EXPIRED: "Expired" };

const OfferProgress = ({ status, joined }) => {
  const steps = ["Draft", "Reviewed", "Final", "Sent", status === "REJECTED" ? "Rejected" : status === "EXPIRED" ? "Expired" : "Accepted", "Joined"];
  const idxMap = { DRAFT: 0, REVIEW_DONE: 1, FINAL: 2, SENT: 3, ACCEPTED: 4, REJECTED: 4, EXPIRED: 4 };
  const current = joined ? 5 : idxMap[status] ?? 0;
  const bad = status === "REJECTED" || status === "EXPIRED";
  return (
    <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
      {steps.map((label, i) => {
        const done = i < current || (joined && i <= current);
        const isCurrent = i === current && !joined;
        const color = isCurrent && bad && i === 4 ? "#dc2626" : done || isCurrent ? "#730042" : "#d1d5db";
        return (
          <div key={label} className="flex-1 min-w-[52px] flex flex-col items-center gap-1.5">
            <div className="w-full flex items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : ""}`} style={{ background: i <= current ? "#730042" : "#e5e7eb" }} />
              <div className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0" style={{ borderColor: color, background: done || isCurrent ? color : "#fff" }} />
              <div className={`h-0.5 flex-1 ${i === steps.length - 1 ? "opacity-0" : ""}`} style={{ background: i < current ? "#730042" : "#e5e7eb" }} />
            </div>
            <span className="text-[10px] font-semibold text-center" style={{ color: isCurrent || done ? color : "#9ca3af" }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

const GenerateForm = ({ candidate, templates, onDone }) => {
  const genMut = useGenerateOffer();
  const [form, setForm] = useState({ annual_ctc: candidate.offered_salary || "", joining_date: ymd(candidate.joining_date) || plusDays(30), validity_days: 7, template_key: "classic" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!Number(form.annual_ctc)) return toast.error("Enter the annual CTC");
    try {
      const res = await genMut.mutateAsync({
        candidateId: candidate._id,
        data: { annual_ctc: Number(form.annual_ctc), joining_date: form.joining_date, validity_days: Number(form.validity_days), template_key: form.template_key },
      });
      toast.success("Offer letter draft created");
      onDone(res.data);
    } catch (err) {
      toast.error(err?.message || "Could not generate offer");
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-4 bg-[#fdf5f9] rounded-xl border border-[#eedde8]">
        <div className="flex items-center gap-2 mb-1">
          <FaFileAlt className="text-[#730042]" size={13} />
          <span className="text-sm font-bold text-gray-800">Generate offer letter</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">Enter the basic terms now. You can edit every detail, the CTC break-up and the letter content on the next screen before sending.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Annual CTC (INR)</label>
          <input type="number" min="0" className={inputCls} value={form.annual_ctc} onChange={set("annual_ctc")} />
        </div>
        <div>
          <label className={labelCls}>Date of joining</label>
          <input type="date" className={inputCls} value={form.joining_date} onChange={set("joining_date")} />
        </div>
        <div>
          <label className={labelCls}>Offer valid for (days)</label>
          <input type="number" min="1" max="60" className={inputCls} value={form.validity_days} onChange={set("validity_days")} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Template</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {templates.map((t) => (
            <button
              key={t.key}
              onClick={() => setForm((f) => ({ ...f, template_key: t.key }))}
              className={`text-left p-3 rounded-xl border-2 transition-all ${form.template_key === t.key ? "border-[#730042] bg-[#fdf5f9]" : "border-gray-100 hover:border-gray-300"}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.accent }} />
                <span className="text-sm font-bold text-gray-800">{t.name}</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1 leading-snug">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={submit} disabled={genMut.isPending} className={primaryBtn}>
        <FaFileAlt size={11} /> {genMut.isPending ? "Generating…" : "Generate and edit"}
      </button>
    </div>
  );
};

const AppointmentSection = ({ candidate, appointment, meta, canAct, onEdit }) => {
  const genMut = useGenerateAppointment();
  const finMut = useFinalizeAppointment();
  const emailMut = useSendAppointmentEmail();
  const waMut = useSendAppointmentWhatsapp();
  const [waLink, setWaLink] = useState(null);

  const download = async () => {
    try {
      const blob = await fetchAppointmentPdf(appointment._id);
      saveBlob(blob, `Appointment_${appointment.ref_no.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      toast.error(err?.message || "Download failed");
    }
  };

  const run = async (fn, ok) => {
    try {
      const res = await fn();
      toast.success(res.message || ok);
      return res;
    } catch (err) {
      toast.error(err?.message || "Action failed");
      return null;
    }
  };

  if (!appointment) {
    return (
      <div className="border border-gray-100 rounded-xl p-4">
        <div className="text-sm font-bold text-gray-800 mb-1">Appointment letter</div>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">The candidate has joined. Generate the appointment letter, offer details are filled in automatically.</p>
        {canAct ? (
          <button
            disabled={genMut.isPending}
            className={primaryBtn}
            onClick={async () => {
              const res = await run(() => genMut.mutateAsync(candidate._id), "Appointment letter created");
              if (res?.data) onEdit(res.data);
            }}
          >
            <FaFileAlt size={11} /> {genMut.isPending ? "Generating…" : "Generate appointment letter"}
          </button>
        ) : (
          <p className="text-xs text-gray-400">Not generated yet.</p>
        )}
      </div>
    );
  }

  const isFinal = appointment.status === "FINAL";
  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-bold text-gray-800">Appointment letter</div>
          <div className="text-xs text-gray-400 mt-0.5">{appointment.ref_no}</div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isFinal ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{isFinal ? "Final · Locked" : "Draft"}</span>
      </div>
      {isFinal && appointment.sent_at && <p className="text-xs text-gray-500">Sent on {fmtDateTime(appointment.sent_at)} via {appointment.sent_via.join(", ").toLowerCase()}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={download} className={ghostBtn}><FaDownload size={10} /> Download</button>
        {canAct && !isFinal && (
          <>
            <button onClick={() => onEdit(appointment)} className={ghostBtn}><FaEdit size={10} /> Review and edit</button>
            <button
              disabled={finMut.isPending}
              className={primaryBtn}
              onClick={() => run(() => finMut.mutateAsync(appointment._id), "Finalized")}
            >
              <FaLock size={10} /> {finMut.isPending ? "Finalizing…" : "Finalize and lock"}
            </button>
          </>
        )}
        {canAct && isFinal && (
          <>
            <button disabled={emailMut.isPending} onClick={() => run(() => emailMut.mutateAsync(appointment._id), "Sent")} className={primaryBtn}>
              <FaEnvelope size={10} /> {emailMut.isPending ? "Sending…" : "Email"}
            </button>
            <button
              disabled={waMut.isPending}
              className={ghostBtn}
              onClick={async () => {
                const res = await run(() => waMut.mutateAsync(appointment._id), "Ready");
                const link = res?.data?.whatsapp_url;
                if (link) {
                  const w = window.open(link, "_blank", "noopener");
                  if (!w) setWaLink(link);
                }
              }}
            >
              <FaWhatsapp size={11} /> WhatsApp
            </button>
          </>
        )}
      </div>
      {waLink && (
        <a href={waLink} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-emerald-700 underline">Open WhatsApp</a>
      )}
      {!meta && null}
    </div>
  );
};

const OfferTab = ({ candidate, canAct }) => {
  const { data, isLoading } = useOfferBundle(candidate._id);
  const [editor, setEditor] = useState(null);
  const [joinDate, setJoinDate] = useState("");
  const [extendDate, setExtendDate] = useState("");
  const [showExtend, setShowExtend] = useState(false);
  const [waLink, setWaLink] = useState(null);

  const reviewMut = useMarkOfferReviewDone();
  const finMut = useFinalizeOffer();
  const reopenMut = useReopenOffer();
  const emailMut = useSendOfferEmail();
  const waMut = useSendOfferWhatsapp();
  const resendMut = useResendOffer();
  const extendMut = useExtendOfferValidity();
  const joinMut = useJoinCandidate();

  const bundle = data?.data;
  const offer = bundle?.offer;
  const appointment = bundle?.appointment;
  const meta = bundle ? { templates: bundle.templates, placeholders: bundle.placeholders } : null;
  const joined = candidate.current_stage === "JOINED";

  const run = async (fn, ok) => {
    try {
      const res = await fn();
      toast.success(res?.message || ok);
      return res;
    } catch (err) {
      toast.error(err?.message || "Action failed");
      return null;
    }
  };

  const openWa = (link) => {
    if (!link) return;
    const w = window.open(link, "_blank", "noopener");
    if (!w) setWaLink(link);
  };

  const downloadOffer = async () => {
    try {
      const blob = await fetchOfferPdf(offer._id);
      saveBlob(blob, `Offer_${offer.ref_no.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      toast.error(err?.message || "Download failed");
    }
  };

  if (isLoading) return <div className="py-12 text-center text-sm text-gray-400">Loading offer details…</div>;
  if (!bundle) return <div className="py-12 text-center text-sm text-gray-400">Could not load offer details.</div>;

  const legacyOffered = !offer && candidate.current_stage === "OFFER_RELEASED";

  if (!offer && candidate.current_stage === "SELECTED") {
    if (!canAct) return <p className="text-sm text-gray-400 py-6">No offer letter has been generated yet.</p>;
    return (
      <>
        <GenerateForm candidate={candidate} templates={bundle.templates || []} onDone={(o) => setEditor({ kind: "OFFER", letter: o })} />
        {editor && <OfferEditor kind={editor.kind} letter={editor.letter} meta={meta} issues={null} onClose={() => setEditor(null)} />}
      </>
    );
  }

  if (legacyOffered) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
          This candidate was moved to Offer Released before the offer letter workflow existed, so there is no digital offer on file. You can still mark them as joined.
        </div>
        {canAct && (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div>
              <label className={labelCls}>Joining date</label>
              <input type="date" className={inputCls} value={joinDate || ymd(candidate.joining_date)} onChange={(e) => setJoinDate(e.target.value)} />
            </div>
            <button
              disabled={joinMut.isPending}
              className={primaryBtn}
              onClick={() => run(() => joinMut.mutateAsync({ id: candidate._id, data: { joining_date: joinDate || ymd(candidate.joining_date) } }), "Marked as joined")}
            >
              <FaUserCheck size={11} /> {joinMut.isPending ? "Saving…" : "Mark as joined"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!offer) return <p className="text-sm text-gray-400 py-6">No offer letter for this candidate.</p>;

  const status = offer.status;
  const editable = ["DRAFT", "REVIEW_DONE"].includes(status);
  const expired = status === "EXPIRED";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-bold text-gray-800">Offer letter</div>
          <div className="text-xs text-gray-400 mt-0.5">{offer.ref_no} · {offer.designation}</div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
      </div>

      <OfferProgress status={status} joined={joined} />

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Annual CTC", val: inr(offer.ctc?.annual_ctc) },
          { label: "Joining date", val: fmtDate(offer.joining_date) },
          { label: "Valid until", val: fmtDate(offer.valid_till) },
          { label: "Template", val: (bundle.templates || []).find((t) => t.key === offer.template_key)?.name || offer.template_key },
        ].map(({ label, val }) => (
          <div key={label} className="bg-[#fdf5f9] rounded-xl p-3">
            <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">{label}</div>
            <div className="text-sm font-semibold text-gray-800">{val}</div>
          </div>
        ))}
      </div>

      {editable && bundle.issues && (bundle.issues.missing?.length > 0 || bundle.issues.unresolved?.length > 0) && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 leading-relaxed">
          {bundle.issues.missing?.length > 0 && <div>Missing: <strong>{bundle.issues.missing.join(", ")}</strong></div>}
          {bundle.issues.unresolved?.length > 0 && <div>Empty or unknown placeholders: <strong>{bundle.issues.unresolved.map((u) => `{{${u}}}`).join(", ")}</strong></div>}
        </div>
      )}

      {status === "SENT" && offer.sent_at && (
        <p className="text-xs text-gray-500">Sent on {fmtDateTime(offer.sent_at)} via {offer.sent_via.join(", ").toLowerCase()}{offer.resend_count > 0 ? ` · resent ${offer.resend_count} time${offer.resend_count > 1 ? "s" : ""}` : ""}. Waiting for the candidate's response.</p>
      )}

      {status === "ACCEPTED" && offer.response?.at && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-800 leading-relaxed">
          Accepted on <strong>{fmtDateTime(offer.response.at)}</strong>. IP: {offer.response.ip || "n/a"}.
        </div>
      )}

      {status === "REJECTED" && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-4">
          <div className="text-[10px] font-semibold tracking-widest text-red-400 uppercase mb-1">Candidate declined on {fmtDateTime(offer.response?.at)}</div>
          <p className="text-sm text-red-600 font-semibold">{offer.response?.reason}</p>
          {offer.response?.comment && <p className="text-xs text-red-500 mt-1 leading-relaxed">{offer.response.comment}</p>}
          <p className="text-[11px] text-red-400 mt-2">The opening is available again for this requisition.</p>
        </div>
      )}

      {expired && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
          This offer expired on {fmtDate(offer.valid_till)} without a response. Resend it with a new validity date or extend the validity.
        </div>
      )}

      {offer.change_requests?.length > 0 && (
        <div className="border border-gray-100 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700"><FaCommentDots className="text-[#730042]" size={11} /> Candidate messages ({offer.change_requests.length})</div>
          {offer.change_requests.map((c, i) => (
            <div key={i} className="bg-[#fdf5f9] rounded-lg px-3 py-2">
              <div className="text-[10px] text-gray-400 mb-0.5">{fmtDateTime(c.requested_at)}</div>
              <div className="text-xs text-gray-700 leading-relaxed">{c.message}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={downloadOffer} className={ghostBtn}><FaDownload size={10} /> Download PDF</button>

        {canAct && editable && (
          <button onClick={() => setEditor({ kind: "OFFER", letter: offer })} className={ghostBtn}><FaEdit size={10} /> Review and edit</button>
        )}
        {canAct && status === "DRAFT" && (
          <button disabled={reviewMut.isPending} className={primaryBtn} onClick={() => run(() => reviewMut.mutateAsync(offer._id), "Marked as reviewed")}>
            <FaCheckCircle size={10} /> {reviewMut.isPending ? "Checking…" : "Mark review done"}
          </button>
        )}
        {canAct && status === "REVIEW_DONE" && (
          <button disabled={finMut.isPending} className={primaryBtn} onClick={() => run(() => finMut.mutateAsync(offer._id), "Offer finalized")}>
            <FaLock size={10} /> {finMut.isPending ? "Finalizing…" : "Finalize offer"}
          </button>
        )}
        {canAct && ["REVIEW_DONE", "FINAL"].includes(status) && (
          <button disabled={reopenMut.isPending} className={ghostBtn} onClick={() => run(() => reopenMut.mutateAsync(offer._id), "Reopened")}>
            <FaUndo size={10} /> Reopen for editing
          </button>
        )}

        {canAct && status === "FINAL" && (
          <>
            <button disabled={emailMut.isPending} className={primaryBtn} onClick={() => run(() => emailMut.mutateAsync(offer._id), "Offer sent")}>
              <FaEnvelope size={10} /> {emailMut.isPending ? "Sending…" : "Send by email"}
            </button>
            <button
              disabled={waMut.isPending}
              className={ghostBtn}
              onClick={async () => {
                const res = await run(() => waMut.mutateAsync(offer._id), "Ready");
                openWa(res?.data?.whatsapp_url);
              }}
            >
              <FaWhatsapp size={11} /> Send on WhatsApp
            </button>
          </>
        )}

        {canAct && (status === "SENT" || expired) && (
          <>
            <button
              disabled={resendMut.isPending}
              className={primaryBtn}
              onClick={() => run(() => resendMut.mutateAsync({ id: offer._id, data: { channel: "EMAIL", valid_till: expired ? extendDate || plusDays(7) : undefined } }), "Offer resent")}
            >
              <FaRedo size={10} /> {resendMut.isPending ? "Sending…" : "Resend email"}
            </button>
            <button
              disabled={resendMut.isPending}
              className={ghostBtn}
              onClick={async () => {
                const res = await run(() => resendMut.mutateAsync({ id: offer._id, data: { channel: "WHATSAPP", valid_till: expired ? extendDate || plusDays(7) : undefined } }), "Ready");
                openWa(res?.data?.whatsapp_url);
              }}
            >
              <FaWhatsapp size={11} /> Resend on WhatsApp
            </button>
            <button className={ghostBtn} onClick={() => setShowExtend((v) => !v)}><FaCalendarPlus size={10} /> Extend validity</button>
          </>
        )}
      </div>

      {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-emerald-700 underline">Open WhatsApp</a>}

      {canAct && (showExtend || expired) && (status === "SENT" || expired) && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end p-4 bg-[#fdf5f9] rounded-xl border border-[#eedde8]">
          <div>
            <label className={labelCls}>New validity date</label>
            <input type="date" className={inputCls} min={plusDays(0)} value={extendDate} onChange={(e) => setExtendDate(e.target.value)} />
          </div>
          <button
            disabled={!extendDate || extendMut.isPending}
            className={primaryBtn}
            onClick={async () => {
              const res = await run(() => extendMut.mutateAsync({ id: offer._id, data: { valid_till: extendDate } }), "Validity extended");
              if (res) {
                setShowExtend(false);
                setExtendDate("");
              }
            }}
          >
            {extendMut.isPending ? "Saving…" : expired ? "Extend and reopen offer" : "Extend"}
          </button>
        </div>
      )}

      {status === "ACCEPTED" && !joined && canAct && (
        <div className="p-4 border border-emerald-100 bg-emerald-50/50 rounded-xl">
          <div className="text-sm font-bold text-gray-800 mb-1">Candidate has accepted</div>
          <p className="text-xs text-gray-500 mb-3">Confirm the joining date when the candidate reports for duty.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div>
              <label className={labelCls}>Joining date</label>
              <input type="date" className={inputCls} value={joinDate || ymd(offer.joining_date)} onChange={(e) => setJoinDate(e.target.value)} />
            </div>
            <button
              disabled={joinMut.isPending}
              className={primaryBtn}
              onClick={() => run(() => joinMut.mutateAsync({ id: candidate._id, data: { joining_date: joinDate || ymd(offer.joining_date) } }), "Marked as joined")}
            >
              <FaUserCheck size={11} /> {joinMut.isPending ? "Saving…" : "Mark as joined"}
            </button>
          </div>
        </div>
      )}

      {joined && (
        <AppointmentSection
          candidate={candidate}
          appointment={appointment}
          meta={meta}
          canAct={canAct}
          onEdit={(letter) => setEditor({ kind: "APPOINTMENT", letter })}
        />
      )}

      {editor && (
        <OfferEditor
          key={`${editor.kind}-${editor.letter._id}`}
          kind={editor.kind}
          letter={editor.kind === "OFFER" ? offer || editor.letter : appointment || editor.letter}
          meta={meta}
          issues={editor.kind === "OFFER" ? bundle.issues : null}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
};

export default OfferTab;