import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Member } from "../types";

interface FormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const login = useMutation<Member, Error, FormValues>({
    mutationFn: (data) => api.post("/auth/login", data),
    onSuccess: (member) => {
      qc.setQueryData(["me"], member);
      navigate("/dashboard");
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Book Club</h1>
        <form
          onSubmit={handleSubmit((v) => login.mutate(v))}
          className="space-y-4"
        >
          <div>
            <label className="label">Email</label>
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
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              {...register("password", { required: "Required" })}
            />
            {errors.password && (
              <p className="error-text">{errors.password.message}</p>
            )}
          </div>
          {login.isError && <p className="error-text">{login.error.message}</p>}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={login.isPending}
          >
            {login.isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-sm text-center text-gray-500 mt-4">
          No account?{" "}
          <Link to="/register" className="text-brand-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
