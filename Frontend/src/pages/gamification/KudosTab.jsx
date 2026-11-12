import { useEffect, useState } from "react";
import { Card, Avatar, Button, Modal, Field, inputCls, Skeleton, Empty, Pill, timeAgo, fmt } from "../../components/gamification/ui";
import { useGamKudos, useGamKudosMeta, useGamPeopleSearch, useGiveKudos, useReactKudos, useCommentKudos } from "../../auth/server-state/gamification/gamification.hook";

function GiveModal({ open, onClose, meta }) {
  const give = useGiveKudos();
  const [q, setQ] = useState(""); const [dq, setDq] = useState("");
  const [to, setTo] = useState(null);
  const [category, setCategory] = useState("teamwork");
  const [message, setMessage] = useState(""); const [coins, setCoins] = useState(0);
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const { data: people } = useGamPeopleSearch(dq);
  const reset = () => { setQ(""); setTo(null); setMessage(""); setCoins(0); setCategory("teamwork"); };
  const left = meta?.budget?.left ?? 0;
  const max = Math.min(left, meta?.limits?.maxCoinsPerKudos ?? 0);
  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="👏 Recognise a teammate" wide>
      <div className="space-y-3">
        {to ? (
          <div className="flex items-center gap-3 rounded-xl bg-pink-50 p-2.5"><Avatar name={to.name} photo={to.photo} size={36} /><div className="flex-1"><p className="text-sm font-bold">{to.name}</p><p className="text-xs text-gray-500">{to.designation} {to.department && `· ${to.department}`}</p></div><button className="text-xs font-semibold text-[#730042]" onClick={() => setTo(null)}>change</button></div>
        ) : (
          <Field label="Who made your day?">
            <input className={inputCls} placeholder="Search a colleague by name…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            {people?.people?.length > 0 && <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border bg-white shadow">{people.people.map((p) => <button key={p.key} onClick={() => setTo(p)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-pink-50"><Avatar name={p.name} photo={p.photo} size={28} ring={false} /><span className="text-sm font-semibold">{p.name}</span><span className="text-xs text-gray-400">{p.department}</span></button>)}</div>}
          </Field>
        )}
        <Field label="What did they do well?">
          <div className="flex flex-wrap gap-1.5">{meta?.categories?.map((c) => <button key={c.key} onClick={() => setCategory(c.key)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${category === c.key ? "border-[#730042] bg-pink-50 text-[#730042]" : "border-gray-200 text-gray-600"}`}>{c.icon} {c.label}</button>)}</div>
        </Field>
        <Field label="Your message" hint={`Be specific — ${meta?.limits?.minMessageLength || 10}+ characters. ${message.length}/500`}>
          <textarea className={`${inputCls} min-h-[90px]`} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Thanks for staying late to help us ship the release — it really made a difference!" />
        </Field>
        {max > 0 && (
          <Field label={`Gift coins (optional) — ${fmt(left)} left this month`}>
            <div className="flex items-center gap-3"><input type="range" min={0} max={max} value={coins} onChange={(e) => setCoins(+e.target.value)} className="flex-1 accent-[#730042]" /><span className="w-16 text-right text-sm font-bold text-[#730042]">🪙 {coins}</span></div>
          </Field>
        )}
        <Button variant="pink" className="w-full" disabled={!to || message.trim().length < (meta?.limits?.minMessageLength || 10)} loading={give.isPending}
          onClick={() => give.mutate({ toKey: to.key, category, message, coins }, { onSuccess: () => { reset(); onClose(); } })}>Send kudos 🎉</Button>
      </div>
    </Modal>
  );
}

function KudosCard({ k, meta }) {
  const react = useReactKudos(); const comment = useCommentKudos();
  const [show, setShow] = useState(false); const [text, setText] = useState("");
  const cat = meta?.categories?.find((c) => c.key === k.category);
  return (
    <Card className={`p-4 ${k.pinned ? "ring-2 ring-amber-300" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar name={k.fromName} photo={k.fromPhoto} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-700"><b>{k.mine ? "You" : k.fromName}</b> recognised <b>{k.forMe ? "you" : k.toName}</b> {cat && <Pill className="ml-1">{cat.icon} {cat.label}</Pill>}{k.pinned && <Pill color="#d97706" className="ml-1">📌 pinned</Pill>}</p>
          <p className="mt-1.5 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-800">{k.message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {k.coins > 0 && <Pill color="#d97706">🪙 {k.coins} gifted</Pill>}
            {meta?.reactions?.map((e) => { const r = k.reactions[e]; return <button key={e} onClick={() => react.mutate({ id: k.id, emoji: e })} className={`rounded-full border px-2 py-0.5 text-xs ${r?.mine ? "border-[#cd166e] bg-pink-50" : "border-gray-200 hover:bg-gray-50"}`}>{e}{r ? ` ${r.count}` : ""}</button>; })}
            <button onClick={() => setShow((s) => !s)} className="ml-auto text-xs font-semibold text-gray-500 hover:text-[#730042]">💬 {k.comments.length || ""} · {timeAgo(k.createdAt)}</button>
          </div>
          {show && (
            <div className="mt-2 space-y-1.5">
              {k.comments.map((c, i) => <p key={i} className="text-xs"><b>{c.mine ? "You" : c.name}</b> <span className="text-gray-600">{c.text}</span></p>)}
              <div className="flex gap-2"><input className={`${inputCls} !py-1.5`} placeholder="Add a comment…" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && text.trim() && comment.mutate({ id: k.id, text }, { onSuccess: () => setText("") })} /><Button variant="ghost" onClick={() => text.trim() && comment.mutate({ id: k.id, text }, { onSuccess: () => setText("") })}>Post</Button></div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function KudosTab() {
  const [view, setView] = useState("all"); const [page, setPage] = useState(1); const [open, setOpen] = useState(false);
  const { data: meta } = useGamKudosMeta();
  const { data, isLoading, error } = useGamKudos({ view, page });
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#730042] to-[#cd166e] p-4 text-white">
        <div><p className="text-lg font-extrabold">Kudos wall 👏</p><p className="text-xs opacity-90">Gift coins left this month: <b>{fmt(meta?.budget?.left)}</b> / {fmt(meta?.budget?.allowance)}</p></div>
        <Button className="!bg-white !text-[#730042] hover:!bg-pink-50" onClick={() => setOpen(true)}>+ Give kudos</Button>
      </Card>
      <div className="flex gap-1">{[["all", "Everyone"], ["received", "Received"], ["given", "Given"]].map(([k, l]) => <button key={k} onClick={() => { setView(k); setPage(1); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${view === k ? "bg-[#730042] text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}>{l}</button>)}</div>
      {isLoading ? <Skeleton className="h-40" /> : error ? <Empty icon="🔒" title={error.message} /> : data.items.length === 0 ? <Card><Empty icon="🌱" title="No kudos here yet" hint="Be the first to recognise someone — it earns you XP too!" /></Card> : (
        <>
          <div className="space-y-3">{data.items.map((k) => <KudosCard key={k.id} k={k} meta={meta} />)}</div>
          {data.pages > 1 && <div className="flex justify-center gap-2"><Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Newer</Button><span className="self-center text-xs text-gray-500">{page}/{data.pages}</span><Button variant="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Older →</Button></div>}
        </>
      )}
      <GiveModal open={open} onClose={() => setOpen(false)} meta={meta} />
    </div>
  );
}
