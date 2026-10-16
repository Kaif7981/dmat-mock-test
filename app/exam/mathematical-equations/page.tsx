
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type QuestionContent = {
  equations?: string[];
  targetVariables?: string[];
  targetVariable?: string;
  instructions?: string;
};

type Question = {
  id: string;
  question_number: number;
  question_text: string;
  difficulty: string;
  content: QuestionContent | null;
};

type NumericAnswers = Record<string, Record<string, string>>;

const EXAM_DURATION_SECONDS = 25 * 60;

export default function MathematicalEquationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<NumericAnswers>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      try {
        const { data: mockTest, error: mockError } = await supabase
          .from("mock_tests")
          .select("id")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (mockError || !mockTest) {
          throw new Error("Unable to load the mock test.");
        }

        const { data, error } = await supabase
          .from("questions")
          .select(
            "id, question_number, question_text, difficulty, content"
          )
          .eq("mock_test_id", mockTest.id)
          .eq("section", "mathematical_equations")
          .order("question_number", { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error("No Mathematical Equations questions found.");
        }

        if (!cancelled) {
          setQuestions(data as Question[]);
        }
      } catch (error) {
        console.error("Question loading error:", error);

        if (!cancelled) {
          alert(
            error instanceof Error
              ? error.message
              : "Unable to load questions."
          );
          router.push("/dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleSubmit = useCallback(async () => {
    if (submitting || questions.length === 0) return;

    setSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        alert("Your session has expired. Please log in again.");
        router.push("/login");
        return;
      }

      // Convert entered strings to numbers. Blank inputs remain unanswered.
      const numericAnswers: Record<string, Record<string, number>> = {};

      for (const question of questions) {
        const questionAnswers = answers[question.id] ?? {};
        const variables =
          question.content?.targetVariables ??
          (question.content?.targetVariable
            ? [question.content.targetVariable]
            : ["x"]);

        const submitted: Record<string, number> = {};

        for (const variable of variables) {
          const rawValue = questionAnswers[variable]?.trim();

          if (rawValue !== undefined && rawValue !== "") {
            const value = Number(rawValue);

            if (!Number.isSafeInteger(value)) {
              alert(
                `Question ${question.question_number}: enter a whole number for ${variable}.`
              );
              setSubmitting(false);
              return;
            }

            submitted[variable] = value;
          }
        }

        if (Object.keys(submitted).length > 0) {
          numericAnswers[question.id] = submitted;
        }
      }

      const response = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          questionIds: questions.map((question) => question.id),
          numericAnswers,
          sessionId: localStorage.getItem("dmatSessionId"),
          section: "mathematical_equations",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Score API error:", result);
        alert(result.error || "Unable to submit the section.");
        setSubmitting(false);
        return;
      }

      // Preserve the existing section-complete flow.
      // The scoring API must be updated to support numericAnswers next.
      localStorage.setItem(
        "dmatResult",
        JSON.stringify({
          score: result.score ?? result.correctAnswers ?? 0,
          totalQuestions: questions.length,
          correctAnswers: result.correctAnswers ?? 0,
          wrongAnswers: result.wrongAnswers ?? 0,
          unanswered:
            result.unanswered ??
            questions.length -
              (result.correctAnswers ?? 0) -
              (result.wrongAnswers ?? 0),
          accuracy:
            questions.length > 0
              ? Math.round(
                  ((result.correctAnswers ?? 0) / questions.length) * 100
                )
              : 0,
          numericAnswers,
        })
      );

      router.push(
        "/exam/section-complete?section=mathematical-equations"
      );
    } catch (error) {
      console.error("Submission error:", error);
      alert("Something went wrong while submitting your answers.");
      setSubmitting(false);
    }
  }, [answers, questions, router, submitting, supabase]);

  useEffect(() => {
    if (loading || questions.length === 0 || submitting) return;

    if (timeLeft <= 0) {
      void handleSubmit();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, loading, questions.length, submitting, handleSubmit]);

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  function updateAnswer(
    questionId: string,
    variable: string,
    value: string
  ) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: {
        ...previous[questionId],
        [variable]: value,
      },
    }));
  }

  const answeredCount = questions.filter((question) => {
    const values = Object.values(answers[question.id] ?? {});
    return values.some((value) => value.trim() !== "");
  }).length;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading Mathematical Equations...</p>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">No Questions Available</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const question = questions[currentQuestion];
  const content = question.content;
  const variables =
    content?.targetVariables ??
    (content?.targetVariable ? [content.targetVariable] : ["x"]);
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Core Module</p>
              <h1 className="text-xl font-bold md:text-2xl">
                Mathematical Equations
              </h1>
            </div>
            <div
              className={`rounded-xl border px-4 py-2 text-lg font-bold ${
                timeLeft <= 60
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm text-gray-500">
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span>{answeredCount} answered</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  Question {currentQuestion + 1}
                </span>
                <span className="text-sm capitalize text-gray-500">
                  Difficulty: {question.difficulty || "Not specified"}
                </span>
              </div>

              <h2 className="mt-7 whitespace-pre-line text-lg font-semibold leading-relaxed md:text-xl">
                {question.question_text}
              </h2>

              {content?.instructions && (
                <p className="mt-4 text-sm text-gray-600">
                  {content.instructions}
                </p>
              )}

              {content?.equations && content.equations.length > 0 && (
                <div className="mt-6 space-y-3 rounded-xl bg-gray-50 p-5">
                  {content.equations.map((equation, index) => (
                    <p
                      key={`${question.id}-equation-${index}`}
                      className="font-mono text-lg font-semibold"
                    >
                      {equation}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-7 space-y-4">
                <p className="font-medium text-gray-700">
                  Enter your answer{variables.length > 1 ? "s" : ""}:
                </p>

                {variables.map((variable) => (
                  <label
                    key={variable}
                    className="block max-w-sm"
                  >
                    <span className="mb-2 block text-sm font-semibold text-gray-700">
                      Value of {variable}
                    </span>
                    <input
                      type="number"
                      step="1"
                      inputMode="numeric"
                      value={answers[question.id]?.[variable] ?? ""}
                      onChange={(event) =>
                        updateAnswer(
                          question.id,
                          variable,
                          event.target.value
                        )
                      }
                      disabled={submitting}
                      placeholder={`Enter ${variable}`}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                onClick={() =>
                  setCurrentQuestion((previous) =>
                    Math.max(previous - 1, 0)
                  )
                }
                disabled={currentQuestion === 0 || submitting}
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() =>
                    setCurrentQuestion((previous) =>
                      Math.min(previous + 1, questions.length - 1)
                    )
                  }
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Section"}
                </button>
              )}
            </div>
          </section>

          <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-36">
            <h2 className="font-bold">Question Navigator</h2>

            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>🔵 Current question</p>
              <p>🟢 Answered</p>
              <p>⚪ Not answered</p>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-4">
              {questions.map((item, index) => {
                const isAnswered = Object.values(
                  answers[item.id] ?? {}
                ).some((value) => value.trim() !== "");
                const isCurrent = index === currentQuestion;

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentQuestion(index)}
                    disabled={submitting}
                    aria-label={`Go to question ${index + 1}`}
                    className={`h-10 rounded-lg border text-sm font-semibold transition ${
                      isCurrent
                        ? "border-blue-600 bg-blue-600 text-white"
                        : isAnswered
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Answered</span>
                <span className="font-semibold text-green-700">
                  {answeredCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Not answered</span>
                <span className="font-semibold">
                  {questions.length - answeredCount}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
