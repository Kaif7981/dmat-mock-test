
"use client";

import { useState } from "react";
import FigureMatrix, {
  type MatrixCell,
} from "@/components/FigureMatrix";

const movementPath = [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4];

function makeMatrix(position: number): MatrixCell[] {
  const cells: MatrixCell[] = Array(16).fill(null);

  cells[position] = {
    shape: "circle",
    filled: true,
    color: "#2563eb",
  };

  return cells;
}

const sequence = [0, 1, 2, 3].map(makeMatrix);

const choices = [
  { letter: "A", position: 7, group: "first" },
  { letter: "B", position: 4, group: "first" },
  { letter: "C", position: 15, group: "first" },
  { letter: "D", position: 11, group: "second" },
  { letter: "E", position: 14, group: "second" },
  { letter: "F", position: 8, group: "second" },
];

export default function TestMatrixQuestionPage() {
  const [firstAnswer, setFirstAnswer] = useState("");
  const [secondAnswer, setSecondAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const correct = firstAnswer === "A" && secondAnswer === "D";

  function resetQuestion() {
    setFirstAnswer("");
    setSecondAnswer("");
    setSubmitted(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-gray-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            DMAT · Figure Sequences
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Practice Question 01
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Difficulty: Easy · Sample question for testing the new format
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold leading-relaxed sm:text-xl">
            Study the sequence of matrices. Identify the next two matrices
            that continue the same pattern.
          </h2>

          <div className="mt-7">
            <p className="mb-4 text-sm font-semibold text-gray-600">
              Given sequence
            </p>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {sequence.map((cells, index) => (
                <div key={index} className="min-w-0">
                  <FigureMatrix
                    cells={cells}
                    size="small"
                    label={`Sequence matrix ${index + 1}`}
                  />
                  <p className="mt-2 text-center text-sm font-medium text-gray-500">
                    Matrix {index + 1}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "First missing matrix",
                group: "first",
                selected: firstAnswer,
                setSelected: setFirstAnswer,
              },
              {
                title: "Second missing matrix",
                group: "second",
                selected: secondAnswer,
                setSelected: setSecondAnswer,
              },
            ].map((section) => (
              <div key={section.group}>
                <h3 className="mb-3 font-semibold">
                  {section.title}
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {choices
                    .filter((choice) => choice.group === section.group)
                    .map((choice) => {
                      const selected = section.selected === choice.letter;

                      return (
                        <button
                          key={choice.letter}
                          type="button"
                          disabled={submitted}
                          onClick={() => section.setSelected(choice.letter)}
                          aria-pressed={selected}
                          className={`rounded-xl border-2 p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default ${
                            selected
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          <span className="mb-2 block text-sm font-bold">
                            {choice.letter}
                          </span>

                          <FigureMatrix
                            cells={makeMatrix(choice.position)}
                            size="small"
                            label={`Option ${choice.letter}`}
                          />
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {!submitted ? (
            <button
              type="button"
              disabled={!firstAnswer || !secondAnswer}
              onClick={() => setSubmitted(true)}
              className="mt-8 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Check answer
            </button>
          ) : (
            <div
              className={`mt-8 rounded-xl border p-5 ${
                correct
                  ? "border-green-200 bg-green-50"
                  : "border-amber-200 bg-amber-50"
              }`}
              role="status"
            >
              <h3 className="font-bold">
                {correct ? "Correct!" : "Not quite — review the pattern."}
              </h3>

              <p className="mt-2 text-sm leading-relaxed">
                The circle moves clockwise along the outer edge of the
                matrix. It moves one cell at a time: from the top-left
                corner, across the top row, then down the right edge.
                The next positions are cell 8 (Option A) and cell 12
                (Option D), counting from 1 in reading order.
              </p>

              <button
                type="button"
                onClick={resetQuestion}
                className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Try again
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
