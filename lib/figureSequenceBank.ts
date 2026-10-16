
import type { MatrixCell } from "@/components/FigureMatrix";

export type Difficulty = "easy" | "medium" | "hard";
export type AnswerLetter = "A" | "B" | "C";

export type FigureSequenceQuestion = {
  id: string;
  difficulty: Difficulty;
  instruction: string;
  frames: MatrixCell[][];
  fifthOptions: Record<AnswerLetter, MatrixCell[]>;
  sixthOptions: Record<AnswerLetter, MatrixCell[]>;
  correctFifth: AnswerLetter;
  correctSixth: AnswerLetter;
  explanation: string;
};

type FigureState = {
  position: number;
  shape?: "circle" | "square" | "triangle" | "diamond" | "star" | "arrow" | "cross";
  rotation?: number;
  filled?: boolean;
  color?: string;
};

const DEFAULT_COLOR = "#2563eb";

export function makeSingleFigureMatrix(
  position: number,
  figure: Omit<FigureState, "position"> = {}
): MatrixCell[] {
  const cells: MatrixCell[] = Array(16).fill(null);

  if (position >= 0 && position < 16) {
    cells[position] = {
      shape: figure.shape ?? "circle",
      rotation: figure.rotation ?? 0,
      filled: figure.filled ?? true,
      color: figure.color ?? DEFAULT_COLOR,
    };
  }

  return cells;
}

function matrix(state: FigureState): MatrixCell[] {
  return makeSingleFigureMatrix(state.position, state);
}

function state(
  position: number,
  shape: FigureState["shape"] = "circle",
  rotation = 0,
  filled = true,
  color = DEFAULT_COLOR
): FigureState {
  return { position, shape, rotation, filled, color };
}

function buildQuestion(
  id: string,
  difficulty: Difficulty,
  states: [FigureState, FigureState, FigureState, FigureState, FigureState, FigureState],
  fifthDistractors: [FigureState, FigureState],
  sixthDistractors: [FigureState, FigureState],
  correctFifth: AnswerLetter,
  correctSixth: AnswerLetter,
  explanation: string
): FigureSequenceQuestion {
  const letters: AnswerLetter[] = ["A", "B", "C"];

  const arrangeOptions = (
    correct: FigureState,
    distractors: [FigureState, FigureState],
    correctLetter: AnswerLetter
  ): Record<AnswerLetter, MatrixCell[]> => {
    const candidates: FigureState[] = [];
    let distractorIndex = 0;

    for (const letter of letters) {
      if (letter === correctLetter) {
        candidates.push(correct);
      } else {
        candidates.push(distractors[distractorIndex++]);
      }
    }

    return {
      A: matrix(candidates[0]),
      B: matrix(candidates[1]),
      C: matrix(candidates[2]),
    };
  };

  return {
    id,
    difficulty,
    instruction:
      "Study the four given matrices. Select the correct fifth and sixth matrices from their respective options.",
    frames: states.slice(0, 4).map(matrix),
    fifthOptions: arrangeOptions(states[4], fifthDistractors, correctFifth),
    sixthOptions: arrangeOptions(states[5], sixthDistractors, correctSixth),
    correctFifth,
    correctSixth,
    explanation,
  };
}

export const FIGURE_SEQUENCE_QUESTION_COUNT = 20;
export const FIGURE_SEQUENCE_TIME_SECONDS = 25 * 60;

export const figureSequenceQuestions: FigureSequenceQuestion[] = [
  // EASY: Q1–Q5

  buildQuestion(
    "FS01",
    "easy",
    [
      state(0), state(1), state(2), state(3), state(7), state(11),
    ],
    [state(6), state(15)],
    [state(10), state(14)],
    "A",
    "B",
    "The circle moves one cell to the right along the top row, then one cell down along the right edge. The fifth position is cell 8 (index 7), and the sixth is cell 12 (index 11)."
  ),

  buildQuestion(
    "FS02",
    "easy",
    [
      state(0, "triangle", 0),
      state(0, "triangle", 90),
      state(0, "triangle", 180),
      state(0, "triangle", 270),
      state(0, "triangle", 360),
      state(0, "triangle", 450),
    ],
    [state(0, "triangle", 90), state(0, "triangle", 180)],
    [state(0, "triangle", 180), state(0, "triangle", 270)],
    "A",
    "B",
    "The triangle rotates clockwise by 90 degrees in every frame. The fifth orientation is 360 degrees and the sixth is 450 degrees."
  ),

  buildQuestion(
    "FS03",
    "easy",
    [
      state(5, "circle", 0, false),
      state(5, "circle", 0, true),
      state(5, "circle", 0, false),
      state(5, "circle", 0, true),
      state(5, "circle", 0, false),
      state(5, "circle", 0, true),
    ],
    [state(5, "circle", 0, true), state(6, "circle", 0, false)],
    [state(5, "circle", 0, false), state(6, "circle", 0, true)],
    "A",
    "B",
    "The circle alternates between hollow and filled while remaining in the same cell. The fifth is hollow and the sixth is filled."
  ),

  buildQuestion(
    "FS04",
    "easy",
    [
      state(0, "square"),
      state(1, "square"),
      state(2, "square"),
      state(3, "square"),
      state(7, "square"),
      state(11, "square"),
    ],
    [state(6, "square"), state(15, "square")],
    [state(10, "square"), state(14, "square")],
    "A",
    "B",
    "The square follows the same clockwise edge path: across the top row, then down the right column. The next two positions are indices 7 and 11."
  ),

  buildQuestion(
    "FS05",
    "easy",
    [
      state(4, "circle", 0, true, "#dc2626"),
      state(4, "circle", 0, true, "#2563eb"),
      state(4, "circle", 0, true, "#dc2626"),
      state(4, "circle", 0, true, "#2563eb"),
      state(4, "circle", 0, true, "#dc2626"),
      state(4, "circle", 0, true, "#2563eb"),
    ],
    [
      state(4, "circle", 0, true, "#2563eb"),
      state(5, "circle", 0, true, "#dc2626"),
    ],
    [
      state(4, "circle", 0, true, "#dc2626"),
      state(5, "circle", 0, true, "#2563eb"),
    ],
    "A",
    "B",
    "The circle alternates between red and blue in the same position. The fifth is red and the sixth is blue."
  ),

  // MEDIUM: Q6–Q13

  buildQuestion(
    "FS06",
    "medium",
    [
      state(0, "diamond", 0),
      state(1, "diamond", 90),
      state(2, "diamond", 180),
      state(3, "diamond", 270),
      state(7, "diamond", 0),
      state(11, "diamond", 90),
    ],
    [state(7, "diamond", 90), state(6, "diamond", 0)],
    [state(11, "diamond", 180), state(15, "diamond", 90)],
    "A",
    "B",
    "The figure moves clockwise around the outer edge. Its orientation also rotates 90 degrees per frame. After the top-right corner, it moves down the right edge."
  ),

  buildQuestion(
    "FS07",
    "medium",
    [
      state(0, "circle"),
      state(2, "circle"),
      state(4, "circle"),
      state(6, "circle"),
      state(8, "circle"),
      state(10, "circle"),
    ],
    [state(9, "circle"), state(12, "circle")],
    [state(11, "circle"), state(14, "circle")],
    "A",
    "B",
    "The circle advances two cell indices each frame, wrapping from the last index to the beginning when necessary. The sequence positions are 0, 2, 4, 6, 8, 10."
  ),

  buildQuestion(
    "FS08",
    "medium",
    [
      state(0, "triangle", 0, false),
      state(1, "triangle", 90, true),
      state(2, "triangle", 180, false),
      state(3, "triangle", 270, true),
      state(4, "triangle", 0, false),
      state(5, "triangle", 90, true),
    ],
    [state(4, "triangle", 90, false), state(4, "triangle", 0, true)],
    [state(5, "triangle", 180, true), state(6, "triangle", 90, true)],
    "A",
    "B",
    "The triangle moves one cell forward, rotates 90 degrees clockwise, and alternates hollow/filled each frame. The fifth is at index 4, hollow and upright; the sixth is at index 5, filled and rotated 90 degrees."
  ),

  buildQuestion(
    "FS09",
    "medium",
    [
      state(0, "square", 0),
      state(1, "square", 0),
      state(2, "square", 0),
      state(3, "square", 0),
      state(3, "square", 90),
      state(3, "square", 180),
    ],
    [state(3, "square", 0), state(2, "square", 90)],
    [state(3, "square", 270), state(2, "square", 180)],
    "A",
    "B",
    "The square moves across the top row until it reaches the last column, then remains there while rotating 90 degrees clockwise per frame."
  ),

  buildQuestion(
    "FS10",
    "medium",
    [
      state(0, "circle", 0, true, "#dc2626"),
      state(1, "circle", 0, true, "#2563eb"),
      state(2, "circle", 0, true, "#16a34a"),
      state(3, "circle", 0, true, "#7c3aed"),
      state(4, "circle", 0, true, "#dc2626"),
      state(5, "circle", 0, true, "#2563eb"),
    ],
    [
      state(4, "circle", 0, true, "#2563eb"),
      state(4, "circle", 0, true, "#16a34a"),
    ],
    [
      state(5, "circle", 0, true, "#16a34a"),
      state(6, "circle", 0, true, "#7c3aed"),
    ],
    "A",
    "B",
    "The circle moves one cell forward and its colours repeat red, blue, green, purple. The fifth is red at index 4 and the sixth is blue at index 5."
  ),

  buildQuestion(
    "FS11",
    "medium",
    [
      state(0, "arrow", 0),
      state(1, "arrow", 90),
      state(2, "arrow", 180),
      state(3, "arrow", 270),
      state(7, "arrow", 0),
      state(11, "arrow", 90),
    ],
    [state(7, "arrow", 90), state(6, "arrow", 0)],
    [state(11, "arrow", 180), state(15, "arrow", 90)],
    "A",
    "B",
    "The arrow moves clockwise around the border and rotates by 90 degrees on each step. Its fifth and sixth positions are indices 7 and 11."
  ),

  buildQuestion(
    "FS12",
    "medium",
    [
      state(0, "circle"),
      state(5, "circle"),
      state(10, "circle"),
      state(15, "circle"),
      state(10, "circle"),
      state(5, "circle"),
    ],
    [state(0, "circle"), state(6, "circle")],
    [state(0, "circle"), state(4, "circle")],
    "A",
    "B",
    "The circle moves down the main diagonal and then reverses direction, moving back up the same diagonal. The fifth is index 10 and the sixth is index 5."
  ),

  buildQuestion(
    "FS13",
    "medium",
    [
      state(0, "square", 0, false),
      state(1, "square", 90, true),
      state(2, "square", 180, false),
      state(3, "square", 270, true),
      state(7, "square", 0, false),
      state(11, "square", 90, true),
    ],
    [state(7, "square", 90, false), state(6, "square", 0, false)],
    [state(11, "square", 180, true), state(15, "square", 90, true)],
    "A",
    "B",
    "The square moves clockwise along the outer edge, rotates 90 degrees each step, and alternates hollow/filled. The fifth is hollow at index 7 and the sixth is filled at index 11."
  ),

  // HARD: Q14–Q20

  buildQuestion(
    "FS14",
    "hard",
    [
      state(0, "diamond", 0),
      state(1, "diamond", 90),
      state(3, "diamond", 180),
      state(6, "diamond", 270),
      state(10, "diamond", 0),
      state(15, "diamond", 90),
    ],
    [state(10, "diamond", 90), state(11, "diamond", 0)],
    [state(15, "diamond", 180), state(14, "diamond", 90)],
    "A",
    "B",
    "The figure advances by increasing steps of 1, 2, 3, 4, then 5 cell indices, modulo 16. It also rotates 90 degrees each step. The next positions are 10 and 15."
  ),

  buildQuestion(
    "FS15",
    "hard",
    [
      state(0, "triangle", 0, false, "#dc2626"),
      state(1, "triangle", 90, true, "#2563eb"),
      state(3, "triangle", 180, false, "#16a34a"),
      state(6, "triangle", 270, true, "#7c3aed"),
      state(10, "triangle", 0, false, "#dc2626"),
      state(15, "triangle", 90, true, "#2563eb"),
    ],
    [
      state(10, "triangle", 90, false, "#dc2626"),
      state(11, "triangle", 0, false, "#16a34a"),
    ],
    [
      state(15, "triangle", 180, true, "#2563eb"),
      state(14, "triangle", 90, true, "#7c3aed"),
    ],
    "A",
    "B",
    "The triangle advances by increasing index steps, rotates 90 degrees clockwise, alternates fill, and cycles through four colours. The fifth state is index 10, hollow red; the sixth is index 15, filled blue."
  ),

  buildQuestion(
    "FS16",
    "hard",
    [
      state(0, "circle"),
      state(1, "circle"),
      state(3, "circle"),
      state(6, "circle"),
      state(10, "circle"),
      state(15, "circle"),
    ],
    [state(10, "circle"), state(11, "circle")],
    [state(15, "circle"), state(14, "circle")],
    "A",
    "B",
    "The circle advances by 1, then 2, then 3, then 4, then 5 positions. The fifth and sixth matrices therefore contain the circle at indices 10 and 15."
  ),

  buildQuestion(
    "FS17",
    "hard",
    [
      state(0, "square", 0, false),
      state(1, "square", 90, true),
      state(3, "square", 180, false),
      state(6, "square", 270, true),
      state(10, "square", 0, false),
      state(15, "square", 90, true),
    ],
    [
      state(10, "square", 90, false),
      state(11, "square", 0, false),
    ],
    [
      state(15, "square", 180, true),
      state(14, "square", 90, true),
    ],
    "A",
    "B",
    "The square follows increasing index steps of 1, 2, 3, 4, and 5, rotates 90 degrees clockwise, and alternates hollow/filled. The next two states are index 10 hollow and index 15 filled."
  ),

  buildQuestion(
    "FS18",
    "hard",
    [
      state(0, "star", 0, true, "#dc2626"),
      state(1, "star", 90, true, "#2563eb"),
      state(3, "star", 180, true, "#16a34a"),
      state(6, "star", 270, true, "#7c3aed"),
      state(10, "star", 0, true, "#dc2626"),
      state(15, "star", 90, true, "#2563eb"),
    ],
    [
      state(10, "star", 90, true, "#dc2626"),
      state(11, "star", 0, true, "#16a34a"),
    ],
    [
      state(15, "star", 180, true, "#2563eb"),
      state(14, "star", 90, true, "#7c3aed"),
    ],
    "A",
    "B",
    "The star advances by increasing steps, rotates 90 degrees per frame, and cycles through red, blue, green, and purple. The fifth is red at index 10; the sixth is blue at index 15."
  ),

  buildQuestion(
    "FS19",
    "hard",
    [
      state(0, "arrow", 0),
      state(1, "arrow", 90),
      state(3, "arrow", 180),
      state(6, "arrow", 270),
      state(10, "arrow", 0),
      state(15, "arrow", 90),
    ],
    [
      state(10, "arrow", 90),
      state(11, "arrow", 0),
    ],
    [
      state(15, "arrow", 180),
      state(14, "arrow", 90),
    ],
    "A",
    "B",
    "The arrow advances by increasing steps of 1, 2, 3, 4, and 5 positions and rotates 90 degrees per step. The next positions are 10 and 15."
  ),

  buildQuestion(
    "FS20",
    "hard",
    [
      state(0, "diamond", 0, false, "#dc2626"),
      state(1, "diamond", 90, true, "#2563eb"),
      state(3, "diamond", 180, false, "#16a34a"),
      state(6, "diamond", 270, true, "#7c3aed"),
      state(10, "diamond", 0, false, "#dc2626"),
      state(15, "diamond", 90, true, "#2563eb"),
    ],
    [
      state(10, "diamond", 90, false, "#dc2626"),
      state(11, "diamond", 0, false, "#16a34a"),
    ],
    [
      state(15, "diamond", 180, true, "#2563eb"),
      state(14, "diamond", 90, true, "#7c3aed"),
    ],
    "A",
    "B",
    "The diamond follows increasing index steps, rotates clockwise by 90 degrees, alternates hollow and filled, and cycles through four colours. The fifth state is index 10, hollow red; the sixth is index 15, filled blue."
  ),
];
