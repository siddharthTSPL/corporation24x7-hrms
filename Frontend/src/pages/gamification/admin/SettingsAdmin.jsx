import { useEffect, useState } from "react";
import { Card, Button, SectionTitle, Skeleton, Field, inputCls, Pill, fmt } from "../../../components/gamification/ui";
import { useAdminSettings, useSaveSettings, useResetRules } from "../../../auth/server-state/gamification/gamification.hook";

const MODULES = { attendance: "Attendance", timesheet: "Timesheets", training: "Training", review: "Reviews", policy: "Policies", meetings: "Meetings", tickets: "Ideas & suggestions", kudos: "Kudos wall", quiz: "Daily quiz", spin: "Lucky spin", store: "Rewards store", streaks: "Streaks & daily reward", quests: "Quests", challenges: "Challenges", seasons: "Seasons", badges: "Badges", leaderboard: "Leaderboards" };
const CAT_ORDER = ["attendance", "productivity", "learning", "growth", "culture", "engagement", "profile"];
const Num = ({ value, onChange, min = 0, max = 100000, className = "" }) => <input type="number" min={min} max={max} className={`${inputCls} !px-2 !py-1 text-center ${className}`} value={value} onChange={(e) => onChange(e.target.value === "" ? "" : +e.target.value)} />;

export default function SettingsAdmin() {
  const { data, isLoading } = useAdminSettings();
  const save = useSaveSettings(); const reset = useResetRules();
  const [s, setS] = useState(() => (data ? JSON.parse(JSON.stringify(data.settings)) : null));
  useEffect(() => { if (data) setS(JSON.parse(JSON.stringify(data.settings))); }, [data]);
  if (isLoading || !s) return <Skeleton className="h-96" />;
  const set = (path, v) => setS((o) => { const n = JSON.parse(JSON.stringify(o)); let t = n; const p = path.split("."); p.slice(0, -1).forEach((k) => (t = t[k] = t[k] || {})); t[p[p.length - 1]] = v; return n; });
  const rule = (ev) => ({ enabled: true, xp: ev.xp, coins: ev.coins, dailyCap: ev.dailyCap, ...(s.rules?.[ev.key] || {}) });
  const grouped = CAT_ORDER.map((c) => [c, data.events.filter((e) => e.category === c)]).filter(([, l]) => l.length);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-base font-bold text-gray-800">Rewards programme</p><p className="text-xs text-gray-500">Master switch for the whole programme.</p></div>
        <label className="flex cursor-pointer items-center gap-2"><span className={`text-sm font-bold ${s.enabled ? "text-emerald-600" : "text-gray-400"}`}>{s.enabled ? "ON" : "OFF"}</span><input type="checkbox" className="h-5 w-10 accent-[#730042]" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} /></label>
      </Card>

      <Card className="p-4">
        <SectionTitle icon="🧩" title="Modules" sub="Turn parts of the programme on or off." />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(MODULES).map(([k, l]) => <label key={k} className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm"><span className="font-semibold text-gray-700">{l}</span><input type="checkbox" className="h-4 w-4 accent-[#730042]" checked={s.modules[k] !== false} onChange={(e) => set(`modules.${k}`, e.target.checked)} /></label>)}</div>
      </Card>

      <Card className="p-4">
        <SectionTitle icon="⚖️" title="Fairness & limits" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Daily XP cap per person" hint="Stops grinding. 0 = unlimited. Quiz, spin, daily reward and quest payouts are exempt."><Num value={s.dailyXpCap} onChange={(v) => set("dailyXpCap", v)} max={5000} /></Field>
          <Field label="Level curve (XP base)" hint="Higher = slower levelling. Default 80."><Num value={s.levelBase} onChange={(v) => set("levelBase", v)} min={20} max={400} /></Field>
          <Field label="Leaderboard size"><Num value={s.leaderboard.topN} onChange={(v) => set("leaderboard.topN", v)} min={5} max={200} /></Field>
          <Field label="Streak freeze price (coins)"><Num value={s.streaks.freezeCost} onChange={(v) => set("streaks.freezeCost", v)} max={5000} /></Field>
          <Field label="Max freezes held"><Num value={s.streaks.maxFreezes} onChange={(v) => set("streaks.maxFreezes", v)} max={10} /></Field>
          <Field label="Extra spin price (coins)"><Num value={s.spin.extraSpinCost} onChange={(v) => set("spin.extraSpinCost", v)} max={1000} /></Field>
          <Field label="Max extra spins / day"><Num value={s.spin.maxExtraPerDay} onChange={(v) => set("spin.maxExtraPerDay", v)} max={10} /></Field>
          <Field label="Manager award budget (XP / month)"><Num value={s.manager.monthlyXpLimit} onChange={(v) => set("manager.monthlyXpLimit", v)} /></Field>
          <Field label="Manager award budget (coins / month)"><Num value={s.manager.monthlyCoinLimit} onChange={(v) => set("manager.monthlyCoinLimit", v)} /></Field>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#730042]" checked={s.leaderboard.showDepartments !== false} onChange={(e) => set("leaderboard.showDepartments", e.target.checked)} /> Show department-vs-department rankings</label>
      </Card>

      <Card className="p-4">
        <SectionTitle icon="👏" title="Kudos rules" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Gift-coin allowance per person / month"><Num value={s.kudos.monthlyAllowance} onChange={(v) => set("kudos.monthlyAllowance", v)} max={5000} /></Field>
          <Field label="Max gift coins per kudos"><Num value={s.kudos.maxCoinsPerKudos} onChange={(v) => set("kudos.maxCoinsPerKudos", v)} max={500} /></Field>
          <Field label="Kudos per day (total)"><Num value={s.kudos.dailyLimit} onChange={(v) => set("kudos.dailyLimit", v)} min={1} max={50} /></Field>
          <Field label="Kudos per person per day"><Num value={s.kudos.maxPerDayPerPerson} onChange={(v) => set("kudos.maxPerDayPerPerson", v)} min={1} max={10} /></Field>
          <Field label="Minimum message length"><Num value={s.kudos.minMessageLength} onChange={(v) => set("kudos.minMessageLength", v)} max={200} /></Field>
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle icon="🏟️" title="Seasons" sub="Seasons have their own leaderboard, prizes and a Hall of Fame." />
        <Field label="Auto-create seasons"><select className={`${inputCls} max-w-xs`} value={s.seasons.auto} onChange={(e) => set("seasons.auto", e.target.value)}><option value="none">Manual only</option><option value="monthly">Every month</option><option value="quarterly">Every quarter</option></select></Field>
      </Card>

      <Card className="p-4">
        <SectionTitle icon="🎛️" title="Points per activity" sub="Set XP, coins and the daily limit for each action. Disable any you don't want." right={<Button variant="outline" className="text-xs" loading={reset.isPending} onClick={() => confirm("Reset every activity to the defaults?") && reset.mutate()}>Reset to defaults</Button>} />
        <div className="space-y-4">{grouped.map(([cat, list]) => (
          <div key={cat}><p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">{cat}</p>
            <div className="divide-y rounded-xl border">{list.map((ev) => { const r = rule(ev); return (
              <div key={ev.key} className={`flex flex-wrap items-center gap-2 p-2.5 ${r.enabled ? "" : "opacity-50"}`}>
                <input type="checkbox" className="h-4 w-4 accent-[#730042]" checked={r.enabled} onChange={(e) => set(`rules.${ev.key}.enabled`, e.target.checked)} />
                <span className="text-lg">{ev.icon}</span><span className="min-w-[140px] flex-1 text-sm font-semibold text-gray-700">{ev.label}</span>
                <label className="flex items-center gap-1 text-[11px] text-gray-500">XP<Num className="w-16" value={r.xp} onChange={(v) => set(`rules.${ev.key}.xp`, v)} max={1000} /></label>
                <label className="flex items-center gap-1 text-[11px] text-gray-500">🪙<Num className="w-16" value={r.coins} onChange={(v) => set(`rules.${ev.key}.coins`, v)} max={1000} /></label>
                <label className="flex items-center gap-1 text-[11px] text-gray-500">max/day<Num className="w-14" value={r.dailyCap || 0} onChange={(v) => set(`rules.${ev.key}.dailyCap`, v)} max={50} /></label>
              </div>); })}</div></div>))}</div>
      </Card>

      <div className="sticky bottom-3 z-10 flex justify-end"><Button variant="pink" className="!px-6 !py-2.5 shadow-lg" loading={save.isPending} onClick={() => save.mutate(s)}>Save all settings</Button></div>
    </div>
  );
}
