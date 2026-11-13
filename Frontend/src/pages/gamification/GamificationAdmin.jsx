import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, PageHeader, Button, Card, Empty, Skeleton } from "../../components/gamification/ui";
import AnalyticsAdmin from "./admin/AnalyticsAdmin";
import SettingsAdmin from "./admin/SettingsAdmin";
import { ChallengesAdmin, GoalsAdmin, SeasonsAdmin } from "./admin/ContentAdmin";
import { RewardsAdmin, AchievementsAdmin, PeopleAdmin } from "./admin/PeopleRewardsAdmin";
import { useAdminRedemptions, useGamMe } from "../../auth/server-state/gamification/gamification.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";

export default function GamificationAdmin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "insights";
  const { data: auth } = useAuth();
  const { data: me, isLoading } = useGamMe(true);
  const { data: pending } = useAdminRedemptions("pending");

  if (isLoading) return <div className="mx-auto max-w-6xl p-6"><Skeleton className="h-40" /></div>;
  if (me && me.enabled === false) {
    const owner = ["superadmin", "super_admin"].includes(auth?.role);
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card><Empty icon="shield" title="Recognition & Rewards is turned off" hint={owner ? "Turn it on from Settings, under Recognition & Rewards. It stays off for everyone until you do." : "The organisation owner (super admin) can turn this module on from Settings."} /></Card>
      </div>
    );
  }
  const tabs = [
    { id: "insights", icon: "trend", label: "Insights" },
    { id: "rules", icon: "layers", label: "Rules and settings" },
    { id: "rewards", icon: "gift", label: "Rewards and approvals", badge: pending?.items?.length || 0 },
    { id: "challenges", icon: "flag", label: "Challenges" },
    { id: "goals", icon: "target", label: "Goals" },
    { id: "seasons", icon: "trophy", label: "Seasons" },
    { id: "achievements", icon: "award", label: "Achievements and awards" },
    { id: "people", icon: "users", label: "People" },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader title="Rewards administration" subtitle="Configure the programme, run challenges, approve rewards and track engagement."
        actions={<Link to="/gamification"><Button variant="secondary" size="sm"><ArrowLeft size={14} />Back to Recognition & Rewards</Button></Link>} />
      <Tabs tabs={tabs} value={tab} onChange={(t) => setParams({ tab: t })} />
      {tab === "insights" && <AnalyticsAdmin />}
      {tab === "rules" && <SettingsAdmin />}
      {tab === "rewards" && <RewardsAdmin />}
      {tab === "challenges" && <ChallengesAdmin />}
      {tab === "goals" && <GoalsAdmin />}
      {tab === "seasons" && <SeasonsAdmin />}
      {tab === "achievements" && <AchievementsAdmin />}
      {tab === "people" && <PeopleAdmin />}
    </div>
  );
}
