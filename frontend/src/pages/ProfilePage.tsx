import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import type { Member } from "../types";

interface FormValues {
  name: string;
  email: string;
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
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: member?.name ?? "",
      email: member?.email ?? "",
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
        email: data.email,
        streetAddress: data.streetAddress,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
      };
      // The backend needs the current password to change email or password
      if (data.newPassword || data.email !== member?.email) {
        payload.currentPassword = data.currentPassword;
      }
      if (data.newPassword) payload.newPassword = data.newPassword;
      return api.put("/members/me", payload);
    },
    onSuccess: (updated) => {
      qc.setQueryData(["me"], updated);
      reset({
        name: updated.name,
        email: updated.email,
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

  const deleteAccount = useMutation<void, Error>({
    mutationFn: () => api.delete("/members/me"),
    onSuccess: () => {
      qc.clear();
      navigate("/login");
    },
  });

  return (
    <div>
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
          <div>
            <label className="label">Email *</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              {...register("email", { required: "Required" })}
            />
            <p className="text-xs text-gray-400 mt-1">
              Password reset links are sent here.
            </p>
            {errors.email && (
              <p className="error-text">{errors.email.message}</p>
            )}
          </div>
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
            Password
          </p>
          <p className="text-xs text-gray-500 -mt-2">
            Enter your current password to change your email or password.
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

      {/* Danger zone */}
      <div className="card border-red-200 mt-6">
        <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">
          Danger Zone
        </h2>
        {confirmDelete ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              This permanently deletes your account: your name, email, address,
              and password are erased. Votes in past meetings stay (anonymously)
              so the archive doesn't change. This cannot be undone.
            </p>
            {deleteAccount.isError && (
              <p className="error-text">{deleteAccount.error.message}</p>
            )}
            <div className="flex gap-3">
              <button
                className="btn-primary bg-red-600 hover:bg-red-700 border-red-600"
                onClick={() => deleteAccount.mutate()}
                disabled={deleteAccount.isPending}
              >
                {deleteAccount.isPending
                  ? "Deleting…"
                  : "Yes, delete my account"}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteAccount.isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="text-sm text-red-600 hover:underline"
            onClick={() => setConfirmDelete(true)}
          >
            Delete my account
          </button>
        )}
      </div>
    </div>
  );
}
