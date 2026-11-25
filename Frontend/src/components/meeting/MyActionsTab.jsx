import { useState } from "react";
import { ListChecks } from "lucide-react";
import { useMyActionItems } from "../../auth/server-state/meeting/meetingSpace.hook";
import { ActionItemRow } from "./tabs/ActionItemsTab";
import { Empty, SkeletonList, ErrorNote } from "./ui";
import { cx } from "./meetingClasses";

const FILTERS = {
  open: { status: "open" },
  overdue: { overdue: true },
  done: { status: "done" },
};
const LABELS = { open: "Open", overdue: "Overdue", done: "Done" };

export default function MyActionsTab({ onOpen }) {
  const [f, setF] = useState("open");
  const q = useMyActionItems({ ...FILTERS[f], limit: 100 });
  const items = q.data?.actionItems || [];

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter my action items" className="inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white">
        {Object.keys(FILTERS).map((k) => (
          <button key={k} type="button" aria-pressed={f === k} onClick={() => setF(k)} className={cx("min-h-10 border-r border-gray-300 px-5 text-sm last:border-r-0", f === k ? "bg-[#730042] text-white" : "text-gray-700 hover:bg-gray-50")}>
            {LABELS[k]}
          </button>
        ))}
      </div>
      {q.isLoading && <SkeletonList />}
      {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
      {!q.isLoading && !q.isError && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white">
          <Empty icon={ListChecks} title={f === "overdue" ? "Nothing overdue" : f === "done" ? "Nothing completed yet" : "You're all caught up"} hint="Action items assigned to you in meetings show up here." />
        </div>
      )}
      <ul className="space-y-2">
        {items.map((i) => (
          <ActionItemRow key={i.id} item={i} showMeeting onOpenMeeting={onOpen} />
        ))}
      </ul>
    </div>
  );
}