
"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const goToLogin = () => {
    router.push("/login");
  };

  const goToRegister = () => {
    router.push("/register");
  };

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-5 md:px-8">
        <button
          onClick={() => router.push("/")}
          className="text-2xl font-bold text-blue-600"
          aria-label="DMAT Mock home"
        >
          DMAT Mock
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={goToLogin}
            className="rounded-lg px-5 py-2 font-medium text-gray-800 transition hover:bg-gray-100"
          >
            Login
          </button>

          <button
            onClick={goToRegister}
            className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Register
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center md:px-8 md:py-20">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          Prepare for Your DMAT Exam
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          Practice with realistic DMAT mock tests, get instant results,
          identify your mistakes, and understand where you need to improve.
        </p>

        <button
          onClick={goToLogin}
          className="mt-8 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          Start Your Mock Test
        </button>

        <p className="mt-3 text-sm text-gray-500">
          Sign in or create an account to get started.
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-20 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-bold text-gray-900">
              Full Mock Test
            </h3>
            <p className="mt-3 leading-7 text-gray-700">
              Experience a timed exam environment similar to the real test.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-bold text-gray-900">
              Instant Results
            </h3>
            <p className="mt-3 leading-7 text-gray-700">
              See your score after completing the mock test.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-bold text-gray-900">
              Mistake Analysis
            </h3>
            <p className="mt-3 leading-7 text-gray-700">
              Review incorrect answers and identify areas where you need more
              practice.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-blue-600 px-6 py-16 text-center text-white">
        <h2 className="text-3xl font-bold">
          Ready to Test Yourself?
        </h2>

        <p className="mt-4 text-blue-50">
          Take your first DMAT mock test and assess your preparation.
        </p>

        <button
          onClick={goToLogin}
          className="mt-6 rounded-xl bg-white px-8 py-3 font-bold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          Start Mock Test
        </button>
      </section>
    </main>
  );
}
