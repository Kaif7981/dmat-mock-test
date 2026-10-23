
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Register() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError("Account creation could not be confirmed. Please try again.");
        return;
      }

      // Supabase returns no session when email confirmation is required.
      if (!data.session) {
        setVerificationEmail(cleanEmail);
        return;
      }

      // A session means the user is already authenticated.
      router.replace("/dashboard");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (verificationEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
              ✓
            </div>

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Verify your email
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Your registration was submitted. If email confirmation is enabled,
              check your inbox for the verification link.
            </p>

            <p className="mt-3 break-words font-semibold text-blue-700">
              {verificationEmail}
            </p>

            <p className="mt-4 text-sm leading-6 text-gray-500">
              Open the email and follow its instructions. If you don&apos;t see
              it, check your spam folder too.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Go to Login
            </Link>

            <button
              type="button"
              onClick={() => {
                setVerificationEmail("");
                setPassword("");
                setConfirmPassword("");
              }}
              className="mt-4 text-sm font-medium text-blue-600 hover:underline"
            >
              Back to registration
            </button>
          </div>
        </div>
      </main>
    );
  }

  const inputClass =
    "block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 caret-blue-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">DMAT Mock</h1>
          <p className="mt-2 text-gray-600">
            Create your account to start practicing
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your details below
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="register-name"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Full Name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Email Address
              </label>
              <input
                id="register-email"
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
                htmlFor="register-password"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
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
              <p className="mt-1 text-xs text-gray-500">
                Use at least 6 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className={`${inputClass} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  aria-pressed={showConfirmPassword}
                  className="absolute inset-y-0 right-3 text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
