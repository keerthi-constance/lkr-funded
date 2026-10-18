// Server-only PayHere (Sri Lankan payment gateway) integration. Computes the
// checkout request hash and verifies notify_url webhook signatures — both
// require PAYHERE_MERCHANT_SECRET, which must never reach the client. Any
// `**/server/**` module is blocked from the client bundle at build time by
// this project's import-protection plugin.
import { createHash, timingSafeEqual } from "node:crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set.`);
  return value;
}

function isSandbox(): boolean {
  return process.env.PAYHERE_SANDBOX_MODE !== "false";
}

export const PAYHERE_CHECKOUT_URL = isSandbox()
  ? "https://sandbox.payhere.lk/pay/checkout"
  : "https://www.payhere.lk/pay/checkout";

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

// PayHere requires amounts formatted to exactly 2 decimal places, no
// thousands separators (e.g. "1000.00", not "1,000.00" or "1000").
export function formatAmount(amountLKR: number): string {
  return amountLKR.toFixed(2);
}

export type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
};

export type CheckoutParams = {
  orderId: string;
  amountLKR: number;
  itemDescription: string;
  customer: CheckoutCustomer;
};

// PayHere's Checkout hash: MD5(merchant_id + order_id + amount + currency +
// UPPERCASE(MD5(merchant_secret))), itself uppercased.
function computeCheckoutHash(merchantId: string, orderId: string, formattedAmount: string): string {
  const secretHash = md5(requireEnv("PAYHERE_MERCHANT_SECRET")).toUpperCase();
  return md5(merchantId + orderId + formattedAmount + "LKR" + secretHash).toUpperCase();
}

// The full set of fields the donate form POSTs to PAYHERE_CHECKOUT_URL.
export function buildCheckoutFields(params: CheckoutParams): Record<string, string> {
  const merchantId = requireEnv("PAYHERE_MERCHANT_ID");
  const formattedAmount = formatAmount(params.amountLKR);

  return {
    merchant_id: merchantId,
    return_url: requireEnv("PAYHERE_RETURN_URL"),
    cancel_url: requireEnv("PAYHERE_CANCEL_URL"),
    notify_url: requireEnv("PAYHERE_NOTIFY_URL"),
    order_id: params.orderId,
    items: params.itemDescription,
    currency: "LKR",
    amount: formattedAmount,
    first_name: params.customer.firstName,
    last_name: params.customer.lastName,
    email: params.customer.email,
    phone: params.customer.phone,
    address: params.customer.address,
    city: params.customer.city,
    country: "Sri Lanka",
    hash: computeCheckoutHash(merchantId, params.orderId, formattedAmount),
  };
}

export type PayhereNotifyPayload = {
  merchant_id: string;
  order_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
  payment_id?: string;
};

// PayHere's notify_url signature: MD5(merchant_id + order_id + payhere_amount
// + payhere_currency + status_code + UPPERCASE(MD5(merchant_secret))),
// uppercased — recomputed here and compared against the posted md5sig.
// This (not the browser return_url) is the authoritative confirmation of
// payment; callers must reject the webhook on a mismatch.
export function verifyNotifySignature(payload: PayhereNotifyPayload): boolean {
  const secretHash = md5(requireEnv("PAYHERE_MERCHANT_SECRET")).toUpperCase();
  const expected = md5(
    payload.merchant_id + payload.order_id + payload.payhere_amount + payload.payhere_currency + payload.status_code + secretHash
  ).toUpperCase();

  const received = payload.md5sig?.toUpperCase() ?? "";
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(received, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

export type PayhereStatus = "success" | "pending" | "cancelled" | "failed" | "chargedback" | "unknown";

// PayHere status_code: 2=success, 0=pending, -1=cancelled, -2=failed, -3=chargedback.
export function mapStatusCode(statusCode: string): PayhereStatus {
  switch (statusCode) {
    case "2":
      return "success";
    case "0":
      return "pending";
    case "-1":
      return "cancelled";
    case "-2":
      return "failed";
    case "-3":
      return "chargedback";
    default:
      return "unknown";
  }
}
