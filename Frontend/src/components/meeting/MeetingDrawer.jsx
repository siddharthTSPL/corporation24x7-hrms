import { useState } from "react";
import { X } from "lucide-react";
import { useMeeting } from "../../auth/server-state/meeting/meeting.hook";
import { Drawer, Chip, Spinner, ErrorNote, Tabs, Btn } from "./ui";
import OverviewTab from "./tabs/OverviewTab";
import AnnouncementsTab from "./tabs/AnnouncementsTab";
import NotesTab from "./tabs/NotesTab";
import ActionItemsTab from "./tabs/ActionItemsTab";
import PollsTab from "./tabs/PollsTab";
import FeedbackTab from "./tabs/FeedbackTab";
import GuestsTab from "./tabs/GuestsTab";
import SettingsTab from "./tabs/SettingsTab";
import ReportTab from "./tabs/ReportTab";

const STATUS = { live: ["live", "Live now"], scheduled: ["brand", "Scheduled"], ended: ["gray", "Ended"], cancelled: ["red", "Cancelled"] };

export default function MeetingDrawer({ id, onClose, onEdit }) {
  const q = useMeeting(id);
  const [tab, setTab] = useState("overview");
  const m = q.data;
  const moderator = !!(m?.isHost || m?.isCoHost);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "updates", label: "Updates" },
    { id: "notes", label: "Notes" },
    { id: "actions", label: "Action items" },
    { id: "polls", label: "Polls" },
    ...(m?.status === "ended" || moderator ? [{ id: "feedback", label: "Feedback" }] : []),
    ...(moderator && (m?.status === "scheduled" || m?.status === "live") ? [{ id: "guests", label: "Guests", badge: 0 }, { id: "settings", label: "Settings" }] : []),
    ...(moderator && (m?.status === "ended" || m?.status === "live") ? [{ id: "report", label: "Report" }] : []),
  ];
  const [tone, label] = STATUS[m?.status] || STATUS.scheduled;

  return (
    <Drawer open={!!id} onClose={onClose}>
      <div className="border-b border-gray-200 px-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">{m?.title || "Meeting"}</h2>
            {m && <Chip tone={tone} className="mt-1">{label}</Chip>}
          </div>
          <Btn variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </Btn>
        </div>
        <Tabs tabs={tabs} value={tab} onChange={setTab} className="mt-3 border-b-0" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {q.isLoading && <Spinner />}
        {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
        {m && tab === "overview" && <OverviewTab meeting={m} moderator={moderator} onEdit={onEdit} />}
        {m && tab === "updates" && <AnnouncementsTab meeting={m} moderator={moderator} />}
        {m && tab === "notes" && <NotesTab meeting={m} />}
        {m && tab === "actions" && <ActionItemsTab meeting={m} moderator={moderator} />}
        {m && tab === "polls" && <PollsTab meeting={m} moderator={moderator} />}
        {m && tab === "feedback" && <FeedbackTab meeting={m} moderator={moderator} />}
        {m && moderator && tab === "guests" && <GuestsTab meeting={m} />}
        {m && moderator && tab === "settings" && <SettingsTab meeting={m} />}
        {m && moderator && tab === "report" && <ReportTab meeting={m} />}
      </div>
    </Drawer>
  );
}
