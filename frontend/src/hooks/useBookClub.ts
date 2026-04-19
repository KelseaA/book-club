import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  BookClubMonth,
  MemberSummary,
  BookVoteStatus,
  BookResultsResponse,
  DateResultsResponse,
  BookMetadata,
} from "../types";

// ── Month ─────────────────────────────────────────────────────────────────────

export function useCurrentMonth() {
  return useQuery<BookClubMonth>({
    queryKey: ["month", "current"],
    queryFn: () => api.get("/months/current"),
  });
}

export function useMonth(monthKey: string) {
  return useQuery<BookClubMonth>({
    queryKey: ["month", monthKey],
    queryFn: () => api.get(`/months/${monthKey}`),
    enabled: !!monthKey,
  });
}

export function useMonths() {
  return useQuery<BookClubMonth[]>({
    queryKey: ["months"],
    queryFn: () => api.get("/months"),
  });
}

export function useMembers() {
  return useQuery<MemberSummary[]>({
    queryKey: ["members"],
    queryFn: () => api.get("/members"),
  });
}

// ── Month mutations ───────────────────────────────────────────────────────────

function useMonthMutation<TVar>(
  fn: (v: TVar) => Promise<BookClubMonth>,
  keys: string[],
) {
  const qc = useQueryClient();
  return useMutation<BookClubMonth, Error, TVar>({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(["month", data.monthKey], data);
      qc.setQueryData(["month", "current"], (old: BookClubMonth | undefined) =>
        old?.monthKey === data.monthKey ? data : old,
      );
    },
  });
}

export function useSetHost(monthKey: string) {
  return useMonthMutation(
    (hostMemberId: number) =>
      api.put(`/months/${monthKey}/host`, { hostMemberId }),
    ["month", monthKey],
  );
}

export function useRevealResults(monthKey: string) {
  return useMonthMutation(
    (_: undefined) => api.post(`/months/${monthKey}/reveal`),
    ["month", monthKey],
  );
}

export function useFinalizeMonth(monthKey: string) {
  return useMonthMutation(
    (body: { finalBookOptionId: number; finalMeetingDate: string }) =>
      api.post(`/months/${monthKey}/finalize`, body),
    ["month", monthKey],
  );
}

// ── Book options ──────────────────────────────────────────────────────────────

function invalidateMonth(
  qc: ReturnType<typeof useQueryClient>,
  monthKey: string,
) {
  qc.invalidateQueries({ queryKey: ["month", monthKey] });
  qc.invalidateQueries({ queryKey: ["month", "current"] });
}

export function useAddBook(monthKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      author: string;
      notes?: string;
      coverImageUrl?: string;
      sourceUrl?: string;
    }) => api.post(`/months/${monthKey}/books`, body),
    onSuccess: () => invalidateMonth(qc, monthKey),
  });
}

export function useUpdateBook(monthKey: string, bookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      author: string;
      notes?: string;
      coverImageUrl?: string;
      sourceUrl?: string;
    }) => api.put(`/months/${monthKey}/books/${bookId}`, body),
    onSuccess: () => invalidateMonth(qc, monthKey),
  });
}

export function useDeleteBook(monthKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId: number) =>
      api.delete(`/months/${monthKey}/books/${bookId}`),
    onSuccess: () => invalidateMonth(qc, monthKey),
  });
}

// ── Date options ──────────────────────────────────────────────────────────────

export function useAddDate(monthKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string; label?: string }) =>
      api.post(`/months/${monthKey}/dates`, body),
    onSuccess: () => invalidateMonth(qc, monthKey),
  });
}

export function useUpdateDate(monthKey: string, dateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string; label?: string }) =>
      api.put(`/months/${monthKey}/dates/${dateId}`, body),
    onSuccess: () => invalidateMonth(qc, monthKey),
  });
}

export function useDeleteDate(monthKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dateId: number) =>
      api.delete(`/months/${monthKey}/dates/${dateId}`),
    onSuccess: () => invalidateMonth(qc, monthKey),
  });
}

// ── Votes ─────────────────────────────────────────────────────────────────────

export function useMyVoteStatus(monthKey: string) {
  return useQuery<BookVoteStatus>({
    queryKey: ["voteStatus", monthKey],
    queryFn: () => api.get(`/months/${monthKey}/votes/me`),
    enabled: !!monthKey,
  });
}

export function useSubmitBookVote(monthKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ranks: { bookOptionId: number; rank: number }[]) =>
      api.post(`/months/${monthKey}/votes/books`, { ranks }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["voteStatus", monthKey] }),
  });
}

export function useSubmitDateVote(monthKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dateOptionIds: number[]) =>
      api.post(`/months/${monthKey}/votes/dates`, { dateOptionIds }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["voteStatus", monthKey] }),
  });
}

// ── Results ───────────────────────────────────────────────────────────────────

export function useBookResults(monthKey: string, enabled = true) {
  return useQuery<BookResultsResponse>({
    queryKey: ["bookResults", monthKey],
    queryFn: () => api.get(`/months/${monthKey}/results/books`),
    enabled: enabled && !!monthKey,
  });
}

export function useDateResults(monthKey: string, enabled = true) {
  return useQuery<DateResultsResponse>({
    queryKey: ["dateResults", monthKey],
    queryFn: () => api.get(`/months/${monthKey}/results/dates`),
    enabled: enabled && !!monthKey,
  });
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export function useFetchMetadata() {
  return useMutation<BookMetadata, Error, string>({
    mutationFn: (url: string) => api.post("/metadata/fetch", { url }),
  });
}
