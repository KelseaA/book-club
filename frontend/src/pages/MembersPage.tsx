import { useState } from "react";
import {
  useGrantAdmin,
  useJoinLink,
  useMembers,
  useRemovedMembers,
  useRemoveMember,
  useResetJoinLink,
  useRestoreMember,
  useStepDown,
} from "../hooks/useBookClub";
import { useAuth } from "../hooks/useAuth";

/** Who's in the club, plus the shared join link for inviting more people */
export default function MembersPage() {
  const { member: me } = useAuth();
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

      <MemberList meId={me?.id} meIsAdmin={!!me?.isAdmin} />
      {me?.isAdmin && <RemovedMembers />}
    </div>
  );
}

/**
 * The member list. Admins also get per-member actions (make admin, remove)
 * and can step down. Everything here is re-checked by the backend.
 */
function MemberList({
  meId,
  meIsAdmin,
}: {
  meId?: number;
  meIsAdmin: boolean;
}) {
  const { data: members = [], isLoading } = useMembers();
  const removeMember = useRemoveMember();
  const grantAdmin = useGrantAdmin();
  const stepDown = useStepDown();
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const adminCount = members.filter((m) => m.isAdmin).length;
  const error = removeMember.error || grantAdmin.error || stepDown.error;

  return (
    <section className="card">
      <h2 className="text-lg font-semibold mb-3">
        {isLoading ? "Members" : `${members.length} members`}
      </h2>
      {error && <p className="error-text mb-2">{error.message}</p>}
      <ul className="divide-y divide-gray-100">
        {members.map((m) => {
          const isMe = m.id === meId;
          return (
            <li key={m.id} className="py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span>{m.name}</span>
                {isMe && <span className="text-gray-400">(you)</span>}
                {m.isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
                    Admin
                  </span>
                )}

                <span className="ml-auto flex gap-3 text-xs">
                  {/* Your own row: admins can step down unless they're the last one */}
                  {isMe &&
                    m.isAdmin &&
                    (adminCount > 1 ? (
                      <button
                        className="text-gray-500 hover:underline"
                        onClick={() => stepDown.mutate(undefined)}
                        disabled={stepDown.isPending}
                      >
                        Step down as admin
                      </button>
                    ) : (
                      <span className="text-gray-400">
                        Make someone else an admin before you can step down
                      </span>
                    ))}

                  {meIsAdmin && !isMe && confirmRemoveId !== m.id && (
                    <>
                      {!m.isAdmin && (
                        <button
                          className="text-brand-600 hover:underline"
                          onClick={() => grantAdmin.mutate(m.id)}
                          disabled={grantAdmin.isPending}
                        >
                          Make admin
                        </button>
                      )}
                      <button
                        className="text-red-500 hover:underline"
                        onClick={() => setConfirmRemoveId(m.id)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </span>
              </div>

              {confirmRemoveId === m.id && (
                <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-100 space-y-2">
                  <p className="text-gray-700">
                    Remove {m.name}? They'll be signed out and won't be able to
                    sign back in. Their past votes stay in the archive, and you
                    can restore them later.
                  </p>
                  <div className="flex gap-3">
                    <button
                      className="text-red-600 font-medium hover:underline"
                      onClick={() =>
                        removeMember.mutate(m.id, {
                          onSettled: () => setConfirmRemoveId(null),
                        })
                      }
                      disabled={removeMember.isPending}
                    >
                      {removeMember.isPending
                        ? "Removing…"
                        : `Remove ${m.name}`}
                    </button>
                    <button
                      className="text-gray-500 hover:underline"
                      onClick={() => setConfirmRemoveId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Admin only: removed members, with a way to undo the removal */
function RemovedMembers() {
  const { data: removed = [] } = useRemovedMembers(true);
  const restore = useRestoreMember();
  if (removed.length === 0) return null;

  return (
    <section className="card">
      <h2 className="text-lg font-semibold mb-1">Removed members</h2>
      <p className="text-sm text-gray-500 mb-3">
        Only admins see this. Restoring lets them sign in again as a regular
        member.
      </p>
      {restore.isError && (
        <p className="error-text mb-2">{restore.error.message}</p>
      )}
      <ul className="divide-y divide-gray-100">
        {removed.map((m) => (
          <li key={m.id} className="py-2.5 text-sm flex items-center gap-2">
            <span className="text-gray-500">{m.name}</span>
            <button
              className="ml-auto text-xs text-brand-600 hover:underline"
              onClick={() => restore.mutate(m.id)}
              disabled={restore.isPending}
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
