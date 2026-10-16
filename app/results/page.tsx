
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";


type QuestionReview = {
  questionId: string;
  question: {
    id: string;
    question_number: number;
    module: string | null;
    section: string;
    question_type: string | null;
    question_text: string;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    difficulty: string;
    content: any;
    options: any;
  };
  selectedOption: string | null;
  correctOption: string | null;
  
  selectedNumericAnswers: Record<string, number> | null;
  correctNumericAnswers: Record<string, number> | null;

  explanation: string;
  status: "correct" | "wrong" | "unanswered";
};

type SectionResult = {
  section: string;
  completedAt: string | null;
  attempt: {
    id: string;
    score: number;
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    unanswered: number;
    completed_at: string;
  } | null;
  questions: QuestionReview[];
};

type ResultsData = {
  success: boolean;
  session: {
    id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
  };
  requiredSections: string[];
  sections: SectionResult[];
  overall: {
    score: number;
    totalQuestions: number;
    correct: number;
    wrong: number;
    unanswered: number;
    percentage: number;
  };
};

const SECTION_LABELS: Record<string, string> = {
  figure_sequences: "Figure Sequences",
  mathematical_equations: "Mathematical Equations",
  latin_squares: "Latin Squares",
  general_academic: "General Academic Module",
};

const SECTION_ORDER = [
  "figure_sequences",
  "mathematical_equations",
  "latin_squares",
  "general_academic",
];

function getOptionText(question: QuestionReview["question"], option: string | null) {
  if (!option) return "Not answered";

  if (["A", "B", "C", "D", "E"].includes(option)) {
    const options = question.options;

    if (options && typeof options === "object" && options[option]) {
      return String(options[option]);
    }
  }

  switch (option) {
    case "A":
      return question.option_a ?? "Option A";
    case "B":
      return question.option_b ?? "Option B";
    case "C":
      return question.option_c ?? "Option C";
    case "D":
      return question.option_d ?? "Option D";
    case "E":
      return "Option E";
    default:
      return option;
  }
}

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      try {
        const supabase = createClient();

        const { data: authData, error: authError } =
          await supabase.auth.getSession();

        const accessToken = authData.session?.access_token;

        if (authError || !accessToken) {
          router.push("/login");
          return;
        }

        const sessionId = localStorage.getItem("dmatSessionId");

        if (!sessionId) {
          setError(
            "No mock-test session was found. Start a new mock test from your dashboard."
          );
          return;
        }

        const response = await fetch(
          `/api/results?sessionId=${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to load your results."
          );
        }

        if (!cancelled) {
          setData(result as ResultsData);
        }
      } catch (err) {
        console.error("Results loading error:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your results."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
          <div className="mx-auto w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-lg font-semibold mt-4">
            Loading your mock-test results...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please wait while we retrieve your saved section scores.
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold">Unable to load results</h1>
          <p className="text-gray-600 mt-3">
            {error || "No results are available."}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const { overall } = data;
  const sectionsByName = new Map(
    data.sections.map((section) => [section.section, section])
  );

  const isFullyCompleted =
    data.session.status === "completed" &&
    SECTION_ORDER.every((section) => {
      const result = sectionsByName.get(section);
      return Boolean(result?.attempt);
    });

  const accuracy =
    overall.correct + overall.wrong > 0
      ? Math.round(
          (overall.correct / (overall.correct + overall.wrong)) * 100
        )
      : 0;

  const performance =
    overall.percentage >= 80
      ? "Excellent!"
      : overall.percentage >= 60
        ? "Good attempt!"
        : overall.percentage >= 40
          ? "Keep practicing!"
          : "More practice needed";

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <p className="text-sm font-semibold text-blue-700">
            DMAT Full Mock Test 01
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">
            {isFullyCompleted ? "Your Final Result" : "Your Progress"}
          </h1>
          <p className="text-gray-600 mt-2">
            {isFullyCompleted
              ? "Your combined performance across all four sections."
              : "These are the results saved so far for this mock-test session."}
          </p>
          <div className="mt-4">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                isFullyCompleted
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isFullyCompleted ? "Mock Test Completed" : "In Progress"}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Combined Score
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-6xl font-bold text-blue-600">
                  {overall.score}
                </span>
                <span className="text-2xl text-gray-500">
                  / {overall.totalQuestions}
                </span>
              </div>
              <p className="text-xl font-semibold mt-2">
                {overall.percentage}%
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Practice-test percentage, not an official dMAT score or percentile.
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6">
              <p className="text-sm font-semibold text-blue-700">
                Performance
              </p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {performance}
              </p>
              <p className="text-sm text-blue-800 mt-2">
                Review your section scores and individual answers below.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-600">Correct</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {overall.correct}
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-600">Wrong</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {overall.wrong}
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-600">Unanswered</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {overall.unanswered}
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-600">Accuracy</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {accuracy}%
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold">Section-wise Performance</h2>
          <p className="text-gray-600 mt-1 mb-5">
            Each section is scored separately and included in the combined score.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECTION_ORDER.map((sectionName, index) => {
              const section = sectionsByName.get(sectionName);
              const attempt = section?.attempt;
              const total = attempt?.total_questions ?? 0;
              const correct = attempt?.correct_answers ?? 0;
              const percentage =
                total > 0 ? Math.round((correct / total) * 100) : 0;

              return (
                <article
                  key={sectionName}
                  className="bg-white border border-gray-200 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Section {index + 1}
                      </p>
                      <h3 className="text-lg font-bold mt-1">
                        {SECTION_LABELS[sectionName]}
                      </h3>
                    </div>
                    <span
                      className={`text-xs rounded-full px-3 py-1 font-semibold ${
                        attempt
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {attempt ? "Submitted" : "Not submitted"}
                    </span>
                  </div>

                  {attempt ? (
                    <>
                      <div className="flex items-baseline gap-2 mt-5">
                        <span className="text-3xl font-bold">
                          {attempt.score}
                        </span>
                        <span className="text-gray-500">/ {total}</span>
                        <span className="ml-auto font-semibold">
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 mt-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-3">
                        {correct} correct · {attempt.wrong_answers} wrong ·{" "}
                        {attempt.unanswered} unanswered
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 mt-5">
                      No saved score is available for this section yet.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Question Analysis</h2>
          <p className="text-gray-600 mt-1 mb-5">
            Review submitted answers and explanations by section.
          </p>

          <div className="space-y-8">
            {SECTION_ORDER.map((sectionName) => {
              const section = sectionsByName.get(sectionName);

              if (!section?.questions?.length) return null;

              return (
                <div key={sectionName}>
                  <h3 className="text-xl font-bold mb-4">
                    {SECTION_LABELS[sectionName]}
                  </h3>

                  <div className="space-y-4">
                    {section.questions.map((item, index) => {
                      const question = item.question;
                      const status = item.status;

                      return (
                        <article
                          key={item.questionId}
                          className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
                        >
                          <div
                            className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
                              status === "correct"
                                ? "bg-green-50 border-green-200"
                                : status === "wrong"
                                  ? "bg-red-50 border-red-200"
                                  : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div>
                              <p className="font-bold">
                                Question {index + 1}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Difficulty: {question.difficulty}
                              </p>
                            </div>
                            <span className="text-sm font-semibold">
                              {status === "correct"
                                ? "✓ Correct"
                                : status === "wrong"
                                  ? "✕ Wrong"
                                  : "Not answered"}
                            </span>
                          </div>

                          <div className="p-5">
                            <p className="font-semibold leading-relaxed whitespace-pre-line">
                              {question.question_text}
                            </p>

                            {question.question_type === "latin_square" &&
                              question.content?.grid && (
                                <div className="mt-4 overflow-x-auto">
                                  <div className="inline-grid gap-1">
                                    {question.content.grid.map(
                                      (row: string[], rowIndex: number) => (
                                        <div
                                          key={rowIndex}
                                          className="flex gap-1"
                                        >
                                          {row.map(
                                            (cell: string, colIndex: number) => {
                                              const isMissing =
                                                rowIndex ===
                                                  question.content.missingRow &&
                                                colIndex ===
                                                  question.content.missingColumn;

                                              return (
                                                <div
                                                  key={colIndex}
                                                  className={`w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center border rounded font-semibold ${
                                                    isMissing
                                                      ? "bg-blue-100 border-blue-400"
                                                      : "bg-gray-50 border-gray-200"
                                                  }`}
                                                >
                                                  {isMissing ? "?" : cell}
                                                </div>
                                              );
                                            }
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {question.question_type === "figure_sequence" &&
                              question.content?.figures && (
                                <p className="mt-3 text-sm text-gray-600">
                                  Figure sequence question. Your original visual
                                  is stored with the question.
                                </p>
                              )}

                            
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
  <div className="rounded-xl border bg-gray-50 p-4">
    <p className="text-xs font-semibold text-gray-500 uppercase">
      Your Answer
    </p>

    <div className="font-semibold mt-2">
      {question.section === "mathematical_equations" ? (
        item.selectedNumericAnswers &&
        Object.keys(item.selectedNumericAnswers).length > 0 ? (
          Object.entries(item.selectedNumericAnswers).map(
            ([variable, value]) => (
              <p key={variable}>
                {variable} = {value}
              </p>
            )
          )
        ) : (
          "Not answered"
        )
      ) : item.selectedOption ? (
        `${item.selectedOption} — ${getOptionText(
          question,
          item.selectedOption
        )}`
      ) : (
        "Not answered"
      )}
    </div>
  </div>

  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
    <p className="text-xs font-semibold text-green-700 uppercase">
      Correct Answer
    </p>

    <div className="font-semibold text-green-900 mt-2">
      {question.section === "mathematical_equations" ? (
        item.correctNumericAnswers &&
        Object.keys(item.correctNumericAnswers).length > 0 ? (
          Object.entries(item.correctNumericAnswers).map(
            ([variable, value]) => (
              <p key={variable}>
                {variable} = {value}
              </p>
            )
          )
        ) : (
          "Unavailable"
        )
      ) : item.correctOption ? (
        `${item.correctOption} — ${getOptionText(
          question,
          item.correctOption
        )}`
      ) : (
        "Unavailable"
      )}
    </div>
  </div>
</div>


                            <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4">
                              <p className="text-sm font-bold text-blue-900">
                                Explanation
                              </p>
                              <p className="text-sm text-blue-900 mt-2 whitespace-pre-line">
                                {item.explanation ||
                                  "Explanation unavailable."}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {data.sections.every((section) => !section.questions?.length) && (
            <div className="bg-white border rounded-2xl p-8 text-center text-gray-600">
              No submitted question reviews are available yet.
            </div>
          )}
        </section>

        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-10">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-7 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
