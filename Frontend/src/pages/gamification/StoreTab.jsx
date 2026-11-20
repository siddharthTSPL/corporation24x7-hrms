import { useState } from "react";
import { Card, Button, Modal, Field, inputCls, Pill, Skeleton, Empty, SectionTitle, timeAgo, fmt } from "../../components/gamification/ui";
import { useGamStore, useRedeem, useGamRedemptions, useCancelRedemption, useBuyFreeze } from "../../auth/server-state/gamification/gamification.hook";

const CATS = { all: "All", perk: "Perks", time: "Time off", voucher: "Vouchers", swag: "Swag", charity: "Charity", cosmetic: "Cosmetics", boost: "Boosts", other: "Other" };
const STATUS = { pending: ["#d97706", "Pending approval"], approved: ["#2563eb", "Approved"], fulfilled: ["#059669", "Fulfilled"], rejected: ["#dc2626", "Rejected"], cancelled: ["#6b7280", "Cancelled"] };

export default function StoreTab() {
  const { data, isLoading, error } = useGamStore();
  const { data: reds } = useGamRedemptions();
  const redeem = useRedeem(); const cancel = useCancelRedemption(); const freeze = useBuyFreeze();
  const [cat, setCat] = useState("all"); const [pick, setPick] = useState(null); const [note, setNote] = useState("");
  if (isLoading) return <Skeleton className="h-64" />;
  if (error) return <Empty icon="🔒" title={error.message} />;
  const items = data.items.filter((i) => cat === "all" || i.category === cat);
  const cats = Object.keys(CATS).filter((c) => c === "all" || data.items.some((i) => i.category === c));

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white">
        <div><p className="text-xs font-semibold opacity-90">Your balance</p><p className="text-3xl font-extrabold">🪙 {fmt(data.coins)}</p></div>
        <Button className="!bg-white !text-orange-600" loading={freeze.isPending} onClick={() => freeze.mutate()}>🧊 Streak freeze · {data.freeze.cost} 🪙 ({data.freeze.have}/{data.freeze.max})</Button>
      </Card>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${cat === c ? "border-[#730042] bg-pink-50 text-[#730042]" : "border-gray-200 bg-white text-gray-600"}`}>{CATS[c]}</button>)}</div>
      {items.length === 0 ? <Card><Empty icon="🛍️" title="The store is empty" hint="Ask your admin to add some rewards." /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => {
            const afford = data.coins >= r.cost; const blocked = r.outOfStock || r.locked || (r.perUserLimit > 0 && r.usedByMe >= r.perUserLimit);
            return (
              <Card key={r.id} className={`flex flex-col p-4 ${blocked ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between"><span className="text-4xl">{r.icon}</span><div className="flex flex-col items-end gap-1">{r.effect && <Pill color="#059669">instant</Pill>}{r.stock >= 0 && !r.outOfStock && <Pill color="#d97706">{r.stock} left</Pill>}{r.outOfStock && <Pill color="#dc2626">sold out</Pill>}{r.locked && <Pill color="#6b7280">🔒 Lv {r.minLevel}</Pill>}</div></div>
                <p className="mt-2 text-sm font-bold text-gray-800">{r.name}</p>
                <p className="mt-0.5 flex-1 text-xs text-gray-500">{r.description}</p>
                <div className="mt-3 flex items-center justify-between"><span className="text-base font-extrabold text-[#730042]">🪙 {fmt(r.cost)}</span>
                  <Button variant={afford && !blocked ? "pink" : "ghost"} className="!px-3 !py-1.5 text-xs" disabled={blocked || !afford} onClick={() => { setPick(r); setNote(""); }}>{blocked ? "Unavailable" : afford ? "Redeem" : `Need ${fmt(r.cost - data.coins)} more`}</Button></div>
              </Card>
            );
          })}
        </div>
      )}

      {reds?.items?.length > 0 && (
        <div>
          <SectionTitle icon="🧾" title="My redemptions" />
          <Card className="divide-y">{reds.items.map((r) => { const [c, l] = STATUS[r.status]; return (
            <div key={r.id} className="flex items-center gap-3 p-3"><span className="text-2xl">{r.icon}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-800">{r.name}</p><p className="text-[11px] text-gray-500">{timeAgo(r.at)} · 🪙 {fmt(r.cost)}{r.result?.coins ? ` · won ${r.result.coins} 🪙` : ""}{r.adminNote ? ` · “${r.adminNote}”` : ""}</p></div>
              <Pill color={c}>{l}</Pill>
              {r.status === "pending" && <button onClick={() => cancel.mutate(r.id)} className="text-xs font-semibold text-red-500 hover:underline">Cancel</button>}
            </div>); })}</Card>
        </div>
      )}

      <Modal open={!!pick} onClose={() => setPick(null)} title="Confirm redemption">
        {pick && (
          <div className="space-y-3 text-center">
            <div className="text-5xl">{pick.icon}</div><p className="text-lg font-bold">{pick.name}</p><p className="text-sm text-gray-500">{pick.description}</p>
            <p className="rounded-xl bg-amber-50 p-2 text-sm font-semibold text-amber-800">Costs 🪙 {fmt(pick.cost)} · you'll have 🪙 {fmt(data.coins - pick.cost)} left</p>
            {pick.requiresApproval && !pick.effect && <Field label="Note for the approver (optional)"><input className={inputCls} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. preferred date, size, address…" /></Field>}
            <div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setPick(null)}>Not now</Button><Button variant="pink" className="flex-1" loading={redeem.isPending} onClick={() => redeem.mutate({ id: pick.id, note }, { onSuccess: (d) => { setPick(null); import("react-hot-toast").then((m) => m.default.success(d.message)); } })}>Confirm</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
