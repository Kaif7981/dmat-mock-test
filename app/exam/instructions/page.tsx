
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ExamInstructionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function startCoreModule() {
    if (starting) return;

    setStarting(true);
    setErrorMessage("");

    try {
      // Confirm that the student is logged in.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // Find the published mock test.
      const {
        data: mockTest,
        error: mockError,
      } = await supabase
        .from("mock_tests")
        .select("id")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (mockError || !mockTest) {
        throw new Error(
          "Unable to find a published mock test."
        );
      }

      // Create one overall session for this mock test.
      const {
        data: session,
        error: sessionError,
      } = await supabase
        .from("mock_sessions")
        .insert({
          user_id: user.id,
          mock_test_id: mockTest.id,
          status: "in_progress",
        })
        .select("id")
        .single();

      if (sessionError || !session) {
        console.error(
          "Session creation error:",
          sessionError
        );

        throw new Error(
          "Unable to start your mock test. Please try again."
        );
      }

      // Store the session ID for subsequent sections.
      // Later, we will update the section submission API
      // to associate each attempt with this session.
      localStorage.setItem(
        "dmatSessionId",
        session.id
      );

      router.push("/exam/figure-sequences");
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );

      setStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold text-blue-600">
            DMAT Mock
          </h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Title */}
        <section className="text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
            Full Mock Test
          </span>

          <h2 className="text-3xl md:text-4xl font-bold mt-4">
            DMAT Full Mock Test 01
          </h2>

          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            Read the instructions carefully before beginning
            your mock examination.
          </p>
        </section>

        {/* Important Notice */}
        <section className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-blue-900">
            Before you begin
          </h3>

          <ul className="mt-4 space-y-3 text-sm text-blue-900">
            <li>• Each section has its own time limit.</li>
            <li>• Once you submit a section, you cannot return to it.</li>
            <li>• Make sure you have a stable internet connection.</li>
            <li>• Your answers are saved when each section is submitted.</li>
            <li>• Your final performance report will be available after completing the mock test.</li>
          </ul>
        </section>

        {/* Exam Structure */}
        <section className="mt-8">
          <h3 className="text-2xl font-bold">
            Mock Test Structure
          </h3>

          <p className="text-gray-600 mt-2">
            The mock test is divided into multiple sections.
            Complete each section in order.
          </p>

          <div className="mt-5 space-y-4">
            {/* Figure Sequences */}
            <SectionCard
              number="1"
              title="Figure Sequences"
              duration="20 Questions · 25 Minutes"
              description="Identify patterns in sequences of figures and select the figure that completes the sequence."
              status="Ready"
              active
            />

            {/* Mathematical Equations */}
            <SectionCard
              number="2"
              title="Mathematical Equations"
              duration="20 Questions · 25 Minutes"
              description="Solve systems of equations and determine the correct values for the unknowns."
              status="Next Section"
            />

            {/* Latin Squares */}
            <SectionCard
              number="3"
              title="Latin Squares"
              duration="20 Questions · 25 Minutes"
              description="Complete the logical pattern in each Latin square and select the correct answer."
              status="Coming Next"
            />

            {/* General Academic */}
            <SectionCard
              number="4"
              title="General Academic Module"
              duration="Subject Module"
              description="Apply academic knowledge to solve subject-related problems."
              status="Coming Next"
            />
          </div>
        </section>

        {/* Rules */}
        <section className="mt-8 bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold">
            Important Rules
          </h3>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <RuleCard
              title="⏱️ Section timing"
              description="The timer starts when you begin a section."
            />

            <RuleCard
              title="🔒 Section lock"
              description="Completed sections cannot be reopened."
            />

            <RuleCard
              title="💾 Automatic saving"
              description="Your submitted answers are stored with your attempt."
            />

            <RuleCard
              title="📊 Final analysis"
              description="Your performance is shown after completing the mock."
            />
          </div>
        </section>

        {/* Start */}
        <section className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 text-center">
          <h3 className="text-xl font-bold">
            Ready to begin?
          </h3>

          <p className="text-gray-600 mt-2">
            Your first section is Figure Sequences.
          </p>

          {errorMessage && (
            <p
              role="alert"
              className="mt-4 text-sm text-red-600"
            >
              {errorMessage}
            </p>
          )}

          <button
            onClick={startCoreModule}
            disabled={starting}
            className="mt-6 px-8 py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {starting
              ? "Starting..."
              : "Start Core Module →"}
          </button>
        </section>
      </div>
    </main>
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
      className={`bg-white border rounded-2xl p-6 shadow-sm ${
        active
          ? "border-blue-200"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center font-bold shrink-0 ${
            active
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {number}
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h4 className="text-lg font-bold">
              {title}
            </h4>

            <span
              className={`text-sm font-semibold ${
                active
                  ? "text-blue-700"
                  : "text-gray-600"
              }`}
            >
              {duration}
            </span>
          </div>

          <p className="text-gray-600 text-sm mt-2">
            {description}
          </p>

          <span
            className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
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
      <p className="font-semibold text-gray-900">
        {title}
      </p>

      <p className="text-sm text-gray-600 mt-1">
        {description}
      </p>
    </div>
  );
}
