import { useState } from "react";
import { ListChecks } from "lucide-react";
import { useMyActionItems } from "../../auth/server-state/meeting/meetingSpace.hook";
import { ActionItemRow } from "./tabs/ActionItemsTab";
import { Empty, Spinner, ErrorNote, Tabs } from "./ui";

const FILTERS = {
  open: { status: "open" },
  overdue: { overdue: true },
  done: { status: "done" },
};

export default function MyActionsTab({ onOpen }) {
  const [f, setF] = useState("open");
  const q = useMyActionItems({ ...FILTERS[f], limit: 100 });
  const items = q.data?.actionItems || [];

  return (
    <div className="space-y-4">
      <Tabs value={f} onChange={setF} tabs={[{ id: "open", label: "Open" }, { id: "overdue", label: "Overdue" }, { id: "done", label: "Done" }]} />
      {q.isLoading && <Spinner />}
      {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
      {!q.isLoading && !q.isError && items.length === 0 && <Empty icon={ListChecks} title={f === "overdue" ? "Nothing overdue" : f === "done" ? "Nothing completed yet" : "You're all caught up"} hint="Action items assigned to you in meetings show up here." />}
      <ul className="space-y-2">
        {items.map((i) => (
          <ActionItemRow key={i.id} item={i} showMeeting onOpenMeeting={onOpen} />
        ))}
      </ul>
    </div>
  );
}
