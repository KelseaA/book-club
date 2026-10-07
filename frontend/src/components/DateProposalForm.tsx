import { useForm } from "react-hook-form";
import { useAddDate, useUpdateDate } from "../hooks/useBookClub";
import type { DateOption } from "../types";

// All meetings start at 7:30 PM local time, so hosts only pick the day.
const MEETING_HOUR = 19;
const MEETING_MINUTE = 30;

/**
 * Parse "MM/DD" into a meeting Date. The year is inferred: this year if the
 * month is the current month or later, otherwise next year (e.g. entering
 * "1/15" in December means next January). Returns null for impossible
 * dates like "2/30".
 */
function parseMeetingDate(value: string): Date | null {
  const [month, day] = value.split("/").map(Number);
  const now = new Date();
  const year =
    month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
  const date = new Date(year, month - 1, day, MEETING_HOUR, MEETING_MINUTE);
  // JS Date silently rolls over invalid days (2/30 → 3/2), so check it stuck
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

interface FormValues {
  date: string; // MM/DD
}

interface Props {
  meetingId: number;
  dateOption?: DateOption;
  onDone: () => void;
}

export default function DateProposalForm({
  meetingId,
  dateOption,
  onDone,
}: Props) {
  const isEdit = !!dateOption;
  const add = useAddDate(meetingId);
  const update = useUpdateDate(meetingId, dateOption?.id ?? 0);
  const mutation = isEdit ? update : add;

  const existing = dateOption ? new Date(dateOption.date) : null;
  const defaultDate = existing
    ? `${existing.getMonth() + 1}/${existing.getDate()}`
    : "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { date: defaultDate },
  });

  function onSubmit(v: FormValues) {
    const date = parseMeetingDate(v.date)!; // validated by the form rule
    mutation.mutate({ date: date.toISOString() }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Date *</label>
        <input
          className="input"
          placeholder="MM/DD"
          maxLength={5}
          {...register("date", {
            required: "Date is required",
            pattern: {
              value: /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/,
              message: "Enter a date as MM/DD",
            },
            validate: (v) => !!parseMeetingDate(v) || "That date doesn't exist",
          })}
        />
        {errors.date && <p className="error-text">{errors.date.message}</p>}
      </div>
      {mutation.isError && (
        <p className="error-text">{mutation.error.message}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : isEdit ? "Save" : "Add Date"}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
