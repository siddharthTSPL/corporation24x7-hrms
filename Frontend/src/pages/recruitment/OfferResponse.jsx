import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FaCheckCircle, FaTimesCircle, FaFilePdf, FaClock, FaExclamationCircle, FaCommentDots } from "react-icons/fa";
import { getPublicOffer, respondToOffer, publicOfferPdfUrl } from "../../auth/api/public/offerresponse.api";

const fmtDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
};

const fmtInr = (n) => (n ? `₹ ${Number(n).toLocaleString("en-IN")}` : "-");

const Shell = ({ children }) => (
  <div className="min-h-screen bg-[#f4f3ee] px-3 py-6 sm:py-10 flex justify-center">
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ece8e0]">{children}</div>
      <p className="text-center text-[11px] text-gray-400 mt-4">Secure offer response, powered by TorchX Talent</p>
    </div>
  </div>
);

const Header = ({ data }) => (
  <div className="px-6 py-5 flex items-center gap-3" style={{ background: data.accent }}>
    {data.logo_url ? (
      <span className="bg-white rounded-lg p-1.5 flex items-center">
        <img src={data.logo_url} alt="" className="h-8 w-auto max-w-[110px] object-contain" />
      </span>
    ) : null}
    <span className="text-white font-bold text-lg leading-tight">{data.company_name}</span>
  </div>
);

const Row = ({ label, value }) =>
  value ? (
    <div className="flex justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  ) : null;

const Message = ({ icon, tone, title, text, data }) => (
  <Shell>
    {data && <Header data={data} />}
    <div className="p-8 text-center">
      <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${tone}`}>{icon}</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
    </div>
  </Shell>
);

const OfferResponse = () => {
  const { token } = useParams();
  const [mode, setMode] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [changeMsg, setChangeMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [finished, setFinished] = useState(null);

  const { data, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ["public-offer", token],
    queryFn: () => getPublicOffer(token),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const offer = data?.data;

  const submit = async (payload, onDone) => {
    setBusy(true);
    setError("");
    try {
      const res = await respondToOffer(token, payload);
      onDone(res);
    } catch (err) {
      setError(err.message);
      if (err.status === 409 || err.status === 410) refetch();
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="p-10 text-center text-sm text-gray-400">Loading your offer…</div>
      </Shell>
    );
  }

  if (loadError || !offer) {
    return (
      <Message
        tone="bg-red-50 text-red-500"
        icon={<FaExclamationCircle size={28} />}
        title="Link not available"
        text="This link is invalid or no longer available. Please contact the HR team that sent you the offer."
      />
    );
  }

  if (finished === "ACCEPTED" || (offer.state === "RESPONDED" && offer.response_action === "ACCEPTED")) {
    return (
      <Message
        data={offer}
        tone="bg-emerald-50 text-emerald-600"
        icon={<FaCheckCircle size={30} />}
        title={finished ? "Offer accepted" : "Already responded"}
        text={finished ? `Thank you, ${offer.candidate_name}. Your acceptance has been recorded and a confirmation email is on its way. The HR team will contact you about joining formalities.` : `You accepted this offer on ${fmtDate(offer.responded_at)}. No further action is needed.`}
      />
    );
  }

  if (finished === "REJECTED" || (offer.state === "RESPONDED" && offer.response_action === "REJECTED")) {
    return (
      <Message
        data={offer}
        tone="bg-gray-100 text-gray-500"
        icon={<FaTimesCircle size={30} />}
        title={finished ? "Response recorded" : "Already responded"}
        text={finished ? "We have recorded that you are declining this offer. Thank you for your time, we wish you all the best." : `You declined this offer on ${fmtDate(offer.responded_at)}. No further action is needed.`}
      />
    );
  }

  if (offer.state === "EXPIRED") {
    return (
      <Message
        data={offer}
        tone="bg-amber-50 text-amber-600"
        icon={<FaClock size={28} />}
        title="This offer has expired"
        text={`The validity of this offer ended on ${fmtDate(offer.valid_till)}. Please contact the HR team if you would still like to be considered.`}
      />
    );
  }

  if (offer.state !== "PENDING") {
    return (
      <Message
        data={offer}
        tone="bg-gray-100 text-gray-500"
        icon={<FaExclamationCircle size={28} />}
        title="Link not available"
        text="This offer is not open for a response right now. Please contact the HR team."
      />
    );
  }

  const btn = "w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60";

  return (
    <Shell>
      <Header data={offer} />
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">Hello {offer.candidate_name},</h1>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          {offer.company_name} is pleased to offer you the position of <strong className="text-gray-800">{offer.designation}</strong>. Please review the details and let us know your decision.
        </p>

        <div className="mt-5 rounded-xl border border-gray-100 px-4 py-1">
          <Row label="Reference" value={offer.ref_no} />
          <Row label="Designation" value={offer.designation} />
          <Row label="Department" value={offer.department} />
          <Row label="Employment" value={[offer.employment_type, offer.work_mode].filter(Boolean).join(" · ")} />
          <Row label="Location" value={offer.work_location} />
          <Row label="Annual CTC" value={fmtInr(offer.annual_ctc)} />
          <Row label="Date of Joining" value={fmtDate(offer.joining_date)} />
          <Row label="Offer Valid Until" value={fmtDate(offer.valid_till)} />
        </div>

        <a
          href={publicOfferPdfUrl(token)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
        >
          <FaFilePdf className="text-red-500" /> View full offer letter (PDF)
        </a>

        {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
        {notice && <div className="mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">{notice}</div>}

        {!mode && (
          <div className="mt-5 space-y-3">
            <button className={`${btn} text-white bg-emerald-600 hover:bg-emerald-700`} onClick={() => { setMode("ACCEPT"); setError(""); setNotice(""); }}>
              Accept Offer
            </button>
            <button className={`${btn} text-red-600 border-2 border-red-500 bg-white hover:bg-red-50`} onClick={() => { setMode("REJECT"); setError(""); setNotice(""); }}>
              Reject Offer
            </button>
            {offer.change_requests_left > 0 && (
              <button className="w-full text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1.5 py-1" onClick={() => { setMode("CHANGES"); setError(""); setNotice(""); }}>
                <FaCommentDots size={11} /> Request changes to salary or joining date
              </button>
            )}
          </div>
        )}

        {mode === "ACCEPT" && (
          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-5 h-5 accent-emerald-600" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span className="text-sm text-gray-700 leading-relaxed">I accept the terms of this offer</span>
            </label>
            <button
              disabled={!accepted || busy}
              className={`${btn} text-white bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed`}
              onClick={() => submit({ action: "ACCEPT", accepted_terms: true }, () => setFinished("ACCEPTED"))}
            >
              {busy ? "Saving…" : "Confirm Acceptance"}
            </button>
            <button className="w-full text-xs font-semibold text-gray-500 py-1" onClick={() => setMode(null)}>Go back</button>
          </div>
        )}

        {mode === "REJECT" && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-gray-400 uppercase mb-1.5">Reason for declining</label>
              <select className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-gray-500 bg-white" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Select a reason</option>
                {offer.reject_reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-gray-400 uppercase mb-1.5">Comment (optional)</label>
              <textarea rows={3} maxLength={1000} className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-gray-500 resize-y" value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <button
              disabled={!reason || busy}
              className={`${btn} text-white bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed`}
              onClick={() => submit({ action: "REJECT", reason, comment }, () => setFinished("REJECTED"))}
            >
              {busy ? "Saving…" : "Confirm Rejection"}
            </button>
            <button className="w-full text-xs font-semibold text-gray-500 py-1" onClick={() => setMode(null)}>Go back</button>
          </div>
        )}

        {mode === "CHANGES" && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-gray-400 uppercase mb-1.5">What would you like to discuss?</label>
              <textarea rows={4} maxLength={1500} className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-gray-500 resize-y" value={changeMsg} onChange={(e) => setChangeMsg(e.target.value)} />
              <p className="text-[11px] text-gray-400 mt-1.5">Your offer stays open. HR will get in touch with you.</p>
            </div>
            <button
              disabled={changeMsg.trim().length < 5 || busy}
              className={`${btn} text-white disabled:cursor-not-allowed`}
              style={{ background: offer.accent }}
              onClick={() =>
                submit({ action: "REQUEST_CHANGES", message: changeMsg }, (res) => {
                  setNotice(res.message);
                  setChangeMsg("");
                  setMode(null);
                  refetch();
                })
              }
            >
              {busy ? "Sending…" : "Send to HR"}
            </button>
            <button className="w-full text-xs font-semibold text-gray-500 py-1" onClick={() => setMode(null)}>Go back</button>
          </div>
        )}
      </div>
    </Shell>
  );
};

export default OfferResponse;