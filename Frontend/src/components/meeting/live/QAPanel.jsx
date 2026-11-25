import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FaThumbtack, FaTrash, FaRegThumbsUp, FaThumbsUp, FaCheck } from "react-icons/fa";
import useCall from "../../../../realtime/useCall";
import { emitAck } from "../../../../realtime/chatSocket";
import { useMeetingQuestions, MEETING_LIVE_KEYS } from "../../../../auth/server-state/meeting/meetingLive.hook";
import { PanelHeader } from "../RoomMedia";
import { EV } from "./liveEvents";
import { act, darkInput, PillButton, Empty, Tabs } from "./liveUi";

// The server may name these fields slightly differently; read them forgivingly.
const votesOf = (q) => q.upvoteCount ?? (Array.isArray(q.upvoters) ? q.upvoters.length : typeof q.upvotes === "number" ? q.upvotes : q.upvotes?.length ?? 0);
const mineUp = (q, myKey) => q.iUpvoted ?? q.upvoted ?? q.hasUpvoted ?? (Array.isArray(q.upvoters) && q.upvoters.some((u) => (u?.key || u) === myKey));
const authorOf = (q) => (q.anonymous ? "Anonymous" : q.authorName || q.author?.name || q.name || "Someone");
const answerOf = (q) => (typeof q.answer === "string" ? q.answer : q.answer?.text || "");
const isMine = (q, myKey) => q.mine ?? q.isMine ?? (q.authorKey || q.author?.key) === myKey;

function Question({ q, myKey, moderator, send }) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const up = mineUp(q, myKey);
  const answer = answerOf(q);

  return (
    <li className={`rounded-2xl p-3.5 ${q.pinned ? "bg-amber-400/10 ring-1 ring-amber-400/30" : "bg-white/5"}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => send(EV.qaUpvote, { questionId: q.id })} aria-pressed={!!up} className={`flex w-11 shrink-0 flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs font-semibold ${up ? "bg-[#CD166E] text-white" : "bg-white/10 text-gray-200 hover:bg-white/15"}`}>
          {up ? <FaThumbsUp className="text-[11px]" /> : <FaRegThumbsUp className="text-[11px]" />}
          {votesOf(q)}
        </button>
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap break-words text-sm text-white">{q.text}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500">
            {q.pinned && <FaThumbtack className="text-amber-300" />} {authorOf(q)}
            {moderator && q.anonymous && (q.authorName || q.author?.name) ? <span className="text-gray-600">({q.authorName || q.author?.name})</span> : null}
          </p>
          {answer && (
            <div className="mt-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              <span className="mb-0.5 flex items-center gap-1 font-semibold text-emerald-300"><FaCheck className="text-[9px]" /> Answered{q.answeredByName ? ` by ${q.answeredByName}` : ""}</span>
              {answer}
            </div>
          )}
          {replying && (
            <div className="mt-2 flex gap-2">
              <input autoFocus className={darkInput} placeholder="Type the answer" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={1000} />
              <PillButton tone="brand" disabled={!reply.trim()} onClick={() => { send(EV.qaAnswer, { questionId: q.id, answer: reply.trim() }); setReplying(false); setReply(""); }}>Send</PillButton>
            </div>
          )}
        </div>
      </div>
      {(moderator || isMine(q, myKey)) && (
        <div className="mt-2 flex flex-wrap justify-end gap-1.5">
          {moderator && <PillButton tone="ghost" onClick={() => setReplying((v) => !v)}>{answer ? "Edit answer" : "Answer"}</PillButton>}
          {moderator && <PillButton tone="ghost" onClick={() => send(EV.qaPin, { questionId: q.id, pinned: !q.pinned })}>{q.pinned ? "Unpin" : "Pin"}</PillButton>}
          <PillButton tone="danger" title="Delete" onClick={() => send(EV.qaDelete, { questionId: q.id })}><FaTrash /></PillButton>
        </div>
      )}
    </li>
  );
}

export default function QAPanel({ onClose }) {
  const { active, isHost, myKey } = useCall();
  const qc = useQueryClient();
  const meetingId = active?.meetingId;
  const roomKey = active?.roomKey;
  const { data: questions = [], isLoading, isError } = useMeetingQuestions(meetingId, true, { poll: true });
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [tab, setTab] = useState("open");

  const refresh = () => qc.invalidateQueries({ queryKey: MEETING_LIVE_KEYS.questions(meetingId) });
  const send = (event, payload) => act(async () => { await emitAck(event, { roomKey, meetingId, ...payload }); refresh(); });

  const { open, answered } = useMemo(() => {
    const visible = questions.filter((q) => !q.dismissed || isHost);
    const sort = (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || votesOf(b) - votesOf(a) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    return { open: visible.filter((q) => !answerOf(q)).sort(sort), answered: visible.filter((q) => answerOf(q)).sort(sort) };
  }, [questions, isHost]);
  const list = tab === "open" ? open : answered;

  const ask = (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    send(EV.qaAsk, { text: body, anonymous: anon });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Q&A" subtitle="Ask, upvote and get answers" onClose={onClose} />
      <Tabs tabs={[["open", `Open (${open.length})`], ["answered", `Answered (${answered.length})`]]} value={tab} onChange={setTab} />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isLoading && <p className="py-10 text-center text-xs text-gray-500">Loading questions…</p>}
        {isError && <p className="py-10 text-center text-xs text-red-300">Couldn't load the questions.</p>}
        {!isLoading && !isError && !list.length && <Empty icon="🙋" title={tab === "open" ? "No open questions" : "Nothing answered yet"} hint={tab === "open" ? "Be the first to ask." : "Answers from the host show up here."} />}
        <ul className="space-y-2.5">
          {list.map((q) => <Question key={q.id} q={q} myKey={myKey} moderator={isHost} send={send} />)}
        </ul>
      </div>
      <form onSubmit={ask} className="space-y-2 border-t border-white/10 p-3">
        <textarea rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) ask(e); }} placeholder="Ask a question" className={`${darkInput} resize-none`} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-300">
            <input type="checkbox" className="accent-[#CD166E]" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Ask anonymously
          </label>
          <PillButton type="submit" tone="brand" disabled={!text.trim()}>Ask</PillButton>
        </div>
      </form>
    </div>
  );
}
