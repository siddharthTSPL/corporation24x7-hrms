import { useEffect, useRef } from "react";
import useCall from "../../../../realtime/useCall";
import { useMeetingTranscript, useShareMeetingTranscript, useDownloadMeetingTranscript } from "../../../../auth/server-state/meeting/meetingLive.hook";
import { PanelHeader } from "../RoomMedia";
import { useLiveStore } from "./liveStore";
import { captionsSupported } from "./useCaptions";
import { act, PillButton, Empty } from "./liveUi";

const LANGS = [["en-IN", "English (India)"], ["en-US", "English (US)"], ["en-GB", "English (UK)"], ["hi-IN", "Hindi"]];

export default function TranscriptPanel({ onClose, captionsOn, onCaptions, mySpeech, onMySpeech, lang, onLang }) {
  const { active, isHost } = useCall();
  const meetingId = active?.meetingId;
  const live = useLiveStore((s) => s.captions);
  const { data, error, isLoading } = useMeetingTranscript(meetingId, true);
  const share = useShareMeetingTranscript();
  const download = useDownloadMeetingTranscript();
  const endRef = useRef(null);

  const blocked = error?.status === 403;
  const saved = data?.lines || [];
  const mine = live.filter((c) => c.final); // what this device heard live; used while the saved transcript is not available
  const lines = blocked || !saved.length ? mine.map((c) => ({ key: c.id, name: c.name, text: c.text, at: c.at })) : saved;

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [lines.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Captions & transcript" subtitle="Live captions and the saved transcript" onClose={onClose} />

      <div className="space-y-3 border-b border-white/10 px-4 py-3">
        {!captionsSupported() && <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">Your browser can't turn your speech into captions. You will still see captions from others.</p>}
        <label className="flex items-center justify-between text-sm text-white">
          Show live captions
          <input type="checkbox" className="h-4 w-4 accent-[#CD166E]" checked={captionsOn} onChange={(e) => onCaptions(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between text-sm text-white">
          Caption my speech
          <input type="checkbox" className="h-4 w-4 accent-[#CD166E]" checked={mySpeech} disabled={!captionsSupported()} onChange={(e) => onMySpeech(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-white">
          I speak
          <select value={lang} onChange={(e) => onLang(e.target.value)} className="rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white outline-none">
            {LANGS.map(([v, l]) => <option key={v} value={v} className="text-gray-900">{l}</option>)}
          </select>
        </label>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {isLoading && <p className="py-6 text-center text-xs text-gray-500">Loading transcript…</p>}
        {blocked && <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400">The host hasn't shared the full transcript. You can see captions from this session below.</p>}
        {!isLoading && !lines.length && <Empty icon="📝" title="No transcript yet" hint="Lines appear here as people speak." />}
        {lines.map((l, i) => (
          <div key={l.key || i}>
            <p className="text-[11px] font-semibold text-gray-400">{l.name || "Someone"}{l.at ? <span className="ml-2 font-normal text-gray-600">{new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> : null}</p>
            <p className="text-sm text-gray-100">{l.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3">
        {isHost && data?.canShare !== false && !blocked && (
          <PillButton disabled={share.isPending} onClick={() => act(() => share.mutateAsync({ id: meetingId, shared: !data?.shared }))}>
            {data?.shared ? "Stop sharing with attendees" : "Share with attendees"}
          </PillButton>
        )}
        {!blocked && saved.length > 0 && <PillButton tone="light" disabled={download.isPending} onClick={() => act(() => download.mutateAsync(meetingId))}>Download .txt</PillButton>}
      </div>
    </div>
  );
}
