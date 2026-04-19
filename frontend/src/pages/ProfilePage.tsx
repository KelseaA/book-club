import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import type { Member } from "../types";

interface FormValues {
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  currentPassword: string;
  newPassword: string;
}

export default function ProfilePage() {
  const { member } = useAuth();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: member?.name ?? "",
      streetAddress: member?.streetAddress ?? "",
      city: member?.city ?? "",
      state: member?.state ?? "",
      zipCode: member?.zipCode ?? "",
      country: member?.country ?? "",
      currentPassword: "",
      newPassword: "",
    },
  });

  const update = useMutation<Member, Error, FormValues>({
    mutationFn: (data) => {
      const payload: Record<string, string> = {
        name: data.name,
        streetAddress: data.streetAddress,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
      };
      if (data.newPassword) {
        payload.currentPassword = data.currentPassword;
        payload.newPassword = data.newPassword;
      }
      return api.put("/members/me", payload);
    },
    onSuccess: (updated) => {
      qc.setQueryData(["me"], updated);
      reset({
        name: updated.name,
        streetAddress: updated.streetAddress ?? "",
        city: updated.city ?? "",
        state: updated.state ?? "",
        zipCode: updated.zipCode ?? "",
        country: updated.country ?? "",
        currentPassword: "",
        newPassword: "",
      });
    },
  });

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <div className="card">
        <form
          onSubmit={handleSubmit((v) => update.mutate(v))}
          className="space-y-4"
        >
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              {...register("name", { required: "Required" })}
            />
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>
          <p className="text-sm text-gray-400">Email: {member?.email}</p>
          <hr className="border-gray-200" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Mailing Address
          </p>
          <div>
            <label className="label">Street Address</label>
            <input className="input" {...register("streetAddress")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" {...register("city")} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" {...register("state")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Zip Code</label>
              <input className="input" {...register("zipCode")} />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" {...register("country")} />
            </div>
          </div>
          <hr className="border-gray-200" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Change Password (optional)
          </p>
          <div>
            <label className="label">Current Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              {...register("newPassword", {
                minLength: { value: 8, message: "Min 8 characters" },
              })}
            />
            {errors.newPassword && (
              <p className="error-text">{errors.newPassword.message}</p>
            )}
          </div>
          {update.isError && (
            <p className="error-text">{update.error.message}</p>
          )}
          {update.isSuccess && (
            <p className="text-green-600 text-sm">Profile saved!</p>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={update.isPending}
          >
            {update.isPending ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
