
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FigureMatrix, {
  type MatrixCell,
  type MatrixFigure,
} from "@/components/FigureMatrix";

type Figure = {
  shape: string;
  filled?: boolean;
  position?: string;
  rotation?: number;
  color?: string;
  items?: Figure[];
};

function figureToMatrixCells(figure: Figure): MatrixCell[] {
  const cells: MatrixCell[] = Array.from({ length: 16 }, () => null);

  const positionMap: Record<string, number> = {
    "top-left": 0,
    top: 1,
    "top-right": 3,
    left: 4,
    center: 5,
    right: 7,
    "bottom-left": 12,
    bottom: 13,
    "bottom-right": 15,
  };

  function convert(item: Figure): MatrixFigure {
    return {
      shape: item.shape as MatrixFigure["shape"],
      rotation: item.rotation ?? 0,
      filled: item.filled ?? false,
      color: item.color ?? "#111827",
    };
  }

  const items =
    Array.isArray(figure.items) && figure.items.length > 0
      ? figure.items
      : [figure];

  for (const item of items) {
    const position = item.position ?? figure.position ?? "center";
    const cellIndex = positionMap[position];

    if (cellIndex === undefined) continue;

    const matrixFigure = convert(item);
    const existing = cells[cellIndex];

    if (existing === null) {
      cells[cellIndex] = matrixFigure;
    } else if (Array.isArray(existing)) {
      cells[cellIndex] = [...existing, matrixFigure];
    } else {
      cells[cellIndex] = [existing, matrixFigure];
    }
  }

  return cells;
}

type QuestionOptions = {
  fifth?: Record<string, Figure>;
  sixth?: Record<string, Figure>;
};

type Question = {
  id: string;
  question_number: number;
  question_text: string | null;
  difficulty: string | null;
  content: {
    type?: string;
    figures?: Figure[];
    difficulty?: string;
  } | null;
  options: QuestionOptions | null;
};

type PairAnswer = {
  fifth: string;
  sixth: string;
};

const LETTERS = ["A", "B", "C"] as const;
const SECTION_SECONDS = 25 * 60;

export default function FigureSequencesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matrixAnswers, setMatrixAnswers] = useState<
    Record<string, PairAnswer>
  >({});
  const [timeLeft, setTimeLeft] = useState(SECTION_SECONDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      try {
        // The dashboard saves the selected mock test ID before the exam starts.
        const testId = localStorage.getItem("dmatTestId");

        if (!testId) {
          throw new Error(
            "Missing test ID. Please restart the mock test from the dashboard."
          );
        }

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

       const { data: test, error: testError } = await supabase
  .from("mock_tests")
  .select("id")
  .eq("id", testId)
  .eq("published", true)
  .single();

if (testError || !test) {
  throw new Error(
    testError?.message || "Published mock test could not be loaded."
  );
}

        const { data, error: questionError } = await supabase
          .from("questions")
          .select(
            "id, question_number, question_text, difficulty, content, options"
          )
          .eq("mock_test_id", test.id)
          .eq("section", "figure_sequences")
          .order("question_number", { ascending: true });

        if (questionError) {
          throw new Error(questionError.message);
        }

        if (!data || data.length === 0) {
          throw new Error(
            "No Figure Sequences questions were found. Add questions to Supabase first."
          );
        }

        const formatted = data as unknown as Question[];

        const invalid = formatted.find((question) => {
          const figures = question.content?.figures;
          const options = question.options;

          return (
            !Array.isArray(figures) ||
            figures.length !== 4 ||
            !options?.fifth ||
            !options?.sixth ||
            !LETTERS.every(
              (letter) =>
                options.fifth?.[letter] && options.sixth?.[letter]
            )
          );
        });

        if (invalid) {
          throw new Error(
            `Question ${invalid.question_number} has incomplete data. Each question needs four given figures and three choices for both the fifth and sixth figures.`
          );
        }

        if (!cancelled) {
          setQuestions(formatted);
        }
      } catch (err) {
        console.error("Figure Sequences loading error:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Figure Sequences."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const selectAnswer = useCallback(
    (questionId: string, part: "fifth" | "sixth", letter: string) => {
      if (submitting) return;

      setMatrixAnswers((previous) => ({
        ...previous,
        [questionId]: {
          fifth: previous[questionId]?.fifth ?? "",
          sixth: previous[questionId]?.sixth ?? "",
          [part]: letter,
        },
      }));
    },
    [submitting]
  );

  const handleSubmit = useCallback(
    async (automatic = false) => {
      if (submitting || questions.length === 0) return;

      const unanswered = questions.filter((question) => {
        const answer = matrixAnswers[question.id];
        return !answer?.fifth || !answer?.sixth;
      }).length;

      if (!automatic) {
        const message =
          unanswered > 0
            ? `${unanswered} question(s) have one or more missing selections. Submit anyway?`
            : "Are you sure you want to submit this section?";

        if (!window.confirm(message)) return;
      }

      setSubmitting(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          alert("Your session has expired. Please log in again.");
          router.push("/login");
          return;
        }

        const questionIds = questions.map((question) => question.id);
        const sessionId = localStorage.getItem("dmatSessionId");
        const testId = localStorage.getItem("dmatTestId");

        if (!testId) {
          alert("Test ID is missing. Please restart the mock test from the dashboard.");
          router.push("/dashboard");
          return;
        }

        if (!sessionId) {
          alert("Your exam session was not found. Please restart the exam.");
          router.push("/dashboard");
          return;
        }

        const response = await fetch("/api/score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            matrixAnswers,
            questionIds,
            sessionId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("Score API error:", result);
          alert(result?.error || "Unable to submit this section.");
          return;
        }

        localStorage.setItem("dmatResult", JSON.stringify(result));
        localStorage.setItem(
          "dmatAnswers",
          JSON.stringify(matrixAnswers)
        );
        localStorage.setItem(
          "dmatQuestionIds",
          JSON.stringify(questionIds)
        );

        router.push(
          `/exam/section-complete?section=figure-sequences&testId=${encodeURIComponent(testId)}`
        );

      } catch (err) {
        console.error("Figure Sequences submission error:", err);
        alert("Something went wrong while submitting. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [matrixAnswers, questions, router, submitting, supabase]
  );

 
useEffect(() => {
  if (loading || questions.length === 0 || submitting) return;

  const timer = window.setTimeout(() => {
    if (timeLeft <= 1) {
      setTimeLeft(0);
      void handleSubmit(true);
    } else {
      setTimeLeft((value) => Math.max(0, value - 1));
    }
  }, 1000);

  return () => window.clearTimeout(timer);
}, [timeLeft, loading, questions.length, submitting, handleSubmit]);


  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="font-semibold text-gray-700">
          Loading Figure Sequences...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-red-700">
            Figure Sequences could not load
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-700">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const question = questions[currentIndex];

  if (!question) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-gray-700">No question is currently selected.</p>
      </main>
    );
  }

  const answer = matrixAnswers[question.id] ?? {
    fifth: "",
    sixth: "",
  };

  const figures = question.content?.figures ?? [];
  const options = question.options;
  const answeredCount = questions.filter((item) => {
    const selected = matrixAnswers[item.id];
    return Boolean(selected?.fifth && selected?.sixth);
  }).length;

  const progress =
    questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              DMAT · Core Module
            </p>
            <h1 className="mt-1 text-lg font-bold">Figure Sequences</h1>
            <p className="text-sm text-gray-500">
              Select the fifth and sixth figures
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-right">
            <p className="text-xs text-gray-500">Time remaining</p>
            <p
              className={`font-mono text-xl font-bold ${
                timeLeft <= 300 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>

        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-blue-700">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <p className="mt-1 text-xs capitalize text-gray-500">
                  Difficulty: {question.difficulty || "Not specified"}
                </p>
              </div>

              <span className="text-sm text-gray-500">
                {answer.fifth && answer.sixth
                  ? "2/2 selected"
                  : `${
                      Number(Boolean(answer.fifth)) +
                      Number(Boolean(answer.sixth))
                    }/2 selected`}
              </span>
            </div>

            <h2 className="mt-5 rounded-xl border border-gray-200 bg-slate-50 p-4 text-lg font-semibold leading-relaxed">
              {question.question_text ||
                "Study the sequence and select the missing figures."}
            </h2>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-slate-50 p-4 sm:p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Given sequence — first four figures
              </p>

              <div className="overflow-x-auto py-2">
                <div className="flex min-w-max items-center justify-center gap-2 sm:gap-3">
                  {figures.map((figure, index) => (
                    <div key={index} className="text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-gray-200 bg-white sm:h-24 sm:w-24">
                        <FigureMatrix
  cells={figureToMatrixCells(figure)}
  size="small"
  label={`Given figure ${index + 1}`}
/>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Figure {index + 1}
                      </p>
                    </div>
                  ))}

                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 text-2xl font-bold text-blue-600 sm:h-24 sm:w-24">
                    5
                  </div>

                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 text-2xl font-bold text-blue-600 sm:h-24 sm:w-24">
                    6
                  </div>
                </div>
              </div>
            </div>

            {(["fifth", "sixth"] as const).map((part) => {
              const choices = options?.[part];

              if (!choices) return null;

              return (
                <div key={part} className="mt-7">
                  <div className="mb-3">
                    <h3 className="font-bold text-gray-900">
                      Choose the {part === "fifth" ? "5th" : "6th"} figure
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select one of the three options below.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {LETTERS.map((letter) => {
                      const choice = choices[letter];
                      if (!choice) return null;

                      const selected = answer[part] === letter;

                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() =>
                            selectAnswer(question.id, part, letter)
                          }
                          disabled={submitting}
                          aria-pressed={selected}
                          className={`relative flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border-2 p-4 transition-colors ${
                            selected
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 bg-white hover:border-blue-300"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                              selected
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {letter}
                          </span>

                          <div className="flex min-h-16 items-center justify-center">
                            <FigureMatrix
  cells={figureToMatrixCells(choice)}
  size="small"
  label={`Option ${letter} for ${part === "fifth" ? "fifth" : "sixth"} figure`}
/>
                          </div>

                          {selected && (
                            <span className="text-xs font-semibold text-blue-700">
                              Selected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((index) => Math.max(0, index - 1))
                }
                disabled={currentIndex === 0 || submitting}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold disabled:opacity-40"
              >
                ← Previous
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((index) =>
                      Math.min(questions.length - 1, index + 1)
                    )
                  }
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Next question →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit section"}
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-28">
          <h2 className="font-bold">Question Navigator</h2>
          <p className="mt-2 text-sm text-gray-500">
            A question counts as answered when both figures are selected.
          </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-5 gap-2">
            {questions.map((item, index) => {
              const selected = matrixAnswers[item.id];
              const complete = Boolean(
                selected?.fifth && selected?.sixth
              );
              const current = index === currentIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  disabled={submitting}
                  aria-label={`Question ${index + 1}${
                    complete ? ", answered" : ", incomplete"
                  }`}
                  className={`flex h-10 items-center justify-center rounded-lg border text-sm font-semibold ${
                    current
                      ? "border-blue-600 bg-blue-600 text-white"
                      : complete
                      ? "border-green-300 bg-green-50 text-green-800"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Fully answered</span>
              <span className="font-semibold text-green-700">
                {answeredCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Incomplete</span>
              <span className="font-semibold">
                {questions.length - answeredCount}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="mt-5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Finish section"}
          </button>
        </aside>
      </div>
    </main>
  );
}
