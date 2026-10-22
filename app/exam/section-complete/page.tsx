"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SectionCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const section = searchParams.get("section");
  const testId = searchParams.get("testId");

  const isFigureSequences = section === "figure-sequences";
  const isMathematicalEquations = section === "mathematical-equations";
  const isLatinSquares = section === "latin-squares";
  const isGeneralAcademic = section === "general-academic";

  
function continueToNextSection() {
  const testQuery = testId
    ? `?testId=${encodeURIComponent(testId)}`
    : "";

  if (isFigureSequences) {
    router.push(`/exam/mathematical-equations${testQuery}`);
    return;
  }

  if (isMathematicalEquations) {
    router.push(`/exam/latin-squares${testQuery}`);
    return;
  }

  if (isLatinSquares) {
    router.push(`/exam/general-academic${testQuery}`);
    return;
  }

  if (isGeneralAcademic) {
    router.push(
      testId
        ? `/results?testId=${encodeURIComponent(testId)}`
        : "/results"
    );
    return;
  }

  router.push("/dashboard");
}


  const nextSectionNumber = isFigureSequences
    ? "2"
    : isMathematicalEquations
      ? "3"
      : "4";

  const nextSectionName = isFigureSequences
    ? "Mathematical Equations"
    : isMathematicalEquations
      ? "Latin Squares"
      : "General Academic Module";

  const nextSectionDescription = isFigureSequences
    ? "Solve systems of equations and determine the correct values for the unknowns."
    : isMathematicalEquations
      ? "Complete logical patterns in Latin squares and select the correct answer."
      : "Apply your academic knowledge to solve subject-related problems.";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 md:p-10 text-center">
          {/* Status icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="mt-6 text-3xl md:text-4xl font-bold">
            {isGeneralAcademic
              ? "Mock Test Completed!"
              : "Section Completed"}
          </h1>

          <p className="mt-3 text-lg text-gray-600">
            {isFigureSequences
              ? "Figure Sequences"
              : isMathematicalEquations
                ? "Mathematical Equations"
                : isLatinSquares
                  ? "Latin Squares"
                  : isGeneralAcademic
                    ? "General Academic Module"
                    : "Section Completed"}
          </p>

          {/* Confirmation */}
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-5">
            <p className="text-green-800 font-medium">
              Your answers have been submitted successfully.
            </p>

            <p className="text-sm text-green-700 mt-2">
              {isGeneralAcademic
                ? "You have reached the end of the mock test."
                : "This section is now complete and cannot be reopened."}
            </p>
          </div>

          {/* Next section card */}
          {!isGeneralAcademic && (
            <div className="mt-8 text-left">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Next Section
              </p>

              <div className="mt-3 border border-gray-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    {nextSectionNumber}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">
                      {nextSectionName}
                    </h3>

                    <p className="text-gray-600 mt-1">
                      {isLatinSquares
                        ? "Subject Module"
                        : "20 Questions · 25 Minutes"}
                    </p>

                    <p className="text-sm text-gray-500 mt-3">
                      {nextSectionDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main action */}
          <button
            onClick={continueToNextSection}
            className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition"
          >
            {isFigureSequences
              ? "Continue to Mathematical Equations →"
              : isMathematicalEquations
                ? "Continue to Latin Squares →"
                : isLatinSquares
                  ? "Continue to General Academic →"
                  : isGeneralAcademic
                    ? "View Final Results →"
                    : "Continue →"}
          </button>

          {/* Dashboard action */}
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SectionCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading section details...</p>
        </main>
      }
    >
      <SectionCompleteContent />
    </Suspense>
  );
}