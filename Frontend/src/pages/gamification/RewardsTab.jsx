import { useState } from "react";
import toast from "react-hot-toast";
import { Card, Button, Modal, Field, inputCls, Pill, Skeleton, Empty, SectionTitle, IconTile, Segmented, timeAgo, fmt } from "../../components/gamification/ui";
import { useGamStore, useRedeem, useGamRedemptions, useCancelRedemption } from "../../auth/server-state/gamification/gamification.hook";

const CATS = { all: "All", perk: "Perks", time: "Time off", voucher: "Vouchers", swag: "Merchandise", charity: "Charity", other: "Other" };
const STATUS = { pending: ["warning", "Pending approval"], approved: ["info", "Approved"], fulfilled: ["success", "Fulfilled"], rejected: ["danger", "Rejected"], cancelled: ["neutral", "Cancelled"] };

export default function RewardsTab() {
  const { data, isLoading, error } = useGamStore();
  const { data: reds } = useGamRedemptions();
  const redeem = useRedeem(); const cancel = useCancelRedemption();
  const [cat, setCat] = useState("all"); const [pick, setPick] = useState(null); const [note, setNote] = useState("");
  if (isLoading) return <Skeleton className="h-64" />;
  if (error) return <Card><Empty icon="shield" title={error.message} /></Card>;
  const items = data.items.filter((i) => cat === "all" || i.category === cat);
  const cats = Object.keys(CATS).filter((c) => c === "all" || data.items.some((i) => i.category === c));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Card className="flex items-center gap-3 px-4 py-3"><IconTile name="wallet" size={36} /><div><p className="text-[11px] font-medium text-[#7a6a64]">Your reward points</p><p className="text-xl font-semibold text-[#2a1a16]">{fmt(data.coins)}</p></div></Card>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${cat === c ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-[#ede5e0] bg-white text-[#5b4b45] hover:bg-[#faf7f5]"}`}>{CATS[c]}</button>)}</div>
      </div>

      {items.length === 0 ? <Card><Empty icon="gift" title="No rewards available" hint="Your administrator hasn't added any rewards yet." /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => {
            const afford = data.coins >= r.cost; const limit = r.perUserLimit > 0 && r.usedByMe >= r.perUserLimit; const blocked = r.outOfStock || r.locked || limit;
            return (
              <Card key={r.id} className={`flex flex-col p-4 ${blocked ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2"><IconTile name={r.icon} size={40} /><div className="flex flex-wrap justify-end gap-1">{r.stock >= 0 && !r.outOfStock && <Pill tone="warning">{r.stock} left</Pill>}{r.outOfStock && <Pill tone="danger">Out of stock</Pill>}{r.locked && <Pill>Level {r.minLevel}+</Pill>}{limit && <Pill>Limit reached</Pill>}</div></div>
                <p className="mt-3 text-[13px] font-semibold text-[#2a1a16]">{r.name}</p>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-[#7a6a64]">{r.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-[#f3efec] pt-3"><span className="text-sm font-semibold text-[#730042]">{fmt(r.cost)} pts</span>
                  <Button size="sm" variant={afford && !blocked ? "primary" : "secondary"} disabled={blocked || !afford} onClick={() => { setPick(r); setNote(""); }}>{blocked ? "Unavailable" : afford ? "Redeem" : `${fmt(r.cost - data.coins)} pts short`}</Button></div>
              </Card>
            );
          })}
        </div>
      )}

      {reds?.items?.length > 0 && (
        <div>
          <SectionTitle icon="file" title="Redemption history" />
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead><tr className="border-b border-[#ede5e0] text-[11px] uppercase tracking-wide text-[#9c8880]"><th className="px-4 py-2.5 font-medium">Reward</th><th className="px-2 py-2.5 font-medium">Requested</th><th className="px-2 py-2.5 text-right font-medium">Points</th><th className="px-2 py-2.5 font-medium">Status</th><th className="px-4 py-2.5" /></tr></thead>
              <tbody>{reds.items.map((r) => { const [tone, label] = STATUS[r.status]; return (
                <tr key={r.id} className="border-b border-[#f3efec] last:border-0"><td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><IconTile name={r.icon} size={28} /><div><p className="font-medium text-[#2a1a16]">{r.name}</p>{r.adminNote && <p className="text-[11px] text-[#9c8880]">Note: {r.adminNote}</p>}</div></div></td><td className="px-2 py-2.5 text-[#7a6a64]">{timeAgo(r.at)}</td><td className="px-2 py-2.5 text-right text-[#5b4b45]">{fmt(r.cost)}</td><td className="px-2 py-2.5"><Pill tone={tone}>{label}</Pill></td><td className="px-4 py-2.5 text-right">{r.status === "pending" && <Button variant="ghost" size="sm" onClick={() => cancel.mutate(r.id)}>Cancel</Button>}</td></tr>); })}</tbody>
            </table>
          </Card>
        </div>
      )}

      <Modal open={!!pick} onClose={() => setPick(null)} title="Confirm redemption">
        {pick && (
          <div className="space-y-4">
            <div className="flex items-start gap-3"><IconTile name={pick.icon} size={44} /><div><p className="text-sm font-semibold text-[#2a1a16]">{pick.name}</p><p className="mt-0.5 text-xs text-[#7a6a64]">{pick.description}</p></div></div>
            <div className="rounded-lg bg-[#faf7f5] px-3 py-2.5 text-xs text-[#5b4b45]"><div className="flex justify-between"><span>Cost</span><b>{fmt(pick.cost)} pts</b></div><div className="mt-1 flex justify-between"><span>Balance after redemption</span><b>{fmt(data.coins - pick.cost)} pts</b></div></div>
            {pick.requiresApproval && <Field label="Note for the approver (optional)"><input className={inputCls} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Preferred date, size, delivery details" /></Field>}
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPick(null)}>Cancel</Button><Button loading={redeem.isPending} onClick={() => redeem.mutate({ id: pick.id, note }, { onSuccess: (d) => { setPick(null); toast.success(d.message); } })}>Confirm redemption</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
