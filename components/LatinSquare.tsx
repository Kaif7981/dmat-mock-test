
"use client";

type CellPosition = {
  row: number;
  column: number;
};

type LatinSquareProps = {
  grid: string[][];
  missingRow?: number;
  missingColumn?: number;
  missingCells?: CellPosition[];
  questionCell?: CellPosition;
};

export default function LatinSquare({
  grid,
  missingRow,
  missingColumn,
  missingCells = [],
  questionCell,
}: LatinSquareProps) {
  const isQuestionCell = (row: number, column: number) => {
    if (
      questionCell &&
      questionCell.row === row &&
      questionCell.column === column
    ) {
      return true;
    }

    // Preserve support for older questions using missingRow/missingColumn.
    return (
      missingRow === row &&
      missingColumn === column &&
      !missingCells.some(
        (cell) => cell.row === row && cell.column === column
      )
    );
  };

  const columnCount = Math.max(1, ...grid.map((row) => row.length));

  const cellSize =
    columnCount >= 5
      ? "h-10 w-10 text-base sm:h-12 sm:w-12 sm:text-lg md:h-14 md:w-14"
      : columnCount === 4
        ? "h-12 w-12 text-lg sm:h-14 sm:w-14 sm:text-xl md:h-16 md:w-16"
        : "h-14 w-14 text-xl sm:h-16 sm:w-16 sm:text-2xl md:h-20 md:w-20";

  return (
    <div className="flex w-full justify-center overflow-x-auto px-1">
      <div className="inline-block overflow-hidden rounded-lg border-2 border-gray-800 bg-white">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, columnIndex) => {
              const question = isQuestionCell(rowIndex, columnIndex);
              const isLastColumn = columnIndex === row.length - 1;
              const isLastRow = rowIndex === grid.length - 1;

              return (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  aria-label={
                    question
                      ? `Row ${rowIndex + 1}, column ${columnIndex + 1}, missing value`
                      : `Row ${rowIndex + 1}, column ${columnIndex + 1}`
                  }
                  className={[
                    "flex shrink-0 items-center justify-center border-r border-b border-gray-400 font-bold",
                    cellSize,
                    question
                      ? "bg-orange-100 text-red-600"
                      : "bg-white text-gray-900",
                    isLastColumn ? "border-r-0" : "",
                    isLastRow ? "border-b-0" : "",
                  ].join(" ")}
                >
                  {question ? "?" : cell || ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
