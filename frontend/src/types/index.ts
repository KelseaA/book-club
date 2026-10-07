// Shared TypeScript types mirroring the Prisma models returned from the API

export type MonthStatus = "SETUP" | "VOTING" | "FINALIZED";

export interface Member {
  id: number;
  name: string;
  email: string;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberSummary {
  id: number;
  name: string;
  email?: string; // only present on the logged-in member's own profile, not in list/host contexts
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}

export interface BookOption {
  id: number;
  monthId: number;
  title: string;
  author: string;
  notes?: string | null;
  genres?: string | null;
  coverImageUrl?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DateOption {
  id: number;
  monthId: number;
  date: string;
  createdAt: string;
}

export interface BookClubMonth {
  id: number;
  monthKey: string;
  status: MonthStatus;
  hostMemberId: number;
  host: MemberSummary;
  resultsVisible: boolean;
  revealedAt?: string | null;
  finalBookOptionId?: number | null;
  finalBookOption?: BookOption | null;
  finalMeetingDate?: string | null;
  bookOptions: BookOption[];
  dateOptions: DateOption[];
  createdAt: string;
  updatedAt: string;
  _count: { bookVotes: number };
}

export interface BookVoteRankRow {
  id: number;
  bookOptionId: number;
  rank: number;
}

export interface BookVoteStatus {
  hasVoted: boolean;
  bookVote: { id: number; ranks: BookVoteRankRow[] } | null;
  dateSelections: { id: number; dateOptionId: number }[];
}

export interface BookResult {
  id: number;
  title: string;
  author: string;
  notes?: string | null;
  coverImageUrl?: string | null;
  sourceUrl?: string | null;
  genres?: string | null;
  bordaPoints: number;
}

export interface BookResultsResponse {
  monthKey: string;
  totalBallots: number;
  results: BookResult[];
}

export interface DateResultEntry {
  id: number;
  date: string;
  count: number;
  availableMembers: MemberSummary[];
}

export interface DateResultsResponse {
  monthKey: string;
  results: DateResultEntry[];
}

export interface BookMetadata {
  title?: string;
  author?: string;
  coverImageUrl?: string;
  sourceUrl?: string;
}
