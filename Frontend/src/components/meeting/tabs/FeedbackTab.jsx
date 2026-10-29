import { useState } from "react";
import toast from "react-hot-toast";
import { Star } from "lucide-react";
import Avatar from "../../chat/Avatar";
import { useMyMeetingFeedback, useSubmitMeetingFeedback, useMeetingFeedbackSummary } from "../../../auth/server-state/meeting/meetingSpace.hook";
import { Btn, Empty, Spinner, ErrorNote, cx, inputCls } from "../ui";
import { FEEDBACK_TAGS, errMsg } from "../meetingUtils";

function Stars({ value, onChange, size = 28 }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange?.(n)} disabled={!onChange} className="disabled:cursor-default">
          <Star size={size} className={n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
        </button>
      ))}
    </div>
  );
}

function RateForm({ meeting: m }) {
  const q = useMyMeetingFeedback(m.id);
  const submit = useSubmitMeetingFeedback();
  const mine = q.data?.feedback;
  const [rating, setRating] = useState(null);
  const [tags, setTags] = useState(null);
  const [comment, setComment] = useState(null);
  const [anonymous, setAnonymous] = useState(null);

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorNote error={q.error} retry={q.refetch} />;
  if (!q.data?.canRate) return <Empty icon={Star} title="Feedback opens when the meeting ends" />;

  const r = rating ?? mine?.rating ?? 0;
  const t = tags ?? mine?.tags ?? [];
  const c = comment ?? mine?.comment ?? "";
  const a = anonymous ?? mine?.anonymous ?? false;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-800">How was this meeting?</p>
        <Stars value={r} onChange={setRating} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(q.data.tags || Object.keys(FEEDBACK_TAGS)).map((k) => (
          <button key={k} type="button" aria-pressed={t.includes(k)} onClick={() => setTags(t.includes(k) ? t.filter((x) => x !== k) : [...t, k])} className={cx("rounded-full border px-3 py-1 text-xs", t.includes(k) ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-gray-300 text-gray-600 hover:bg-gray-50")}>
            {FEEDBACK_TAGS[k] || k}
          </button>
        ))}
      </div>
      <textarea className={inputCls} rows={3} maxLength={1000} placeholder="Anything else? (optional)" value={c} onChange={(e) => setComment(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" className="accent-[#730042]" checked={a} onChange={(e) => setAnonymous(e.target.checked)} /> Send anonymously
      </label>
      <Btn disabled={!r} loading={submit.isPending} onClick={() => submit.mutate({ id: m.id, rating: r, tags: t, comment: c, anonymous: a }, { onSuccess: () => toast.success(mine ? "Feedback updated" : "Thanks for the feedback"), onError: (e) => toast.error(errMsg(e)) })}>
        {mine ? "Update feedback" : "Send feedback"}
      </Btn>
    </div>
  );
}

function Summary({ meeting: m }) {
  const q = useMeetingFeedbackSummary(m.id);
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorNote error={q.error} retry={q.refetch} />;
  const d = q.data;
  if (!d?.count) return <Empty icon={Star} title="No feedback yet" hint="Ratings appear here once attendees respond after the meeting." />;
  const max = Math.max(...Object.values(d.distribution), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        <div>
          <p className="text-3xl font-semibold text-gray-900">{d.average}</p>
          <Stars value={Math.round(d.average)} size={16} />
        </div>
        <p className="text-sm text-gray-500">
          {d.count} of {d.invited} responded ({d.responseRate}%)
        </p>
      </div>
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((n) => (
          <div key={n} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-3">{n}</span>
            <div className="h-2 flex-1 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-amber-400" style={{ width: `${(d.distribution[n] / max) * 100}%` }} />
            </div>
            <span className="w-5 text-right">{d.distribution[n]}</span>
          </div>
        ))}
      </div>
      {Object.keys(d.tags || {}).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(d.tags).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <span key={k} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
              {FEEDBACK_TAGS[k] || k} · {n}
            </span>
          ))}
        </div>
      )}
      {d.comments?.length > 0 && (
        <ul className="space-y-2">
          {d.comments.map((c, i) => (
            <li key={i} className="rounded-lg border border-gray-200 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                {c.person ? <Avatar name={c.person.name} photo={c.person.photo} size={18} /> : null}
                <span>{c.person?.name || "Anonymous"}</span>
                <Stars value={c.rating} size={12} />
              </div>
              <p className="text-gray-700">{c.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FeedbackTab({ meeting: m, moderator }) {
  return (
    <div className="space-y-8 p-5">
      {m.status === "ended" || !moderator ? <RateForm meeting={m} /> : null}
      {moderator && (
        <section>
          {m.status === "ended" && <h4 className="mb-3 border-t border-gray-100 pt-6 text-sm font-semibold text-gray-900">Responses</h4>}
          <Summary meeting={m} />
        </section>
      )}
    </div>
  );
}
