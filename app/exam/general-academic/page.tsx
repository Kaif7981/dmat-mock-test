"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty: string;
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

const EXAM_DURATION_SECONDS = 90 * 60;

export default function GeneralAcademicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get("testId");
  const supabase = useMemo(() => createClient(), []);
  const autoSubmitStarted = useRef(false);

  const [questions, setQuestions] = useState<Question[]>(
    []
  );

  const [answers, setAnswers] = useState<
    Record<string, string>
  >({});

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [timeLeft, setTimeLeft] = useState(
    EXAM_DURATION_SECONDS
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------
  // LOAD QUESTIONS FOR THE SELECTED MOCK TEST
  // -----------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      if (!testId) {
        alert("Missing test ID. Please start the mock test from the dashboard.");
        router.replace("/dashboard");
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: mockTest, error: mockError } = await supabase
          .from("mock_tests")
          .select("id")
          .eq("id", testId)
          .eq("published", true)
          .single();

        if (mockError || !mockTest) {
          throw new Error("The selected mock test is unavailable or unpublished.");
        }

        const { data, error } = await supabase
          .from("questions")
          .select(`
            id,
            question_number,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            difficulty
          `)
          .eq("mock_test_id", mockTest.id)
          .eq("section", "general_academic")
          .order("question_number", { ascending: true });

        if (error) {
          throw new Error(`Unable to load General Academic questions: ${error.message}`);
        }

        if (!cancelled) {
          setQuestions((data ?? []) as Question[]);
          setCurrentQuestion(0);
        }
      } catch (error) {
        console.error("General Academic loading error:", error);
        if (!cancelled) {
          alert(error instanceof Error ? error.message : "Something went wrong while loading the section.");
          router.replace("/dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [router, supabase, testId]);

  // -----------------------------------------
  // FORMAT TIMER
  // -----------------------------------------
  function formatTime(seconds: number) {
    const hours = Math.floor(
      seconds / 3600
    );

    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    const remainingSeconds =
      seconds % 60;

    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  // -----------------------------------------
  // SELECT ANSWER
  // -----------------------------------------
  function selectAnswer(
    questionId: string,
    option: string
  ) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: option,
    }));
  }

  // -----------------------------------------
  // PREVIOUS
  // -----------------------------------------
  function goToPreviousQuestion() {
    setCurrentQuestion((previous) =>
      Math.max(previous - 1, 0)
    );
  }

  // -----------------------------------------
  // NEXT
  // -----------------------------------------
  function goToNextQuestion() {
    setCurrentQuestion((previous) =>
      Math.min(
        previous + 1,
        questions.length - 1
      )
    );
  }

  // -----------------------------------------
  // SUBMIT
  // -----------------------------------------
  const handleSubmit = useCallback(async () => {
    if (
      submitting ||
      questions.length === 0
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      const accessToken =
        sessionData.session
          ?.access_token;

      if (!accessToken) {
        alert(
          "Your session has expired. Please login again."
        );

        router.push("/login");
        return;
      }

      const questionIds =
        questions.map(
          (question) => question.id
        );

      const response =
        await fetch(
          "/api/score",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`,
            },

            body: JSON.stringify({
              questionIds,
              answers,
              sessionId: localStorage.getItem("dmatSessionId"),
              testId,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        console.error(
          "Score API error:",
          result
        );

        alert(
          result.error ||
            "Unable to submit the section."
        );

        setSubmitting(false);
        return;
      }

      const totalQuestions =
        questions.length;

      const correctAnswers =
        result.correctAnswers ?? 0;

      const wrongAnswers =
        result.wrongAnswers ?? 0;

      const unanswered =
        result.unanswered ??
        totalQuestions -
          correctAnswers -
          wrongAnswers;

      const score =
        result.score ??
        correctAnswers;

      const accuracy =
        totalQuestions > 0
          ? Math.round(
              (correctAnswers /
                totalQuestions) *
                100
            )
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

      localStorage.setItem(
        "dmatResult",
        JSON.stringify(
          finalResult
        )
      );

      localStorage.setItem(
        "dmatAnswers",
        JSON.stringify(
          answers
        )
      );

      localStorage.setItem(
        "dmatQuestionIds",
        JSON.stringify(
          questionIds
        )
      );

      router.push(
        `/exam/section-complete?section=general-academic&testId=${encodeURIComponent(testId ?? "")}`
      );
    } catch (error) {
      console.error(
        "Submission error:",
        error
      );

      alert(
        "Something went wrong while submitting your answers."
      );

      setSubmitting(false);
    }
  }, [answers, questions, router, supabase, submitting, testId]);

  // -----------------------------------------
  // TIMER
  // -----------------------------------------
  useEffect(() => {
    if (loading || questions.length === 0 || submitting) return;

    if (timeLeft <= 0) {
      if (!autoSubmitStarted.current) {
        autoSubmitStarted.current = true;
        void handleSubmit();
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [timeLeft, loading, questions.length, submitting, handleSubmit]);

  // -----------------------------------------
  // LOADING
  // -----------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">

        <div className="text-center">

          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-gray-600">
            Loading General Academic Module...
          </p>

        </div>

      </main>
    );
  }

  // -----------------------------------------
  // NO QUESTIONS
  // -----------------------------------------
  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">

        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md">

          <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">
              GA
            </span>
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            General Academic Module
          </h1>

          <p className="text-gray-600 mt-3">
            The General Academic questions
            have not been added yet.
          </p>

          <p className="text-sm text-gray-500 mt-2">
            The exam structure is ready.
            Questions will be added next.
          </p>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl"
          >
            Back to Dashboard
          </button>

        </div>

      </main>
    );
  }

  // -----------------------------------------
  // CURRENT QUESTION
  // -----------------------------------------
  const question =
    questions[currentQuestion];

  const selectedAnswer =
    answers[question.id];

  const answeredCount =
    Object.keys(answers).length;

  const progress =
    ((currentQuestion + 1) /
      questions.length) *
    100;

  // -----------------------------------------
  // MAIN UI
  // -----------------------------------------
  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Subject Module</p>
              <h1 className="text-xl md:text-2xl font-bold">
                General Academic Module
              </h1>
            </div>

            <div
              className={`px-4 py-2 rounded-xl border font-bold text-lg ${
                timeLeft <= 300
                  ? "bg-red-50 border-red-300 text-red-600"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span>{answeredCount} answered</span>
            </div>

            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* TWO-COLUMN EXAM LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
          {/* LEFT: QUESTION AND ANSWERS */}
          <section className="min-w-0">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
                  Question {currentQuestion + 1}
                </span>

                <span className="text-sm text-gray-500 capitalize">
                  Difficulty: {question.difficulty || "Standard"}
                </span>
              </div>

              <h2 className="mt-7 text-lg md:text-xl font-semibold leading-relaxed whitespace-pre-line">
                {question.question_text}
              </h2>

              <div className="mt-7 space-y-4">
                {[
                  { key: "A", text: question.option_a },
                  { key: "B", text: question.option_b },
                  { key: "C", text: question.option_c },
                  { key: "D", text: question.option_d },
                ].map((option) => {
                  const isSelected = selectedAnswer === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        selectAnswer(question.id, option.key)
                      }
                      disabled={submitting}
                      className={`w-full text-left border-2 rounded-2xl p-4 transition ${
                        isSelected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
                      } disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {option.key}
                        </div>

                        <div className="text-gray-800 font-medium">
                          {option.text}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PREVIOUS / NEXT */}
            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={goToPreviousQuestion}
                disabled={currentQuestion === 0 || submitting}
                className="px-5 py-3 rounded-xl border border-gray-300 bg-white font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                ← Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={goToNextQuestion}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Section"}
                </button>
              )}
            </div>
          </section>

          {/* RIGHT: QUESTION NAVIGATOR */}
          <aside className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 lg:sticky lg:top-36">
            <h2 className="font-bold text-gray-900">
              Question Navigator
            </h2>

            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                Current
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-600" />
                Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400" />
                Not Answered
              </div>
            </div>

            <div className="mt-5 grid grid-cols-5 lg:grid-cols-4 gap-2">
              {questions.map((item, index) => {
                const isAnswered = Boolean(answers[item.id]);
                const isCurrent = index === currentQuestion;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentQuestion(index)}
                    disabled={submitting}
                    aria-label={`Go to question ${index + 1}`}
                    className={`h-10 rounded-lg text-sm font-semibold border transition ${
                      isCurrent
                        ? "bg-blue-600 text-white border-blue-600"
                        : isAnswered
                        ? "bg-green-50 text-green-700 border-green-300"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Answered</span>
                <span className="font-semibold text-green-700">
                  {answeredCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Not Answered</span>
                <span className="font-semibold text-gray-700">
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
