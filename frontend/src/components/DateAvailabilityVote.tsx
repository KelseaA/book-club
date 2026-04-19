import { useState } from "react";
import type { DateOption } from "../types";

interface Props {
  monthKey: string;
  dateOptions: DateOption[];
  onSelectionChange: (ids: number[]) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DateAvailabilityVote({
  dateOptions,
  onSelectionChange,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      onSelectionChange([...next]);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {dateOptions.map((d) => (
        <label
          key={d.id}
          className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50"
        >
          <input
            type="checkbox"
            className="w-4 h-4 accent-brand-500"
            checked={selected.has(d.id)}
            onChange={() => toggle(d.id)}
          />
          <span className="text-sm">
            {formatDate(d.date)}
            {d.label && <span className="text-gray-400 ml-1">— {d.label}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
