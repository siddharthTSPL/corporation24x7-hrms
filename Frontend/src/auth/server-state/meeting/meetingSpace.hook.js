import { useEffect, useRef } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDiscoverMeetings,
  getMeetingSpace,
  updateMeetingSpace,
  setMeetingInterest,
  getInterestedPeople,
  promoteInterestedPeople,
  nudgeMeetingInvitees,
  createInstantMeeting,
  getMeetingInsights,
  getAnnouncements,
  createAnnouncement,
  previewAnnouncementAudience,
  markAnnouncementSeen,
  markAllAnnouncementsSeen,
  getAnnouncementViewers,
  updateAnnouncement,
  deleteAnnouncement,
  getMeetingNotes,
  saveMeetingNotes,
  shareMeetingNotes,
  getMeetingActionItems,
  createMeetingActionItem,
  updateMeetingActionItem,
  deleteMeetingActionItem,
  getMyActionItems,
  getMeetingPolls,
  createMeetingPoll,
  voteMeetingPoll,
  closeMeetingPoll,
  deleteMeetingPoll,
  getMeetingFeedbackSummary,
  getMyMeetingFeedback,
  submitMeetingFeedback,
} from "../../api/meeting/meetingSpace.api";
import { MEETING_KEYS } from "./meeting.hook";

export const MEETING_SPACE_KEYS = {
  all: ["meetingSpace"],
  discover: (p) => ["meetingSpace", "discover", p || {}],
  space: (id) => ["meetingSpace", "space", id],
  interested: (id) => ["meetingSpace", "interested", id],
  insights: (p) => ["meetingSpace", "insights", p || {}],
  announcements: (id, p) => ["meetingSpace", "announcements", id, p || {}],
  announcementsOf: (id) => ["meetingSpace", "announcements", id],
  viewers: (id, aid) => ["meetingSpace", "viewers", id, aid],
  notes: (id) => ["meetingSpace", "notes", id],
  actionItems: (id, p) => ["meetingSpace", "actionItems", id, p || {}],
  actionItemsOf: (id) => ["meetingSpace", "actionItems", id],
  myActionItems: (p) => ["meetingSpace", "myActionItems", p || {}],
  polls: (id) => ["meetingSpace", "polls", id],
  feedback: (id) => ["meetingSpace", "feedback", id],
  myFeedback: (id) => ["meetingSpace", "myFeedback", id],
};

export const MEETING_SPACE_EVENTS = [
  "meeting:announcement",
  "meeting:announcement:updated",
  "meeting:announcement:deleted",
  "meeting:interest",
  "meeting:notes",
  "meeting:action-item",
  "meeting:poll",
  "meeting:feedback",
];

export const patchAnnouncementSeen = (qc, meetingId, announcementId, seenCount) => {
  qc.setQueriesData({ queryKey: MEETING_SPACE_KEYS.announcementsOf(meetingId) }, (old) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        announcements: page.announcements.map((a) => (a.id === announcementId ? { ...a, seenCount } : a)),
      })),
    };
  });
  qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.viewers(meetingId, announcementId) });
};

const invalidateSpace = (qc, id) => {
  qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.space(id) });
  qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.interested(id) });
  qc.invalidateQueries({ queryKey: [...MEETING_SPACE_KEYS.all, "discover"] });
  qc.invalidateQueries({ queryKey: MEETING_KEYS.all });
};

export const useDiscoverMeetings = (params = {}, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.discover(params),
    queryFn: () => getDiscoverMeetings(params),
    enabled,
    staleTime: 20000,
    refetchOnWindowFocus: true,
    select: (d) => d.meetings,
  });

export const useMeetingSpace = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.space(id),
    queryFn: () => getMeetingSpace(id),
    enabled: enabled && !!id,
    staleTime: 10000,
    select: (d) => d.meeting,
  });

export const useUpdateMeetingSpace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMeetingSpace,
    onSuccess: (_, v) => invalidateSpace(qc, v.id),
  });
};

const patchInterest = (qc, id, interested) => {
  const bump = (m) => {
    if (m.id !== id || m.myInterest === interested) return m;
    return { ...m, myInterest: interested, interestedCount: Math.max(0, m.interestedCount + (interested ? 1 : -1)) };
  };
  qc.setQueriesData({ queryKey: [...MEETING_SPACE_KEYS.all, "discover"] }, (old) => (old?.meetings ? { ...old, meetings: old.meetings.map(bump) } : old));
  qc.setQueryData(MEETING_SPACE_KEYS.space(id), (old) => (old?.meeting ? { ...old, meeting: bump(old.meeting) } : old));
};

export const useSetMeetingInterest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setMeetingInterest,
    onMutate: ({ id, interested = true }) => patchInterest(qc, id, interested),
    onError: (_, v) => invalidateSpace(qc, v.id),
    onSuccess: (_, v) => invalidateSpace(qc, v.id),
  });
};

export const useInterestedPeople = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.interested(id),
    queryFn: () => getInterestedPeople(id),
    enabled: enabled && !!id,
    staleTime: 10000,
  });

export const usePromoteInterestedPeople = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: promoteInterestedPeople,
    onSuccess: (_, v) => {
      invalidateSpace(qc, v.id);
      qc.invalidateQueries({ queryKey: MEETING_KEYS.one(v.id) });
    },
  });
};

export const useNudgeMeetingInvitees = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: nudgeMeetingInvitees,
    onSuccess: () => qc.invalidateQueries({ queryKey: MEETING_KEYS.all }),
  });
};

export const useCreateInstantMeeting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createInstantMeeting,
    onSuccess: () => qc.invalidateQueries({ queryKey: MEETING_KEYS.all }),
  });
};

export const useMeetingInsights = (params = {}, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.insights(params),
    queryFn: () => getMeetingInsights(params),
    enabled,
    staleTime: 60000,
  });

export const useAnnouncements = (id, { limit = 20, unseen = false } = {}, enabled = true) =>
  useInfiniteQuery({
    queryKey: MEETING_SPACE_KEYS.announcements(id, { limit, unseen }),
    queryFn: ({ pageParam }) => getAnnouncements({ id, before: pageParam, limit, unseen }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: enabled && !!id,
    staleTime: 10000,
    select: (d) => ({
      announcements: d.pages.flatMap((p) => p.announcements),
      unseenCount: d.pages[0]?.unseenCount ?? 0,
    }),
  });

export const useCreateAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.announcementsOf(v.id) }),
  });
};

export const usePreviewAnnouncementAudience = () => useMutation({ mutationFn: previewAnnouncementAudience });

const markSeenInCache = (qc, id, aids) => {
  const ids = new Set(aids);
  qc.setQueriesData({ queryKey: MEETING_SPACE_KEYS.announcementsOf(id) }, (old) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page, i) => ({
        ...page,
        unseenCount: i === 0 ? Math.max(0, (page.unseenCount || 0) - ids.size) : page.unseenCount,
        announcements: page.announcements.map((a) => (ids.has(a.id) && !a.seenByMe ? { ...a, seenByMe: true, seenCount: a.seenCount + 1 } : a)),
      })),
    };
  });
};

export const useMarkAnnouncementSeen = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAnnouncementSeen,
    onMutate: ({ id, aid }) => markSeenInCache(qc, id, [aid]),
    onError: (_, v) => qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.announcementsOf(v.id) }),
  });
};

export const useMarkAllAnnouncementsSeen = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllAnnouncementsSeen,
    onSettled: (_, __, id) => qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.announcementsOf(id) }),
  });
};

export const useAutoMarkAnnouncementsSeen = (id, announcements, active = true) => {
  const { mutate } = useMarkAllAnnouncementsSeen();
  const sent = useRef(new Set());
  useEffect(() => {
    if (!active || !id || !announcements?.length) return;
    const fresh = announcements.filter((a) => !a.seenByMe && !sent.current.has(a.id));
    if (!fresh.length) return;
    fresh.forEach((a) => sent.current.add(a.id));
    mutate(id);
  }, [active, id, announcements, mutate]);
};

export const useAnnouncementViewers = (id, aid, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.viewers(id, aid),
    queryFn: () => getAnnouncementViewers({ id, aid }),
    enabled: enabled && !!id && !!aid,
    staleTime: 5000,
  });

export const useUpdateAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateAnnouncement,
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.announcementsOf(v.id) }),
  });
};

export const useDeleteAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.announcementsOf(v.id) }),
  });
};

export const useMeetingNotes = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.notes(id),
    queryFn: () => getMeetingNotes(id),
    enabled: enabled && !!id,
    staleTime: 10000,
  });

export const useSaveMeetingNotes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMeetingNotes,
    onSuccess: (data, v) => qc.setQueryData(MEETING_SPACE_KEYS.notes(v.id), (old) => ({ ...(old || {}), success: true, canEdit: true, note: data.note })),
    onError: (e, v) => {
      if (e.status === 409) qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.notes(v.id) });
    },
  });
};

export const useShareMeetingNotes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shareMeetingNotes,
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.notes(v.id) }),
  });
};

export const useMeetingActionItems = (id, params = {}, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.actionItems(id, params),
    queryFn: () => getMeetingActionItems({ id, ...params }),
    enabled: enabled && !!id,
    staleTime: 10000,
    select: (d) => d.actionItems,
  });

const useActionItemMutation = (fn) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.actionItemsOf(v.id) });
      qc.invalidateQueries({ queryKey: [...MEETING_SPACE_KEYS.all, "myActionItems"] });
    },
  });
};

export const useCreateActionItem = () => useActionItemMutation(createMeetingActionItem);
export const useUpdateActionItem = () => useActionItemMutation(updateMeetingActionItem);
export const useDeleteActionItem = () => useActionItemMutation(deleteMeetingActionItem);

export const useMyActionItems = (params = {}, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.myActionItems(params),
    queryFn: () => getMyActionItems(params),
    enabled,
    staleTime: 15000,
    refetchOnWindowFocus: true,
  });

export const useMeetingPolls = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.polls(id),
    queryFn: () => getMeetingPolls(id),
    enabled: enabled && !!id,
    staleTime: 5000,
    refetchInterval: (query) => (query.state.data?.polls?.some((p) => p.status === "open") ? 10000 : false),
    select: (d) => d.polls,
  });

export const useCreatePoll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMeetingPoll,
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.polls(v.id) }),
  });
};

export const useVotePoll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: voteMeetingPoll,
    onSuccess: (data, v) =>
      qc.setQueryData(MEETING_SPACE_KEYS.polls(v.id), (old) => (old?.polls ? { ...old, polls: old.polls.map((p) => (p.id === data.poll.id ? data.poll : p)) } : old)),
  });
};

export const useClosePoll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: closeMeetingPoll,
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.polls(v.id) }),
  });
};

export const useDeletePoll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMeetingPoll,
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.polls(v.id) }),
  });
};

export const useMyMeetingFeedback = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.myFeedback(id),
    queryFn: () => getMyMeetingFeedback(id),
    enabled: enabled && !!id,
    staleTime: 30000,
  });

export const useSubmitMeetingFeedback = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitMeetingFeedback,
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.myFeedback(v.id) });
      qc.invalidateQueries({ queryKey: MEETING_SPACE_KEYS.feedback(v.id) });
    },
  });
};

export const useMeetingFeedbackSummary = (id, enabled = true) =>
  useQuery({
    queryKey: MEETING_SPACE_KEYS.feedback(id),
    queryFn: () => getMeetingFeedbackSummary(id),
    enabled: enabled && !!id,
    staleTime: 15000,
  });
