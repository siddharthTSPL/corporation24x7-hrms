import { useState } from "react";
import { X } from "lucide-react";
import { useMeeting } from "../../auth/server-state/meeting/meeting.hook";
import { Drawer, Chip, Tabs, TabPanel, Btn, SkeletonList, ErrorNote } from "./ui";
import OverviewTab from "./tabs/OverviewTab";
import AnnouncementsTab from "./tabs/AnnouncementsTab";
import NotesTab from "./tabs/NotesTab";
import ActionItemsTab from "./tabs/ActionItemsTab";
import PollsTab from "./tabs/PollsTab";
import FeedbackTab from "./tabs/FeedbackTab";
import GuestsTab from "./tabs/GuestsTab";
import SettingsTab from "./tabs/SettingsTab";
import ReportTab from "./tabs/ReportTab";
import MinutesTab from "./tabs/MinutesTab";

const STATUS = { live: ["live", "Live now"], scheduled: ["brand", "Scheduled"], ended: ["gray", "Ended"], cancelled: ["red", "Cancelled"] };

function DrawerBody({ id, onClose, onEdit }) {
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
    ...(m?.status === "ended" ? [{ id: "minutes", label: "Minutes" }] : []),
    ...(m?.status === "ended" || moderator ? [{ id: "feedback", label: "Feedback" }] : []),
    ...(moderator && (m?.status === "scheduled" || m?.status === "live") ? [{ id: "guests", label: "Guests" }, { id: "settings", label: "Settings" }] : []),
    ...(moderator && (m?.status === "ended" || m?.status === "live") ? [{ id: "report", label: "Report" }] : []),
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : "overview";
  const [tone, label] = STATUS[m?.status] || STATUS.scheduled;
  const panel = { idPrefix: "md", className: "outline-none" };

  return (
    <>
      <div className="mtg-safe-t border-b border-gray-200 px-4 pt-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">{m?.title || "Meeting"}</h2>
            {m && (
              <Chip tone={tone} className="mt-1">
                {label}
              </Chip>
            )}
          </div>
          <Btn variant="ghost" size="icon" aria-label="Close meeting details" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </Btn>
        </div>
        <Tabs tabs={tabs} value={current} onChange={setTab} label="Meeting sections" idPrefix="md" className="mt-3 border-b-0" />
      </div>

      <div className="flex-1 overflow-y-auto" aria-busy={q.isLoading}>
        {q.isLoading && <SkeletonList rows={5} />}
        {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
        {m && (
          <>
            <TabPanel id="overview" active={current === "overview"} {...panel}>
              <OverviewTab meeting={m} moderator={moderator} onEdit={onEdit} />
            </TabPanel>
            <TabPanel id="updates" active={current === "updates"} {...panel}>
              <AnnouncementsTab meeting={m} moderator={moderator} />
            </TabPanel>
            <TabPanel id="notes" active={current === "notes"} {...panel}>
              <NotesTab meeting={m} />
            </TabPanel>
            <TabPanel id="actions" active={current === "actions"} {...panel}>
              <ActionItemsTab meeting={m} moderator={moderator} />
            </TabPanel>
            <TabPanel id="polls" active={current === "polls"} {...panel}>
              <PollsTab meeting={m} moderator={moderator} />
            </TabPanel>
            <TabPanel id="minutes" active={current === "minutes"} {...panel}>
              <MinutesTab meeting={m} />
            </TabPanel>
            <TabPanel id="feedback" active={current === "feedback"} {...panel}>
              <FeedbackTab meeting={m} moderator={moderator} />
            </TabPanel>
            <TabPanel id="guests" active={moderator && current === "guests"} {...panel}>
              <GuestsTab meeting={m} />
            </TabPanel>
            <TabPanel id="settings" active={moderator && current === "settings"} {...panel}>
              <SettingsTab meeting={m} />
            </TabPanel>
            <TabPanel id="report" active={moderator && current === "report"} {...panel}>
              <ReportTab meeting={m} />
            </TabPanel>
          </>
        )}
      </div>
    </>
  );
}

export default function MeetingDrawer({ id, onClose, onEdit }) {
  return (
    <Drawer open={!!id} onClose={onClose} label="Meeting details">
      {id && <DrawerBody key={id} id={id} onClose={onClose} onEdit={onEdit} />}
    </Drawer>
  );
}
