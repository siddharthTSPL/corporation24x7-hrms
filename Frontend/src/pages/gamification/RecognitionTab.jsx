import { useEffect, useState } from "react";
import { ThumbsUp, Sparkles, Heart, Lightbulb, MessageSquare } from "lucide-react";
import { Card, Avatar, Button, Modal, Field, inputCls, Skeleton, Empty, Pill, Segmented, Icon, timeAgo, fmt } from "../../components/gamification/ui";
import { useGamKudos, useGamKudosMeta, useGamPeopleSearch, useGiveKudos, useReactKudos, useCommentKudos } from "../../auth/server-state/gamification/gamification.hook";

const REACTIONS = { appreciate: [ThumbsUp, "Appreciate"], celebrate: [Sparkles, "Celebrate"], support: [Heart, "Support"], insightful: [Lightbulb, "Insightful"] };

function GiveModal({ open, onClose, meta }) {
  const give = useGiveKudos();
  const [q, setQ] = useState(""); const [dq, setDq] = useState(""); const [to, setTo] = useState(null);
  const [category, setCategory] = useState("teamwork"); const [message, setMessage] = useState(""); const [coins, setCoins] = useState(0);
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const { data: people } = useGamPeopleSearch(dq);
  const reset = () => { setQ(""); setTo(null); setMessage(""); setCoins(0); setCategory("teamwork"); };
  const left = meta?.budget?.left ?? 0;
  const max = Math.min(left, meta?.limits?.maxCoinsPerKudos ?? 0);
  const min = meta?.limits?.minMessageLength || 10;
  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Recognise a colleague" wide>
      <div className="space-y-4">
        {to ? (
          <div className="flex items-center gap-3 rounded-lg border border-[#ede5e0] p-2.5"><Avatar name={to.name} photo={to.photo} size={34} /><div className="min-w-0 flex-1"><p className="text-[13px] font-medium text-[#2a1a16]">{to.name}</p><p className="text-xs text-[#7a6a64]">{[to.designation, to.department].filter(Boolean).join(" - ")}</p></div><Button variant="ghost" size="sm" onClick={() => setTo(null)}>Change</Button></div>
        ) : (
          <Field label="Colleague">
            <input className={inputCls} placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            {people?.people?.length > 0 && <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#ede5e0] bg-white shadow-sm">{people.people.map((p) => <button key={p.key} onClick={() => setTo(p)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[#faf7f5]"><Avatar name={p.name} photo={p.photo} size={26} /><span className="text-[13px] font-medium text-[#2a1a16]">{p.name}</span><span className="text-xs text-[#9c8880]">{p.department}</span></button>)}</div>}
          </Field>
        )}
        <Field label="Company value">
          <div className="flex flex-wrap gap-1.5">{meta?.categories?.map((c) => <button key={c.key} onClick={() => setCategory(c.key)} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${category === c.key ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-[#ede5e0] text-[#5b4b45] hover:bg-[#faf7f5]"}`}><Icon name={c.icon} size={13} />{c.label}</button>)}</div>
        </Field>
        <Field label="What did they do?" hint={`Be specific about the impact (minimum ${min} characters). ${message.length}/500`}>
          <textarea className={`${inputCls} min-h-[96px]`} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Example: Thank you for staying back to resolve the payroll discrepancy before the deadline." />
        </Field>
        {max > 0 && (
          <Field label={`Gift reward points (optional) - ${fmt(left)} remaining this month`}>
            <div className="flex items-center gap-3"><input type="range" min={0} max={max} value={coins} onChange={(e) => setCoins(+e.target.value)} className="flex-1 accent-[#730042]" /><span className="w-14 text-right text-[13px] font-semibold text-[#730042]">{coins}</span></div>
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-1"><Button variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button><Button disabled={!to || message.trim().length < min} loading={give.isPending} onClick={() => give.mutate({ toKey: to.key, category, message, coins }, { onSuccess: () => { reset(); onClose(); } })}>Send recognition</Button></div>
      </div>
    </Modal>
  );
}

function Post({ k, meta }) {
  const react = useReactKudos(); const comment = useCommentKudos();
  const [show, setShow] = useState(false); const [text, setText] = useState("");
  const cat = meta?.categories?.find((c) => c.key === k.category);
  return (
    <Card className={`p-4 ${k.pinned ? "border-[#c99700]/50" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar name={k.fromName} photo={k.fromPhoto} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#5b4b45]"><b className="font-semibold text-[#2a1a16]">{k.mine ? "You" : k.fromName}</b> recognised <b className="font-semibold text-[#2a1a16]">{k.forMe ? "you" : k.toName}</b>{cat && <Pill tone="brand"><Icon name={cat.icon} size={11} />{cat.label}</Pill>}{k.pinned && <Pill tone="warning">Pinned</Pill>}<span className="text-[11px] text-[#9c8880]">{timeAgo(k.createdAt)}</span></div>
          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-[#faf7f5] px-3 py-2.5 text-[13px] leading-relaxed text-[#2a1a16]">{k.message}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {Object.entries(REACTIONS).map(([key, [I, label]]) => { const r = k.reactions[key]; return <button key={key} title={label} onClick={() => react.mutate({ id: k.id, emoji: key })} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${r?.mine ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-[#ede5e0] text-[#7a6a64] hover:bg-[#faf7f5]"}`}><I size={13} />{r ? r.count : ""}</button>; })}
            {k.coins > 0 && <Pill tone="warning">+{k.coins} points gifted</Pill>}
            <button onClick={() => setShow((s) => !s)} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[#7a6a64] hover:text-[#730042]"><MessageSquare size={13} />{k.comments.length || "Comment"}</button>
          </div>
          {show && (
            <div className="mt-3 space-y-2 border-t border-[#f3efec] pt-3">
              {k.comments.map((c, i) => <p key={i} className="text-xs text-[#5b4b45]"><b className="font-semibold text-[#2a1a16]">{c.mine ? "You" : c.name}</b> {c.text}</p>)}
              <div className="flex gap-2"><input className={inputCls} placeholder="Add a comment" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && text.trim() && comment.mutate({ id: k.id, text }, { onSuccess: () => setText("") })} /><Button variant="secondary" onClick={() => text.trim() && comment.mutate({ id: k.id, text }, { onSuccess: () => setText("") })}>Post</Button></div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function RecognitionTab() {
  const [view, setView] = useState("all"); const [page, setPage] = useState(1); const [open, setOpen] = useState(false);
  const { data: meta } = useGamKudosMeta();
  const { data, isLoading, error } = useGamKudos({ view, page });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={view} onChange={(v) => { setView(v); setPage(1); }} options={[["all", "Everyone"], ["received", "Received"], ["given", "Given"]]} />
        <div className="flex items-center gap-3"><span className="text-xs text-[#7a6a64]">Gift points left this month: <b className="text-[#2a1a16]">{fmt(meta?.budget?.left)}</b> / {fmt(meta?.budget?.allowance)}</span><Button onClick={() => setOpen(true)}><ThumbsUp size={14} />Recognise a colleague</Button></div>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : error ? <Card><Empty icon="shield" title={error.message} /></Card> : data.items.length === 0 ? <Card><Empty icon="thumbs" title="No recognition yet" hint="Recognising a colleague is the quickest way to build a positive culture - and it earns you XP." action={<Button onClick={() => setOpen(true)}>Send the first one</Button>} /></Card> : (
        <>
          <div className="space-y-3">{data.items.map((k) => <Post key={k.id} k={k} meta={meta} />)}</div>
          {data.pages > 1 && <div className="flex items-center justify-center gap-3"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</Button><span className="text-xs text-[#7a6a64]">Page {page} of {data.pages}</span><Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Older</Button></div>}
        </>
      )}
      <GiveModal open={open} onClose={() => setOpen(false)} meta={meta} />
    </div>
  );
}
