import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Member } from "../types";

interface FormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const reg = useMutation<Member, Error, FormValues>({
    mutationFn: ({ confirmPassword: _c, ...data }) =>
      api.post("/auth/register", data),
    onSuccess: (member) => {
      qc.setQueryData(["me"], member);
      navigate("/dashboard");
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        <form
          onSubmit={handleSubmit((v) => reg.mutate(v))}
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
            {errors.email && (
              <p className="error-text">{errors.email.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Password *</label>
              <input
                className="input"
                type="password"
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
              <label className="label">Confirm Password *</label>
              <input
                className="input"
                type="password"
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
          </div>
          <hr className="border-gray-200" />
          <p className="text-xs text-gray-500">
            Address (optional — shown to members for the month you host)
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
          {reg.isError && <p className="error-text">{reg.error.message}</p>}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={reg.isPending}
          >
            {reg.isPending ? "Creating account…" : "Create Account"}
          </button>
        </form>
        <p className="text-sm text-center text-gray-500 mt-4">
          Already a member?{" "}
          <Link to="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
