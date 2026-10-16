
"use client";

type ShapeType =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "star"
  | "arrow"
  | "cross";

export type MatrixFigure = {
  shape: ShapeType;
  rotation?: number;
  filled?: boolean;
  color?: string;
};

export type MatrixCell = MatrixFigure | MatrixFigure[] | null;

type FigureMatrixProps = {
  cells: MatrixCell[];
  size?: "small" | "medium" | "large";
  label?: string;
};

function isFigureArray(value: MatrixCell): value is MatrixFigure[] {
  return Array.isArray(value);
}

function CellShape({ figure }: { figure: MatrixFigure }) {
  const color = figure.color ?? "#111827";
  const fill = figure.filled ? color : "#ffffff";

  let shape: React.ReactNode = null;

  switch (figure.shape) {
    case "circle":
      shape = (
        <circle
          cx="50"
          cy="50"
          r="24"
          fill={fill}
          stroke={color}
          strokeWidth="6"
        />
      );
      break;

    case "square":
      shape = (
        <rect
          x="26"
          y="26"
          width="48"
          height="48"
          fill={fill}
          stroke={color}
          strokeWidth="6"
        />
      );
      break;

    case "triangle":
      shape = (
        <polygon
          points="50,20 80,76 20,76"
          fill={fill}
          stroke={color}
          strokeWidth="6"
          strokeLinejoin="round"
        />
      );
      break;

    case "diamond":
      shape = (
        <polygon
          points="50,15 85,50 50,85 15,50"
          fill={fill}
          stroke={color}
          strokeWidth="6"
          strokeLinejoin="round"
        />
      );
      break;

    case "star":
      shape = (
        <polygon
          points="50,12 61,38 89,38 67,55 75,83 50,67 25,83 33,55 11,38 39,38"
          fill={fill}
          stroke={color}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      );
      break;

    case "arrow":
      shape = (
        <path
          d="M 12 39 H 57 V 20 L 88 50 L 57 80 V 61 H 12 Z"
          fill={fill}
          stroke={color}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      );
      break;

    case "cross":
      shape = (
        <path
          d="M 38 12 H 62 V 38 H 88 V 62 H 62 V 88 H 38 V 62 H 12 V 38 H 38 Z"
          fill={fill}
          stroke={color}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      );
      break;
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      aria-hidden="true"
    >
      <g transform={`rotate(${figure.rotation ?? 0} 50 50)`}>
        {shape}
      </g>
    </svg>
  );
}

function MatrixCellView({ cell }: { cell: MatrixCell }) {
  const figures = cell === null
    ? []
    : isFigureArray(cell)
      ? cell
      : [cell];

  return (
    <div className="flex aspect-square min-w-0 items-center justify-center border border-gray-300 bg-white p-0.5 sm:p-1">
      <div className="flex h-full w-full items-center justify-center">
        {figures.map((figure, index) => (
          <div
            key={index}
            className="h-full min-h-0 w-full min-w-0"
          >
            <CellShape figure={figure} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FigureMatrix({
  cells,
  size = "medium",
  label = "Figure matrix",
}: FigureMatrixProps) {
  const dimensions = {
    small: "max-w-[240px]",
    medium: "max-w-[360px]",
    large: "max-w-[480px]",
  };

  // Always display exactly 16 cells in a 4 × 4 grid.
  const matrixCells: MatrixCell[] = Array.from(
    { length: 16 },
    (_, index) => cells[index] ?? null
  );

  return (
    <div
      role="img"
      aria-label={label}
      className={`mx-auto w-full ${dimensions[size]}`}
    >
      <div className="grid grid-cols-4 overflow-hidden border-2 border-gray-500 bg-white">
        {matrixCells.map((cell, index) => (
          <MatrixCellView key={index} cell={cell} />
        ))}
      </div>
    </div>
  );
}
