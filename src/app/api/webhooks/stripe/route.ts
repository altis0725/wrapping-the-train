import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { handlePaymentSuccess } from "@/actions/payment";
import type Stripe from "stripe";

/**
 * Stripe Webhook Handler
 *
 * 処理対象イベント:
 * - checkout.session.completed: 決済完了
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Stripe Webhook] Missing signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("[Stripe Webhook] Webhook secret not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("[Stripe Webhook] Signature verification failed:", error);
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!session.metadata) {
          console.error("[Stripe Webhook] Missing metadata in session");
          return NextResponse.json(
            { error: "Missing metadata" },
            { status: 400 }
          );
        }

        const { reservationId, videoId, userId } = session.metadata;

        if (!reservationId || !videoId || !userId) {
          console.error("[Stripe Webhook] Incomplete metadata:", session.metadata);
          return NextResponse.json(
            { error: "Incomplete metadata" },
            { status: 400 }
          );
        }

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || "";

        const result = await handlePaymentSuccess(
          event.id,
          session.id,
          { reservationId, videoId, userId },
          paymentIntentId
        );

        if (!result.success) {
          console.error(
            "[Stripe Webhook] handlePaymentSuccess failed:",
            result.error
          );
          // 500を返すとStripeがリトライする
          return NextResponse.json(
            { error: result.error },
            { status: 500 }
          );
        }

        console.log(
          `[Stripe Webhook] checkout.session.completed processed for reservation ${reservationId}`
        );
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.warn(
          `[Stripe Webhook] Payment failed: ${paymentIntent.id}`,
          paymentIntent.last_payment_error?.message
        );
        // 現時点では特別な処理なし（予約はhold状態のまま期限切れを待つ）
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
