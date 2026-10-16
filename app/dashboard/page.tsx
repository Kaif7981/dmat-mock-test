"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Attempt = {
  id: string;
  score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  unanswered: number | null;
  completed_at: string | null;
  created_at: string;
  mock_tests:
    | {
        title: string;
      }
    | {
        title: string;
      }[]
    | null;
};

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptsLoading, setAttemptsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // =========================================
        // 1. GET LOGGED-IN USER
        // =========================================

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/login");
          return;
        }

        const name =
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Student";

        setUserName(name);
        setUserEmail(user.email || "");

        setLoading(false);

        // =========================================
        // 2. GET USER ATTEMPTS
        // =========================================

        const {
          data: attemptData,
          error: attemptError,
        } = await supabase
          .from("attempts")
          .select(
            `
            id,
            score,
            total_questions,
            correct_answers,
            wrong_answers,
            unanswered,
            completed_at,
            created_at,
            mock_tests (
              title
            )
          `
          )
          .order("created_at", {
            ascending: false,
          });

        if (attemptError) {
          console.error(
            "Attempt loading error:",
            attemptError
          );
          setAttempts([]);
        } else {
          setAttempts(
            (attemptData as Attempt[]) || []
          );
        }
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );
      } finally {
        setLoading(false);
        setAttemptsLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // =========================================
  // START TEST
  // =========================================

  const handleStartTest = () => {
    router.push("/exam/instructions");
  };

  // =========================================
  // CALCULATE STATISTICS
  // =========================================

  const testsCompleted = attempts.length;

  const latestAttempt =
    attempts.length > 0
      ? attempts[0]
      : null;

  const bestAttempt =
    attempts.length > 0
      ? attempts.reduce((best, current) => {
          const bestScore =
            best.score || 0;

          const currentScore =
            current.score || 0;

          return currentScore > bestScore
            ? current
            : best;
        })
      : null;

  const totalQuestionsAttempted =
    attempts.reduce(
      (total, attempt) =>
        total +
        (attempt.total_questions || 0),
      0
    );

  const averagePercentage =
    attempts.length > 0
      ? Math.round(
          attempts.reduce(
            (total, attempt) => {
              const score =
                attempt.score || 0;

              const totalQuestions =
                attempt.total_questions || 0;

              if (totalQuestions === 0) {
                return total;
              }

              return (
                total +
                (score /
                  totalQuestions) *
                  100
              );
            },
            0
          ) / attempts.length
        )
      : 0;

  // =========================================
  // FORMAT DATE
  // =========================================

  function formatDate(
    dateString: string | null
  ) {
    if (!dateString) {
      return "Date unavailable";
    }

    return new Date(
      dateString
    ).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>

          <p className="mt-4 text-gray-600">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  // =========================================
  // DASHBOARD
  // =========================================

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b px-6 md:px-10 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">

          <h1 className="text-2xl font-bold text-blue-600">
            DMAT Mock
          </h1>

          <div className="flex items-center gap-4">

            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-800">
                {userName}
              </p>

              <p className="text-xs text-gray-500">
                {userEmail}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Logout
            </button>

          </div>
        </div>
      </nav>

      {/* Dashboard */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-10">

        {/* Welcome */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {userName} 👋
          </h2>

          <p className="mt-2 text-gray-600">
            Continue your DMAT preparation and improve your score.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">

          {/* Tests Completed */}
          <div className="bg-white border rounded-2xl p-6">
            <p className="text-sm text-gray-500">
              Tests Completed
            </p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {testsCompleted}
            </p>

            <p className="text-sm text-gray-400 mt-1">
              {testsCompleted === 0
                ? "Start your first test"
                : "Keep practicing"}
            </p>
          </div>

          {/* Latest Score */}
          <div className="bg-white border rounded-2xl p-6">
            <p className="text-sm text-gray-500">
              Latest Score
            </p>

            <p className="text-3xl font-bold text-blue-600 mt-2">
              {latestAttempt
                ? `${latestAttempt.score || 0}/${latestAttempt.total_questions || 0}`
                : "--"}
            </p>

            <p className="text-sm text-gray-400 mt-1">
              {latestAttempt
                ? `${Math.round(
                    ((latestAttempt.score || 0) /
                      (latestAttempt.total_questions || 1)) *
                      100
                  )}% score`
                : "No test attempted yet"}
            </p>
          </div>

          {/* Questions Attempted */}
          <div className="bg-white border rounded-2xl p-6">
            <p className="text-sm text-gray-500">
              Questions Attempted
            </p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {totalQuestionsAttempted}
            </p>

            <p className="text-sm text-gray-400 mt-1">
              Across all tests
            </p>
          </div>

          {/* Best Score */}
          <div className="bg-white border rounded-2xl p-6">
            <p className="text-sm text-gray-500">
              Best Score
            </p>

            <p className="text-3xl font-bold text-green-600 mt-2">
              {bestAttempt
                ? `${bestAttempt.score || 0}/${bestAttempt.total_questions || 0}`
                : "--"}
            </p>

            <p className="text-sm text-gray-400 mt-1">
              {attempts.length > 0
                ? `Average: ${averagePercentage}%`
                : "No attempts yet"}
            </p>
          </div>

        </div>

        {/* Available Tests */}
        <div className="mt-10">

          <h3 className="text-2xl font-bold text-gray-900">
            Available Mock Tests
          </h3>

          <p className="text-gray-600 mt-2">
            Choose a mock test and start preparing for your DMAT exam.
          </p>

          {/* Test Card */}
          <div className="mt-5 bg-white border rounded-2xl p-6 md:p-8">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

              {/* Test information */}
              <div>

                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-full">
                  Full Mock Test
                </span>

                <h4 className="text-2xl font-bold text-gray-900 mt-4">
                  DMAT Full Mock Test 01
                </h4>

                <p className="text-gray-600 mt-2 max-w-2xl">
                  Experience a realistic DMAT-style examination
                  with a complete timed test and detailed performance
                  analysis.
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-5 mt-5 text-sm text-gray-600">

                  <span>
                    ⏱️ 3 Hours
                  </span>

                  <span>
                    📝 Full Test
                  </span>

                  <span>
                    📊 Detailed Results
                  </span>

                  <span>
                    ❌ Mistake Analysis
                  </span>

                </div>

              </div>

              {/* Price */}
              <div className="md:text-right md:min-w-[150px]">

                <p className="text-3xl font-bold text-gray-900">
                  ₹99
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  One mock test
                </p>

                <button
                  onClick={handleStartTest}
                  className="mt-4 px-7 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  Start Mock Test
                </button>

              </div>

            </div>

          </div>

        </div>

        {/* Performance Summary */}
        {attempts.length > 0 && (
          <div className="mt-10">

            <h3 className="text-2xl font-bold text-gray-900">
              Your Performance
            </h3>

            <p className="text-gray-600 mt-2">
              A quick overview of your mock-test performance.
            </p>

            <div className="mt-5 bg-white border rounded-2xl p-6">

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

                <div>
                  <p className="text-sm text-gray-500">
                    Best Performance
                  </p>

                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {bestAttempt?.score || 0}/
                    {bestAttempt?.total_questions || 0}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Average Score
                  </p>

                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {averagePercentage}%
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Total Attempts
                  </p>

                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {testsCompleted}
                  </p>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* Previous Attempts */}
        <div className="mt-10">

          <h3 className="text-2xl font-bold text-gray-900">
            Previous Attempts
          </h3>

          <p className="text-gray-600 mt-2">
            Your completed mock tests and scores.
          </p>

          {attemptsLoading ? (
            <div className="mt-5 bg-white border rounded-2xl p-8 text-center">
              <p className="text-gray-500">
                Loading attempts...
              </p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="mt-5 bg-white border rounded-2xl p-8 text-center">

              <div className="text-4xl">
                📋
              </div>

              <h4 className="text-lg font-semibold text-gray-900 mt-4">
                No attempts yet
              </h4>

              <p className="text-gray-500 mt-2">
                Complete your first mock test and your results
                will appear here.
              </p>

              <button
                onClick={handleStartTest}
                className="mt-5 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Take Your First Test
              </button>

            </div>
          ) : (
            <div className="mt-5 space-y-4">

              {attempts.map((attempt, index) => {

                const score =
                  attempt.score || 0;

                const total =
                  attempt.total_questions || 0;

                const percentage =
                  total > 0
                    ? Math.round(
                        (score / total) * 100
                      )
                    : 0;

                return (
                  <div
                    key={attempt.id}
                    className="bg-white border rounded-2xl p-6"
                  >

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                      {/* Test info */}
                      <div>

                        <div className="flex items-center gap-3">

                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            Attempt {attempts.length - index}
                          </span>

                          <span className="text-sm text-gray-500">
                            {formatDate(
                              attempt.completed_at ||
                                attempt.created_at
                            )}
                          </span>

                        </div>

                        <h4 className="text-lg font-bold text-gray-900 mt-3">
                          {Array.isArray(
                            attempt.mock_tests
                          )
                            ? attempt.mock_tests[0]
                                ?.title ||
                              "DMAT Mock Test"
                            : attempt.mock_tests
                                ?.title ||
                              "DMAT Mock Test"}
                        </h4>

                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">

                          <span>
                            ✓ {attempt.correct_answers || 0} Correct
                          </span>

                          <span>
                            ✕ {attempt.wrong_answers || 0} Wrong
                          </span>

                          <span>
                            — {attempt.unanswered || 0} Unanswered
                          </span>

                        </div>

                      </div>

                      {/* Score */}
                      <div className="md:text-right">

                        <p className="text-3xl font-bold text-blue-600">
                          {score}/{total}
                        </p>

                        <p className="text-sm font-medium text-gray-500 mt-1">
                          {percentage}%
                        </p>

                        <button
                          onClick={() =>
                            router.push(
                              "/results"
                            )
                          }
                          className="mt-3 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-50"
                        >
                          View Result
                        </button>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>

      </section>

    </main>
  );
}