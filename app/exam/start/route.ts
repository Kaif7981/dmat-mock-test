
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in before starting a mock test." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const testId = body?.testId;

    if (typeof testId !== "string" || !testId.trim()) {
      return NextResponse.json(
        { error: "Please select a valid mock test." },
        { status: 400 }
      );
    }

    // Verify lifetime access for this authenticated user.
    const { data: purchases, error: purchaseError } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_key", "dmat_lifetime")
      .eq("status", "paid")
      .limit(1);

    if (purchaseError) {
      console.error("Purchase lookup error:", purchaseError);
      return NextResponse.json(
        { error: "Unable to verify access. Please try again." },
        { status: 500 }
      );
    }

    if (!purchases || purchases.length === 0) {
      return NextResponse.json(
        { error: "Please unlock DMAT Lifetime Access first." },
        { status: 403 }
      );
    }

    // Preserve the dashboard's existing test order.
    const { data: allTests, error: testsError } = await supabase
      .from("mock_tests")
      .select("id, title, published")
      .order("created_at", { ascending: true });

    if (testsError) {
      console.error("Test lookup error:", testsError);
      return NextResponse.json(
        { error: "Unable to load mock tests." },
        { status: 500 }
      );
    }

    const tests = (allTests || [])
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 3);

    const index = tests.findIndex((test) => test.id === testId);
    const selectedTest = tests[index];

    if (!selectedTest || !selectedTest.published) {
      return NextResponse.json(
        { error: "This mock test is unavailable." },
        { status: 404 }
      );
    }

    // Test N requires completion of test N-1.
    if (index > 0) {
      const previousTestId = tests[index - 1].id;

      const { data: completedSession, error: completionError } =
        await supabase
          .from("mock_sessions")
          .select("id")
          .eq("user_id", user.id)
          .eq("mock_test_id", previousTestId)
          .eq("status", "completed")
          .limit(1)
          .maybeSingle();

      if (completionError) {
        console.error("Progression check error:", completionError);
        return NextResponse.json(
          { error: "Unable to check test progression." },
          { status: 500 }
        );
      }

      if (!completedSession) {
        return NextResponse.json(
          {
            error: `Complete Mock Test ${index} before starting Mock Test ${index + 1}.`,
          },
          { status: 403 }
        );
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from("mock_sessions")
      .insert({
        user_id: user.id,
        mock_test_id: selectedTest.id,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("Session creation error:", sessionError);
      return NextResponse.json(
        { error: "Unable to start your mock test." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Exam start error:", error);
    return NextResponse.json(
      { error: "Unable to start your mock test. Please try again." },
      { status: 500 }
    );
  }
}
