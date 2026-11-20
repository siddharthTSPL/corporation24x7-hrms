import { useState } from "react";
import toast from "react-hot-toast";
import { FaPlus, FaTimes } from "react-icons/fa";
import useCall from "../../../../realtime/useCall";
import { useMeetingPolls, useCreatePoll, useVotePoll, useClosePoll, useDeletePoll } from "../../../../auth/server-state/meeting/meetingSpace.hook";
import { PanelHeader } from "../RoomMedia";
import { darkInput, PillButton, Empty } from "./liveUi";

const msg = (e) => e?.message || "Something went wrong.";

function CreatePoll({ meetingId, onDone }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const create = useCreatePoll();

  const submit = () => {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return toast.error("Ask a question");
    if (opts.length < 2) return toast.error("Add at least two options");
    create.mutate({ id: meetingId, question: question.trim(), options: opts, multiple, anonymous, notify: true }, { onSuccess: onDone, onError: (e) => toast.error(msg(e)) });
  };

  return (
    <div className="space-y-2.5 rounded-2xl bg-white/5 p-3.5">
      <input autoFocus className={darkInput} placeholder="Your question" maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value)} />
      {options.map((o, i) => (
        <div key={i} className="flex gap-2">
          <input className={darkInput} placeholder={`Option ${i + 1}`} maxLength={120} value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
          {options.length > 2 && <PillButton tone="ghost" title="Remove option" onClick={() => setOptions(options.filter((_, j) => j !== i))}><FaTimes /></PillButton>}
        </div>
      ))}
      {options.length < 8 && <PillButton tone="ghost" onClick={() => setOptions([...options, ""])}><FaPlus className="mr-1 inline text-[9px]" /> Add option</PillButton>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-300">
        <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-[#CD166E]" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} /> Multiple answers</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-[#CD166E]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Anonymous</label>
      </div>
      <div className="flex justify-end gap-2">
        <PillButton tone="ghost" onClick={onDone}>Cancel</PillButton>
        <PillButton tone="brand" disabled={create.isPending} onClick={submit}>{create.isPending ? "Creating…" : "Launch poll"}</PillButton>
      </div>
    </div>
  );
}

function PollCard({ poll: p, meetingId, moderator }) {
  const vote = useVotePoll();
  const close = useClosePoll();
  const del = useDeletePoll();
  const [sel, setSel] = useState(p.myVotes || []);
  const open = p.status === "open";
  const mine = p.myVotes || [];
  const showResults = !open || mine.length > 0 || moderator;
  const changed = sel.length > 0 && (sel.length !== mine.length || sel.some((s) => !mine.includes(s)));
  const pick = (id) => open && setSel(p.multiple ? (sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]) : [id]);

  return (
    <li className="rounded-2xl bg-white/5 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{p.question}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{p.totalVoters} voted · {p.multiple ? "Choose any" : "Choose one"}{p.anonymous ? " · Anonymous" : ""}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${open ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-gray-400"}`}>{open ? "Open" : "Closed"}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {p.options.map((o) => {
          const on = sel.includes(o.id);
          return (
            <li key={o.id}>
              <button type="button" disabled={!open} onClick={() => pick(o.id)} aria-pressed={on} className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm ${on ? "border-[#CD166E]" : "border-white/10"} ${open ? "hover:border-white/30" : ""}`}>
                {showResults && <span className="absolute inset-y-0 left-0 bg-[#CD166E]/25" style={{ width: `${o.percent}%` }} />}
                <span className="relative flex items-center justify-between gap-3">
                  <span className="text-white">{o.text}</span>
                  {showResults && <span className="text-xs text-gray-400">{o.votes} · {o.percent}%</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {open && <PillButton tone="brand" disabled={!changed || vote.isPending} onClick={() => vote.mutate({ id: meetingId, pollId: p.id, optionIds: sel }, { onError: (e) => toast.error(msg(e)) })}>{mine.length ? "Update vote" : "Vote"}</PillButton>}
        {moderator && open && <PillButton disabled={close.isPending} onClick={() => close.mutate({ id: meetingId, pollId: p.id })}>Close poll</PillButton>}
        {moderator && <PillButton tone="danger" className="ml-auto" onClick={() => window.confirm("Delete this poll and its votes?") && del.mutate({ id: meetingId, pollId: p.id })}>Delete</PillButton>}
      </div>
    </li>
  );
}

export default function PollsPanel({ onClose }) {
  const { active, isHost } = useCall();
  const meetingId = active?.meetingId;
  const { data: polls = [], isLoading, isError } = useMeetingPolls(meetingId, true);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Polls" subtitle={isHost ? "Ask the room a quick question" : "Vote when the host launches a poll"} onClose={onClose} right={isHost && !creating ? <PillButton tone="light" onClick={() => setCreating(true)}><FaPlus className="mr-1 inline text-[9px]" /> New</PillButton> : null} />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {creating && <CreatePoll meetingId={meetingId} onDone={() => setCreating(false)} />}
        {isLoading && <p className="py-10 text-center text-xs text-gray-500">Loading polls…</p>}
        {isError && <p className="py-10 text-center text-xs text-red-300">Couldn't load the polls.</p>}
        {!isLoading && !isError && !polls.length && !creating && <Empty icon="📊" title="No polls yet" hint={isHost ? "Tap New to launch one." : "Polls the host launches appear here."} />}
        <ul className="space-y-3">{polls.map((p) => <PollCard key={p.id} poll={p} meetingId={meetingId} moderator={isHost} />)}</ul>
      </div>
    </div>
  );
}
