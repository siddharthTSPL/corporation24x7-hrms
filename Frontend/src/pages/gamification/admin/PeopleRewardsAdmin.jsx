import { useState } from "react";
import { Card, Button, Modal, Field, inputCls, Pill, Skeleton, Empty, SectionTitle, Avatar, IconTile, timeAgo, fmt } from "../../../components/gamification/ui";
import { IconPicker } from "../../../components/gamification/icons";
import {
  useAdminRewards, useCreateReward, useUpdateReward, useDeleteReward, useSeedRewards, useAdminRedemptions, useDecideRedemption,
  useAdminBadges, useCreateBadge, useDeleteBadge, useGrantBadge, useAdminParticipants, useUpdateParticipant, useAdjust,
} from "../../../auth/server-state/gamification/gamification.hook";
import { searchPeople } from "../../../auth/api/gamification/gamification.api";

const Row = ({ children }) => <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
const Num = (p) => <input type="number" className={inputCls} {...p} onChange={(e) => p.onChange(e.target.value === "" ? "" : +e.target.value)} />;
const ask = (msg, fn) => () => window.confirm(msg) && fn();
const STATUS_TONE = { pending: "warning", approved: "info", fulfilled: "success", rejected: "danger", cancelled: "neutral" };
const th = "px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-[#9c8880]";

function PersonPicker({ value, onChange }) {
  const [q, setQ] = useState(""); const [res, setRes] = useState([]);
  const run = async (t) => { setQ(t); if (t.trim().length < 2) return setRes([]); try { setRes((await searchPeople(t)).people || []); } catch { setRes([]); } };
  if (value) return <div className="flex items-center gap-2.5 rounded-lg border border-[#ede5e0] p-2"><Avatar name={value.name} photo={value.photo} size={28} /><span className="flex-1 text-[13px] font-medium text-[#2a1a16]">{value.name}</span><Button variant="ghost" size="sm" onClick={() => onChange(null)}>Change</Button></div>;
  return <div><input className={inputCls} placeholder="Search by name" value={q} onChange={(e) => run(e.target.value)} />{res.length > 0 && <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[#ede5e0] bg-white shadow-sm">{res.map((p) => <button key={p.key} onClick={() => onChange(p)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[#faf7f5]"><Avatar name={p.name} photo={p.photo} size={24} /><span className="text-[13px] text-[#2a1a16]">{p.name}</span><span className="text-xs text-[#9c8880]">{p.department}</span></button>)}</div>}</div>;
}

// ── Rewards store ──
function RewardForm({ init, onClose }) {
  const create = useCreateReward(); const update = useUpdateReward();
  const [f, setF] = useState(() => init || { name: "", description: "", icon: "gift", category: "perk", cost: 500, stock: -1, perUserLimit: 0, minLevel: 1, requiresApproval: true });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const m = init ? update : create;
  return (
    <div className="space-y-4">
      <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label="Icon"><IconPicker value={f.icon} onChange={(v) => set("icon", v)} /></Field>
      <Row><Field label="Category"><select className={inputCls} value={f.category} onChange={(e) => set("category", e.target.value)}>{[["perk", "Perks"], ["time", "Time off"], ["voucher", "Vouchers"], ["swag", "Merchandise"], ["charity", "Charity"], ["other", "Other"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field><Field label="Cost (points)"><Num value={f.cost} min={1} onChange={(v) => set("cost", v)} /></Field></Row>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Stock (-1 = unlimited)"><Num value={f.stock} min={-1} onChange={(v) => set("stock", v)} /></Field><Field label="Per-person limit (0 = none)"><Num value={f.perUserLimit} min={0} onChange={(v) => set("perUserLimit", v)} /></Field><Field label="Minimum level"><Num value={f.minLevel} min={1} onChange={(v) => set("minLevel", v)} /></Field></div>
      <label className="flex items-center gap-2 text-[13px] text-[#2a1a16]"><input type="checkbox" className="accent-[#730042]" checked={f.requiresApproval} onChange={(e) => set("requiresApproval", e.target.checked)} /> Requires administrator approval before it is fulfilled</label>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} disabled={!f.name.trim() || !f.cost} onClick={() => m.mutate({ ...f, ...(init ? { id: init._id } : {}) }, { onSuccess: onClose })}>{init ? "Save reward" : "Add reward"}</Button></div>
    </div>
  );
}

export function RewardsAdmin() {
  const { data, isLoading } = useAdminRewards(); const seed = useSeedRewards(); const del = useDeleteReward(); const upd = useUpdateReward();
  const [status, setStatus] = useState("pending"); const { data: reds } = useAdminRedemptions(status); const decide = useDecideRedemption();
  const [form, setForm] = useState(null);
  return (
    <div className="space-y-6">
      <section>
        <SectionTitle title="Redemption requests" right={<div className="flex gap-1">{["pending", "approved", "fulfilled", "rejected", "all"].map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${status === s ? "bg-[#730042] text-white" : "text-[#5b4b45] hover:bg-[#f3efec]"}`}>{s}</button>)}</div>} />
        {!reds ? <Skeleton className="h-24" /> : !reds.items.length ? <Card><Empty icon="check" title={`No ${status === "all" ? "" : status + " "}requests`} /></Card> : (
          <Card className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-[13px]"><thead><tr className="border-b border-[#ede5e0]"><th className={th}>Reward</th><th className={th}>Employee</th><th className={`${th} text-right`}>Points</th><th className={th}>Requested</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody>{reds.items.map((r) => (
              <tr key={r.id} className="border-b border-[#f3efec] last:border-0"><td className="px-3 py-2.5"><div className="flex items-center gap-2.5"><IconTile name={r.icon} size={28} /><div><p className="font-medium text-[#2a1a16]">{r.name}</p>{r.note && <p className="text-[11px] text-[#9c8880]">Note: {r.note}</p>}</div></div></td><td className="px-3 py-2.5"><p className="text-[#2a1a16]">{r.personName}</p><p className="text-[11px] text-[#9c8880]">{r.department}</p></td><td className="px-3 py-2.5 text-right text-[#5b4b45]">{fmt(r.cost)}</td><td className="px-3 py-2.5 text-[#7a6a64]">{timeAgo(r.at)}</td><td className="px-3 py-2.5"><Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill></td>
                <td className="px-3 py-2.5"><div className="flex justify-end gap-1.5">{r.status === "pending" && <Button variant="secondary" size="sm" onClick={() => decide.mutate({ id: r.id, action: "approve" })}>Approve</Button>}{["pending", "approved"].includes(r.status) && <><Button size="sm" onClick={() => decide.mutate({ id: r.id, action: "fulfil" })}>Mark fulfilled</Button><Button variant="danger" size="sm" onClick={() => { const n = window.prompt("Reason (optional). The employee's points will be refunded:"); if (n !== null) decide.mutate({ id: r.id, action: "reject", adminNote: n }); }}>Reject</Button></>}</div></td></tr>))}</tbody></table></Card>)}
      </section>
      <section className="space-y-3">
        <SectionTitle title="Rewards catalogue" right={<div className="flex gap-2">{data && !data.rewards.length && <Button variant="secondary" loading={seed.isPending} onClick={() => seed.mutate()}>Add starter rewards</Button>}<Button onClick={() => setForm({})}>New reward</Button></div>} />
        {isLoading ? <Skeleton className="h-32" /> : !data.rewards.length ? <Card><Empty icon="gift" title="No rewards yet" hint="Add a starter set (beverage voucher, half-day off, gift voucher and more) in one click, then edit as needed." /></Card> : <div className="grid gap-3 lg:grid-cols-2">{data.rewards.map((r) => (
          <Card key={r._id} className={`flex items-center gap-3 p-3.5 ${r.active ? "" : "opacity-55"}`}><IconTile name={r.icon} size={38} /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-[#2a1a16]">{r.name}</p><p className="text-[11px] text-[#7a6a64]">{fmt(r.cost)} pts - {r.stock < 0 ? "Unlimited stock" : `${r.stock} in stock`} - {fmt(r.redeemedCount)} redeemed{r.minLevel > 1 ? ` - Level ${r.minLevel}+` : ""}</p></div>
            <div className="flex gap-1.5"><Button variant="ghost" size="sm" onClick={() => upd.mutate({ ...r, id: r._id, active: !r.active })}>{r.active ? "Hide" : "Show"}</Button><Button variant="ghost" size="sm" onClick={() => setForm(r)}>Edit</Button><Button variant="danger" size="sm" onClick={ask("Remove this reward from the store?", () => del.mutate(r._id))}>Remove</Button></div></Card>))}</div>}
      </section>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? "Edit reward" : "New reward"} wide>{form && <RewardForm init={form._id ? form : null} onClose={() => setForm(null)} />}</Modal>
    </div>
  );
}

// ── Achievements & manual awards ──
export function AchievementsAdmin() {
  const { data, isLoading } = useAdminBadges(); const create = useCreateBadge(); const del = useDeleteBadge(); const grant = useGrantBadge(); const adjust = useAdjust();
  const [nb, setNb] = useState({ name: "", description: "", icon: "award", color: "#7c3aed", xp: 50, coins: 10 }); const [showNb, setShowNb] = useState(false);
  const [person, setPerson] = useState(null); const [badgeKey, setBadgeKey] = useState(""); const [note, setNote] = useState("");
  const [aw, setAw] = useState({ xp: 50, coins: 10, reason: "", mode: "add" });
  const all = [...(data?.custom || []).filter((c) => c.active).map((c) => ({ key: c.key, label: `${c.name} (company)` })), ...(data?.manual || []).map((m) => ({ key: m.key, label: m.name }))];
  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <SectionTitle title="Grant an achievement" sub="Recognise something special. The employee is notified and receives the achievement's XP and points." />
        <Row><Field label="Employee"><PersonPicker value={person} onChange={setPerson} /></Field><Field label="Achievement"><select className={inputCls} value={badgeKey} onChange={(e) => setBadgeKey(e.target.value)}><option value="">Select an achievement</option>{all.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select></Field></Row>
        <Field label="Note (shown on the achievement)"><input className={inputCls} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Won the Q3 hackathon" /></Field>
        <div><Button disabled={!person || !badgeKey} loading={grant.isPending} onClick={() => grant.mutate({ targetKey: person.key, badgeKey, note }, { onSuccess: () => setNote("") })}>Grant achievement</Button></div>
      </Card>
      <Card className="space-y-4 p-4">
        <SectionTitle title="Manual XP and points adjustment" sub="Add a bonus or correct a mistake. Every change is logged with your name and a reason." />
        <Row><Field label="Employee"><PersonPicker value={person} onChange={setPerson} /></Field><Field label="Action"><select className={inputCls} value={aw.mode} onChange={(e) => setAw({ ...aw, mode: e.target.value })}><option value="add">Add bonus</option><option value="deduct">Deduct (correction)</option></select></Field></Row>
        <Row><Field label="XP"><Num value={aw.xp} min={0} onChange={(v) => setAw({ ...aw, xp: v })} /></Field><Field label="Reward points"><Num value={aw.coins} min={0} onChange={(v) => setAw({ ...aw, coins: v })} /></Field></Row>
        <Field label="Reason (required)"><input className={inputCls} value={aw.reason} maxLength={200} onChange={(e) => setAw({ ...aw, reason: e.target.value })} /></Field>
        <div><Button variant={aw.mode === "deduct" ? "danger" : "primary"} disabled={!person || aw.reason.trim().length < 5 || (!aw.xp && !aw.coins)} loading={adjust.isPending} onClick={() => adjust.mutate({ targetKey: person.key, ...aw }, { onSuccess: () => setAw({ ...aw, reason: "" }) })}>{aw.mode === "deduct" ? "Deduct" : "Apply bonus"}</Button></div>
      </Card>
      <section className="space-y-3">
        <SectionTitle title="Company achievements" sub={`${data?.total || 132} built-in achievements are earned automatically. Create your own for company moments.`} right={<Button onClick={() => setShowNb(true)}>New achievement</Button>} />
        {isLoading ? <Skeleton className="h-24" /> : !data.custom.length ? <Card><Empty icon="award" title="No company achievements yet" hint="For example: Hackathon Winner, Client Hero, Safety Champion." /></Card> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.custom.map((b) => <Card key={b._id} className="flex items-center gap-3 p-3.5"><IconTile name={b.icon} color={b.color} size={38} round /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-[#2a1a16]">{b.name}</p><p className="text-[11px] text-[#7a6a64]">+{b.xp} XP - +{b.coins} points</p></div><Button variant="danger" size="sm" onClick={ask("Delete this achievement definition?", () => del.mutate(b._id))}>Delete</Button></Card>)}</div>}
      </section>
      <Modal open={showNb} onClose={() => setShowNb(false)} title="New company achievement">
        <div className="space-y-4"><Field label="Name"><input className={inputCls} value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} /></Field>
          <Field label="Description"><input className={inputCls} value={nb.description} onChange={(e) => setNb({ ...nb, description: e.target.value })} /></Field>
          <Field label="Icon"><IconPicker value={nb.icon} onChange={(v) => setNb({ ...nb, icon: v })} /></Field>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Colour"><input type="color" className="h-9 w-full rounded-lg border border-[#ddd2cc]" value={nb.color} onChange={(e) => setNb({ ...nb, color: e.target.value })} /></Field><Field label="XP"><Num value={nb.xp} onChange={(v) => setNb({ ...nb, xp: v })} /></Field><Field label="Points"><Num value={nb.coins} onChange={(v) => setNb({ ...nb, coins: v })} /></Field></div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowNb(false)}>Cancel</Button><Button loading={create.isPending} disabled={!nb.name.trim()} onClick={() => create.mutate(nb, { onSuccess: () => setShowNb(false) })}>Create achievement</Button></div></div>
      </Modal>
    </div>
  );
}

// ── People ──
export function PeopleAdmin() {
  const [q, setQ] = useState(""); const [dept, setDept] = useState(""); const [sort, setSort] = useState("xp"); const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminParticipants({ q: q || undefined, department: dept || undefined, sort, page }); const upd = useUpdateParticipant();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><input className={`${inputCls} max-w-xs`} placeholder="Search people" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /><select className={`${inputCls} max-w-[200px]`} value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }}><option value="">All departments</option>{data?.departments?.map((d) => <option key={d}>{d}</option>)}</select><select className={`${inputCls} max-w-[170px]`} value={sort} onChange={(e) => setSort(e.target.value)}><option value="xp">Most XP</option><option value="coins">Most points</option><option value="recent">Recently active</option></select></div>
      {isLoading ? <Skeleton className="h-48" /> : !data.items.length ? <Card><Empty icon="users" title="No participants yet" hint="A profile is created the first time someone earns points." /></Card> : (
        <Card className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-[13px]"><thead><tr className="border-b border-[#ede5e0]"><th className={th}>Employee</th><th className={th}>Department</th><th className={th}>Level</th><th className={`${th} text-right`}>XP</th><th className={`${th} text-right`}>Points</th><th className={th}>Last active</th><th className={th} /></tr></thead>
          <tbody>{data.items.map((p) => (
            <tr key={p.personKey} className="border-b border-[#f3efec] last:border-0"><td className="px-3 py-2.5"><div className="flex items-center gap-2.5"><Avatar name={p.name} photo={p.photo} size={28} /><div><p className="font-medium text-[#2a1a16]">{p.name}</p><div className="flex gap-1">{p.frozenAccount && <Pill tone="danger">Frozen</Pill>}{p.optedOut && <Pill>Opted out</Pill>}</div></div></div></td><td className="px-3 py-2.5 text-[#7a6a64]">{p.department || "-"}</td><td className="px-3 py-2.5">{p.level}</td><td className="px-3 py-2.5 text-right font-medium text-[#2a1a16]">{fmt(p.xp)}</td><td className="px-3 py-2.5 text-right text-[#5b4b45]">{fmt(p.coins)}</td><td className="px-3 py-2.5 text-[#7a6a64]">{p.lastActiveAt ? timeAgo(p.lastActiveAt) : "Never"}</td>
              <td className="px-3 py-2.5 text-right"><Button variant={p.frozenAccount ? "secondary" : "danger"} size="sm" onClick={ask(p.frozenAccount ? "Allow this person to earn points again?" : "Freeze this account? They stop earning points (use for suspected abuse).", () => upd.mutate({ key: p.personKey, frozenAccount: !p.frozenAccount }))}>{p.frozenAccount ? "Unfreeze" : "Freeze"}</Button></td></tr>))}</tbody></table></Card>)}
      {data?.pages > 1 && <div className="flex items-center justify-center gap-3"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><span className="text-xs text-[#7a6a64]">Page {page} of {data.pages}</span><Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div>}
    </div>
  );
}
