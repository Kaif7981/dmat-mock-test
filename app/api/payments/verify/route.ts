
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const EXPECTED_AMOUNT = 9900;
const EXPECTED_CURRENCY = "INR";

type VerifyBody = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

function signatureMatches(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
) {
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();

  if (!/^[a-f0-9]{128}$/i.test(signature)) {
    return false;
  }

  const received = Buffer.from(signature, "hex");

  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

export async function POST(request: Request) {
  try {
    // Authenticate the student using their Supabase session.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to verify your payment." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | VerifyBody
      | null;

    const orderId = body?.razorpay_order_id;
    const paymentId = body?.razorpay_payment_id;
    const signature = body?.razorpay_signature;

    if (
      typeof orderId !== "string" ||
      typeof paymentId !== "string" ||
      typeof signature !== "string" ||
      !/^order_[A-Za-z0-9]+$/.test(orderId) ||
      !/^pay_[A-Za-z0-9]+$/.test(paymentId)
    ) {
      return NextResponse.json(
        { error: "Invalid payment verification details." },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Payment configuration is incomplete." },
        { status: 500 }
      );
    }

    // Verify Razorpay's HMAC signature.
    if (!signatureMatches(orderId, paymentId, signature, keySecret)) {
      return NextResponse.json(
        { error: "Payment signature verification failed." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Confirm that this order belongs to the logged-in student.
    const { data: purchase, error: purchaseError } = await admin
      .from("purchases")
      .select(
        "id, user_id, product_key, razorpay_order_id, razorpay_payment_id, amount_paise, currency, status"
      )
      .eq("user_id", user.id)
      .eq("product_key", "dmat_lifetime")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (purchaseError) {
      throw purchaseError;
    }

    if (!purchase) {
      return NextResponse.json(
        { error: "No matching purchase was found for your account." },
        { status: 404 }
      );
    }

    // Make retries safe after a successful verification.
    if (
      purchase.status === "paid" &&
      purchase.razorpay_payment_id === paymentId
    ) {
      return NextResponse.json({
        success: true,
        message: "Payment already verified.",
      });
    }

    if (
      purchase.status !== "pending" ||
      purchase.amount_paise !== EXPECTED_AMOUNT ||
      purchase.currency !== EXPECTED_CURRENCY
    ) {
      return NextResponse.json(
        { error: "This order is not eligible for verification." },
        { status: 409 }
      );
    }

    // Confirm the payment directly with Razorpay.
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const payment = await razorpay.payments.fetch(paymentId);

    if (
      payment.order_id !== orderId ||
      payment.amount !== EXPECTED_AMOUNT ||
      payment.currency !== EXPECTED_CURRENCY ||
      payment.status !== "captured"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment is not captured or does not match this order. Please try again after payment confirmation.",
        },
        { status: 409 }
      );
    }

    // Grant access only after signature and payment checks pass.
    const { data: updatedPurchase, error: updateError } = await admin
      .from("purchases")
      .update({
        status: "paid",
        razorpay_payment_id: paymentId,
        paid_at: new Date().toISOString(),
      })
      .eq("id", purchase.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updatedPurchase) {
      return NextResponse.json(
        {
          error:
            "The purchase status changed during verification. Refresh and check your access.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return NextResponse.json(
      { error: "Unable to verify payment right now. Please try again." },
      { status: 500 }
    );
  }
}
