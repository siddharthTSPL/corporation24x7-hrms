import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  respondToMeeting,
  endMeeting,
  getMeetingJoinInfo,
  downloadMeetingIcs,
  checkAvailability,
  getMeetingCalendar,
} from "../../api/meeting/meeting.api";

export const MEETING_KEYS = {
  all: ["meetings"],
  list: (p) => ["meetings", "list", p || {}],
  one: (id) => ["meetings", "one", id],
  joinInfo: (id) => ["meetings", "joinInfo", id],
};

// Live changes (invites, reschedules, RSVPs, "meeting started") invalidate
// ["meetings"] from src/realtime/useChatRealtime.js, so these stay fresh.

// params: { from, to, status, hosting, limit } - defaults: yesterday .. +60 days, not cancelled
export const useMeetings = (params = {}, enabled = true) =>
  useQuery({
    queryKey: MEETING_KEYS.list(params),
    queryFn: () => getMeetings(params),
    enabled,
    staleTime: 15000,
    refetchOnWindowFocus: true,
    select: (d) => d.meetings,
  });

export const useMeeting = (id) =>
  useQuery({
    queryKey: MEETING_KEYS.one(id),
    queryFn: () => getMeeting(id),
    enabled: !!id,
    staleTime: 10000,
    select: (d) => d.meeting,
  });

// Can I join right now? Re-checks every 20 s so a "too early" screen unlocks itself.
export const useMeetingJoinInfo = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_KEYS.joinInfo(id),
    queryFn: () => getMeetingJoinInfo(id),
    enabled: enabled && !!id,
    refetchInterval: 20000,
    staleTime: 0,
  });

const useMeetingMutation = (fn) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: MEETING_KEYS.all }),
  });
};

// Resolves { meeting, occurrences, conflicts } - show `conflicts` as a warning, the meeting is already created.
export const useCreateMeeting = () => useMeetingMutation(createMeeting);
export const useUpdateMeeting = () => useMeetingMutation(updateMeeting); // { id, ...fields }
export const useCancelMeeting = () => useMeetingMutation(cancelMeeting); // { id, scope: "this"|"series", reason? }
export const useRespondToMeeting = () => useMeetingMutation(respondToMeeting); // { id, rsvp: "accepted"|"declined"|"tentative" }
export const useEndMeeting = () => useMeetingMutation(endMeeting); // (id)

// "Add to calendar": triggers a browser download of the .ics file.
export const useDownloadMeetingIcs = () =>
  useMutation({
    mutationFn: async (id) => {
      const blob = await downloadMeetingIcs(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-${id}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });

// Busy check while picking a time: mutate({ people, startTime, endTime, excludeMeetingId? })
export const useCheckAvailability = () => useMutation({ mutationFn: checkAvailability });

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// month: "YYYY-MM". Every meeting mutation invalidates ["meetings"], so a newly scheduled /
// rescheduled / cancelled meeting shows up here without a refresh.
export const useMeetingCalendar = (month, enabled = true) =>
  useQuery({
    queryKey: [...MEETING_KEYS.all, "calendar", month, LOCAL_TZ],
    queryFn: () => getMeetingCalendar({ month, tz: LOCAL_TZ }),
    enabled: enabled && /^\d{4}-\d{2}$/.test(month || ""),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

// For small calendars (dashboards): Map<dayOfMonth, [{ id, title, startTime, status }]>.
// month0 is a 0-based month index like the dashboard calendars use.
export const useMeetingDays = (month0, year) => {
  const key = `${year}-${String(month0 + 1).padStart(2, "0")}`;
  const { data } = useMeetingCalendar(key);
  return useMemo(() => {
    const map = new Map();
    if (!data) return map;
    const byId = new Map((data.meetings || []).map((m) => [m.id, m]));
    for (const [dayKey, ids] of Object.entries(data.days || {})) {
      if (!dayKey.startsWith(key)) continue;
      const day = Number(dayKey.slice(8, 10));
      const list = ids.map((id) => byId.get(id)).filter(Boolean).map((m) => ({ id: m.id, title: m.title, startTime: m.startTime, status: m.status }));
      if (list.length) map.set(day, list);
    }
    return map;
  }, [data, key]);
};
