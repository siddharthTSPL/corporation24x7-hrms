import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Tabs, Empty, Card, Skeleton } from "../../components/gamification/ui";
import { useGamHub } from "../../auth/server-state/gamification/gamification.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import OverviewTab from "./OverviewTab";
import QuestsTab from "./QuestsTab";
import BadgesTab from "./BadgesTab";
import LeaderboardTab from "./LeaderboardTab";
import KudosTab from "./KudosTab";
import StoreTab from "./StoreTab";
import ChallengesTab from "./ChallengesTab";
import ProfileTab from "./ProfileTab";

export default function GamificationHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const { data: auth } = useAuth();
  const role = auth?.role || "";
  const { data: hub, isLoading, error } = useGamHub();
  const isAdmin = ["admin", "senior_admin", "superadmin", "super_admin"].includes(role);
  const goTo = (t) => setParams({ tab: t });

  if (error && /owner account|switched off/i.test(error.message)) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card><Empty icon={/off/.test(error.message) ? "😴" : "👑"} title={error.message} hint={isAdmin ? "You can manage the programme from the Rewards Admin console." : undefined} />
          {isAdmin && <div className="pb-6 text-center"><Link to="/gamification-admin" className="rounded-xl bg-[#730042] px-4 py-2 text-sm font-semibold text-white">Open Rewards Admin</Link></div>}</Card>
      </div>
    );
  }

  const tabs = [
    { id: "overview", icon: "🏠", label: "Overview" },
    { id: "quests", icon: "🗺️", label: "Quests", badge: hub?.quests?.claimable || 0 },
    { id: "leaderboard", icon: "🏆", label: "Leaderboard" },
    { id: "challenges", icon: "⚔️", label: "Challenges" },
    { id: "kudos", icon: "👏", label: "Kudos" },
    { id: "badges", icon: "🏅", label: "Badges" },
    { id: "store", icon: "🛍️", label: "Store" },
    { id: "profile", icon: "🎨", label: "Me" },
  ].filter((t) => {
    const m = hub?.modules || {};
    return !((t.id === "quests" && m.quests === false) || (t.id === "leaderboard" && m.leaderboard === false) || (t.id === "challenges" && m.challenges === false) || (t.id === "kudos" && m.kudos === false) || (t.id === "badges" && m.badges === false) || (t.id === "store" && m.store === false));
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-extrabold text-gray-800">Rewards <span className="text-[#cd166e]">&</span> Recognition</h1><p className="text-sm text-gray-500">Earn XP, level up, collect badges and treat yourself.</p></div>
        {isAdmin && <Link to="/gamification-admin" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#730042] shadow-sm ring-1 ring-gray-200 hover:bg-pink-50"><Settings size={15} /> Admin console</Link>}
      </div>
      <Tabs tabs={tabs} value={tab} onChange={goTo} />
      {isLoading ? <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-40" /></div> : error ? <Card><Empty icon="⚠️" title={error.message} /></Card> : (
        <>
          {tab === "overview" && <OverviewTab hub={hub} loading={isLoading} goTo={goTo} />}
          {tab === "quests" && <QuestsTab />}
          {tab === "leaderboard" && <LeaderboardTab me={hub.me} />}
          {tab === "challenges" && <ChallengesTab />}
          {tab === "kudos" && <KudosTab />}
          {tab === "badges" && <BadgesTab />}
          {tab === "store" && <StoreTab />}
          {tab === "profile" && <ProfileTab me={hub.me} role={role} />}
        </>
      )}
    </div>
  );
}
