import { useState } from "react";
import {
  useJoinLink,
  useMembers,
  useResetJoinLink,
} from "../hooks/useBookClub";
import { useAuth } from "../hooks/useAuth";

/** Who's in the club, plus the shared join link for inviting more people */
export default function MembersPage() {
  const { member: me } = useAuth();
  const { data: members = [], isLoading } = useMembers();
  const joinLink = useJoinLink();
  const resetLink = useResetJoinLink();
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  async function copy() {
    if (!joinLink.data) return;
    await navigator.clipboard.writeText(joinLink.data.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Members</h1>

      <section className="card space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Invite someone</h2>
          <p className="text-sm text-gray-500 mt-1">
            Text this link to anyone you'd like to join the club. The same link
            works for everyone.
          </p>
        </div>
        {joinLink.isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : joinLink.isError ? (
          <p className="error-text">{joinLink.error.message}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input flex-1 min-w-0 font-mono text-xs"
              value={joinLink.data?.url ?? ""}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <button className="btn-primary shrink-0" onClick={copy}>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        )}
        {confirmReset ? (
          <div className="text-sm space-y-2">
            <p className="text-gray-700">
              The current link will stop working for anyone who hasn't joined
              yet. Members who already joined aren't affected.
            </p>
            <div className="flex gap-3">
              <button
                className="text-red-600 font-medium hover:underline"
                onClick={() =>
                  resetLink.mutate(undefined, {
                    onSuccess: () => setConfirmReset(false),
                  })
                }
                disabled={resetLink.isPending}
              >
                {resetLink.isPending ? "Resetting…" : "Yes, reset the link"}
              </button>
              <button
                className="text-gray-500 hover:underline"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
            </div>
            {resetLink.isError && (
              <p className="error-text">{resetLink.error.message}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Shared somewhere it shouldn't be?{" "}
            <button
              className="text-brand-600 hover:underline"
              onClick={() => setConfirmReset(true)}
            >
              Reset link
            </button>
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-3">
          {isLoading ? "Members" : `${members.length} members`}
        </h2>
        <ul className="divide-y divide-gray-100">
          {members.map((m) => (
            <li key={m.id} className="py-2.5 text-sm">
              {m.name}
              {m.id === me?.id && (
                <span className="text-gray-400 ml-2">(you)</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
