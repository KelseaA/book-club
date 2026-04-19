import { useForm } from "react-hook-form";
import { useAddDate, useUpdateDate } from "../hooks/useBookClub";
import type { DateOption } from "../types";

interface FormValues {
  date: string; // datetime-local value
  label: string;
}

interface Props {
  monthKey: string;
  dateOption?: DateOption;
  onDone: () => void;
}

export default function DateProposalForm({
  monthKey,
  dateOption,
  onDone,
}: Props) {
  const isEdit = !!dateOption;
  const add = useAddDate(monthKey);
  const update = useUpdateDate(monthKey, dateOption?.id ?? 0);
  const mutation = isEdit ? update : add;

  const defaultDate = dateOption
    ? new Date(dateOption.date).toISOString().slice(0, 16)
    : "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { date: defaultDate, label: dateOption?.label ?? "" },
  });

  function onSubmit(v: FormValues) {
    const payload = {
      date: new Date(v.date).toISOString(),
      label: v.label || undefined,
    };
    mutation.mutate(payload as Parameters<typeof mutation.mutate>[0], {
      onSuccess: onDone,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Date & Time *</label>
        <input
          type="datetime-local"
          className="input"
          {...register("date", { required: "Date is required" })}
        />
        {errors.date && <p className="error-text">{errors.date.message}</p>}
      </div>
      <div>
        <label className="label">Label (optional)</label>
        <input
          className="input"
          placeholder='e.g. "Saturday evening"'
          {...register("label")}
        />
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
