import { useState, useRef, useEffect } from "react";
import { useSetHost, useMembers } from "../hooks/useBookClub";
import type { Meeting } from "../types";

interface Props {
  meeting: Meeting;
}

export default function HostSelector({ meeting }: Props) {
  const { data: members = [] } = useMembers();
  const setHost = useSetHost(meeting.id);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const currentHost = members.find((m) => m.id === meeting.hostMemberId);

  function handleSelect(memberId: number) {
    setHost.mutate(memberId, { onSuccess: () => setOpen(false) });
  }

  return (
    <div className="relative" ref={panelRef}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">
          Host:{" "}
          <span className="font-medium text-gray-800">
            {currentHost?.name ?? "—"}
          </span>
        </span>
        <button
          className="btn-secondary text-xs"
          onClick={() => setOpen((v) => !v)}
          disabled={setHost.isPending}
        >
          {setHost.isPending ? "Saving…" : "Change Host"}
        </button>
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
          {members.map((m) => (
            <button
              key={m.id}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${
                m.id === meeting.hostMemberId
                  ? "font-semibold text-brand-600"
                  : "text-gray-700"
              }`}
              onClick={() => handleSelect(m.id)}
              disabled={m.id === meeting.hostMemberId}
            >
              {m.name}
              {m.id === meeting.hostMemberId && (
                <span className="text-xs text-brand-400">current</span>
              )}
            </button>
          ))}
        </div>
      )}

      {setHost.isError && (
        <p className="error-text text-xs mt-1">{setHost.error.message}</p>
      )}
    </div>
  );
}
