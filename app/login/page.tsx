
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        const message = loginError.message.toLowerCase();

        if (
          message.includes("email not confirmed") ||
          message.includes("email_not_confirmed")
        ) {
          setError(
            "Please verify your email before logging in. Check your inbox for the verification link."
          );
        } else {
          setError("Unable to log in. Check your email and password and try again.");
        }
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 caret-blue-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">DMAT Mock</h1>
          <p className="mt-2 text-gray-600">
            Continue your DMAT preparation
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Login to access your mock tests
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Email Address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-3 text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
