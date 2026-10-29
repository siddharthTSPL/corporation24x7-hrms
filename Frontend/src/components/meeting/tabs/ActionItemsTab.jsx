import { useState } from "react";
import toast from "react-hot-toast";
import { ListChecks, Trash2, Plus } from "lucide-react";
import Avatar from "../../chat/Avatar";
import { useMeetingActionItems, useCreateActionItem, useUpdateActionItem, useDeleteActionItem } from "../../../auth/server-state/meeting/meetingSpace.hook";
import { Btn, Chip, Empty, Spinner, ErrorNote, Tabs, cx, inputCls } from "../ui";
import { fmtDate, errMsg } from "../meetingUtils";

const PRIORITY = { high: "red", medium: "amber", low: "gray" };

export function ActionItemRow({ item, meetingId, canDelete, showMeeting, onOpenMeeting }) {
  const upd = useUpdateActionItem();
  const del = useDeleteActionItem();
  const done = item.status === "done";
  const id = meetingId || item.meetingId;
  const toggle = () => upd.mutate({ id, itemId: item.id, status: done ? "open" : "done" }, { onError: (e) => toast.error(errMsg(e)) });

  return (
    <li className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <input type="checkbox" checked={done} onChange={toggle} disabled={upd.isPending} aria-label={`Mark "${item.title}" as ${done ? "open" : "done"}`} className="mt-1 h-4 w-4 accent-[#730042]" />
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-medium", done ? "text-gray-400 line-through" : "text-gray-900")}>{item.title}</p>
        {item.details && <p className="mt-0.5 text-xs text-gray-500">{item.details}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={item.assignee?.name} photo={item.assignee?.photo} size={16} /> {item.assignee?.name}
          </span>
          {item.dueDate && <Chip tone={item.overdue ? "red" : "gray"}>{item.overdue ? "Overdue · " : "Due "}{fmtDate(item.dueDate)}</Chip>}
          <Chip tone={PRIORITY[item.priority]}>{item.priority}</Chip>
          {showMeeting && item.meeting && (
            <button onClick={() => onOpenMeeting?.(item.meetingId)} className="text-[#730042] underline-offset-2 hover:underline">
              {item.meeting.title}
            </button>
          )}
        </div>
      </div>
      {canDelete && (
        <Btn variant="dangerSoft" size="icon" aria-label="Delete action item" onClick={() => window.confirm("Delete this action item?") && del.mutate({ id, itemId: item.id })}>
          <Trash2 size={15} />
        </Btn>
      )}
    </li>
  );
}

function AddForm({ meeting: m, moderator }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("medium");
  const create = useCreateActionItem();
  const people = (m.attendees || []).filter((a) => a.rsvp !== "declined");

  const add = () => {
    if (!title.trim()) return;
    create.mutate(
      { id: m.id, title: title.trim(), priority, assigneeKey: assignee || undefined, dueDate: due ? new Date(`${due}T23:59`).toISOString() : undefined },
      { onSuccess: () => { setTitle(""); setDue(""); }, onError: (e) => toast.error(errMsg(e)) },
    );
  };

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Add an action item" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Btn loading={create.isPending} onClick={add} aria-label="Add action item">
          <Plus size={16} />
        </Btn>
      </div>
      <div className="flex flex-wrap gap-2">
        {moderator && (
          <select className={`${inputCls} w-auto!`} value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee">
            <option value="">Assign to me</option>
            {people.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <input type="date" className={`${inputCls} w-auto!`} value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
        <select className={`${inputCls} w-auto!`} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
      </div>
    </div>
  );
}

export default function ActionItemsTab({ meeting: m, moderator }) {
  const q = useMeetingActionItems(m.id);
  const [f, setF] = useState("all");
  const items = (q.data || []).filter((i) => f === "all" || i.status === f);

  return (
    <div className="space-y-4 p-5">
      {m.status !== "cancelled" && <AddForm meeting={m} moderator={moderator} />}
      <Tabs value={f} onChange={setF} tabs={[{ id: "all", label: "All" }, { id: "open", label: "Open" }, { id: "done", label: "Done" }]} />
      {q.isLoading && <Spinner />}
      {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
      {!q.isLoading && !q.isError && items.length === 0 && <Empty icon={ListChecks} title="No action items" hint="Capture follow-ups here so nothing gets lost after the call." />}
      <ul className="space-y-2">
        {items.map((i) => (
          <ActionItemRow key={i.id} item={i} meetingId={m.id} canDelete={moderator} />
        ))}
      </ul>
    </div>
  );
}
