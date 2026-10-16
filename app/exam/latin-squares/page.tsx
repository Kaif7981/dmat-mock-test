
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LatinSquare from "@/components/LatinSquare";

type LatinSquareContent = {
  type?: string;
  grid: string[][];
  missingRow: number;
  missingColumn: number;
};

type LatinSquareOptions = {
  A: string;
  B: string;
  C: string;
  D: string;
  E: string;
};

type Question = {
  id: string;
  question_number: number;
  question_text: string;
  difficulty: string;
  content: LatinSquareContent;
  options: LatinSquareOptions;
};

type Result = {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  accuracy: number;
  answers: Record<string, string>;
};

const EXAM_DURATION_SECONDS = 25 * 60;

export default function LatinSquaresPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Prevent duplicate submissions.
  const submissionStarted = useRef(false);

  // LOAD QUESTIONS
  const loadQuestions = useCallback(async () => {
    try {
      const { data: mockTest, error: mockError } = await supabase
        .from("mock_tests")
        .select("id")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (mockError || !mockTest) {
        console.error("Mock test error:", mockError);
        alert("Unable to load the mock test.");
        router.push("/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("questions")
        .select(
          "id, question_number, question_text, difficulty, content, options"
        )
        .eq("mock_test_id", mockTest.id)
        .eq("section", "latin_squares")
        .order("question_number", { ascending: true });

      if (error) {
        console.error("Question loading error:", error);
        alert("Unable to load Latin Squares questions.");
        router.push("/dashboard");
        return;
      }

      if (!data || data.length === 0) {
        setQuestions([]);
        return;
      }

      const formattedQuestions: Question[] = data.map((item) => ({
        id: item.id,
        question_number: item.question_number,
        question_text: item.question_text ?? "",
        difficulty: item.difficulty ?? "easy",
        content: item.content as LatinSquareContent,
        options: item.options as LatinSquareOptions,
      }));

      setQuestions(formattedQuestions);
    } catch (error) {
      console.error("Unexpected question loading error:", error);
      alert("Something went wrong while loading the section.");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  // SUBMIT SECTION
  const handleSubmit = useCallback(async () => {
    if (submissionStarted.current || questions.length === 0) {
      return;
    }

    submissionStarted.current = true;
    setSubmitting(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        alert("Your session has expired. Please login again.");
        router.push("/login");
        submissionStarted.current = false;
        setSubmitting(false);
        return;
      }

      const questionIds = questions.map((item) => item.id);

      const response = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          questionIds,
          answers,
          sessionId:
            typeof window !== "undefined"
              ? localStorage.getItem("dmatSessionId")
              : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Score API error:", result);
        alert(result.error || "Unable to submit the section.");
        submissionStarted.current = false;
        setSubmitting(false);
        return;
      }

      const totalQuestions = questions.length;
      const correctAnswers = result.correctAnswers ?? 0;
      const wrongAnswers = result.wrongAnswers ?? 0;
      const unanswered =
        result.unanswered ??
        totalQuestions - correctAnswers - wrongAnswers;
      const score = result.score ?? correctAnswers;
      const accuracy =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;

      const finalResult: Result = {
        score,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        unanswered,
        accuracy,
        answers,
      };

      localStorage.setItem("dmatResult", JSON.stringify(finalResult));
      localStorage.setItem("dmatAnswers", JSON.stringify(answers));
      localStorage.setItem("dmatQuestionIds", JSON.stringify(questionIds));

      router.push("/exam/section-complete?section=latin-squares");
    } catch (error) {
      console.error("Submission error:", error);
      alert("Something went wrong while submitting your answers.");
      submissionStarted.current = false;
      setSubmitting(false);
    }
  }, [answers, questions, router, supabase]);

  // TIMER
  useEffect(() => {
    if (loading || questions.length === 0 || submitting) {
      return;
    }

    if (timeLeft <= 0) {
      void handleSubmit();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    handleSubmit,
    loading,
    questions.length,
    submitting,
    timeLeft,
  ]);

  // FORMAT TIMER
  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  // SELECT ANSWER
  function selectAnswer(questionId: string, option: string) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: option,
    }));
  }

  // PREVIOUS QUESTION
  function goToPreviousQuestion() {
    setCurrentQuestion((current) => Math.max(current - 1, 0));
  }

  // NEXT QUESTION
  function goToNextQuestion() {
    setCurrentQuestion((current) =>
      Math.min(current + 1, questions.length - 1)
    );
  }

  // LOADING SCREEN
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-gray-600">Loading Latin Squares...</p>
        </div>
      </main>
    );
  }

  // NO QUESTIONS
  if (questions.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <span className="text-2xl">∎</span>
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Latin Squares
          </h1>

          <p className="mt-3 text-gray-600">
            The Latin Squares questions have not been added yet.
          </p>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const question = questions[currentQuestion];
  const selectedAnswer = answers[question.id];

  const answeredCount = questions.filter((item) =>
    Boolean(answers[item.id])
  ).length;

  const progress =
    ((currentQuestion + 1) / questions.length) * 100;

  const grid = question.content?.grid ?? [];
  const missingRow = question.content?.missingRow ?? 0;
  const missingColumn = question.content?.missingColumn ?? 0;

  // MAIN UI
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Core Module</p>
              <h1 className="text-xl font-bold md:text-2xl">
                Latin Squares
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

          {/* PROGRESS */}
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm text-gray-500">
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span>{answeredCount} answered</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* TWO-COLUMN LAYOUT */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8 lg:py-8">
        {/* LEFT: QUESTION */}
        <section className="min-w-0">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                Question {currentQuestion + 1}
              </span>

              <span className="text-sm capitalize text-gray-500">
                {question.difficulty}
              </span>
            </div>

            <div className="mt-7 text-center">
              <h2 className="text-lg font-semibold text-gray-900 md:text-xl">
                {question.question_text ||
                  "Which letter should replace the missing cell?"}
              </h2>
            </div>

            {/* LATIN SQUARE */}
            <div className="mt-8">
              <LatinSquare
                grid={grid}
                missingRow={missingRow}
                missingColumn={missingColumn}
              />
            </div>

            {/* OPTIONS */}
            <div className="mt-10">
              <p className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
                Select your answer
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
                {(["A", "B", "C", "D", "E"] as const).map((option) => {
                  const isSelected = selectedAnswer === option;
                  const optionText = question.options?.[option] ?? option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => selectAnswer(question.id, option)}
                      aria-pressed={isSelected}
                      disabled={submitting}
                      className={`rounded-2xl border-2 p-4 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:flex-col">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {option}
                        </div>

                        <div className="text-center font-medium text-gray-800">
                          {optionText}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PREVIOUS / NEXT / SUBMIT */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goToPreviousQuestion}
              disabled={currentQuestion === 0 || submitting}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
            >
              ← Previous
            </button>

            {currentQuestion < questions.length - 1 ? (
              <button
                type="button"
                onClick={goToNextQuestion}
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
              >
                {submitting ? "Submitting..." : "Submit Section"}
              </button>
            )}
          </div>
        </section>

        {/* RIGHT: QUESTION NAVIGATOR */}
        <aside className="min-w-0 lg:sticky lg:top-36">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-gray-900">
                Question Navigator
              </h2>

              <span className="text-sm text-gray-500">
                {questions.length} questions
              </span>
            </div>

            {/* LEGEND */}
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-blue-600" />
                Current question
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-green-300 bg-green-50" />
                Answered
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-gray-300 bg-white" />
                Not answered
              </div>
            </div>

            {/* CLICKABLE QUESTION NUMBERS */}
            <div className="mt-5 grid grid-cols-5 gap-2">
              {questions.map((item, index) => {
                const isAnswered = Boolean(answers[item.id]);
                const isCurrent = index === currentQuestion;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentQuestion(index)}
                    aria-label={`Go to question ${index + 1}`}
                    aria-current={isCurrent ? "step" : undefined}
                    disabled={submitting}
                    className={`relative z-10 flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition disabled:cursor-not-allowed ${
                      isCurrent
                        ? "border-blue-600 bg-blue-600 text-white"
                        : isAnswered
                        ? "border-green-300 bg-green-50 text-green-700 hover:border-green-500"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* ANSWER COUNTS */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Answered</span>
                <span className="font-semibold text-green-700">
                  {answeredCount}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">Not answered</span>
                <span className="font-semibold text-gray-700">
                  {questions.length - answeredCount}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
