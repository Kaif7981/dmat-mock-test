
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PRODUCT_KEY = "dmat_lifetime";
const COUPON_CODE = "dMat-99";
const PRICE_PAISE = 9900;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in before purchasing." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const coupon = typeof body.couponCode === "string"
      ? body.couponCode.trim()
      : "";

    if (coupon && coupon !== COUPON_CODE) {
      return NextResponse.json(
        { error: "Invalid coupon code." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: existing, error: lookupError } = await admin
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_key", PRODUCT_KEY)
      .eq("status", "paid")
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existing) {
      return NextResponse.json(
        { error: "You already have lifetime access." },
        { status: 409 }
      );
    }

    // Private coupon: grant access without creating a ₹0 Razorpay order.
    if (coupon === COUPON_CODE) {
      const { error: insertError } = await admin
        .from("purchases")
        .insert({
          user_id: user.id,
          product_key: PRODUCT_KEY,
          razorpay_order_id: null,
          razorpay_payment_id: null,
          amount_paise: 0,
          currency: "INR",
          coupon_code: COUPON_CODE,
          status: "paid",
          paid_at: new Date().toISOString(),
        });

      if (insertError) {
        if (insertError.code === "23505") {
          return NextResponse.json(
            { error: "Lifetime access has already been claimed." },
            { status: 409 }
          );
        }
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        freeAccess: true,
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Payment configuration is incomplete." },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: PRICE_PAISE,
      currency: "INR",
      receipt: `dmat_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
      notes: {
        user_id: user.id,
        product_key: PRODUCT_KEY,
      },
    });

    const { error: insertError } = await admin
      .from("purchases")
      .insert({
        user_id: user.id,
        product_key: PRODUCT_KEY,
        razorpay_order_id: order.id,
        amount_paise: PRICE_PAISE,
        currency: "INR",
        coupon_code: null,
        status: "pending",
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      freeAccess: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 }
    );
  }
}
