
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MockTest = {
  id: string;
  title: string;
  duration_minutes: number;
};

function ExamInstructionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get("testId");
  const supabase = useMemo(() => createClient(), []);

  const [mockTest, setMockTest] = useState<MockTest | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load only the mock test selected on the dashboard.
  useEffect(() => {
    let cancelled = false;

    async function fetchTest() {
      // Allow the effect to start before updating React state.
      await Promise.resolve();

      if (cancelled) return;

      if (!testId) {
        setMockTest(null);
        setErrorMessage(
          "No mock test was selected. Return to the dashboard and select a test."
        );
        setLoadingTest(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("mock_tests")
          .select("id, title, duration_minutes")
          .eq("id", testId)
          .eq("published", true)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          console.error("Mock test lookup error:", error);
          setMockTest(null);
          setErrorMessage(
            "The selected mock test could not be loaded. Return to the dashboard and try again."
          );
        } else {
          setMockTest(data as MockTest);
          setErrorMessage("");
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Unexpected mock test lookup error:", error);
        setMockTest(null);
        setErrorMessage("Unable to load the selected mock test.");
      } finally {
        if (!cancelled) {
          setLoadingTest(false);
        }
      }
    }

    void fetchTest();

    return () => {
      cancelled = true;
    };
  }, [supabase, testId]);

  async function startCoreModule() {
    if (starting || loadingTest) return;

    setErrorMessage("");

    if (!testId || !mockTest || mockTest.id !== testId) {
      setErrorMessage(
        "The selected mock test is unavailable. Please return to the dashboard."
      );
      return;
    }

    setStarting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // Create a session for this exact mock test.

const startResponse = await fetch("/api/exam/start", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    testId: mockTest.id,
  }),
});

const startData = await startResponse.json();

if (
  !startResponse.ok ||
  !startData.success ||
  !startData.sessionId
) {
  throw new Error(
    startData.error ||
      "Unable to start your mock test. Please try again."
  );
}

// Preserve the session and selected test for later sections.
localStorage.setItem("dmatSessionId", startData.sessionId);
localStorage.setItem("dmatTestId", mockTest.id);

router.push(
  `/exam/figure-sequences?testId=${encodeURIComponent(mockTest.id)}`
);

    } catch (error) {
      console.error("Start mock test error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <h1 className="text-2xl font-bold text-blue-600">
            DMAT Mock
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <section className="text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
            Full Mock Test
          </span>

          <h2 className="mt-4 text-3xl font-bold md:text-4xl">
            {loadingTest
              ? "Loading mock test..."
              : mockTest?.title ?? "Mock Test Instructions"}
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Read the instructions carefully before beginning your mock examination.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-lg font-bold text-blue-900">
            Before you begin
          </h3>

          <ul className="mt-4 space-y-3 text-sm text-blue-900">
            <li>• Each section has its own time limit.</li>
            <li>• Once you submit a section, you cannot return to it.</li>
            <li>• Make sure you have a stable internet connection.</li>
            <li>• Your answers are saved when each section is submitted.</li>
            <li>• Your performance report will be available after completing the mock test.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="text-2xl font-bold">
            Mock Test Structure
          </h3>

          <p className="mt-2 text-gray-600">
            Complete all four sections in order.
          </p>

          <div className="mt-5 space-y-4">
            <SectionCard
              number="1"
              title="Figure Sequences"
              duration="20 Questions · 25 Minutes"
              description="Identify patterns in sequences of figures and select the figures that complete them."
              status="First Section"
              active
            />

            <SectionCard
              number="2"
              title="Mathematical Equations"
              duration="20 Questions · 25 Minutes"
              description="Solve equations and determine the values of unknowns."
              status="Next Section"
            />

            <SectionCard
              number="3"
              title="Latin Squares"
              duration="20 Questions · 25 Minutes"
              description="Complete logical patterns in Latin square matrices."
              status="Next Section"
            />

            <SectionCard
              number="4"
              title="General Academic Module"
              duration="80 Questions"
              description="Apply academic knowledge to solve subject-related questions."
              status="Final Section"
            />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-bold">Important Rules</h3>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <RuleCard
              title="⏱️ Section timing"
              description="The timer starts when you begin a section."
            />

            <RuleCard
              title="🔒 Section lock"
              description="Completed sections cannot be reopened in the same session."
            />

            <RuleCard
              title="💾 Answer saving"
              description="Your submitted answers are stored with your attempt."
            />

            <RuleCard
              title="📊 Final analysis"
              description="Your performance report appears after completing the mock."
            />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-center md:p-8">
          <h3 className="text-xl font-bold">Ready to begin?</h3>

          <p className="mt-2 text-gray-600">
            Your first section is Figure Sequences.
          </p>

          {errorMessage && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            onClick={startCoreModule}
            disabled={starting || loadingTest || !mockTest}
            className="mt-6 rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingTest
              ? "Loading Test..."
              : starting
                ? "Starting..."
                : "Start Core Module →"}
          </button>

          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Return to Dashboard
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ExamInstructionsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-gray-600">Loading instructions...</p>
        </main>
      }
    >
      <ExamInstructionsContent />
    </Suspense>
  );
}

function SectionCard({
  number,
  title,
  duration,
  description,
  status,
  active = false,
}: {
  number: string;
  title: string;
  duration: string;
  description: string;
  status: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-6 shadow-sm ${
        active ? "border-blue-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
            active
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {number}
        </div>

        <div className="flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-lg font-bold">{title}</h4>

            <span className="text-sm font-semibold text-gray-600">
              {duration}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-600">{description}</p>

          <span
            className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              active
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

function RuleCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </div>
  );
}
