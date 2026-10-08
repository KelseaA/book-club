// Shared TypeScript types mirroring the Prisma models returned from the API

export type MeetingStatus = "SETUP" | "VOTING" | "FINALIZED";

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
  meetingId: number;
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
  meetingId: number;
  date: string;
  createdAt: string;
}

export interface Meeting {
  id: number;
  status: MeetingStatus;
  hostMemberId: number;
  host: MemberSummary;
  resultsVisible: boolean;
  revealedAt?: string | null;
  finalBookOptionId?: number | null;
  finalBookOption?: BookOption | null;
  meetingDate?: string | null;
  bookOptions: BookOption[];
  dateOptions: DateOption[];
  createdAt: string;
  updatedAt: string;
  _count: { bookVotes: number };
}

/** GET /meetings/current — what the dashboard shows */
export interface CurrentMeetings {
  /** Finalized meetings that haven't happened yet, soonest first */
  upcoming: Meeting[];
  /** Meeting being planned or voted on */
  active: Meeting | null;
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
  meetingId: number;
  totalBallots: number;
  results: BookResult[];
  /** Every book tied for first — more than one means the host must pick */
  leaderIds: number[];
}

export interface DateResultEntry {
  id: number;
  date: string;
  count: number;
  availableMembers: MemberSummary[];
}

export interface DateResultsResponse {
  meetingId: number;
  results: DateResultEntry[];
  /** Every date tied for most available — more than one means the host must pick */
  leaderIds: number[];
}

export interface BookMetadata {
  title?: string;
  author?: string;
  coverImageUrl?: string;
  sourceUrl?: string;
}
