// PayHere's notify_url webhook — the ONLY authoritative confirmation of
// payment. The browser return_url is never trusted for this; it just polls
// getDonationStatus (see src/routes/donate.return.tsx) until this webhook
// has done its job. Idempotent: PayHere may redeliver the same notification,
// so a donation already in a terminal state is a no-op.
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getDb } from "@/backend/db";
import { DonationModel, ProjectModel } from "@/backend/models";
import {
  verifyNotifySignature,
  mapStatusCode,
  type PayhereNotifyPayload,
} from "@/backend/server/payhere";
import { ensureCampaign, recordContribution } from "@/backend/server/ledger";

export const Route = createFileRoute("/api/payhere/notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const get = (key: string) => (form.get(key) ?? "").toString();

        const payload: PayhereNotifyPayload = {
          merchant_id: get("merchant_id"),
          order_id: get("order_id"),
          payhere_amount: get("payhere_amount"),
          payhere_currency: get("payhere_currency"),
          status_code: get("status_code"),
          md5sig: get("md5sig"),
          payment_id: get("payment_id") || undefined,
        };

        if (!payload.order_id || !payload.md5sig) {
          return new Response("Missing required fields.", { status: 400 });
        }

        if (!verifyNotifySignature(payload)) {
          console.error("[payhere:notify] Signature mismatch for order", payload.order_id);
          return new Response("Invalid signature.", { status: 400 });
        }

        await getDb();
        const donation = await DonationModel.findOne({ payhereOrderId: payload.order_id });
        if (!donation) {
          // Unknown order — nothing useful a retry would fix; ack anyway.
          console.warn("[payhere:notify] No donation found for order", payload.order_id);
          return new Response("OK", { status: 200 });
        }

        // Idempotent: already terminal, ignore any redelivery.
        if (donation.status === "confirmed" || donation.status === "failed") {
          return new Response("OK", { status: 200 });
        }

        const status = mapStatusCode(payload.status_code);

        if (status === "success") {
          donation.status = "confirmed";
          donation.payherePaymentId = payload.payment_id;
          await donation.save();

          const project = await ProjectModel.findOneAndUpdate(
            { slug: donation.projectSlug },
            { $inc: { raised: donation.amount, donors: 1 } },
            { new: true },
          );
          if (project && project.raised >= project.goal && project.status !== "funded") {
            project.status = "funded";
            await project.save();
          }

          if (project) {
            await ensureCampaign(
              project.slug,
              project.title,
              project.goal,
              project.milestones.map((m: { id: string; title: string; percent: number }) => ({
                milestoneId: m.id,
                title: m.title,
                targetPercent: m.percent,
              })),
              project.student?.payoutAccount,
            );
          }

          const ledgerResult = await recordContribution(
            donation.projectSlug,
            String(donation._id),
            donation.amount,
            payload.order_id,
            payload.payment_id,
            new Date().toISOString(),
          );
          donation.ledgerTxId = ledgerResult.ledgerTxId;
          donation.ledgerAvailable = ledgerResult.available;
          await donation.save();
        } else if (status === "cancelled" || status === "failed" || status === "chargedback") {
          donation.status = "failed";
          await donation.save();
        }
        // "pending"/"unknown" — leave the donation pending; PayHere will
        // notify again once it reaches a terminal status.

        return new Response("OK", { status: 200 });
      },
    },
  },
});
