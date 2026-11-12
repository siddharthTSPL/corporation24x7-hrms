import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs } from "../../components/gamification/ui";
import AnalyticsAdmin from "./admin/AnalyticsAdmin";
import SettingsAdmin from "./admin/SettingsAdmin";
import { ChallengesAdmin, QuestsAdmin, SeasonsAdmin, QuizAdmin } from "./admin/ContentAdmin";
import { RewardsAdmin, BadgesAdmin, PeopleAdmin } from "./admin/PeopleRewardsAdmin";
import { useAdminRedemptions } from "../../auth/server-state/gamification/gamification.hook";

export default function GamificationAdmin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "analytics";
  const { data: pending } = useAdminRedemptions("pending");
  const tabs = [
    { id: "analytics", icon: "📊", label: "Insights" },
    { id: "settings", icon: "⚙️", label: "Rules & settings" },
    { id: "rewards", icon: "🛍️", label: "Store & approvals", badge: pending?.items?.length || 0 },
    { id: "challenges", icon: "⚔️", label: "Challenges" },
    { id: "quests", icon: "🗺️", label: "Quests" },
    { id: "seasons", icon: "🏟️", label: "Seasons" },
    { id: "badges", icon: "🏅", label: "Badges & awards" },
    { id: "quiz", icon: "🧠", label: "Quiz" },
    { id: "people", icon: "👥", label: "People" },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-extrabold text-gray-800">Rewards <span className="text-[#cd166e]">Admin</span></h1><p className="text-sm text-gray-500">Configure the programme, run challenges, approve rewards and watch engagement.</p></div>
        <Link to="/gamification" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#730042] shadow-sm ring-1 ring-gray-200 hover:bg-pink-50"><ArrowLeft size={15} /> Back to Rewards</Link>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={(t) => setParams({ tab: t })} />
      {tab === "analytics" && <AnalyticsAdmin />}
      {tab === "settings" && <SettingsAdmin />}
      {tab === "rewards" && <RewardsAdmin />}
      {tab === "challenges" && <ChallengesAdmin />}
      {tab === "quests" && <QuestsAdmin />}
      {tab === "seasons" && <SeasonsAdmin />}
      {tab === "badges" && <BadgesAdmin />}
      {tab === "quiz" && <QuizAdmin />}
      {tab === "people" && <PeopleAdmin />}
    </div>
  );
}
