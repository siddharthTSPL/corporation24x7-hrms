import { useState } from "react";
import toast from "react-hot-toast";
import { Pin, Trash2, Megaphone, Eye } from "lucide-react";
import Avatar from "../../chat/Avatar";
import { useAnnouncements, useAutoMarkAnnouncementsSeen, useCreateAnnouncement, useDeleteAnnouncement, useUpdateAnnouncement } from "../../../auth/server-state/meeting/meetingSpace.hook";
import { Btn, Chip, Empty, Spinner, ErrorNote, inputCls } from "../ui";
import { fmtDateTime, errMsg } from "../meetingUtils";

const AUDIENCES = {
  all: { label: "Everyone invited", to: { attendees: true, rsvp: [] } },
  going: { label: "People going or maybe", to: { attendees: true, rsvp: ["accepted", "tentative"] } },
  pending: { label: "People who haven't replied", to: { attendees: true, rsvp: ["invited"] } },
};

function Compose({ meeting: m }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [pinned, setPinned] = useState(false);
  const [aud, setAud] = useState("all");
  const [guests, setGuests] = useState(false);
  const [interested, setInterested] = useState(false);
  const create = useCreateAnnouncement();

  const send = () => {
    if (!text.trim()) return toast.error("Write a message first");
    create.mutate(
      { id: m.id, title: title.trim(), text: text.trim(), pinned, to: { ...AUDIENCES[aud].to, guests, interested } },
      {
        onSuccess: () => {
          setTitle("");
          setText("");
          setPinned(false);
          toast.success("Announcement sent");
        },
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <input className={inputCls} placeholder="Title (optional)" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={inputCls} rows={3} maxLength={3000} placeholder="Share an update with the attendees" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <select className={`${inputCls} w-auto!`} value={aud} onChange={(e) => setAud(e.target.value)} aria-label="Audience">
          {Object.entries(AUDIENCES).map(([k, a]) => (
            <option key={k} value={k}>
              {a.label}
            </option>
          ))}
        </select>
        {m.guestCount > 0 && (
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input type="checkbox" className="accent-[#730042]" checked={guests} onChange={(e) => setGuests(e.target.checked)} /> Include guests
          </label>
        )}
        {m.visibility === "organisation" && (
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input type="checkbox" className="accent-[#730042]" checked={interested} onChange={(e) => setInterested(e.target.checked)} /> Include interested people
          </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input type="checkbox" className="accent-[#730042]" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
        </label>
        <Btn size="sm" className="ml-auto" loading={create.isPending} onClick={send}>
          Send
        </Btn>
      </div>
    </div>
  );
}

export default function AnnouncementsTab({ meeting: m, moderator }) {
  const q = useAnnouncements(m.id, { limit: 20 });
  const items = q.data?.announcements || [];
  useAutoMarkAnnouncementsSeen(m.id, items, true);
  const del = useDeleteAnnouncement();
  const upd = useUpdateAnnouncement();
  const canPost = moderator && m.status !== "cancelled";

  return (
    <div className="space-y-4 p-5">
      {canPost && <Compose meeting={m} />}
      {q.isLoading && <Spinner />}
      {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
      {!q.isLoading && !q.isError && items.length === 0 && <Empty icon={Megaphone} title="No announcements yet" hint={canPost ? "Updates you send here also reach attendees as notifications." : "The host's updates will show up here."} />}

      <ul className="space-y-3">
        {[...items].sort((a, b) => Number(b.pinned) - Number(a.pinned)).map((a) => (
          <li key={a.id} className={`rounded-xl border bg-white p-4 ${a.seenByMe ? "border-gray-200" : "border-[#CD166E]/40"}`}>
            <div className="flex items-start gap-3">
              <Avatar name={a.author?.name} photo={a.author?.photo} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-800">{a.author?.name}</span>
                  <span>{fmtDateTime(a.createdAt)}</span>
                  {a.pinned && (
                    <Chip tone="brand">
                      <Pin size={10} /> Pinned
                    </Chip>
                  )}
                </div>
                {a.title && <p className="mt-1.5 text-sm font-semibold text-gray-900">{a.title}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{a.text}</p>
                {a.canManage && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400">
                    <Eye size={12} /> Seen by {a.seenCount} of {a.recipientCount}
                  </p>
                )}
              </div>
              {a.canManage && (
                <div className="flex shrink-0 gap-1">
                  <Btn variant="ghost" size="icon" aria-label={a.pinned ? "Unpin" : "Pin"} onClick={() => upd.mutate({ id: m.id, aid: a.id, pinned: !a.pinned })}>
                    <Pin size={15} />
                  </Btn>
                  <Btn variant="dangerSoft" size="icon" aria-label="Delete announcement" onClick={() => window.confirm("Delete this announcement?") && del.mutate({ id: m.id, aid: a.id })}>
                    <Trash2 size={15} />
                  </Btn>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {q.hasNextPage && (
        <div className="text-center">
          <Btn variant="secondary" size="sm" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            Load older
          </Btn>
        </div>
      )}
    </div>
  );
}
