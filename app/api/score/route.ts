
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
  );
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const SECTION_NAMES = [
  "figure_sequences",
  "mathematical_equations",
  "latin_squares",
  "general_academic",
] as const;

type SectionName = (typeof SECTION_NAMES)[number];
type ResultStatus = "correct" | "wrong" | "unanswered";
type NumericAnswer = Record<string, number>;
type NumericAnswers = Record<string, NumericAnswer>;

type MatrixAnswer = {
  fifth: string;
  sixth: string;
};

type MatrixAnswers = Record<string, MatrixAnswer>;

type AnswerKey = {
  question_id: string;
  correct_option: string | null;
  correct_numeric_answers: NumericAnswer | null;
  correct_matrix_answers: MatrixAnswer | null;
  explanation: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNumericAnswer(value: unknown): value is NumericAnswer {
  return (
    isObject(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every(
      (item) => typeof item === "number" && Number.isSafeInteger(item)
    )
  );
}

function isMatrixAnswer(value: unknown): value is MatrixAnswer {
  if (!isObject(value)) return false;

  return (
    typeof value.fifth === "string" &&
    typeof value.sixth === "string" &&
    ["A", "B", "C"].includes(value.fifth.toUpperCase()) &&
    ["A", "B", "C"].includes(value.sixth.toUpperCase())
  );
}

function numericAnswersMatch(
  selected: NumericAnswer,
  correct: NumericAnswer
): boolean {
  const selectedKeys = Object.keys(selected).sort();
  const correctKeys = Object.keys(correct).sort();

  if (
    selectedKeys.length !== correctKeys.length ||
    selectedKeys.some((key, index) => key !== correctKeys[index])
  ) {
    return false;
  }

  return correctKeys.every((key) => selected[key] === correct[key]);
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let createdAttemptId: string | null = null;
  let createdSessionId: string | null = null;
  let createdSection: SectionName | null = null;

  try {
    const body: unknown = await request.json();

    if (!isObject(body)) {
      return errorResponse("Invalid request body.", 400);
    }

    const {
      answers,
      numericAnswers,
      matrixAnswers,
      questionIds,
      sessionId,
    } = body;

    if (
      !Array.isArray(questionIds) ||
      questionIds.length === 0 ||
      !questionIds.every(
        (id): id is string => typeof id === "string" && id.length > 0
      ) ||
      new Set(questionIds).size !== questionIds.length
    ) {
      return errorResponse("Invalid question submission.", 400);
    }

    if (
      (answers !== undefined && !isObject(answers)) ||
      (numericAnswers !== undefined && !isObject(numericAnswers)) ||
      (matrixAnswers !== undefined && !isObject(matrixAnswers))
    ) {
      return errorResponse("Invalid answer data.", 400);
    }

    if (typeof sessionId !== "string" || !sessionId) {
      return errorResponse(
        "Mock session not found. Please start the mock test again.",
        400
      );
    }

    // 1. Authenticate the student.
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return errorResponse("Authentication required.", 401);
    }

    const accessToken = authorization.slice("Bearer ".length);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return errorResponse("Your login session is invalid. Please log in again.", 401);
    }

    // 2. Validate the saved mock session.
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("mock_sessions")
      .select("id, user_id, mock_test_id, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      console.error("Mock session lookup error:", sessionError);
      return errorResponse(
        "Mock session not found. Please restart the mock test.",
        403
      );
    }

    if (session.status !== "in_progress") {
      return errorResponse(
        "This mock session is not in progress. Please start a new mock test.",
        403
      );
    }

    // 3. Confirm all questions belong to this test.
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("questions")
      .select("id, question_number, section")
      .eq("mock_test_id", session.mock_test_id)
      .in("id", questionIds);

    if (questionsError) {
      console.error("Question validation error:", questionsError);
      return errorResponse("Unable to validate the submitted questions.", 500);
    }

    if (!questions || questions.length !== questionIds.length) {
      return errorResponse(
        "One or more submitted questions do not belong to this mock test.",
        400
      );
    }

    const sections = [...new Set(questions.map((q) => q.section))];

    if (
      sections.length !== 1 ||
      !SECTION_NAMES.includes(sections[0] as SectionName)
    ) {
      return errorResponse(
        "Submit questions from one valid section at a time.",
        400
      );
    }

    const section = sections[0] as SectionName;
    const isMath = section === "mathematical_equations";
    const isFigureSequence = section === "figure_sequences";

    // 4. Enforce the answer format for this section.
    if (isMath) {
      if (
        numericAnswers === undefined ||
        answers !== undefined ||
        matrixAnswers !== undefined
      ) {
        return errorResponse(
          "Mathematical Equations requires numericAnswers only.",
          400
        );
      }
    } else if (isFigureSequence) {
      if (
        matrixAnswers === undefined ||
        answers !== undefined ||
        numericAnswers !== undefined
      ) {
        return errorResponse(
          "Figure Sequences requires matrixAnswers only.",
          400
        );
      }
    } else {
      if (
        answers === undefined ||
        numericAnswers !== undefined ||
        matrixAnswers !== undefined
      ) {
        return errorResponse(
          "This section requires multiple-choice answers only.",
          400
        );
      }
    }

    const submittedAnswers: Record<string, unknown> = isMath
      ? (numericAnswers as NumericAnswers)
      : isFigureSequence
        ? (matrixAnswers as MatrixAnswers)
        : (answers as Record<string, unknown>);

    if (
      Object.keys(submittedAnswers).some(
        (id) => !questionIds.includes(id)
      )
    ) {
      return errorResponse("Answers contain an unknown question ID.", 400);
    }

    // 5. Validate numeric responses.
    if (isMath) {
      for (const [id, value] of Object.entries(
        numericAnswers as NumericAnswers
      )) {
        if (!questionIds.includes(id) || !isNumericAnswer(value)) {
          return errorResponse(
            "A numeric answer is invalid. Enter whole-number values.",
            400
          );
        }

        if (
          Object.keys(value).some(
            (variable) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(variable)
          )
        ) {
          return errorResponse("Invalid variable name in numeric answer.", 400);
        }
      }
    }

    // 6. Validate paired figure answers.
    if (isFigureSequence) {
      for (const [id, value] of Object.entries(
        matrixAnswers as Record<string, unknown>
      )) {
        if (!questionIds.includes(id) || !isMatrixAnswer(value)) {
          return errorResponse(
            "Invalid Figure Sequences answer. Select A, B, or C for each figure.",
            400
          );
        }
      }
    }

    // 7. Validate standard multiple-choice answers.
    if (!isMath && !isFigureSequence) {
      for (const [id, value] of Object.entries(
        answers as Record<string, unknown>
      )) {
        if (!questionIds.includes(id)) {
          return errorResponse("Answers contain an unknown question ID.", 400);
        }

        if (
          value !== null &&
          value !== "" &&
          (typeof value !== "string" ||
            !["A", "B", "C", "D", "E"].includes(
              value.trim().toUpperCase()
            ))
        ) {
          return errorResponse("Invalid multiple-choice option.", 400);
        }
      }
    }

    // 8. Prevent duplicate submissions.
    const { data: existingSection, error: existingSectionError } =
      await supabaseAdmin
        .from("mock_session_sections")
        .select("id")
        .eq("session_id", session.id)
        .eq("section", section)
        .maybeSingle();

    if (existingSectionError) {
      console.error("Section lookup error:", existingSectionError);
      return errorResponse("Unable to verify section status.", 500);
    }

    if (existingSection) {
      return errorResponse(
        "This section has already been submitted in this mock session. Start a new mock test to try again.",
        409
      );
    }

    // 9. Load protected answer keys.
    const { data: answerData, error: answerError } = await supabaseAdmin
      .from("question_answers")
      .select(
        "question_id, correct_option, correct_numeric_answers, correct_matrix_answers, explanation"
      )
      .in("question_id", questionIds);

    if (answerError) {
      console.error("Answer key lookup error:", answerError);
      return errorResponse("Unable to load the answer key.", 500);
    }

    const answerMap = new Map<string, AnswerKey>();

    for (const item of answerData ?? []) {
      answerMap.set(item.question_id, item as AnswerKey);
    }

    if (questionIds.some((id) => !answerMap.has(id))) {
      return errorResponse(
        "An answer key is missing for one or more questions.",
        500
      );
    }

    if (
      isMath &&
      questionIds.some(
        (id) => !isNumericAnswer(answerMap.get(id)?.correct_numeric_answers)
      )
    ) {
      return errorResponse(
        "A numeric answer key is missing or invalid for this section.",
        500
      );
    }

    if (
      isFigureSequence &&
      questionIds.some(
        (id) => !isMatrixAnswer(answerMap.get(id)?.correct_matrix_answers)
      )
    ) {
      return errorResponse(
        "A fifth/sixth Figure Sequence answer key is missing or invalid.",
        500
      );
    }

    if (
      !isMath &&
      !isFigureSequence &&
      questionIds.some((id) => !answerMap.get(id)?.correct_option)
    ) {
      return errorResponse(
        "A multiple-choice answer key is missing.",
        500
      );
    }

    // 10. Score the answers.
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    const results = questionIds.map((questionId: string) => {
      const answer = answerMap.get(questionId)!;
      const explanation = answer.explanation || "";

      let selectedOption: string | null = null;
      let selectedNumeric: NumericAnswer | null = null;
      let selectedMatrix: MatrixAnswer | null = null;
      let status: ResultStatus;

      if (isMath) {
        const raw = (numericAnswers as NumericAnswers)[questionId];

        selectedNumeric =
          raw && Object.keys(raw).length > 0 ? raw : null;

        if (!selectedNumeric) {
          status = "unanswered";
          unanswered++;
        } else if (
          numericAnswersMatch(
            selectedNumeric,
            answer.correct_numeric_answers!
          )
        ) {
          status = "correct";
          correct++;
        } else {
          status = "wrong";
          wrong++;
        }
      } else if (isFigureSequence) {
        const raw = (matrixAnswers as MatrixAnswers)[questionId];

        const fifth = raw?.fifth?.trim().toUpperCase() || "";
        const sixth = raw?.sixth?.trim().toUpperCase() || "";

        selectedMatrix =
          fifth || sixth ? { fifth, sixth } : null;

        if (!selectedMatrix) {
          status = "unanswered";
          unanswered++;
        } else if (
          fifth &&
          sixth &&
          fifth === answer.correct_matrix_answers!.fifth.toUpperCase() &&
          sixth === answer.correct_matrix_answers!.sixth.toUpperCase()
        ) {
          // Both answers must be correct to earn credit.
          status = "correct";
          correct++;
        } else {
          status = "wrong";
          wrong++;
        }
      } else {
        const rawOption = (answers as Record<string, unknown>)[questionId];

        selectedOption =
          typeof rawOption === "string" && rawOption.trim()
            ? rawOption.trim().toUpperCase()
            : null;

        if (!selectedOption) {
          status = "unanswered";
          unanswered++;
        } else if (selectedOption === answer.correct_option?.toUpperCase()) {
          status = "correct";
          correct++;
        } else {
          status = "wrong";
          wrong++;
        }
      }

      return {
        question_id: questionId,
        selected_option: selectedOption,
        selected_numeric_answers: selectedNumeric,
        selected_matrix_answers: selectedMatrix,
        is_correct: status === "correct",
        correct_option:
          !isMath && !isFigureSequence ? answer.correct_option : null,
        correct_numeric_answers: isMath
          ? answer.correct_numeric_answers
          : null,
        correct_matrix_answers: isFigureSequence
          ? answer.correct_matrix_answers
          : null,
        explanation,
        status,
      };
    });

    const totalQuestions = questionIds.length;
    const score = correct;
    const percentage = Math.round((correct / totalQuestions) * 100);

    // 11. Create the attempt.
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("attempts")
      .insert({
        user_id: user.id,
        mock_test_id: session.mock_test_id,
        completed_at: new Date().toISOString(),
        score,
        total_questions: totalQuestions,
        correct_answers: correct,
        wrong_answers: wrong,
        unanswered,
      })
      .select("id")
      .single();

    if (attemptError || !attempt) {
      console.error("Attempt creation error:", attemptError);
      return errorResponse(
        `Unable to save your attempt: ${attemptError?.message || "Unknown database error."}`,
        500
      );
    }

    createdAttemptId = attempt.id;
    createdSessionId = session.id;
    createdSection = section;

    // 12. Link the attempt to the section.
    const { error: sectionInsertError } = await supabaseAdmin
      .from("mock_session_sections")
      .insert({
        session_id: session.id,
        section,
        attempt_id: attempt.id,
        completed_at: new Date().toISOString(),
      });

    if (sectionInsertError) {
      console.error("Section link error:", sectionInsertError);

      await supabaseAdmin.from("attempts").delete().eq("id", attempt.id);

      createdAttemptId = null;

      return errorResponse(
        `Unable to link this section: ${sectionInsertError.message}`,
        500
      );
    }

    // 13. Save the selected answers.
    const attemptAnswers = results.map((item) => ({
      attempt_id: attempt.id,
      question_id: item.question_id,
      selected_option: item.selected_option,
      selected_numeric_answers: item.selected_numeric_answers,
      selected_matrix_answers: item.selected_matrix_answers,
      is_correct: item.is_correct,
    }));

    const { error: attemptAnswersError } = await supabaseAdmin
      .from("attempt_answers")
      .insert(attemptAnswers);

    if (attemptAnswersError) {
      console.error("Attempt answers insert error:", attemptAnswersError);

      await supabaseAdmin
        .from("mock_session_sections")
        .delete()
        .eq("session_id", session.id)
        .eq("section", section);

      await supabaseAdmin.from("attempts").delete().eq("id", attempt.id);

      createdAttemptId = null;

      return NextResponse.json(
        {
          error: "Unable to save your answers.",
          details: attemptAnswersError.message,
          code: attemptAnswersError.code,
          hint: attemptAnswersError.hint,
        },
        { status: 500 }
      );
    }

    // 14. Mark the mock session complete after all four sections finish.
    const { data: completedSections, error: completedSectionsError } =
      await supabaseAdmin
        .from("mock_session_sections")
        .select("section")
        .eq("session_id", session.id);

    if (completedSectionsError) {
      console.error("Completed sections lookup error:", completedSectionsError);
    }

    const completedNames = new Set(
      (completedSections ?? []).map((item) => item.section)
    );

    const allSectionsCompleted =
      !completedSectionsError &&
      SECTION_NAMES.every((name) => completedNames.has(name));

    let sessionCompleted = false;

    if (allSectionsCompleted) {
      const { error: completionError } = await supabaseAdmin
        .from("mock_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .eq("status", "in_progress");

      if (completionError) {
        console.error("Session completion error:", completionError);
      } else {
        sessionCompleted = true;
      }
    }

    // 15. Return the result.
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionCompleted,
      section,
      attemptId: attempt.id,
      score,
      totalQuestions,
      percentage,
      correct,
      correctAnswers: correct,
      wrong,
      wrongAnswers: wrong,
      unanswered,
      results,
    });
  } catch (error) {
    console.error("Score API unexpected error:", error);

    if (createdAttemptId) {
      if (createdSessionId && createdSection) {
        await supabaseAdmin
          .from("mock_session_sections")
          .delete()
          .eq("session_id", createdSessionId)
          .eq("section", createdSection);
      }

      await supabaseAdmin
        .from("attempt_answers")
        .delete()
        .eq("attempt_id", createdAttemptId);

      await supabaseAdmin
        .from("attempts")
        .delete()
        .eq("id", createdAttemptId);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while scoring the test.",
      },
      { status: 500 }
    );
  }
}
