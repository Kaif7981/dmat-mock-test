
"use client";

type ShapeType =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "star"
  | "arrow"
  | "cross";

type FigureData = {
  shape: ShapeType;
  position?: string;
  rotation?: number;
  filled?: boolean;
  color?: string;
};

type FrameData = FigureData & {
  items?: FigureData[];
};

type FigureSequenceProps = {
  figures: FrameData[];
  showQuestionMark?: boolean;
};

function getPosition(position?: string) {
  const positions: Record<string, { x: number; y: number }> = {
    center: { x: 50, y: 50 },
    top: { x: 50, y: 25 },
    right: { x: 75, y: 50 },
    bottom: { x: 50, y: 75 },
    left: { x: 25, y: 50 },
    "top-left": { x: 25, y: 25 },
    "top-right": { x: 75, y: 25 },
    "bottom-left": { x: 25, y: 75 },
    "bottom-right": { x: 75, y: 75 },
  };

  return positions[position ?? "center"] ?? positions.center;
}

function Shape({ figure }: { figure: FigureData }) {
  const { x, y } = getPosition(figure.position);
  const rotation = figure.rotation ?? 0;
  const fill = figure.filled ? figure.color ?? "#111827" : "white";
  const stroke = figure.color ?? "#111827";
  const strokeWidth = 4;

  let drawing: React.ReactNode = null;

  switch (figure.shape) {
    case "circle":
      drawing = (
        <circle cx={x} cy={y} r="15" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      );
      break;

    case "square":
      drawing = (
        <rect x={x - 15} y={y - 15} width="30" height="30" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      );
      break;

    case "triangle":
      drawing = (
        <polygon
          points={`${x},${y - 19} ${x + 19},${y + 16} ${x - 19},${y + 16}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
      break;

    case "diamond":
      drawing = (
        <polygon
          points={`${x},${y - 20} ${x + 18},${y} ${x},${y + 20} ${x - 18},${y}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
      break;

    case "star":
      drawing = (
        <polygon
          points={`${x},${y - 21} ${x + 6},${y - 7} ${x + 21},${y - 7} ${x + 10},${y + 3} ${x + 14},${y + 19} ${x},${y + 10} ${x - 14},${y + 19} ${x - 10},${y + 3} ${x - 21},${y - 7} ${x - 6},${y - 7}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      );
      break;

    case "arrow":
      drawing = (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round">
          <path d={`M ${x - 21} ${y - 7} L ${x + 4} ${y - 7} L ${x + 4} ${y - 17} L ${x + 22} ${y} L ${x + 4} ${y + 17} L ${x + 4} ${y + 7} L ${x - 21} ${y + 7} Z`} />
        </g>
      );
      break;

    case "cross":
      drawing = (
        <path
          d={`M ${x - 7} ${y - 21} H ${x + 7} V ${y - 7} H ${x + 21} V ${y + 7} H ${x + 7} V ${y + 21} H ${x - 7} V ${y + 7} H ${x - 21} V ${y - 7} H ${x - 7} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      );
      break;
  }

  return (
    <g transform={`rotate(${rotation} ${x} ${y})`}>
      {drawing}
    </g>
  );
}

function Frame({ frame }: { frame?: FrameData | null }) {
  if (!frame || typeof frame !== "object") {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
        No figure
      </div>
    );
  }

  const items =
    Array.isArray(frame.items) && frame.items.length > 0
      ? frame.items
      : [frame];

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-gray-200 bg-white sm:h-28 sm:w-28">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full text-gray-900"
        role="img"
        aria-label="Geometric pattern figure"
      >
        {items.map((item, index) => (
          <Shape key={index} figure={item} />
        ))}
      </svg>
    </div>
  );
}

export default function FigureSequence({
  figures,
  showQuestionMark = false,
}: FigureSequenceProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
      {figures.map((figure, index) => (
        <Frame key={index} frame={figure} />
      ))}

      {showQuestionMark && (
        <div
          className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 sm:h-28 sm:w-28"
          aria-label="Missing figure"
        >
          <span className="text-4xl font-bold text-blue-600">?</span>
        </div>
      )}
    </div>
  );
}
