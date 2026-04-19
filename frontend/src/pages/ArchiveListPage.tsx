import { Link } from "react-router-dom";
import { useMonths } from "../hooks/useBookClub";
import MonthStatusBadge from "../components/MonthStatusBadge";

function formatMonthKey(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export default function ArchiveListPage() {
  const { data: months, isLoading, error } = useMonths();

  if (isLoading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;

  const finalized = (months ?? []).filter((m) => m.status === "FINALIZED");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Archive</h1>
      {finalized.length === 0 ? (
        <p className="text-gray-400">No finalized months yet.</p>
      ) : (
        <div className="space-y-3">
          {finalized.map((month) => (
            <Link
              key={month.monthKey}
              to={`/archive/${month.monthKey}`}
              className="card flex items-center justify-between hover:border-brand-300 transition-colors"
            >
              <div>
                <p className="font-semibold">
                  {formatMonthKey(month.monthKey)}
                </p>
                <p className="text-sm text-gray-500">Host: {month.host.name}</p>
                {month.finalBookOption && (
                  <p className="text-sm text-brand-600 mt-1">
                    {month.finalBookOption.title}
                  </p>
                )}
              </div>
              <MonthStatusBadge status={month.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
