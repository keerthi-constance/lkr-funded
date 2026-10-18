// Diagnostic for the PayHere config. Run with:  node scripts/check-payhere.mjs
// Reads .env, reports what's missing, and prints the exact checkout fields
// (with a real hash) that the donate flow would POST — so you can compare them
// against what PayHere's sandbox expects without guessing.
import "dotenv/config";
import { createHash } from "node:crypto";

const md5 = (s) => createHash("md5").update(s).digest("hex");

const required = [
  "PAYHERE_MERCHANT_ID",
  "PAYHERE_MERCHANT_SECRET",
  "PAYHERE_NOTIFY_URL",
  "PAYHERE_RETURN_URL",
  "PAYHERE_CANCEL_URL",
];

let missing = false;
console.log("--- PayHere config ---");
for (const key of required) {
  const value = process.env[key];
  if (!value) {
    console.log(`  ${key}: *** MISSING ***`);
    missing = true;
  } else if (key === "PAYHERE_MERCHANT_SECRET") {
    console.log(`  ${key}: set (${value.length} chars)`);
  } else {
    console.log(`  ${key}: ${value}`);
  }
}
console.log(`  PAYHERE_SANDBOX_MODE: ${process.env.PAYHERE_SANDBOX_MODE ?? "(unset -> sandbox)"}`);

if (missing) {
  console.log("\nFill the missing values in .env, then re-run this script.");
  process.exit(1);
}

// Warn about the classic footgun: PayHere's servers POST to notify_url, so it
// must be publicly reachable. localhost/127.0.0.1 silently never gets called,
// which leaves every donation stuck "pending" even after a successful payment.
const notify = process.env.PAYHERE_NOTIFY_URL;
if (/localhost|127\.0\.0\.1/.test(notify)) {
  console.log(
    "\n!! PAYHERE_NOTIFY_URL points at localhost. PayHere cannot reach it, so\n" +
      "   payments will succeed at PayHere but never confirm in the app.\n" +
      "   Expose your dev server with a tunnel and use that https URL instead."
  );
} else if (!notify.startsWith("https://")) {
  console.log("\n!! PAYHERE_NOTIFY_URL should be https://");
}

const merchantId = process.env.PAYHERE_MERCHANT_ID;
const orderId = "fundEd_diagnostic_001";
const amount = (1000).toFixed(2);
const currency = "LKR";
const secretHash = md5(process.env.PAYHERE_MERCHANT_SECRET).toUpperCase();
const hash = md5(merchantId + orderId + amount + currency + secretHash).toUpperCase();

console.log("\n--- Sample checkout payload ---");
console.log(
  JSON.stringify(
    {
      checkout_url:
        process.env.PAYHERE_SANDBOX_MODE !== "false"
          ? "https://sandbox.payhere.lk/pay/checkout"
          : "https://www.payhere.lk/pay/checkout",
      merchant_id: merchantId,
      order_id: orderId,
      items: "Donation to <project>",
      currency,
      amount,
      hash,
    },
    null,
    2
  )
);
console.log(
  "\nIf PayHere still rejects the payment with a valid hash, the usual cause is\n" +
    "that the domain you're checking out from isn't approved yet:\n" +
    "  PayHere sandbox > Settings > Domains & Credentials > Add Domain/App\n" +
    "Approval can take up to 24 hours."
);
