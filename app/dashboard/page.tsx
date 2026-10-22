
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MockTest = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  published: boolean;
  created_at: string;
};

type Attempt = {
  id: string;
  score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  unanswered: number | null;
  completed_at: string | null;
  created_at: string;
  mock_tests: { title: string } | { title: string }[] | null;
};

type MockSession = {
  mock_test_id: string;
  status: string;
};

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [tests, setTests] = useState<MockTest[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [completedTestIds, setCompletedTestIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setUserName(
        user.user_metadata?.full_name || user.email?.split("@")[0] || "Student"
      );
      setUserEmail(user.email || "");

      const [
        { data: testData, error: testError },
        { data: attemptData, error: attemptError },
        { data: sessionData, error: sessionError },
      ] = await Promise.all([
        supabase
          .from("mock_tests")
          .select(
            "id, title, description, duration_minutes, price, published, created_at"
          )
          .order("created_at", { ascending: true }),
        supabase
          .from("attempts")
          .select(`
            id,
            score,
            total_questions,
            correct_answers,
            wrong_answers,
            unanswered,
            completed_at,
            created_at,
            mock_tests ( title )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("mock_sessions")
          .select("mock_test_id, status")
          .eq("user_id", user.id)
          .eq("status", "completed"),
      ]);

      if (testError) throw testError;
      if (attemptError) throw attemptError;
      if (sessionError) throw sessionError;

     const allTests = ((testData || []) as MockTest[])
  .sort((a, b) => a.title.localeCompare(b.title))
  .slice(0, 3);
      setTests(allTests);
      setAttempts((attemptData || []) as Attempt[]);

      const completedIds = [
        ...new Set(
          ((sessionData || []) as MockSession[]).map(
            (session) => session.mock_test_id
          )
        ),
      ];

      setCompletedTestIds(completedIds);
    } catch (error) {
      console.error("Dashboard loading error:", error);
      setErrorMessage(
        "We couldn't load your dashboard. Please refresh and try again."
      );
    } finally {
      setLoading(false);
      setAttemptsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
  let cancelled = false;

  const run = async () => {
    if (cancelled) return;
    await loadDashboard();
  };

  void run();

  return () => {
    cancelled = true;
  };
}, [loadDashboard]);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      localStorage.removeItem("dmatSessionId");
      localStorage.removeItem("dmatResults");
      localStorage.removeItem("dmatAnswers");
      localStorage.removeItem("dmatQuestionIds");

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setErrorMessage("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  };

  const handleStartTest = (test: MockTest, index: number) => {
    if (index > 0 && !completedTestIds.includes(tests[index - 1]?.id)) {
      setErrorMessage(
        `Complete Mock Test ${index} before starting Mock Test ${index + 1}.`
      );
      return;
    }

    if (!test.published) {
      setErrorMessage(
        `Mock Test ${index + 1} is not ready yet. Please check back later.`
      );
      return;
    }

    setStartingTestId(test.id);
    setErrorMessage("");

    router.push(
     `/exam/instructions?testId=${encodeURIComponent(test.id)}`
    );
  };

  const testsCompleted = completedTestIds.length;
  const latestAttempt = attempts[0] || null;

  const bestAttempt =
    attempts.length > 0
      ? attempts.reduce((best, current) =>
          (current.score || 0) > (best.score || 0) ? current : best
        )
      : null;

  const totalQuestionsAttempted = attempts.reduce(
    (total, attempt) => total + (attempt.total_questions || 0),
    0
  );

  const averagePercentage =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((total, attempt) => {
            const totalQuestions = attempt.total_questions || 0;
            if (!totalQuestions) return total;
            return total + ((attempt.score || 0) / totalQuestions) * 100;
          }, 0) / attempts.length
        )
      : 0;

  function formatDate(dateString: string | null) {
    if (!dateString) return "Date unavailable";

    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-700">Loading your dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-4 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-2xl font-bold text-blue-600"
          >
            DMAT Mock
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-600">{userEmail}</p>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome back, {userName} 👋
        </h2>
        <p className="mt-2 text-gray-700">
          Complete each mock test to unlock the next one.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tests Completed" value={testsCompleted} />
          <StatCard
            label="Latest Score"
            value={
              latestAttempt
                ? `${latestAttempt.score || 0}/${latestAttempt.total_questions || 0}`
                : "--"
            }
          />
          <StatCard
            label="Questions Attempted"
            value={totalQuestionsAttempted}
          />
          <StatCard
            label="Best Score"
            value={
              bestAttempt
                ? `${bestAttempt.score || 0}/${bestAttempt.total_questions || 0}`
                : "--"
            }
            footer={`Average: ${averagePercentage}%`}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-2xl font-bold text-gray-900">
            Available Mock Tests
          </h3>
          <p className="mt-2 text-gray-700">
            Complete each test to unlock the next one.
          </p>

          {tests.length === 0 ? (
            <div className="mt-5 rounded-xl border bg-white p-6 text-gray-800">
              No mock tests have been created yet.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {tests.map((test, index) => {
                const isCompleted = completedTestIds.includes(test.id);
                const isUnlocked =
                  index === 0 ||
                  completedTestIds.includes(tests[index - 1]?.id);
                const isLocked = !isUnlocked;
                const isReady = test.published;

                return (
                  <article
                    key={test.id}
                    className={`rounded-2xl border bg-white p-6 md:p-8 ${
                      isLocked ? "border-gray-200" : "border-blue-200"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                            Mock Test {index + 1}
                          </span>

                          {isCompleted && (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                              Completed
                            </span>
                          )}

                          {isLocked && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
                              🔒 Locked
                            </span>
                          )}

                          {!isReady && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                              Coming soon
                            </span>
                          )}
                        </div>

                        <h4 className="mt-4 text-xl font-bold text-gray-900">
                          {test.title}
                        </h4>

                        <p className="mt-2 max-w-2xl text-gray-700">
                          {test.description ||
                            "Practice DMAT-style questions in a timed mock exam."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                          <span>⏱️ {test.duration_minutes} minutes</span>
                          <span>
                            {isCompleted
                              ? "✓ Successfully completed"
                              : isLocked
                                ? `Complete Mock Test ${index} to unlock`
                                : !isReady
                                  ? "Questions are being prepared"
                                  : "Available to start"}
                          </span>
                        </div>
                      </div>

                      <div className="md:min-w-36 md:text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {Number(test.price) > 0
                            ? `₹${Number(test.price)}`
                            : "Included"}
                        </p>

                        <button
                          onClick={() => handleStartTest(test, index)}
                          disabled={
                            isLocked ||
                            !isReady ||
                            startingTestId === test.id
                          }
                          className="mt-4 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                        >
                          {isLocked
                            ? "Locked"
                            : !isReady
                              ? "Coming Soon"
                              : startingTestId === test.id
                                ? "Opening..."
                                : isCompleted
                                  ? "Start Again"
                                  : "Start Mock Test"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h3 className="text-2xl font-bold text-gray-900">
            Previous Attempts
          </h3>
          <p className="mt-2 text-gray-700">
            Review your recorded test attempts.
          </p>

          {attemptsLoading ? (
            <p className="mt-5 text-gray-600">Loading attempts...</p>
          ) : attempts.length === 0 ? (
            <div className="mt-5 rounded-xl border bg-white p-8 text-center">
              <h4 className="font-semibold text-gray-900">No attempts yet</h4>
              <p className="mt-2 text-gray-600">
                Complete your first mock test and your results will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {attempts.map((attempt, index) => {
                const score = attempt.score || 0;
                const total = attempt.total_questions || 0;
                const title = Array.isArray(attempt.mock_tests)
                  ? attempt.mock_tests[0]?.title || "DMAT Mock Test"
                  : attempt.mock_tests?.title || "DMAT Mock Test";

                return (
                  <div
                    key={attempt.id}
                    className="rounded-2xl border bg-white p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm text-gray-600">
                          Attempt {attempts.length - index} ·{" "}
                          {formatDate(attempt.completed_at || attempt.created_at)}
                        </p>
                        <h4 className="mt-2 font-bold text-gray-900">{title}</h4>
                        <p className="mt-2 text-sm text-gray-700">
                          ✓ {attempt.correct_answers || 0} correct · ✕{" "}
                          {attempt.wrong_answers || 0} wrong · —{" "}
                          {attempt.unanswered || 0} unanswered
                        </p>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {score}/{total}
                        </p>
                        <p className="text-sm text-gray-600">
                          {total ? Math.round((score / total) * 100) : 0}%
                        </p>
                        <button
                          onClick={() => router.push("/results")}
                          className="mt-2 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
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

function StatCard({
  label,
  value,
  footer,
}: {
  label: string;
  value: string | number;
  footer?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">
        {footer || "Keep practicing"}
      </p>
    </div>
  );
}
