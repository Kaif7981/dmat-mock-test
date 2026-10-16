"use client";

type LatinSquareProps = {
  grid: string[][];
  missingRow: number;
  missingColumn: number;
};

export default function LatinSquare({
  grid,
  missingRow,
  missingColumn,
}: LatinSquareProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-block border-2 border-gray-800 rounded-lg overflow-hidden bg-white">

        {grid.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex"
          >
            {row.map((cell, columnIndex) => {
              const isMissing =
                rowIndex === missingRow &&
                columnIndex === missingColumn;

              return (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center border-r border-b border-gray-400 text-xl sm:text-2xl md:text-3xl font-bold ${
                    isMissing
                      ? "bg-blue-50 text-blue-600"
                      : "bg-white text-gray-900"
                  } ${
                    columnIndex ===
                    row.length - 1
                      ? "border-r-0"
                      : ""
                  } ${
                    rowIndex ===
                    grid.length - 1
                      ? "border-b-0"
                      : ""
                  }`}
                >
                  {isMissing ? "?" : cell}
                </div>
              );
            })}
          </div>
        ))}

      </div>
    </div>
  );
}