
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const SECTION_NAMES = [
  "figure_sequences",
  "mathematical_equations",
  "latin_squares",
  "general_academic",
] as const;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const token = authHeader.slice("Bearer ".length);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Mock session ID is required." },
        { status: 400 }
      );
    }

    // 1. Verify that this session belongs to the authenticated student.
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("mock_sessions")
      .select(
        "id, user_id, mock_test_id, status, started_at, completed_at"
      )
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError) {
      console.error("Session lookup error:", sessionError);
      return NextResponse.json(
        { error: "Unable to load your mock session." },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Mock session not found." },
        { status: 404 }
      );
    }

    // 2. Load completed sections for this session.
    const { data: sectionLinks, error: sectionsError } =
      await supabaseAdmin
        .from("mock_session_sections")
        .select("section, attempt_id, completed_at")
        .eq("session_id", session.id);

    if (sectionsError) {
      console.error("Section lookup error:", sectionsError);
      return NextResponse.json(
        { error: "Unable to load section results." },
        { status: 500 }
      );
    }

    const attemptIds = (sectionLinks ?? [])
      .map((item) => item.attempt_id)
      .filter((id): id is string => Boolean(id));

    if (attemptIds.length === 0) {
      return NextResponse.json({
        success: true,
        session,
        requiredSections: SECTION_NAMES,
        sections: [],
        overall: {
          score: 0,
          totalQuestions: 0,
          correct: 0,
          wrong: 0,
          unanswered: 0,
          percentage: 0,
        },
      });
    }

    // 3. Load the attempts belonging to this student and mock test.
    const { data: attempts, error: attemptsError } =
      await supabaseAdmin
        .from("attempts")
        .select(
          "id, score, total_questions, correct_answers, wrong_answers, unanswered, completed_at"
        )
        .in("id", attemptIds)
        .eq("user_id", user.id)
        .eq("mock_test_id", session.mock_test_id);

    if (attemptsError) {
      console.error("Attempts lookup error:", attemptsError);
      return NextResponse.json(
        { error: "Unable to load your scores." },
        { status: 500 }
      );
    }

    // 4. Retrieve both answer formats.
    const validAttemptIds = (attempts ?? []).map((item) => item.id);

    if (validAttemptIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          session,
          requiredSections: SECTION_NAMES,
          sections: [],
          overall: {
            score: 0,
            totalQuestions: 0,
            correct: 0,
            wrong: 0,
            unanswered: 0,
            percentage: 0,
          },
        }
      );
    }

    const { data: attemptAnswers, error: answersError } =
      await supabaseAdmin
        .from("attempt_answers")
        .select(
          "attempt_id, question_id, selected_option, selected_numeric_answers, is_correct"
        )
        .in("attempt_id", validAttemptIds);

    if (answersError) {
      console.error("Attempt answers lookup error:", answersError);
      return NextResponse.json(
        { error: "Unable to load your answer review." },
        { status: 500 }
      );
    }

    const questionIds = [
      ...new Set((attemptAnswers ?? []).map((item) => item.question_id)),
    ];

    let questions: any[] = [];
    let answerKeys: any[] = [];

    if (questionIds.length > 0) {
      const { data: questionData, error: questionError } =
        await supabaseAdmin
          .from("questions")
          .select(
            "id, question_number, module, section, question_type, question_text, option_a, option_b, option_c, option_d, difficulty, content, options"
          )
          .eq("mock_test_id", session.mock_test_id)
          .in("id", questionIds);

      if (questionError) {
        console.error("Questions lookup error:", questionError);
        return NextResponse.json(
          { error: "Unable to load questions." },
          { status: 500 }
        );
      }

      questions = questionData ?? [];

      // Answer keys are retrieved server-side for result review.
      const { data: keyData, error: keyError } =
        await supabaseAdmin
          .from("question_answers")
          .select(
            "question_id, correct_option, correct_numeric_answers, explanation"
          )
          .in("question_id", questionIds);

      if (keyError) {
        console.error("Answer key lookup error:", keyError);
        return NextResponse.json(
          { error: "Unable to load answer explanations." },
          { status: 500 }
        );
      }

      answerKeys = keyData ?? [];
    }

    const attemptMap = new Map(
      (attempts ?? []).map((attempt) => [attempt.id, attempt])
    );

    const questionMap = new Map(
      questions.map((question) => [question.id, question])
    );

    const answerKeyMap = new Map(
      answerKeys.map((item) => [item.question_id, item])
    );

    const sections = (sectionLinks ?? [])
      .map((link) => {
        const attempt = link.attempt_id
          ? attemptMap.get(link.attempt_id)
          : null;

        // Do not return answers for attempts that were not verified above.
        if (link.attempt_id && !attempt) {
          return null;
        }

        const review = (attemptAnswers ?? [])
          .filter((item) => item.attempt_id === link.attempt_id)
          .map((item) => {
            const question = questionMap.get(item.question_id);
            const key = answerKeyMap.get(item.question_id);

            const selectedOption = item.selected_option ?? null;
            const selectedNumericAnswers =
              item.selected_numeric_answers ?? null;

            const isMath =
              question?.section === "mathematical_equations";

            const hasNumericAnswer =
              selectedNumericAnswers !== null &&
              typeof selectedNumericAnswers === "object" &&
              !Array.isArray(selectedNumericAnswers) &&
              Object.keys(selectedNumericAnswers).length > 0;

            const hasOptionAnswer =
              typeof selectedOption === "string" &&
              selectedOption.trim().length > 0;

            const isAnswered = isMath
              ? hasNumericAnswer
              : hasOptionAnswer;

            return {
              questionId: item.question_id,
              question,
              selectedOption,
              correctOption: key?.correct_option ?? null,
              selectedNumericAnswers,
              correctNumericAnswers:
                isMath ? key?.correct_numeric_answers ?? null : null,
              explanation: key?.explanation ?? "",
              status: !isAnswered
                ? "unanswered"
                : item.is_correct
                ? "correct"
                : "wrong",
            };
          })
          .filter((item) => Boolean(item.question));

        return {
          section: link.section,
          completedAt: link.completed_at,
          attempt: attempt ?? null,
          questions: review,
        };
      })
      .filter((section) => section !== null);

    // 5. Calculate overall results.
    const overall = sections.reduce(
      (total, section) => {
        const attempt = section.attempt;

        if (!attempt) return total;

        total.score += Number(attempt.score ?? 0);
        total.totalQuestions += Number(attempt.total_questions ?? 0);
        total.correct += Number(attempt.correct_answers ?? 0);
        total.wrong += Number(attempt.wrong_answers ?? 0);
        total.unanswered += Number(attempt.unanswered ?? 0);

        return total;
      },
      {
        score: 0,
        totalQuestions: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
      }
    );

    return NextResponse.json({
      success: true,
      session,
      requiredSections: SECTION_NAMES,
      sections,
      overall: {
        ...overall,
        percentage:
          overall.totalQuestions > 0
            ? Math.round(
                (overall.correct / overall.totalQuestions) * 100
              )
            : 0,
      },
    });
  } catch (error) {
    console.error("Results API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while loading results." },
      { status: 500 }
    );
  }
}
