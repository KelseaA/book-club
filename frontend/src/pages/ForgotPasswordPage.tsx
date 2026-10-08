import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface FormValues {
  email: string;
}

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const request = useMutation<unknown, Error, FormValues>({
    mutationFn: (data) => api.post("/auth/forgot-password", data),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">Reset password</h1>
        {request.isSuccess ? (
          // Same message whether or not the email has an account, so this
          // page can't be used to find out who's a member
          <p className="text-sm text-gray-600 text-center">
            If that email belongs to a member, we've sent a link to reset your
            password. It expires in 1 hour — check your spam folder if you don't
            see it.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500 text-center mb-6">
              Enter your email and we'll send you a reset link.
            </p>
            <form
              onSubmit={handleSubmit((v) => request.mutate(v))}
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
              {request.isError && (
                <p className="error-text">{request.error.message}</p>
              )}
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={request.isPending}
              >
                {request.isPending ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
        <p className="text-sm text-center text-gray-500 mt-4">
          <Link to="/login" className="text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
