import { useState } from "react";
import { Card, Button, Modal, Field, inputCls, Pill, Skeleton, Empty, SectionTitle, Avatar, timeAgo, fmt } from "../../../components/gamification/ui";
import {
  useAdminRewards, useCreateReward, useUpdateReward, useDeleteReward, useSeedRewards, useAdminRedemptions, useDecideRedemption,
  useAdminBadges, useCreateBadge, useUpdateBadge, useDeleteBadge, useGrantBadge, useAdminParticipants, useUpdateParticipant, useAdjust,
} from "../../../auth/server-state/gamification/gamification.hook";
import { searchPeople } from "../../../auth/api/gamification/gamification.api";

const Row = ({ children }) => <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
const Num = (p) => <input type="number" className={inputCls} {...p} onChange={(e) => p.onChange(e.target.value === "" ? "" : +e.target.value)} />;
const Confirm = (msg, fn) => () => window.confirm(msg) && fn();
const STATUS = { pending: "#d97706", approved: "#2563eb", fulfilled: "#059669", rejected: "#dc2626", cancelled: "#6b7280" };

// Person picker (searches colleagues; re-uses the kudos people search)
function PersonPicker({ value, onChange }) {
  const [q, setQ] = useState(""); const [res, setRes] = useState([]);
  const run = async (t) => { setQ(t); if (t.trim().length < 2) return setRes([]); try { setRes((await searchPeople(t)).people || []); } catch { setRes([]); } };
  if (value) return <div className="flex items-center gap-2 rounded-xl bg-pink-50 p-2"><Avatar name={value.name} photo={value.photo} size={28} ring={false} /><span className="flex-1 text-sm font-semibold">{value.name}</span><button className="text-xs font-semibold text-[#730042]" onClick={() => onChange(null)}>change</button></div>;
  return <div><input className={inputCls} placeholder="Search by name…" value={q} onChange={(e) => run(e.target.value)} />{res.length > 0 && <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border bg-white shadow">{res.map((p) => <button key={p.key} onClick={() => onChange(p)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-pink-50"><Avatar name={p.name} photo={p.photo} size={24} ring={false} /><span className="text-sm">{p.name}</span><span className="text-xs text-gray-400">{p.department}</span></button>)}</div>}</div>;
}

// ───────── Rewards store ─────────
function RewardForm({ init, cosmetics, onClose }) {
  const create = useCreateReward(); const update = useUpdateReward();
  const [f, setF] = useState(() => init || { name: "", description: "", icon: "🎁", category: "perk", cost: 500, stock: -1, perUserLimit: 0, minLevel: 1, requiresApproval: true, effect: { type: "none" } });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v })); const eff = (k, v) => setF((o) => ({ ...o, effect: { ...o.effect, [k]: v } }));
  const m = init ? update : create;
  const cos = cosmetics?.[f.effect?.cosmeticType] || [];
  return (
    <div className="space-y-3">
      <Row><Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field><Field label="Icon"><input className={inputCls} value={f.icon} maxLength={4} onChange={(e) => set("icon", e.target.value)} /></Field></Row>
      <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <Row><Field label="Category"><select className={inputCls} value={f.category} onChange={(e) => set("category", e.target.value)}>{["perk", "time", "voucher", "swag", "charity", "cosmetic", "boost", "other"].map((c) => <option key={c}>{c}</option>)}</select></Field><Field label="Cost (coins)"><Num value={f.cost} min={1} onChange={(v) => set("cost", v)} /></Field></Row>
      <div className="grid grid-cols-3 gap-3"><Field label="Stock (-1 = ∞)"><Num value={f.stock} min={-1} onChange={(v) => set("stock", v)} /></Field><Field label="Per-person limit (0 = ∞)"><Num value={f.perUserLimit} min={0} onChange={(v) => set("perUserLimit", v)} /></Field><Field label="Min level"><Num value={f.minLevel} min={1} onChange={(v) => set("minLevel", v)} /></Field></div>
      <Field label="Instant effect"><select className={inputCls} value={f.effect?.type || "none"} onChange={(e) => eff("type", e.target.value)}><option value="none">None — fulfilled manually</option><option value="cosmetic">Unlock a cosmetic</option><option value="freeze">Grant streak freeze(s)</option><option value="mystery">Mystery box (random coins)</option></select></Field>
      {f.effect?.type === "cosmetic" && <Row><Field label="Type"><select className={inputCls} value={f.effect.cosmeticType || ""} onChange={(e) => { eff("cosmeticType", e.target.value); eff("cosmeticId", ""); }}><option value="">Choose…</option><option value="frame">Avatar frame</option><option value="title">Title</option><option value="theme">Profile theme</option></select></Field><Field label="Item"><select className={inputCls} value={f.effect.cosmeticId || ""} onChange={(e) => eff("cosmeticId", e.target.value)}><option value="">Choose…</option>{cos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></Row>}
      {f.effect?.type === "freeze" && <Field label="Freezes granted"><Num value={f.effect.freezes || 1} min={1} onChange={(v) => eff("freezes", v)} /></Field>}
      {f.effect?.type === "mystery" && <Row><Field label="Min coins"><Num value={f.effect.mysteryMin || 0} onChange={(v) => eff("mysteryMin", v)} /></Field><Field label="Max coins"><Num value={f.effect.mysteryMax || 0} onChange={(v) => eff("mysteryMax", v)} /></Field></Row>}
      {(!f.effect || f.effect.type === "none") && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#730042]" checked={f.requiresApproval} onChange={(e) => set("requiresApproval", e.target.checked)} /> Needs admin approval before it's fulfilled</label>}
      <Button variant="pink" className="w-full" loading={m.isPending} disabled={!f.name.trim() || !f.cost} onClick={() => m.mutate({ ...f, ...(init ? { id: init._id } : {}) }, { onSuccess: onClose })}>{init ? "Save reward" : "Add reward"}</Button>
    </div>
  );
}

export function RewardsAdmin() {
  const { data, isLoading } = useAdminRewards(); const seed = useSeedRewards(); const del = useDeleteReward(); const upd = useUpdateReward();
  const [status, setStatus] = useState("pending"); const { data: reds } = useAdminRedemptions(status); const decide = useDecideRedemption();
  const [form, setForm] = useState(null);
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <SectionTitle icon="🧾" title="Redemption requests" right={<div className="flex gap-1">{["pending", "approved", "fulfilled", "rejected", "all"].map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${status === s ? "bg-[#730042] text-white" : "bg-gray-100 text-gray-600"}`}>{s}</button>)}</div>} />
        {!reds ? <Skeleton className="h-24" /> : !reds.items.length ? <Card><Empty icon="✅" title={`No ${status === "all" ? "" : status} requests`} /></Card> : <Card className="divide-y">{reds.items.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-3"><span className="text-2xl">{r.icon}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{r.name} <Pill color={STATUS[r.status]}>{r.status}</Pill></p><p className="text-[11px] text-gray-500">{r.personName}{r.department ? ` · ${r.department}` : ""} · 🪙 {fmt(r.cost)} · {timeAgo(r.at)}{r.note ? ` · “${r.note}”` : ""}</p></div>
            {r.status === "pending" && <Button variant="outline" className="text-xs" onClick={() => decide.mutate({ id: r.id, action: "approve" })}>Approve</Button>}
            {["pending", "approved"].includes(r.status) && <><Button variant="pink" className="text-xs" onClick={() => decide.mutate({ id: r.id, action: "fulfil" })}>Mark fulfilled</Button><Button variant="danger" className="text-xs" onClick={() => { const n = window.prompt("Reason (optional) — coins will be refunded:"); if (n !== null) decide.mutate({ id: r.id, action: "reject", adminNote: n }); }}>Reject</Button></>}</div>))}</Card>}
      </section>
      <section className="space-y-3">
        <SectionTitle icon="🛍️" title="Store catalogue" right={<div className="flex gap-2">{data && !data.rewards.length && <Button variant="outline" loading={seed.isPending} onClick={() => seed.mutate()}>✨ Add starter rewards</Button>}<Button variant="pink" onClick={() => setForm({})}>+ New reward</Button></div>} />
        {isLoading ? <Skeleton className="h-32" /> : !data.rewards.length ? <Card><Empty icon="🛍️" title="No rewards yet" hint="Add a starter pack (coffee, half-day off, vouchers, cosmetics…) with one click." /></Card> : <div className="grid gap-2 lg:grid-cols-2">{data.rewards.map((r) => (
          <Card key={r._id} className={`flex items-center gap-3 p-3 ${r.active ? "" : "opacity-50"}`}><span className="text-3xl">{r.icon}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{r.name}</p><p className="text-[11px] text-gray-500">🪙 {fmt(r.cost)} · {r.stock < 0 ? "∞ stock" : `${r.stock} left`} · {fmt(r.redeemedCount)} redeemed{r.minLevel > 1 ? ` · Lv ${r.minLevel}+` : ""}{r.effect?.type !== "none" ? ` · ${r.effect.type}` : ""}</p></div>
            <Button variant="ghost" className="text-xs" onClick={() => upd.mutate({ ...r, id: r._id, active: !r.active })}>{r.active ? "Hide" : "Show"}</Button><Button variant="ghost" className="text-xs" onClick={() => setForm(r)}>Edit</Button><Button variant="danger" className="text-xs" onClick={Confirm("Remove this reward from the store?", () => del.mutate(r._id))}>✕</Button></Card>))}</div>}
      </section>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? "Edit reward" : "New reward"} wide>{form && <RewardForm init={form._id ? form : null} cosmetics={data?.cosmetics} onClose={() => setForm(null)} />}</Modal>
    </div>
  );
}

// ───────── Badges & manual awards ─────────
export function BadgesAdmin() {
  const { data, isLoading } = useAdminBadges(); const create = useCreateBadge(); const del = useDeleteBadge(); const grant = useGrantBadge(); const adjust = useAdjust();
  const [nb, setNb] = useState({ name: "", description: "", icon: "🏅", color: "#c026d3", xp: 50, coins: 10 }); const [showNb, setShowNb] = useState(false);
  const [person, setPerson] = useState(null); const [badgeKey, setBadgeKey] = useState(""); const [note, setNote] = useState("");
  const [aw, setAw] = useState({ xp: 50, coins: 10, reason: "", mode: "add" });
  const all = [...(data?.custom || []).filter((c) => c.active).map((c) => ({ key: c.key, label: `${c.icon} ${c.name} (company)` })), ...(data?.manual || []).map((m) => ({ key: m.key, label: `${m.icon} ${m.name}` }))];
  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-4">
        <SectionTitle icon="🎖️" title="Grant a badge" sub="Recognise something special — the person gets a celebration + the badge's XP and coins." />
        <Row><Field label="Person"><PersonPicker value={person} onChange={setPerson} /></Field><Field label="Badge"><select className={inputCls} value={badgeKey} onChange={(e) => setBadgeKey(e.target.value)}><option value="">Choose…</option>{all.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select></Field></Row>
        <Field label="Note (shown on the badge)"><input className={inputCls} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Won the Q3 hackathon" /></Field>
        <Button variant="pink" disabled={!person || !badgeKey} loading={grant.isPending} onClick={() => grant.mutate({ targetKey: person.key, badgeKey, note }, { onSuccess: () => { setNote(""); } })}>Grant badge</Button>
      </Card>
      <Card className="space-y-3 p-4">
        <SectionTitle icon="⚖️" title="Manual XP / coin adjustment" sub="Add a bonus or correct a mistake. Every change is logged with your name and reason." />
        <Row><Field label="Person"><PersonPicker value={person} onChange={setPerson} /></Field><Field label="Action"><select className={inputCls} value={aw.mode} onChange={(e) => setAw({ ...aw, mode: e.target.value })}><option value="add">Add bonus</option><option value="deduct">Deduct (correction)</option></select></Field></Row>
        <Row><Field label="XP"><Num value={aw.xp} min={0} onChange={(v) => setAw({ ...aw, xp: v })} /></Field><Field label="Coins"><Num value={aw.coins} min={0} onChange={(v) => setAw({ ...aw, coins: v })} /></Field></Row>
        <Field label="Reason (required)"><input className={inputCls} value={aw.reason} maxLength={200} onChange={(e) => setAw({ ...aw, reason: e.target.value })} /></Field>
        <Button variant={aw.mode === "deduct" ? "danger" : "pink"} disabled={!person || aw.reason.trim().length < 5 || (!aw.xp && !aw.coins)} loading={adjust.isPending} onClick={() => adjust.mutate({ targetKey: person.key, ...aw }, { onSuccess: () => setAw({ ...aw, reason: "" }) })}>{aw.mode === "deduct" ? "Deduct" : "Award"}</Button>
      </Card>
      <section className="space-y-3">
        <SectionTitle icon="🏅" title="Company badges" sub={`${data?.total || 154} built-in badges are earned automatically. Create your own for company moments.`} right={<Button variant="pink" onClick={() => setShowNb(true)}>+ New badge</Button>} />
        {isLoading ? <Skeleton className="h-24" /> : !data.custom.length ? <Card><Empty icon="🏅" title="No company badges yet" hint="e.g. Hackathon Winner, Client Hero, Safety Champion." /></Card> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.custom.map((b) => <Card key={b._id} className="flex items-center gap-3 p-3"><span className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ background: `${b.color}22` }}>{b.icon}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{b.name}</p><p className="text-[11px] text-gray-500">+{b.xp} XP · +{b.coins} 🪙</p></div><Button variant="danger" className="text-xs" onClick={Confirm("Delete this badge definition?", () => del.mutate(b._id))}>✕</Button></Card>)}</div>}
      </section>
      <Modal open={showNb} onClose={() => setShowNb(false)} title="New company badge">
        <div className="space-y-3"><Row><Field label="Name"><input className={inputCls} value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} /></Field><Field label="Icon"><input className={inputCls} value={nb.icon} maxLength={4} onChange={(e) => setNb({ ...nb, icon: e.target.value })} /></Field></Row>
          <Field label="Description"><input className={inputCls} value={nb.description} onChange={(e) => setNb({ ...nb, description: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3"><Field label="Colour"><input type="color" className="h-10 w-full rounded-xl" value={nb.color} onChange={(e) => setNb({ ...nb, color: e.target.value })} /></Field><Field label="XP"><Num value={nb.xp} onChange={(v) => setNb({ ...nb, xp: v })} /></Field><Field label="Coins"><Num value={nb.coins} onChange={(v) => setNb({ ...nb, coins: v })} /></Field></div>
          <Button variant="pink" className="w-full" loading={create.isPending} disabled={!nb.name.trim()} onClick={() => create.mutate(nb, { onSuccess: () => setShowNb(false) })}>Create badge</Button></div>
      </Modal>
    </div>
  );
}

// ───────── People ─────────
export function PeopleAdmin() {
  const [q, setQ] = useState(""); const [dept, setDept] = useState(""); const [sort, setSort] = useState("xp"); const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminParticipants({ q: q || undefined, department: dept || undefined, sort, page }); const upd = useUpdateParticipant();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><input className={`${inputCls} max-w-xs`} placeholder="Search people…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /><select className={`${inputCls} max-w-[200px]`} value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }}><option value="">All departments</option>{data?.departments?.map((d) => <option key={d}>{d}</option>)}</select><select className={`${inputCls} max-w-[160px]`} value={sort} onChange={(e) => setSort(e.target.value)}><option value="xp">Most XP</option><option value="coins">Most coins</option><option value="recent">Recently active</option></select></div>
      {isLoading ? <Skeleton className="h-48" /> : !data.items.length ? <Card><Empty title="No participants yet" hint="Profiles are created the first time someone earns points." /></Card> : <Card className="divide-y">{data.items.map((p) => (
        <div key={p.personKey} className="flex flex-wrap items-center gap-3 p-3"><Avatar name={p.name} photo={p.photo} size={36} ring={false} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{p.name} <Pill>Lv {p.level}</Pill>{p.frozenAccount && <Pill color="#dc2626" className="ml-1">frozen</Pill>}{p.optedOut && <Pill color="#6b7280" className="ml-1">opted out</Pill>}</p><p className="text-[11px] text-gray-500">{p.department || "—"} · {fmt(p.xp)} XP · 🪙 {fmt(p.coins)} · 🏅 {p.badges} · {p.lastActiveAt ? `active ${timeAgo(p.lastActiveAt)}` : "never active"}</p></div>
          <Button variant={p.frozenAccount ? "outline" : "danger"} className="text-xs" onClick={Confirm(p.frozenAccount ? "Allow this person to earn points again?" : "Freeze this account? They stop earning points (use for suspected abuse).", () => upd.mutate({ key: p.personKey, frozenAccount: !p.frozenAccount }))}>{p.frozenAccount ? "Unfreeze" : "Freeze"}</Button></div>))}</Card>}
      {data?.pages > 1 && <div className="flex justify-center gap-2"><Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</Button><span className="self-center text-xs">{page}/{data.pages}</span><Button variant="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>→</Button></div>}
    </div>
  );
}
