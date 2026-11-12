import { useState } from "react";
import { Card, Button, Modal, Field, inputCls, Pill, Skeleton, Empty, SectionTitle, Avatar, timeLeft, fmt } from "../../../components/gamification/ui";
import {
  useAdminChallenges, useCreateChallenge, useUpdateChallenge, useFinaliseChallenge, useCancelChallenge,
  useAdminQuests, useCreateQuest, useUpdateQuest, useDeleteQuest,
  useAdminSeasons, useCreateSeason, useFinaliseSeason, useDeleteSeason,
  useAdminQuiz, useCreateQuiz, useUpdateQuiz, useDeleteQuiz, useGamMeta, useAdminSettings,
} from "../../../auth/server-state/gamification/gamification.hook";

const toLocal = (d) => { const x = new Date(d || Date.now()); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const Row = ({ children }) => <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
const Num = (p) => <input type="number" className={inputCls} {...p} onChange={(e) => p.onChange(e.target.value === "" ? "" : +e.target.value)} />;
const Head = ({ title, icon, onNew, label = "+ New" }) => <SectionTitle icon={icon} title={title} right={<Button variant="pink" onClick={onNew}>{label}</Button>} />;
const Confirm = (msg, fn) => () => window.confirm(msg) && fn();

// ───────── Challenges ─────────
function ChallengeForm({ init, onClose }) {
  const create = useCreateChallenge(); const update = useUpdateChallenge();
  const { data: meta } = useGamMeta();
  const [f, setF] = useState(() => init ? { ...init, startsAt: toLocal(init.startsAt), endsAt: toLocal(init.endsAt), departments: (init.departments || []).join(", ") } : { title: "", description: "", icon: "🏆", scope: "individual", metric: "count", events: [], target: 10, startsAt: toLocal(), endsAt: toLocal(Date.now() + 7 * 86400000), optIn: false, departments: "", rewardXp: 100, rewardCoins: 20, podiumXp: [100, 50, 25], podiumCoins: [30, 20, 10] });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const m = init ? update : create;
  const toggleEv = (k) => set("events", f.events.includes(k) ? f.events.filter((e) => e !== k) : [...f.events, k]);
  const submit = () => m.mutate({ ...f, ...(init ? { id: init.id } : {}), startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString(), departments: f.departments ? f.departments.split(",").map((d) => d.trim()).filter(Boolean) : [] }, { onSuccess: onClose });
  return (
    <div className="space-y-3">
      <Row><Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Kudos Week" /></Field><Field label="Icon"><input className={inputCls} value={f.icon} maxLength={4} onChange={(e) => set("icon", e.target.value)} /></Field></Row>
      <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <Row>
        <Field label="Who competes"><select className={inputCls} value={f.scope} onChange={(e) => set("scope", e.target.value)}><option value="individual">Individuals</option><option value="department">Department vs department</option></select></Field>
        <Field label="What counts"><select className={inputCls} value={f.metric} onChange={(e) => set("metric", e.target.value)}><option value="count">Number of times an activity happens</option><option value="xp">XP earned</option></select></Field>
      </Row>
      <Field label={f.metric === "xp" ? "Only count XP from… (leave empty for all)" : "Activities to count"}>
        <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">{meta?.events?.map((e) => <button type="button" key={e.key} onClick={() => toggleEv(e.key)} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${f.events.includes(e.key) ? "border-[#730042] bg-pink-50 text-[#730042]" : "border-gray-200 text-gray-500"}`}>{e.icon} {e.label}</button>)}</div>
      </Field>
      <Row><Field label="Start"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field><Field label="End"><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field></Row>
      <Row><Field label={`Goal (${f.metric === "xp" ? "XP" : "times"})`}><Num value={f.target} min={1} onChange={(v) => set("target", v)} /></Field><Field label="Only these departments (comma-separated, optional)"><input className={inputCls} value={f.departments} onChange={(e) => set("departments", e.target.value)} placeholder="Sales, Support" /></Field></Row>
      <Row><Field label="Reward on reaching the goal — XP"><Num value={f.rewardXp} onChange={(v) => set("rewardXp", v)} /></Field><Field label="Reward — coins"><Num value={f.rewardCoins} onChange={(v) => set("rewardCoins", v)} /></Field></Row>
      <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <Field key={i} label={`${["🥇", "🥈", "🥉"][i]} podium XP / coins`}><div className="flex gap-1"><Num value={f.podiumXp[i]} onChange={(v) => set("podiumXp", f.podiumXp.map((x, j) => (j === i ? v : x)))} /><Num value={f.podiumCoins[i]} onChange={(v) => set("podiumCoins", f.podiumCoins.map((x, j) => (j === i ? v : x)))} /></div></Field>)}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#730042]" checked={f.optIn} onChange={(e) => set("optIn", e.target.checked)} /> People must join first (opt-in)</label>
      <Button variant="pink" className="w-full" loading={m.isPending} disabled={!f.title.trim() || (f.metric === "count" && !f.events.length)} onClick={submit}>{init ? "Save changes" : "Launch challenge"}</Button>
    </div>
  );
}

export function ChallengesAdmin() {
  const { data, isLoading } = useAdminChallenges(); const fin = useFinaliseChallenge(); const cancel = useCancelChallenge();
  const [form, setForm] = useState(null);
  const col = { live: "#059669", upcoming: "#2563eb", ended: "#6b7280", cancelled: "#dc2626" };
  return (
    <div className="space-y-3">
      <Head icon="⚔️" title="Challenges" onNew={() => setForm({})} label="+ New challenge" />
      {isLoading ? <Skeleton className="h-40" /> : !data.challenges.length ? <Card><Empty icon="🏁" title="No challenges yet" hint="Run a kudos week, a punctuality sprint or a department showdown." /></Card> : data.challenges.map((c) => (
        <Card key={c.id} className="flex flex-wrap items-center gap-3 p-3">
          <span className="text-3xl">{c.icon}</span>
          <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm font-bold">{c.title}<Pill color={col[c.phase]}>{c.phase}</Pill><Pill color="#7c3aed">{c.scope}</Pill></p><p className="text-[11px] text-gray-500">{c.metric === "xp" ? "XP" : c.events.join(", ")} · goal {fmt(c.target)} · {c.phase === "live" ? timeLeft(c.endsAt) : new Date(c.endsAt).toLocaleDateString("en-IN")}{c.participants ? ` · ${c.participants} joined` : ""}</p></div>
          {c.status === "active" && <><Button variant="ghost" className="text-xs" onClick={() => setForm(c)}>Edit</Button><Button variant="outline" className="text-xs" loading={fin.isPending} onClick={Confirm("Finalise now and pay podium prizes?", () => fin.mutate(c.id))}>Finalise</Button><Button variant="danger" className="text-xs" onClick={Confirm("Cancel this challenge?", () => cancel.mutate(c.id))}>Cancel</Button></>}
        </Card>))}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit challenge" : "New challenge"} wide>{form && <ChallengeForm init={form.id ? form : null} onClose={() => setForm(null)} />}</Modal>
    </div>
  );
}

// ───────── Quests ─────────
function QuestForm({ init, onClose }) {
  const create = useCreateQuest(); const update = useUpdateQuest(); const { data: meta } = useGamMeta();
  const [f, setF] = useState(() => init ? { ...init, departments: (init.departments || []).join(", "), startsAt: init.startsAt ? toLocal(init.startsAt) : "", endsAt: init.endsAt ? toLocal(init.endsAt) : "" } : { title: "", desc: "", icon: "🎯", event: "kudos_given", target: 3, period: "weekly", xp: 40, coins: 8, departments: "", startsAt: "", endsAt: "", active: true });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const m = init ? update : create;
  return (
    <div className="space-y-3">
      <Row><Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} /></Field><Field label="Icon"><input className={inputCls} value={f.icon} maxLength={4} onChange={(e) => set("icon", e.target.value)} /></Field></Row>
      <Field label="Description"><input className={inputCls} value={f.desc} onChange={(e) => set("desc", e.target.value)} /></Field>
      <Row><Field label="Activity"><select className={inputCls} value={f.event} onChange={(e) => set("event", e.target.value)}>{meta?.events?.map((e) => <option key={e.key} value={e.key}>{e.icon} {e.label}</option>)}</select></Field><Field label="Times to do it"><Num value={f.target} min={1} onChange={(v) => set("target", v)} /></Field></Row>
      <Row><Field label="Repeats"><select className={inputCls} value={f.period} onChange={(e) => set("period", e.target.value)}><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option><option value="oneoff">One-time</option></select></Field><Field label="Only these departments (optional)"><input className={inputCls} value={f.departments} onChange={(e) => set("departments", e.target.value)} /></Field></Row>
      <Row><Field label="Reward XP"><Num value={f.xp} onChange={(v) => set("xp", v)} /></Field><Field label="Reward coins"><Num value={f.coins} onChange={(v) => set("coins", v)} /></Field></Row>
      <Row><Field label="Available from (optional)"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field><Field label="Until (optional)"><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field></Row>
      <Button variant="pink" className="w-full" loading={m.isPending} disabled={!f.title.trim()} onClick={() => m.mutate({ ...f, ...(init ? { id: init._id } : {}), startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null, endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null, departments: f.departments ? f.departments.split(",").map((d) => d.trim()).filter(Boolean) : [] }, { onSuccess: onClose })}>{init ? "Save quest" : "Create quest"}</Button>
    </div>
  );
}
export function QuestsAdmin() {
  const { data, isLoading } = useAdminQuests(); const del = useDeleteQuest(); const upd = useUpdateQuest();
  const [form, setForm] = useState(null);
  return (
    <div className="space-y-3">
      <Head icon="🗺️" title="Company quests" onNew={() => setForm({})} label="+ New quest" />
      <p className="text-xs text-gray-500">Built-in daily, weekly, monthly and getting-started quests run automatically. Add your own here — they appear for everyone (or chosen departments).</p>
      {isLoading ? <Skeleton className="h-32" /> : !data.quests.length ? <Card><Empty icon="🎯" title="No custom quests" hint="e.g. “Submit your timesheet 4 times this month”." /></Card> : data.quests.map((q) => (
        <Card key={q._id} className={`flex flex-wrap items-center gap-3 p-3 ${q.active ? "" : "opacity-60"}`}><span className="text-2xl">{q.icon}</span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">{q.title} <Pill>{q.period}</Pill></p><p className="text-[11px] text-gray-500">{q.event} × {q.target} · +{q.xp} XP · +{q.coins} 🪙{q.departments?.length ? ` · ${q.departments.join(", ")}` : ""}</p></div>
          <Button variant="ghost" className="text-xs" onClick={() => upd.mutate({ ...q, id: q._id, active: !q.active })}>{q.active ? "Pause" : "Resume"}</Button><Button variant="ghost" className="text-xs" onClick={() => setForm(q)}>Edit</Button><Button variant="danger" className="text-xs" onClick={Confirm("Delete this quest?", () => del.mutate(q._id))}>Delete</Button></Card>))}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? "Edit quest" : "New quest"} wide>{form && <QuestForm init={form._id ? form : null} onClose={() => setForm(null)} />}</Modal>
    </div>
  );
}

// ───────── Seasons ─────────
export function SeasonsAdmin() {
  const { data, isLoading } = useAdminSeasons(); const create = useCreateSeason(); const fin = useFinaliseSeason(); const del = useDeleteSeason();
  const { data: st } = useAdminSettings();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", theme: "🏟️", startsAt: toLocal(), endsAt: toLocal(Date.now() + 30 * 86400000), prizes: [{ xp: 500, coins: 250, label: "Season Champion" }, { xp: 300, coins: 150, label: "Runner-up" }, { xp: 150, coins: 75, label: "Third place" }] });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  return (
    <div className="space-y-3">
      <Head icon="🏟️" title="Seasons & Hall of Fame" onNew={() => setOpen(true)} label="+ New season" />
      <p className="text-xs text-gray-500">A season is a competition window with its own leaderboard. When it ends, prizes are paid and the winners enter the Hall of Fame.{st?.settings?.seasons?.auto !== "none" ? ` Auto-seasons: ${st?.settings?.seasons?.auto}.` : ""}</p>
      {isLoading ? <Skeleton className="h-32" /> : !data.seasons.length ? <Card><Empty icon="🏟️" title="No seasons yet" /></Card> : data.seasons.map((s) => (
        <Card key={s._id} className="p-3"><div className="flex flex-wrap items-center gap-3"><span className="text-3xl">{s.theme}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{s.name} <Pill color={s.status === "finalised" ? "#6b7280" : "#059669"}>{s.status}</Pill></p><p className="text-[11px] text-gray-500">{new Date(s.startsAt).toLocaleDateString("en-IN")} → {new Date(s.endsAt).toLocaleDateString("en-IN")}</p></div>
          {s.status !== "finalised" && <><Button variant="outline" className="text-xs" loading={fin.isPending} onClick={Confirm("End this season now and pay prizes?", () => fin.mutate(s._id))}>End & pay prizes</Button><Button variant="danger" className="text-xs" onClick={Confirm("Delete season?", () => del.mutate(s._id))}>Delete</Button></>}</div>
          {s.winners?.length > 0 && <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">{s.winners.slice(0, 3).map((w) => <Pill key={w.personKey} color="#730042">{["🥇", "🥈", "🥉"][w.rank - 1]} {w.name} · {fmt(w.xp)} XP</Pill>)}</div>}</Card>))}
      <Modal open={open} onClose={() => setOpen(false)} title="New season" wide>
        <div className="space-y-3"><Row><Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Diwali Dash 2026" /></Field><Field label="Icon"><input className={inputCls} value={f.theme} maxLength={4} onChange={(e) => set("theme", e.target.value)} /></Field></Row>
          <Row><Field label="Starts"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field><Field label="Ends"><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field></Row>
          {f.prizes.map((p, i) => <div key={i} className="grid grid-cols-3 gap-2"><Field label={`#${i + 1} label`}><input className={inputCls} value={p.label} onChange={(e) => set("prizes", f.prizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></Field><Field label="XP"><Num value={p.xp} onChange={(v) => set("prizes", f.prizes.map((x, j) => (j === i ? { ...x, xp: v } : x)))} /></Field><Field label="Coins"><Num value={p.coins} onChange={(v) => set("prizes", f.prizes.map((x, j) => (j === i ? { ...x, coins: v } : x)))} /></Field></div>)}
          <Button variant="pink" className="w-full" loading={create.isPending} disabled={!f.name.trim()} onClick={() => create.mutate({ ...f, startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString() }, { onSuccess: () => setOpen(false) })}>Create season</Button></div>
      </Modal>
    </div>
  );
}

// ───────── Quiz questions ─────────
export function QuizAdmin() {
  const { data, isLoading } = useAdminQuiz(); const create = useCreateQuiz(); const del = useDeleteQuiz(); const upd = useUpdateQuiz();
  const [open, setOpen] = useState(false);
  const blank = { question: "", options: ["", "", "", ""], answer: 0, category: "Company", explanation: "" };
  const [f, setF] = useState(blank);
  return (
    <div className="space-y-3">
      <Head icon="🧠" title="Daily quiz — your questions" onNew={() => { setF(blank); setOpen(true); }} label="+ Add question" />
      <p className="text-xs text-gray-500">The built-in bank (security, wellbeing, HR, productivity, general) rotates daily. Your questions are mixed in — great for company values, policies and product knowledge.</p>
      {isLoading ? <Skeleton className="h-32" /> : !data.questions.length ? <Card><Empty icon="❓" title="No custom questions yet" /></Card> : data.questions.map((q) => (
        <Card key={q._id} className={`p-3 ${q.active ? "" : "opacity-60"}`}><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{q.question}</p><p className="mt-0.5 text-[11px] text-gray-500">{q.options.map((o, i) => (i === q.answer ? `✓ ${o}` : o)).join("  ·  ")}</p></div><Button variant="ghost" className="text-xs" onClick={() => upd.mutate({ ...q, id: q._id, active: !q.active })}>{q.active ? "Pause" : "Resume"}</Button><Button variant="danger" className="text-xs" onClick={Confirm("Delete question?", () => del.mutate(q._id))}>Delete</Button></div></Card>))}
      <Modal open={open} onClose={() => setOpen(false)} title="Add quiz question" wide>
        <div className="space-y-3"><Field label="Question"><input className={inputCls} value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} /></Field>
          {f.options.map((o, i) => <div key={i} className="flex items-center gap-2"><input type="radio" name="ans" className="accent-[#730042]" checked={f.answer === i} onChange={() => setF({ ...f, answer: i })} /><input className={inputCls} placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setF({ ...f, options: f.options.map((x, j) => (j === i ? e.target.value : x)) })} /></div>)}
          <p className="text-[11px] text-gray-400">Select the radio button next to the correct option. Empty options are ignored.</p>
          <Row><Field label="Category"><input className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field><Field label="Explanation (shown after answering)"><input className={inputCls} value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} /></Field></Row>
          <Button variant="pink" className="w-full" loading={create.isPending} disabled={!f.question.trim() || f.options.filter((o) => o.trim()).length < 2 || !f.options[f.answer]?.trim()} onClick={() => { const opts = f.options.map((o) => o.trim()); const ans = opts.slice(0, f.answer).filter(Boolean).length; create.mutate({ ...f, options: opts.filter(Boolean), answer: ans }, { onSuccess: () => setOpen(false) }); }}>Add question</Button></div>
      </Modal>
    </div>
  );
}
