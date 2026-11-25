import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus, Trash2, ImageOff, Lock } from "lucide-react";
import { Modal, Btn, Tabs, TabPanel, Field, Empty, QueryState, SkeletonList } from "./ui";
import { inputCls } from "./meetingClasses";
import { MEETING_TOGGLES, REMINDERS, errMsg } from "./meetingUtils";
import {
  useMeetingDefaults,
  useUpdateMeetingDefaults,
  useMeetingBackgrounds,
  useUploadMeetingBackground,
  useDeleteMeetingBackground,
} from "../../auth/server-state/meeting/meeting.hook";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

function DefaultsForm({ initial, canEdit }) {
  const update = useUpdateMeetingDefaults();
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const setSetting = (patch) => setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const save = () =>
    update.mutate(draft, {
      onSuccess: () => toast.success("Default meeting settings saved"),
      onError: (e) => toast.error(errMsg(e)),
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        These apply to every new meeting in your organisation. Hosts can still change them for an individual meeting.
      </p>
      {!canEdit && (
        <p className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <Lock size={15} aria-hidden="true" /> Only admins can change these.
        </p>
      )}
      <fieldset disabled={!canEdit || update.isPending} className="space-y-4">
        <legend className="sr-only">Default meeting settings</legend>
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {MEETING_TOGGLES.map(([key, label, hint]) => (
            <li key={key} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-600">{hint}</p>
              </div>
              <input type="checkbox" role="switch" aria-label={label} checked={!!draft.settings[key]} onChange={(e) => setSetting({ [key]: e.target.checked })} className="h-5 w-5 shrink-0 accent-[#730042]" />
            </li>
          ))}
          <li className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Let people join before the host</p>
              <p className="text-xs text-gray-600">Attendees can enter the room when it opens, even if the host hasn't arrived.</p>
            </div>
            <input type="checkbox" role="switch" aria-label="Let people join before the host" checked={draft.allowJoinBeforeHost} onChange={(e) => setDraft((d) => ({ ...d, allowJoinBeforeHost: e.target.checked }))} className="h-5 w-5 shrink-0 accent-[#730042]" />
          </li>
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Who can share their screen">
            <select className={inputCls} value={draft.settings.screenShare} onChange={(e) => setSetting({ screenShare: e.target.value })}>
              <option value="everyone">Everyone</option>
              <option value="host">Host and co-hosts only</option>
            </select>
          </Field>
          <Field label="Remind attendees">
            <select className={inputCls} value={draft.reminderMinutes} onChange={(e) => setDraft((d) => ({ ...d, reminderMinutes: Number(e.target.value) }))}>
              {REMINDERS.map((r) => (
                <option key={r} value={r}>
                  {r === 0 ? "No reminder" : `${r} minutes before`}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end">
          <Btn loading={update.isPending} disabled={!dirty} onClick={save}>
            Save defaults
          </Btn>
        </div>
      )}
    </div>
  );
}

function DefaultsPanel() {
  const q = useMeetingDefaults();
  return (
    <QueryState query={q} skeleton={<SkeletonList rows={5} className="p-0" />}>
      {q.data && <DefaultsForm initial={q.data.defaults} canEdit={q.data.canEdit} />}
    </QueryState>
  );
}

function BackgroundsPanel() {
  const q = useMeetingBackgrounds();
  const upload = useUploadMeetingBackground();
  const remove = useDeleteMeetingBackground();
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const list = q.data?.organisation || [];
  const cap = q.data?.limits?.organisation || 30;

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error("Use a PNG, JPG or WebP image.");
    if (file.size > MAX_BYTES) return toast.error("Images can be up to 5 MB.");
    upload.mutate(
      { file, name: name.trim() || undefined, scope: "organisation" },
      {
        onSuccess: () => {
          setName("");
          toast.success("Background added for everyone");
        },
        onError: (err) => toast.error(errMsg(err)),
      },
    );
  };

  const del = (bg) => {
    if (!window.confirm(`Delete "${bg.name}"? People using it will switch back to no effect.`)) return;
    remove.mutate(bg.id, { onSuccess: () => toast.success("Background deleted"), onError: (err) => toast.error(errMsg(err)) });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Organisation backgrounds appear in everyone's camera effects. PNG, JPG or WebP up to 5 MB.</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Name (optional)" className="flex-1">
          <input className={inputCls} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office lobby" />
        </Field>
        <input ref={fileRef} type="file" accept={TYPES.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onPick} />
        <Btn loading={upload.isPending} disabled={list.length >= cap} onClick={() => fileRef.current?.click()}>
          <ImagePlus size={16} aria-hidden="true" /> Upload image
        </Btn>
      </div>
      <p className="text-xs text-gray-600">
        {list.length} of {cap} used
      </p>
      <QueryState query={q} skeleton={<SkeletonList rows={3} className="p-0" />}>
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300">
            <Empty icon={ImageOff} title="No organisation backgrounds yet" hint="Upload an image and it becomes available to everyone in meetings." />
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((bg) => (
              <li key={bg.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <img src={bg.thumbUrl} alt={bg.name} loading="lazy" className="aspect-video w-full bg-gray-100 object-cover" />
                <div className="flex items-center gap-2 p-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800">{bg.name}</p>
                  <Btn variant="dangerSoft" size="icon" aria-label={`Delete ${bg.name}`} loading={remove.isPending && remove.variables === bg.id} onClick={() => del(bg)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}

export default function MeetingAdminSettings({ onClose }) {
  const [tab, setTab] = useState("defaults");
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Meeting settings"
      footer={
        <Btn variant="secondary" onClick={onClose}>
          Close
        </Btn>
      }
    >
      <Tabs
        tabs={[
          { id: "defaults", label: "Default settings" },
          { id: "backgrounds", label: "Backgrounds" },
        ]}
        value={tab}
        onChange={setTab}
        label="Meeting settings sections"
        idPrefix="as"
        className="mb-4"
      />
      <TabPanel id="defaults" idPrefix="as" active={tab === "defaults"} className="outline-none">
        <DefaultsPanel />
      </TabPanel>
      <TabPanel id="backgrounds" idPrefix="as" active={tab === "backgrounds"} className="outline-none">
        <BackgroundsPanel />
      </TabPanel>
    </Modal>
  );
}
