import type { MonthStatus } from "../types";

const labels: Record<MonthStatus, string> = {
  SETUP: "Setup",
  VOTING: "Voting Open",
  FINALIZED: "Finalized",
};

const colors: Record<MonthStatus, string> = {
  SETUP: "bg-yellow-100 text-yellow-800",
  VOTING: "bg-blue-100 text-blue-800",
  FINALIZED: "bg-green-100 text-green-800",
};

export default function MonthStatusBadge({ status }: { status: MonthStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}
