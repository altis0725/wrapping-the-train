import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }

  return stripeInstance;
}

// 後方互換性のためのエクスポート（ただし使用時にエラーになる可能性あり）
export const stripe = {
  get checkout() {
    return getStripe().checkout;
  },
  get refunds() {
    return getStripe().refunds;
  },
  get webhooks() {
    return getStripe().webhooks;
  },
} as unknown as Stripe;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
