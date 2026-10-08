import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  Meeting,
  CurrentMeetings,
  MemberSummary,
  RemovedMember,
  BookVoteStatus,
  BookResultsResponse,
  DateResultsResponse,
} from "../types";

// ── Meetings ──────────────────────────────────────────────────────────────────

/** Upcoming finalized meetings and the one being planned, for the dashboard */
export function useCurrentMeetings() {
  return useQuery<CurrentMeetings>({
    queryKey: ["meetings", "current"],
    queryFn: () => api.get("/meetings/current"),
  });
}

export function useMeeting(meetingId: number) {
  return useQuery<Meeting>({
    queryKey: ["meeting", meetingId],
    queryFn: () => api.get(`/meetings/${meetingId}`),
    enabled: !!meetingId,
  });
}

/** Meetings that have happened, for the archive */
export function useMeetings() {
  return useQuery<Meeting[]>({
    queryKey: ["meetings", "archive"],
    queryFn: () => api.get("/meetings"),
  });
}

export function useMembers() {
  return useQuery<MemberSummary[]>({
    queryKey: ["members"],
    queryFn: () => api.get("/members"),
  });
}

// ── Member admin ──────────────────────────────────────────────────────────────

/** Admin only — the backend rejects everyone else */
export function useRemovedMembers(enabled: boolean) {
  return useQuery<RemovedMember[], Error>({
    queryKey: ["members", "removed"],
    queryFn: () => api.get("/members/removed"),
    enabled,
  });
}

/** Shared by the admin actions: they all change who's listed and who's admin */
function useMembershipMutation<TVar>(fn: (v: TVar) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, TVar>({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useRemoveMember() {
  return useMembershipMutation((memberId: number) =>
    api.post(`/members/${memberId}/remove`),
  );
}

export function useRestoreMember() {
  return useMembershipMutation((memberId: number) =>
    api.post(`/members/${memberId}/restore`),
  );
}

export function useGrantAdmin() {
  return useMembershipMutation((memberId: number) =>
    api.post(`/members/${memberId}/admin`),
  );
}

export function useStepDown() {
  return useMembershipMutation((_: undefined) =>
    api.post("/members/me/step-down"),
  );
}

// ── Join link ─────────────────────────────────────────────────────────────────

/** The club's shareable join link (the backend creates it on first view) */
export function useJoinLink() {
  return useQuery<{ url: string }, Error>({
    queryKey: ["joinLink"],
    queryFn: () => api.get("/members/join-link"),
  });
}

export function useResetJoinLink() {
  const qc = useQueryClient();
  return useMutation<{ url: string }, Error, undefined>({
    mutationFn: () => api.post("/members/join-link/reset"),
    onSuccess: (data) => qc.setQueryData(["joinLink"], data),
  });
}

// ── Meeting mutations ─────────────────────────────────────────────────────────

function useMeetingMutation<TVar>(fn: (v: TVar) => Promise<Meeting>) {
  const qc = useQueryClient();
  return useMutation<Meeting, Error, TVar>({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(["meeting", data.id], data);
      // Status changes can move a meeting between the dashboard's slots
      // (e.g. finalizing turns the active meeting into the upcoming one)
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useStartMeeting() {
  return useMeetingMutation((_: undefined) => api.post("/meetings"));
}

export function useSetHost(meetingId: number) {
  return useMeetingMutation((hostMemberId: number) =>
    api.put(`/meetings/${meetingId}/host`, { hostMemberId }),
  );
}

export function useOpenVoting(meetingId: number) {
  return useMeetingMutation((_: undefined) =>
    api.post(`/meetings/${meetingId}/open-voting`),
  );
}

export function useFinalizeMeeting(meetingId: number) {
  return useMeetingMutation(
    // Tie-break ids are only needed (and only allowed) when there's a tie
    (body: { bookTieBreakId?: number; dateTieBreakId?: number }) =>
      api.post(`/meetings/${meetingId}/finalize`, body),
  );
}

// ── Book options ──────────────────────────────────────────────────────────────

function invalidateMeeting(
  qc: ReturnType<typeof useQueryClient>,
  meetingId: number,
) {
  qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
  qc.invalidateQueries({ queryKey: ["meetings", "current"] });
  qc.invalidateQueries({ queryKey: ["bookResults", meetingId] });
  qc.invalidateQueries({ queryKey: ["dateResults", meetingId] });
}

export function useAddBook(meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      author: string;
      notes?: string;
      coverImageUrl?: string;
      sourceUrl?: string;
    }) => api.post(`/meetings/${meetingId}/books`, body),
    onSuccess: () => invalidateMeeting(qc, meetingId),
  });
}

export function useUpdateBook(meetingId: number, bookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      author: string;
      notes?: string;
      coverImageUrl?: string;
      sourceUrl?: string;
    }) => api.put(`/meetings/${meetingId}/books/${bookId}`, body),
    onSuccess: () => invalidateMeeting(qc, meetingId),
  });
}

export function useDeleteBook(meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId: number) =>
      api.delete(`/meetings/${meetingId}/books/${bookId}`),
    onSuccess: () => invalidateMeeting(qc, meetingId),
  });
}

// ── Date options ──────────────────────────────────────────────────────────────

export function useAddDate(meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string }) =>
      api.post(`/meetings/${meetingId}/dates`, body),
    onSuccess: () => invalidateMeeting(qc, meetingId),
  });
}

export function useUpdateDate(meetingId: number, dateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string }) =>
      api.put(`/meetings/${meetingId}/dates/${dateId}`, body),
    onSuccess: () => invalidateMeeting(qc, meetingId),
  });
}

export function useDeleteDate(meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dateId: number) =>
      api.delete(`/meetings/${meetingId}/dates/${dateId}`),
    onSuccess: () => invalidateMeeting(qc, meetingId),
  });
}

// ── Votes ─────────────────────────────────────────────────────────────────────

export function useMyVoteStatus(meetingId: number) {
  return useQuery<BookVoteStatus>({
    queryKey: ["voteStatus", meetingId],
    queryFn: () => api.get(`/meetings/${meetingId}/votes/me`),
    enabled: !!meetingId,
  });
}

export function useSubmitVote(meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      ranks: { bookOptionId: number; rank: number }[];
      dateOptionIds: number[];
    }) => api.post(`/meetings/${meetingId}/votes`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voteStatus", meetingId] });
      // Vote count gates host controls, and the host may be watching results
      invalidateMeeting(qc, meetingId);
    },
  });
}

// ── Results ───────────────────────────────────────────────────────────────────

export function useBookResults(meetingId: number, enabled = true) {
  return useQuery<BookResultsResponse>({
    queryKey: ["bookResults", meetingId],
    queryFn: () => api.get(`/meetings/${meetingId}/results/books`),
    enabled: enabled && !!meetingId,
  });
}

export function useDateResults(meetingId: number, enabled = true) {
  return useQuery<DateResultsResponse>({
    queryKey: ["dateResults", meetingId],
    queryFn: () => api.get(`/meetings/${meetingId}/results/dates`),
    enabled: enabled && !!meetingId,
  });
}
