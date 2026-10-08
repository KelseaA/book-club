import type { UseFormRegisterReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

/**
 * The "Email me about meetings" opt-in, shared by the sign-up and profile
 * pages. Names the sender address so people can add it to their contacts —
 * mail from a new Gmail account tends to land in spam otherwise.
 */
export default function EmailNotificationsField({
  registration,
  note,
}: {
  registration: UseFormRegisterReturn;
  /** Extra line under the description, e.g. "You can change this later" */
  note?: string;
}) {
  const { data } = useQuery({
    queryKey: ["config"],
    queryFn: () => api.get<{ emailSender: string | null }>("/config"),
    staleTime: Infinity,
  });

  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 w-4 h-4 accent-brand-500"
        {...registration}
      />
      <span>
        <span className="font-medium text-gray-800">
          Email me about meetings
        </span>
        <span className="block text-gray-500 text-xs mt-0.5">
          When voting opens, and when the next book and date are announced.
          {note && ` ${note}`}
        </span>
        {data?.emailSender && (
          <span className="block text-gray-500 text-xs mt-1">
            Emails come from <strong>{data.emailSender}</strong> — add it to
            your contacts so they don't land in spam.
          </span>
        )}
      </span>
    </label>
  );
}
