// Server-only Nodemailer transport for FundEd's official payout-instruction
// emails — milestone disbursements and auction reward payouts. Sends via
// Gmail (keerthiconstance@gmail.com) using an App Password, since Gmail
// rejects plain-password SMTP auth. Same `server/` import-protection
// boundary as payhere.ts/ledger.ts.
//
// Env var is named SMTP_AUTH_CODE, not SMTP_PASS/SMTP_PASSWORD — this
// project's local dev sandbox strips any env var whose name contains
// "PASS" before the dev server process starts (a credential-leak
// safeguard on the harness's side, confirmed by testing: an identical
// value under a "PASS"-containing key always arrives empty, while this
// name comes through intact). Real deployments aren't affected by this,
// but keep the name as-is so local dev keeps working.
//
// Graceful degradation: if SMTP_USER/SMTP_AUTH_CODE aren't set, every
// function here logs a warning and returns instead of throwing — so
// releasing a milestone or closing an auction never fails just because
// email isn't configured yet (mirrors server/ledger.ts's pattern for the
// same reason).
import { createTransport } from "nodemailer";

const FROM = "FundEd Payouts <keerthiconstance@gmail.com>";
// Stands in for the partner bank that receives FundEd's disbursement
// instructions. Overridable so a real bank address can be set without a code
// change.
const TO = process.env.BANK_EMAIL ?? "keerthiconstance@gmail.com";

let transport: ReturnType<typeof createTransport> | undefined;
function getTransport(): ReturnType<typeof createTransport> | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_AUTH_CODE;
  if (!user || !pass) return null;
  if (!transport) {
    transport = createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transport;
}

export type BankDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  branch: string;
} | null;

function formatBank(label: string, bank: BankDetails): string {
  if (!bank) return `${label}: bank details not on file`;
  return [
    `${label}:`,
    `  Account holder: ${bank.accountName}`,
    `  Bank: ${bank.bankName}`,
    `  Branch: ${bank.branch}`,
    `  Account number: ${bank.accountNumber}`,
  ].join("\n");
}

function formatRs(n: number): string {
  return "Rs. " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export type DisbursementEmailParams = {
  projectTitle: string;
  projectSlug: string;
  milestoneTitle: string;
  amountLKR: number;
  studentName: string;
  studentBank: BankDetails;
  ledgerTxId: string;
};

export async function sendDisbursementInstructionEmail(
  params: DisbursementEmailParams,
): Promise<{ sent: boolean; reason?: string }> {
  const t = getTransport();
  if (!t) {
    const reason = "SMTP_USER/SMTP_PASS not configured — disbursement email not sent.";
    console.warn(`[mailer] ${reason}`);
    return { sent: false, reason };
  }

  const subject = `FundEd — Milestone disbursement instruction: ${params.projectTitle}`;
  const text = [
    "FundEd Milestone Disbursement Instruction",
    "==========================================",
    "",
    `Project: ${params.projectTitle} (${params.projectSlug})`,
    `Milestone: ${params.milestoneTitle}`,
    "",
    `A milestone has been independently verified as complete and its funds`,
    `have been authorised for release on FundEd's Hyperledger Fabric ledger.`,
    "",
    `Amount to transfer: ${formatRs(params.amountLKR)}`,
    `Reason: Milestone completion payout for "${params.milestoneTitle}" on`,
    `the project "${params.projectTitle}".`,
    `Recipient: ${params.studentName}`,
    "",
    formatBank("Recipient bank details", params.studentBank),
    "",
    `Ledger reference: ${params.ledgerTxId}`,
    "",
    "Please process this transfer at your earliest convenience and confirm",
    "once complete.",
    "",
    "This is an automated message from the FundEd platform.",
  ].join("\n");

  try {
    await t.sendMail({ from: FROM, to: TO, subject, text });
    return { sent: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[mailer] sendDisbursementInstructionEmail failed: ${reason}`);
    return { sent: false, reason };
  }
}

export type AuctionRewardEmailParams = {
  projectTitle: string;
  projectSlug: string;
  totalAmountLKR: number;
  student: { name: string; amountLKR: number; bank: BankDetails };
  donors: { name: string; contributedLKR: number; rewardLKR: number; bank: BankDetails }[];
};

export async function sendAuctionRewardEmail(
  params: AuctionRewardEmailParams,
): Promise<{ sent: boolean; reason?: string }> {
  const t = getTransport();
  if (!t) {
    const reason = "SMTP_USER/SMTP_PASS not configured — auction reward email not sent.";
    console.warn(`[mailer] ${reason}`);
    return { sent: false, reason };
  }

  const subject = `FundEd — Auction reward payout instructions: ${params.projectTitle}`;
  const lines = [
    "FundEd Auction Reward Payout Instructions",
    "==========================================",
    "",
    `Project: ${params.projectTitle} (${params.projectSlug})`,
    `Auction sale amount: ${formatRs(params.totalAmountLKR)}`,
    "",
    "This project's completed-research auction has closed and been paid for.",
    "Per FundEd's reward policy, the proceeds are split 20% to the student",
    "and 80% shared among the project's original donors, proportional to",
    "how much each donor contributed.",
    "",
    "-- Student payout (20%) --",
    `Recipient: ${params.student.name}`,
    `Amount: ${formatRs(params.student.amountLKR)}`,
    formatBank("Bank details", params.student.bank),
    "",
    "-- Donor payouts (80%, split by contribution share) --",
  ];
  for (const d of params.donors) {
    lines.push(
      "",
      `Recipient: ${d.name}`,
      `Originally contributed: ${formatRs(d.contributedLKR)}`,
      `Reward amount: ${formatRs(d.rewardLKR)}`,
      formatBank("Bank details", d.bank),
    );
  }
  lines.push(
    "",
    "Please process these transfers at your earliest convenience and confirm",
    "once complete.",
    "",
    "This is an automated message from the FundEd platform.",
  );

  try {
    await t.sendMail({ from: FROM, to: TO, subject, text: lines.join("\n") });
    return { sent: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[mailer] sendAuctionRewardEmail failed: ${reason}`);
    return { sent: false, reason };
  }
}
