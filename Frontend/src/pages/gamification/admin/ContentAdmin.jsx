import { useState } from "react";
import { Card, Button, Modal, Field, inputCls, Pill, Skeleton, Empty, SectionTitle, IconTile, timeLeft, formatDate, fmt } from "../../../components/gamification/ui";
import { IconPicker } from "../../../components/gamification/icons";
import {
  useAdminChallenges, useCreateChallenge, useUpdateChallenge, useFinaliseChallenge, useCancelChallenge,
  useAdminQuests, useCreateQuest, useUpdateQuest, useDeleteQuest,
  useAdminSeasons, useCreateSeason, useFinaliseSeason, useDeleteSeason, useGamMeta, useAdminSettings,
} from "../../../auth/server-state/gamification/gamification.hook";

const toLocal = (d) => { const x = new Date(d || Date.now()); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const Row = ({ children }) => <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
const Num = (p) => <input type="number" className={inputCls} {...p} onChange={(e) => p.onChange(e.target.value === "" ? "" : +e.target.value)} />;
const Head = ({ title, sub, onNew, label = "New" }) => <SectionTitle title={title} sub={sub} right={<Button onClick={onNew}>{label}</Button>} />;
const ask = (msg, fn) => () => window.confirm(msg) && fn();

// ── Challenges ──
function ChallengeForm({ init, onClose }) {
  const create = useCreateChallenge(); const update = useUpdateChallenge(); const { data: meta } = useGamMeta();
  const [f, setF] = useState(() => init ? { ...init, startsAt: toLocal(init.startsAt), endsAt: toLocal(init.endsAt), departments: (init.departments || []).join(", ") } : { title: "", description: "", icon: "trophy", scope: "individual", metric: "count", events: [], target: 10, startsAt: toLocal(), endsAt: toLocal(Date.now() + 7 * 86400000), optIn: false, departments: "", rewardXp: 100, rewardCoins: 20, podiumXp: [100, 50, 25], podiumCoins: [30, 20, 10] });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const m = init ? update : create;
  const toggleEv = (k) => set("events", f.events.includes(k) ? f.events.filter((e) => e !== k) : [...f.events, k]);
  return (
    <div className="space-y-4">
      <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Q4 recognition drive" /></Field>
      <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label="Icon"><IconPicker value={f.icon} onChange={(v) => set("icon", v)} /></Field>
      <Row>
        <Field label="Participants"><select className={inputCls} value={f.scope} onChange={(e) => set("scope", e.target.value)}><option value="individual">Individuals</option><option value="department">Department versus department</option></select></Field>
        <Field label="Measure"><select className={inputCls} value={f.metric} onChange={(e) => set("metric", e.target.value)}><option value="count">Number of times an activity happens</option><option value="xp">XP earned</option></select></Field>
      </Row>
      <Field label={f.metric === "xp" ? "Only count XP from these activities (leave empty for all)" : "Activities to count"}>
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">{meta?.events?.map((e) => <button type="button" key={e.key} onClick={() => toggleEv(e.key)} className={`rounded-md border px-2 py-1 text-[11px] font-medium ${f.events.includes(e.key) ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-[#ede5e0] text-[#7a6a64]"}`}>{e.label}</button>)}</div>
      </Field>
      <Row><Field label="Starts"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field><Field label="Ends"><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field></Row>
      <Row><Field label={`Goal (${f.metric === "xp" ? "XP" : "completions"})`}><Num value={f.target} min={1} onChange={(v) => set("target", v)} /></Field><Field label="Limit to departments (comma-separated, optional)"><input className={inputCls} value={f.departments} onChange={(e) => set("departments", e.target.value)} placeholder="Sales, Support" /></Field></Row>
      <Row><Field label="Reward for reaching the goal: XP"><Num value={f.rewardXp} onChange={(v) => set("rewardXp", v)} /></Field><Field label="Reward: points"><Num value={f.rewardCoins} onChange={(v) => set("rewardCoins", v)} /></Field></Row>
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Field key={i} label={`Podium #${i + 1}: XP / points`}><div className="flex gap-1.5"><Num value={f.podiumXp[i]} onChange={(v) => set("podiumXp", f.podiumXp.map((x, j) => (j === i ? v : x)))} /><Num value={f.podiumCoins[i]} onChange={(v) => set("podiumCoins", f.podiumCoins.map((x, j) => (j === i ? v : x)))} /></div></Field>)}</div>
      <label className="flex items-center gap-2 text-[13px] text-[#2a1a16]"><input type="checkbox" className="accent-[#730042]" checked={f.optIn} onChange={(e) => set("optIn", e.target.checked)} /> Employees must join before they participate</label>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} disabled={!f.title.trim() || (f.metric === "count" && !f.events.length)} onClick={() => m.mutate({ ...f, ...(init ? { id: init.id } : {}), startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString(), departments: f.departments ? f.departments.split(",").map((d) => d.trim()).filter(Boolean) : [] }, { onSuccess: onClose })}>{init ? "Save changes" : "Launch challenge"}</Button></div>
    </div>
  );
}

export function ChallengesAdmin() {
  const { data, isLoading } = useAdminChallenges(); const fin = useFinaliseChallenge(); const cancel = useCancelChallenge();
  const [form, setForm] = useState(null);
  const tone = { live: "success", upcoming: "info", ended: "neutral", cancelled: "danger" };
  return (
    <div className="space-y-3">
      <Head title="Challenges" sub="Time-boxed competitions for individuals or departments." onNew={() => setForm({})} label="New challenge" />
      {isLoading ? <Skeleton className="h-40" /> : !data.challenges.length ? <Card><Empty icon="flag" title="No challenges yet" hint="Run a recognition drive, a punctuality sprint or a department showdown." /></Card> : data.challenges.map((c) => (
        <Card key={c.id} className="flex flex-wrap items-center gap-3 p-3.5">
          <IconTile name={c.icon} size={36} />
          <div className="min-w-0 flex-1"><p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#2a1a16]">{c.title}<Pill tone={tone[c.phase]}>{c.phase}</Pill><Pill tone="violet">{c.scope}</Pill></p><p className="text-[11px] text-[#7a6a64]">{c.metric === "xp" ? "XP earned" : c.events.join(", ")} - goal {fmt(c.target)} - {c.phase === "live" ? timeLeft(c.endsAt) : formatDate(c.endsAt)}{c.participants ? ` - ${c.participants} joined` : ""}</p></div>
          {c.status === "active" && <div className="flex gap-1.5"><Button variant="ghost" size="sm" onClick={() => setForm(c)}>Edit</Button><Button variant="secondary" size="sm" loading={fin.isPending} onClick={ask("Finalise now and pay podium prizes?", () => fin.mutate(c.id))}>Finalise</Button><Button variant="danger" size="sm" onClick={ask("Cancel this challenge?", () => cancel.mutate(c.id))}>Cancel</Button></div>}
        </Card>))}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit challenge" : "New challenge"} wide>{form && <ChallengeForm init={form.id ? form : null} onClose={() => setForm(null)} />}</Modal>
    </div>
  );
}

// ── Goals (custom quests) ──
function GoalForm({ init, onClose }) {
  const create = useCreateQuest(); const update = useUpdateQuest(); const { data: meta } = useGamMeta();
  const [f, setF] = useState(() => init ? { ...init, departments: (init.departments || []).join(", "), startsAt: init.startsAt ? toLocal(init.startsAt) : "", endsAt: init.endsAt ? toLocal(init.endsAt) : "" } : { title: "", desc: "", icon: "target", event: "kudos_given", target: 3, period: "weekly", xp: 40, coins: 8, departments: "", startsAt: "", endsAt: "", active: true });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const m = init ? update : create;
  return (
    <div className="space-y-4">
      <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Submit timesheets on time" /></Field>
      <Field label="Description"><input className={inputCls} value={f.desc} onChange={(e) => set("desc", e.target.value)} /></Field>
      <Field label="Icon"><IconPicker value={f.icon} onChange={(v) => set("icon", v)} /></Field>
      <Row><Field label="Activity"><select className={inputCls} value={f.event} onChange={(e) => set("event", e.target.value)}>{meta?.events?.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}</select></Field><Field label="Times to complete"><Num value={f.target} min={1} onChange={(v) => set("target", v)} /></Field></Row>
      <Row><Field label="Repeats"><select className={inputCls} value={f.period} onChange={(e) => set("period", e.target.value)}><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option><option value="oneoff">One time</option></select></Field><Field label="Limit to departments (optional)"><input className={inputCls} value={f.departments} onChange={(e) => set("departments", e.target.value)} /></Field></Row>
      <Row><Field label="Reward: XP"><Num value={f.xp} onChange={(v) => set("xp", v)} /></Field><Field label="Reward: points"><Num value={f.coins} onChange={(v) => set("coins", v)} /></Field></Row>
      <Row><Field label="Available from (optional)"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field><Field label="Available until (optional)"><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field></Row>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} disabled={!f.title.trim()} onClick={() => m.mutate({ ...f, ...(init ? { id: init._id } : {}), startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null, endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null, departments: f.departments ? f.departments.split(",").map((d) => d.trim()).filter(Boolean) : [] }, { onSuccess: onClose })}>{init ? "Save goal" : "Create goal"}</Button></div>
    </div>
  );
}

export function GoalsAdmin() {
  const { data, isLoading } = useAdminQuests(); const del = useDeleteQuest(); const upd = useUpdateQuest();
  const [form, setForm] = useState(null);
  return (
    <div className="space-y-3">
      <Head title="Company goals" sub="Built-in weekly, monthly and getting-started goals run automatically. Add your own here." onNew={() => setForm({})} label="New goal" />
      {isLoading ? <Skeleton className="h-32" /> : !data.quests.length ? <Card><Empty icon="target" title="No company goals yet" hint='Example: "Submit your timesheet 4 times this month".' /></Card> : data.quests.map((q) => (
        <Card key={q._id} className={`flex flex-wrap items-center gap-3 p-3.5 ${q.active ? "" : "opacity-60"}`}><IconTile name={q.icon} size={36} />
          <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#2a1a16]">{q.title} <Pill>{q.period}</Pill></p><p className="text-[11px] text-[#7a6a64]">{q.event} x {q.target} - +{q.xp} XP - +{q.coins} points{q.departments?.length ? ` - ${q.departments.join(", ")}` : ""}</p></div>
          <div className="flex gap-1.5"><Button variant="ghost" size="sm" onClick={() => upd.mutate({ ...q, id: q._id, active: !q.active })}>{q.active ? "Pause" : "Resume"}</Button><Button variant="ghost" size="sm" onClick={() => setForm(q)}>Edit</Button><Button variant="danger" size="sm" onClick={ask("Delete this goal?", () => del.mutate(q._id))}>Delete</Button></div></Card>))}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? "Edit goal" : "New goal"} wide>{form && <GoalForm init={form._id ? form : null} onClose={() => setForm(null)} />}</Modal>
    </div>
  );
}

// ── Seasons ──
export function SeasonsAdmin() {
  const { data, isLoading } = useAdminSeasons(); const create = useCreateSeason(); const fin = useFinaliseSeason(); const del = useDeleteSeason();
  const { data: st } = useAdminSettings();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", theme: "trophy", startsAt: toLocal(), endsAt: toLocal(Date.now() + 30 * 86400000), prizes: [{ xp: 500, coins: 250, label: "Season champion" }, { xp: 300, coins: 150, label: "Runner-up" }, { xp: 150, coins: 75, label: "Third place" }] });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const auto = st?.settings?.seasons?.auto;
  return (
    <div className="space-y-3">
      <Head title="Seasons" sub={`A season is a competition window with its own leaderboard. When it ends, prizes are paid and winners are recorded.${auto && auto !== "none" ? ` Automatic seasons: ${auto}.` : ""}`} onNew={() => setOpen(true)} label="New season" />
      {isLoading ? <Skeleton className="h-32" /> : !data.seasons.length ? <Card><Empty icon="trophy" title="No seasons yet" /></Card> : data.seasons.map((s) => (
        <Card key={s._id} className="p-3.5"><div className="flex flex-wrap items-center gap-3"><IconTile name="trophy" size={36} /><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#2a1a16]">{s.name} <Pill tone={s.status === "finalised" ? "neutral" : "success"}>{s.status}</Pill></p><p className="text-[11px] text-[#7a6a64]">{formatDate(s.startsAt)} to {formatDate(s.endsAt)}</p></div>
          {s.status !== "finalised" && <div className="flex gap-1.5"><Button variant="secondary" size="sm" loading={fin.isPending} onClick={ask("End this season now and pay prizes?", () => fin.mutate(s._id))}>End and pay prizes</Button><Button variant="danger" size="sm" onClick={ask("Delete this season?", () => del.mutate(s._id))}>Delete</Button></div>}</div>
          {s.winners?.length > 0 && <div className="mt-3 flex flex-wrap gap-2 border-t border-[#f3efec] pt-3">{s.winners.slice(0, 3).map((w) => <Pill key={w.personKey} tone="brand">#{w.rank} {w.name} - {fmt(w.xp)} XP</Pill>)}</div>}</Card>))}
      <Modal open={open} onClose={() => setOpen(false)} title="New season" wide>
        <div className="space-y-4"><Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Q4 2026 season" /></Field>
          <Row><Field label="Starts"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field><Field label="Ends"><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field></Row>
          {f.prizes.map((p, i) => <div key={i} className="grid gap-3 sm:grid-cols-3"><Field label={`Position ${i + 1} label`}><input className={inputCls} value={p.label} onChange={(e) => set("prizes", f.prizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></Field><Field label="XP"><Num value={p.xp} onChange={(v) => set("prizes", f.prizes.map((x, j) => (j === i ? { ...x, xp: v } : x)))} /></Field><Field label="Points"><Num value={p.coins} onChange={(v) => set("prizes", f.prizes.map((x, j) => (j === i ? { ...x, coins: v } : x)))} /></Field></div>)}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={create.isPending} disabled={!f.name.trim()} onClick={() => create.mutate({ ...f, startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString() }, { onSuccess: () => setOpen(false) })}>Create season</Button></div></div>
      </Modal>
    </div>
  );
}
