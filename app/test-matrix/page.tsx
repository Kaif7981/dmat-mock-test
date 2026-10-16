
"use client";

import FigureMatrix, {
  type MatrixCell,
} from "@/components/FigureMatrix";

const sampleMatrix: MatrixCell[] = [
  { shape: "circle", filled: false },
  { shape: "square", filled: true },
  null,
  { shape: "triangle", rotation: 90 },

  { shape: "diamond", color: "#2563eb" },
  null,
  { shape: "star", filled: true, color: "#dc2626" },
  { shape: "arrow", rotation: 90 },

  null,
  { shape: "cross", filled: true },
  { shape: "circle", filled: true, color: "#16a34a" },
  null,

  { shape: "triangle", rotation: 180 },
  { shape: "square", color: "#7c3aed" },
  null,
  { shape: "diamond", filled: true },
];

export default function TestMatrixPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Component Preview
        </p>

        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Figure Matrix Test
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Check that the grid, shapes, colours, rotations, and empty cells
          display correctly.
        </p>

        <div className="mt-8">
          <FigureMatrix
            cells={sampleMatrix}
            size="large"
            label="Sample four by four figure matrix"
          />
        </div>

        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          Expected result: a 4 × 4 grid containing different geometric
          figures and several empty cells.
        </div>
      </div>
    </main>
  );
}
