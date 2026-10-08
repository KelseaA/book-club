import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Member } from "../types";

interface FormValues {
  password: string;
  confirmPassword: string;
}

/** Landing page for the emailed link: /reset-password?token=… */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const token = params.get("token");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const reset = useMutation<Member, Error, FormValues>({
    mutationFn: ({ password }) =>
      api.post("/auth/reset-password", { token, password }),
    onSuccess: (member) => {
      // The backend signs this browser in with a fresh session
      qc.setQueryData(["me"], member);
      navigate("/dashboard");
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">
          Choose a new password
        </h1>
        {!token ? (
          <p className="text-sm text-gray-600 text-center">
            This reset link is incomplete. Request a new one from the sign-in
            page.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit((v) => reset.mutate(v))}
            className="space-y-4 mt-6"
          >
            <div>
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                {...register("password", {
                  required: "Required",
                  minLength: { value: 8, message: "Min 8 chars" },
                })}
              />
              {errors.password && (
                <p className="error-text">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword", {
                  required: "Required",
                  validate: (v) =>
                    v === watch("password") || "Passwords do not match",
                })}
              />
              {errors.confirmPassword && (
                <p className="error-text">{errors.confirmPassword.message}</p>
              )}
            </div>
            {reset.isError && (
              <p className="error-text">{reset.error.message}</p>
            )}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={reset.isPending}
            >
              {reset.isPending ? "Saving…" : "Set new password"}
            </button>
            <p className="text-xs text-gray-500 text-center">
              This signs you out on any other devices.
            </p>
          </form>
        )}
        <p className="text-sm text-center text-gray-500 mt-4">
          <Link
            to="/forgot-password"
            className="text-brand-600 hover:underline"
          >
            Request a new link
          </Link>
        </p>
      </div>
    </div>
  );
}
