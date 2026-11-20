import { useSearchParams, Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Tabs, Empty, Card, Skeleton, PageHeader, Button } from "../../components/gamification/ui";
import { useGamHub } from "../../auth/server-state/gamification/gamification.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import OverviewTab from "./OverviewTab";
import GoalsTab from "./GoalsTab";
import AchievementsTab from "./AchievementsTab";
import LeaderboardTab from "./LeaderboardTab";
import RecognitionTab from "./RecognitionTab";
import RewardsTab from "./RewardsTab";
import ChallengesTab from "./ChallengesTab";
import MyActivityTab from "./MyActivityTab";

export default function GamificationHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const { data: auth } = useAuth();
  const role = auth?.role || "";
  const { data: hub, isLoading, error } = useGamHub();
  const isAdmin = ["admin", "senior_admin", "superadmin", "super_admin"].includes(role);
  const goTo = (t) => setParams({ tab: t });

  if (error && /owner account|switched off|not enabled/i.test(error.message)) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card><Empty icon="shield" title={/owner account/i.test(error.message) ? "Owner accounts don't take part" : "Recognition & Rewards is turned off"} hint={error.message}
          action={isAdmin ? <Link to="/gamification-admin"><Button>Open Rewards administration</Button></Link> : null} /></Card>
      </div>
    );
  }

  const m = hub?.modules || {};
  const tabs = [
    { id: "overview", icon: "layers", label: "Overview" },
    { id: "goals", icon: "target", label: "Goals", badge: hub?.quests?.claimable || 0, hide: m.quests === false },
    { id: "recognition", icon: "thumbs", label: "Recognition", hide: m.kudos === false },
    { id: "leaderboard", icon: "trophy", label: "Leaderboard", hide: m.leaderboard === false },
    { id: "challenges", icon: "flag", label: "Challenges", hide: m.challenges === false },
    { id: "achievements", icon: "award", label: "Achievements", hide: m.badges === false },
    { id: "rewards", icon: "gift", label: "Rewards", hide: m.store === false },
    { id: "activity", icon: "user", label: "My activity" },
  ].filter((t) => !t.hide);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader title="Recognition & Rewards" subtitle="Track your progress, recognise colleagues and redeem rewards."
        actions={isAdmin ? <Link to="/gamification-admin"><Button variant="secondary" size="sm"><Settings size={14} />Administration</Button></Link> : null} />
      <Tabs tabs={tabs} value={tab} onChange={goTo} />
      {isLoading ? <div className="space-y-4"><Skeleton className="h-44" /><Skeleton className="h-60" /></div> : error ? <Card><Empty icon="shield" title={error.message} /></Card> : (
        <>
          {tab === "overview" && <OverviewTab hub={hub} loading={isLoading} goTo={goTo} />}
          {tab === "goals" && <GoalsTab />}
          {tab === "recognition" && <RecognitionTab />}
          {tab === "leaderboard" && <LeaderboardTab me={hub.me} />}
          {tab === "challenges" && <ChallengesTab />}
          {tab === "achievements" && <AchievementsTab />}
          {tab === "rewards" && <RewardsTab />}
          {tab === "activity" && <MyActivityTab me={hub.me} role={role} />}
        </>
      )}
    </div>
  );
}
