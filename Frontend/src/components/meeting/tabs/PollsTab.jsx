import { useState } from "react";
import toast from "react-hot-toast";
import { BarChart3, Plus, X } from "lucide-react";
import { useMeetingPolls, useCreatePoll, useVotePoll, useClosePoll, useDeletePoll } from "../../../auth/server-state/meeting/meetingSpace.hook";
import { Btn, Chip, Empty, Spinner, ErrorNote, cx, inputCls } from "../ui";
import { errMsg } from "../meetingUtils";

function CreatePoll({ meetingId, onDone }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [notify, setNotify] = useState(true);
  const create = useCreatePoll();

  const submit = () => {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return toast.error("Ask a question");
    if (opts.length < 2) return toast.error("Add at least two options");
    create.mutate({ id: meetingId, question: question.trim(), options: opts, multiple, anonymous, notify }, { onSuccess: () => { toast.success("Poll created"); onDone(); }, onError: (e) => toast.error(errMsg(e)) });
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <input className={inputCls} placeholder="Your question" maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value)} autoFocus />
      {options.map((o, i) => (
        <div key={i} className="flex gap-2">
          <input className={inputCls} placeholder={`Option ${i + 1}`} maxLength={120} value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
          {options.length > 2 && (
            <Btn variant="ghost" size="icon" aria-label="Remove option" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
              <X size={15} />
            </Btn>
          )}
        </div>
      ))}
      {options.length < 8 && (
        <Btn variant="ghost" size="sm" onClick={() => setOptions([...options, ""])}>
          <Plus size={14} /> Add option
        </Btn>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        {[["Allow multiple answers", multiple, setMultiple], ["Anonymous votes", anonymous, setAnonymous], ["Notify attendees", notify, setNotify]].map(([label, v, set]) => (
          <label key={label} className="flex items-center gap-1.5">
            <input type="checkbox" className="accent-[#730042]" checked={v} onChange={(e) => set(e.target.checked)} /> {label}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Btn>
        <Btn size="sm" loading={create.isPending} onClick={submit}>
          Create poll
        </Btn>
      </div>
    </div>
  );
}

function PollCard({ poll: p, meetingId, moderator }) {
  const vote = useVotePoll();
  const close = useClosePoll();
  const del = useDeletePoll();
  const [sel, setSel] = useState(p.myVotes);
  const open = p.status === "open";
  const showResults = !open || p.myVotes.length > 0 || moderator;
  const changed = sel.length > 0 && (sel.length !== p.myVotes.length || sel.some((s) => !p.myVotes.includes(s)));

  const pick = (id) => {
    if (!open) return;
    setSel(p.multiple ? (sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]) : [id]);
  };

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{p.question}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {p.totalVoters} voted · {p.multiple ? "Choose any" : "Choose one"}
            {p.anonymous ? " · Anonymous" : ""}
          </p>
        </div>
        <Chip tone={open ? "green" : "gray"}>{open ? "Open" : "Closed"}</Chip>
      </div>

      <ul className="mt-3 space-y-2">
        {p.options.map((o) => {
          const on = sel.includes(o.id);
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={!open}
                onClick={() => pick(o.id)}
                aria-pressed={on}
                className={cx("relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm", on ? "border-[#730042]" : "border-gray-200", open && "hover:border-[#730042]/60")}
              >
                {showResults && <span className="absolute inset-y-0 left-0 bg-[#730042]/10" style={{ width: `${o.percent}%` }} />}
                <span className="relative flex items-center justify-between gap-3">
                  <span className={on ? "font-medium text-[#730042]" : "text-gray-800"}>{o.text}</span>
                  {showResults && (
                    <span className="text-xs text-gray-500">
                      {o.votes} · {o.percent}%
                    </span>
                  )}
                </span>
                {o.voters?.length > 0 && <span className="relative mt-1 block text-xs text-gray-500">{o.voters.map((v) => v.name).join(", ")}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {open && (
          <Btn size="sm" disabled={!changed} loading={vote.isPending} onClick={() => vote.mutate({ id: meetingId, pollId: p.id, optionIds: sel }, { onSuccess: () => toast.success("Vote saved"), onError: (e) => toast.error(errMsg(e)) })}>
            {p.myVotes.length ? "Update vote" : "Vote"}
          </Btn>
        )}
        {moderator && open && (
          <Btn variant="secondary" size="sm" loading={close.isPending} onClick={() => close.mutate({ id: meetingId, pollId: p.id })}>
            Close poll
          </Btn>
        )}
        {moderator && (
          <Btn variant="dangerSoft" size="sm" className="ml-auto" onClick={() => window.confirm("Delete this poll and its votes?") && del.mutate({ id: meetingId, pollId: p.id })}>
            Delete
          </Btn>
        )}
      </div>
    </li>
  );
}

export default function PollsTab({ meeting: m, moderator }) {
  const q = useMeetingPolls(m.id);
  const [creating, setCreating] = useState(false);
  const polls = q.data || [];

  return (
    <div className="space-y-4 p-5">
      {moderator && m.status !== "cancelled" && (creating ? <CreatePoll meetingId={m.id} onDone={() => setCreating(false)} /> : (
        <Btn variant="soft" onClick={() => setCreating(true)}>
          <Plus size={15} /> New poll
        </Btn>
      ))}
      {q.isLoading && <Spinner />}
      {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
      {!q.isLoading && !q.isError && polls.length === 0 && !creating && <Empty icon={BarChart3} title="No polls yet" hint={moderator ? "Ask the group a quick question before, during or after the meeting." : "Polls from the host will appear here."} />}
      <ul className="space-y-3">
        {polls.map((p) => (
          <PollCard key={`${p.id}:${p.myVotes.join()}`} poll={p} meetingId={m.id} moderator={moderator} />
        ))}
      </ul>
    </div>
  );
}
