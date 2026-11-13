import { useEffect, useState } from "react";
import { Card, Button, SectionTitle, Skeleton, Field, inputCls, Toggle, Icon, fmt } from "../../../components/gamification/ui";
import { useAdminSettings, useSaveSettings, useResetRules } from "../../../auth/server-state/gamification/gamification.hook";

const MODULES = { attendance: "Attendance", timesheet: "Timesheets", training: "Training", review: "Performance reviews", policy: "Policies", meetings: "Meetings", tickets: "Ideas and suggestions", kudos: "Recognition", streaks: "Attendance streaks", quests: "Goals", challenges: "Challenges", seasons: "Seasons", badges: "Achievements", store: "Rewards store", leaderboard: "Leaderboards" };
const CAT_ORDER = [["attendance", "Attendance"], ["productivity", "Productivity"], ["learning", "Learning"], ["growth", "Growth"], ["culture", "Recognition"], ["profile", "Profile"]];
const Num = ({ value, onChange, min = 0, max = 100000, className = "" }) => <input type="number" min={min} max={max} className={`${inputCls} !px-2 !py-1.5 text-center ${className}`} value={value} onChange={(e) => onChange(e.target.value === "" ? "" : +e.target.value)} />;

export default function SettingsAdmin() {
  const { data, isLoading } = useAdminSettings();
  const save = useSaveSettings(); const reset = useResetRules();
  const [s, setS] = useState(() => (data ? JSON.parse(JSON.stringify(data.settings)) : null));
  useEffect(() => { if (data) setS(JSON.parse(JSON.stringify(data.settings))); }, [data]);
  if (isLoading || !s) return <Skeleton className="h-96" />;
  const set = (path, v) => setS((o) => { const n = JSON.parse(JSON.stringify(o)); let t = n; const p = path.split("."); p.slice(0, -1).forEach((k) => (t = t[k] = t[k] || {})); t[p[p.length - 1]] = v; return n; });
  const rule = (ev) => ({ enabled: true, xp: ev.xp, coins: ev.coins, dailyCap: ev.dailyCap, ...(s.rules?.[ev.key] || {}) });
  const grouped = CAT_ORDER.map(([c, l]) => [l, data.events.filter((e) => e.category === c)]).filter(([, l]) => l.length);
  return (
    <div className="space-y-4 pb-16">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-sm font-semibold text-[#2a1a16]">Pause the programme</p><p className="text-xs text-[#7a6a64]">Temporarily stop awarding points. Existing points, levels and achievements are kept. (The super admin controls whether the module is available at all.)</p></div>
        <div className="flex items-center gap-2"><span className="text-xs font-medium text-[#5b4b45]">{s.enabled ? "Active" : "Paused"}</span><Toggle label="Programme active" checked={s.enabled} onChange={(v) => set("enabled", v)} /></div>
      </Card>

      <Card className="p-4">
        <SectionTitle title="Modules" sub="Choose which parts of the programme your organisation uses." />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(MODULES).map(([k, l]) => <div key={k} className="flex items-center justify-between rounded-lg border border-[#ede5e0] px-3 py-2.5"><span className="text-[13px] text-[#2a1a16]">{l}</span><Toggle label={l} checked={s.modules[k] !== false} onChange={(v) => set(`modules.${k}`, v)} /></div>)}</div>
      </Card>

      <Card className="p-4">
        <SectionTitle title="Fairness and limits" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Daily XP cap per person" hint="Prevents point farming. 0 = unlimited. Goal, challenge and award payouts are exempt."><Num value={s.dailyXpCap} onChange={(v) => set("dailyXpCap", v)} max={5000} /></Field>
          <Field label="Level curve (XP base)" hint="Higher means slower levelling. Default 80."><Num value={s.levelBase} onChange={(v) => set("levelBase", v)} min={20} max={400} /></Field>
          <Field label="Leaderboard size"><Num value={s.leaderboard.topN} onChange={(v) => set("leaderboard.topN", v)} min={5} max={200} /></Field>
          <Field label="Manager award budget (XP per month)"><Num value={s.manager.monthlyXpLimit} onChange={(v) => set("manager.monthlyXpLimit", v)} /></Field>
          <Field label="Manager award budget (points per month)"><Num value={s.manager.monthlyCoinLimit} onChange={(v) => set("manager.monthlyCoinLimit", v)} /></Field>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-[13px] text-[#2a1a16]"><input type="checkbox" className="accent-[#730042]" checked={s.leaderboard.showDepartments !== false} onChange={(e) => set("leaderboard.showDepartments", e.target.checked)} /> Show department rankings</label>
      </Card>

      <Card className="p-4">
        <SectionTitle title="Recognition rules" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Gift-point allowance per person per month"><Num value={s.kudos.monthlyAllowance} onChange={(v) => set("kudos.monthlyAllowance", v)} max={5000} /></Field>
          <Field label="Maximum gift points per recognition"><Num value={s.kudos.maxCoinsPerKudos} onChange={(v) => set("kudos.maxCoinsPerKudos", v)} max={500} /></Field>
          <Field label="Recognitions per person per day"><Num value={s.kudos.dailyLimit} onChange={(v) => set("kudos.dailyLimit", v)} min={1} max={50} /></Field>
          <Field label="Per colleague per day"><Num value={s.kudos.maxPerDayPerPerson} onChange={(v) => set("kudos.maxPerDayPerPerson", v)} min={1} max={10} /></Field>
          <Field label="Minimum message length"><Num value={s.kudos.minMessageLength} onChange={(v) => set("kudos.minMessageLength", v)} max={200} /></Field>
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle title="Seasons" sub="A season is a competition window with its own leaderboard and prizes." />
        <Field label="Create seasons automatically"><select className={`${inputCls} max-w-xs`} value={s.seasons.auto} onChange={(e) => set("seasons.auto", e.target.value)}><option value="none">Manually only</option><option value="monthly">Every month</option><option value="quarterly">Every quarter</option></select></Field>
      </Card>

      <Card className="p-4">
        <SectionTitle title="Points per activity" sub="Set XP, reward points and a daily limit for each activity, or switch an activity off." right={<Button variant="secondary" size="sm" loading={reset.isPending} onClick={() => window.confirm("Reset every activity to its default?") && reset.mutate()}>Reset to defaults</Button>} />
        <div className="space-y-5">{grouped.map(([cat, list]) => (
          <div key={cat}><p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9c8880]">{cat}</p>
            <div className="divide-y divide-[#f3efec] rounded-lg border border-[#ede5e0]">{list.map((ev) => { const r = rule(ev); return (
              <div key={ev.key} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${r.enabled ? "" : "opacity-50"}`}>
                <Toggle label={ev.label} checked={r.enabled} onChange={(v) => set(`rules.${ev.key}.enabled`, v)} />
                <span className="text-[#730042]"><Icon name={ev.icon} size={15} /></span><span className="min-w-[160px] flex-1 text-[13px] text-[#2a1a16]">{ev.label}</span>
                <label className="flex items-center gap-1.5 text-[11px] text-[#7a6a64]">XP<Num className="w-16" value={r.xp} onChange={(v) => set(`rules.${ev.key}.xp`, v)} max={1000} /></label>
                <label className="flex items-center gap-1.5 text-[11px] text-[#7a6a64]">Points<Num className="w-16" value={r.coins} onChange={(v) => set(`rules.${ev.key}.coins`, v)} max={1000} /></label>
                <label className="flex items-center gap-1.5 text-[11px] text-[#7a6a64]">Max/day<Num className="w-14" value={r.dailyCap || 0} onChange={(v) => set(`rules.${ev.key}.dailyCap`, v)} max={50} /></label>
              </div>); })}</div></div>))}</div>
      </Card>

      <div className="sticky bottom-3 z-10 flex justify-end"><Button className="shadow-lg" loading={save.isPending} onClick={() => save.mutate(s)}>Save settings</Button></div>
    </div>
  );
}
