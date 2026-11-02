import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMeetingQuestions,
  getMeetingKudos,
  getMyKudos,
  getKudosLeaderboard,
  getMeetingBoard,
  getMeetingTranscript,
  downloadMeetingTranscriptTxt,
  shareMeetingTranscript,
  getMeetingMinutes,
  downloadMeetingMinutesMd,
} from "../../api/meeting/meetingLive.api";

export const MEETING_LIVE_KEYS = {
  all: ["meetingLive"],
  questions: (id) => ["meetingLive", "questions", id],
  kudos: (id) => ["meetingLive", "kudos", id],
  myKudos: (p) => ["meetingLive", "myKudos", p || {}],
  leaderboard: (p) => ["meetingLive", "leaderboard", p || {}],
  board: (id) => ["meetingLive", "board", id],
  transcript: (id) => ["meetingLive", "transcript", id],
  minutes: (id) => ["meetingLive", "minutes", id],
};

// Socket events that mean one of these queries is stale. Wire them next to MEETING_SPACE_EVENTS
// in useChatRealtime.js if you want the lists to refresh on their own:
//   for (const ev of MEETING_LIVE_EVENTS) socket.on(ev, () => qc.invalidateQueries({ queryKey: MEETING_LIVE_KEYS.all }));
export const MEETING_LIVE_EVENTS = ["meeting:transcript", "meeting:kudos-received"];

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// While the meeting runs the socket pushes new questions, so a slow poll is only a safety net.
export const useMeetingQuestions = (id, enabled = true, { poll = false } = {}) =>
  useQuery({
    queryKey: MEETING_LIVE_KEYS.questions(id),
    queryFn: () => getMeetingQuestions(id),
    enabled: enabled && !!id,
    staleTime: 5000,
    refetchInterval: poll ? 15000 : false,
    select: (d) => d.questions,
  });

export const useMeetingKudos = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_LIVE_KEYS.kudos(id),
    queryFn: () => getMeetingKudos(id),
    enabled: enabled && !!id,
    staleTime: 10000,
    select: (d) => d.kudos,
  });

// params: { days } - { days, receivedCount, givenCount, received, given }
export const useMyKudos = (params = {}, enabled = true) =>
  useQuery({
    queryKey: MEETING_LIVE_KEYS.myKudos(params),
    queryFn: () => getMyKudos(params),
    enabled,
    staleTime: 30000,
  });

// params: { days } - { days, topReceivers, topGivers }
export const useKudosLeaderboard = (params = {}, enabled = true) =>
  useQuery({
    queryKey: MEETING_LIVE_KEYS.leaderboard(params),
    queryFn: () => getKudosLeaderboard(params),
    enabled,
    staleTime: 60000,
  });

export const useMeetingBoard = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_LIVE_KEYS.board(id),
    queryFn: () => getMeetingBoard(id),
    enabled: enabled && !!id,
    staleTime: 10000,
  });

// Attendees get a 403 until the host shares it - that is an answer, not something to retry.
export const useMeetingTranscript = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_LIVE_KEYS.transcript(id),
    queryFn: () => getMeetingTranscript(id),
    enabled: enabled && !!id,
    staleTime: 10000,
    retry: (count, e) => e?.status !== 403 && count < 2,
  });

// mutate({ id, shared?: boolean })
export const useShareMeetingTranscript = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shareMeetingTranscript,
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: MEETING_LIVE_KEYS.transcript(v.id) }),
  });
};

export const useDownloadMeetingTranscript = () =>
  useMutation({
    mutationFn: async (id) => saveBlob(await downloadMeetingTranscriptTxt(id), `meeting-transcript-${id}.txt`),
  });

// { minutes, markdown }
export const useMeetingMinutes = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_LIVE_KEYS.minutes(id),
    queryFn: () => getMeetingMinutes(id),
    enabled: enabled && !!id,
    staleTime: 15000,
  });

export const useDownloadMeetingMinutes = () =>
  useMutation({
    mutationFn: async (id) => saveBlob(await downloadMeetingMinutesMd(id), `meeting-minutes-${id}.md`),
  });
