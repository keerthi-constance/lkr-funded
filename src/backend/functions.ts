import { createServerFn } from "@tanstack/react-start";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { ProjectModel, DonationModel, UniversityModel, UserModel } from "./models";
import type { Project } from "@/lib/mock-data";
import { getSessionUser, patchSessionUser } from "./server/auth";
import { sendDisbursementInstructionEmail } from "./server/mailer";
import { buildCheckoutFields, PAYHERE_CHECKOUT_URL, type CheckoutCustomer } from "./server/payhere";
import {
  ensureCampaign,
  recordContribution,
  submitMilestoneEvidence,
  approveMilestone,
  authoriseDisbursement,
  queryCampaign,
  queryContributions,
  getTransactionDetails,
  type LedgerTransactionDetails,
} from "./server/ledger";

export type DonationRecord = {
  id: string;
  donor: string;
  projectTitle: string;
  projectSlug: string;
  amount: number;
  message: string;
  anonymous: boolean;
  payhereOrderId: string;
  status: "pending" | "confirmed" | "failed";
  date: string;
};

function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}

function withId(doc: Record<string, unknown>) {
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
}

export const getProjects = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const docs = await ProjectModel.find().sort({ createdAt: 1 }).lean();
  return serialize(docs.map(withId)) as unknown as Project[];
});

export const getProjectBySlug = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    await getDb();
    const doc = await ProjectModel.findOne({ slug }).lean();
    return doc ? (serialize(withId(doc)) as unknown as Project) : null;
  });

// The signed-in student's own project — null if they haven't submitted one
// yet. Every student.* dashboard page scopes to this instead of a hardcoded
// demo project, so a freshly registered student starts with nothing until
// they go through /dashboard/student/submit.
export const getMyProject = createServerFn({ method: "GET" }).handler(
  async (): Promise<Project | null> => {
    const user = await getSessionUser();
    if (!user || user.role !== "student" || !user.projectSlug) return null;
    await getDb();
    const doc = await ProjectModel.findOne({ slug: user.projectSlug }).lean();
    return doc ? (serialize(withId(doc)) as unknown as Project) : null;
  },
);

const submitProjectInput = z.object({
  title: z.string().min(3),
  tagline: z.string().min(3),
  abstract: z.string().min(10),
  category: z.string().min(1),
  department: z.string().min(1),
  supervisor: z.string().min(1),
  universityShort: z.string().min(1),
  goal: z.number().positive(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1),
        percent: z.number().positive(),
        description: z.string().optional(),
      }),
    )
    .length(3),
});

// Creates the student's project (status "review", pending university/admin
// approval — see dashboard.university.projects.tsx / dashboard.admin.approvals.tsx)
// and links it to their account, so their dashboard shows it from then on.
export const submitProject = createServerFn({ method: "POST" })
  .validator(submitProjectInput)
  .handler(async ({ data }): Promise<{ slug: string }> => {
    const user = await getSessionUser();
    if (!user || user.role !== "student") {
      throw new Error("You must be signed in as a student to submit a project.");
    }
    if (user.projectSlug) {
      throw new Error("You've already submitted a project.");
    }
    const totalPercent = data.milestones.reduce((s, m) => s + m.percent, 0);
    if (Math.round(totalPercent) !== 100) {
      throw new Error("Milestone percentages must add up to 100.");
    }

    await getDb();
    const university = await UniversityModel.findOne({ short: data.universityShort }).lean();
    if (!university) throw new Error("Unknown university.");

    const base =
      data.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50) || "project";
    const slug = `${base}-${randomUUID().slice(0, 6)}`;

    const milestoneDocs = data.milestones.map((m, i) => ({
      id: `m${i + 1}`,
      title: m.title,
      description: m.description || "To be detailed once work begins.",
      percent: m.percent,
      status: i === 0 ? "active" : "locked",
      targetDate: new Date(Date.now() + (i + 1) * 45 * 86400000).toISOString(),
      evidenceType: "document",
    }));

    await ProjectModel.create({
      slug,
      title: data.title,
      tagline: data.tagline,
      abstract: data.abstract,
      category: data.category,
      tags: [],
      student: {
        name: user.displayName,
        avatar: user.displayName.slice(0, 2).toUpperCase(),
        department: data.department,
      },
      supervisor: data.supervisor,
      university: { name: university.name, short: university.short, logo: university.logo },
      cover: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80",
      goal: data.goal,
      raised: 0,
      donors: 0,
      daysLeft: 90,
      status: "review",
      milestones: milestoneDocs,
      updates: [],
    });

    await UserModel.updateOne({ username: user.username }, { $set: { projectSlug: slug } });
    await patchSessionUser({ projectSlug: slug });

    return { slug };
  });

export const getPlatformStats = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const [projects, universities, donationAgg] = await Promise.all([
    ProjectModel.find().lean(),
    UniversityModel.countDocuments(),
    DonationModel.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: "$donor", total: { $sum: "$amount" } } },
    ]),
  ]);

  const totalRaised = projects.reduce((s, p) => s + p.raised, 0);
  const milestonesCompleted = projects.reduce(
    (s, p) =>
      s +
      p.milestones.filter(
        (m: { status: string }) => m.status === "released" || m.status === "verified",
      ).length,
    0,
  );
  const commission = Math.round(totalRaised * 0.02);

  return {
    totalRaised,
    activeProjects: projects.filter((p) => p.status === "live").length,
    universities,
    milestonesCompleted,
    donors: donationAgg.length,
    commission,
  };
});

export const getUniversities = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const docs = await UniversityModel.find().lean();
  return serialize(docs);
});

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const cats = await ProjectModel.distinct("category");
  return cats as string[];
});

export const getRecentDonations = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const docs = await DonationModel.find({ status: "confirmed" })
    .sort({ date: -1 })
    .limit(50)
    .lean();
  return serialize(docs.map(withId)) as unknown as DonationRecord[];
});

const createPayhereCheckoutInput = z.object({
  slug: z.string(),
  amount: z.number().positive(),
  donor: z.string().default("Anonymous"),
  message: z.string().optional(),
  anonymous: z.boolean().default(false),
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
  }),
});

// Creates a *pending* Donation row keyed by a fresh order ID, then returns
// the PayHere Checkout form fields (incl. request hash) the client
// auto-submits to PAYHERE_CHECKOUT_URL. Never credits project.raised here —
// the notify_url webhook (api.payhere.notify.ts) is the only thing that
// confirms a payment actually happened.
export const createPayhereCheckout = createServerFn({ method: "POST" })
  .validator(createPayhereCheckoutInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug });
    if (!project) throw new Error("Project not found.");

    const orderId = `fundEd_${randomUUID()}`;
    const donor = data.anonymous ? "Anonymous" : data.donor || "Anonymous";

    // Build the checkout fields (throws on missing/invalid PayHere config)
    // before writing anything — otherwise a config error would leave behind
    // an orphaned "pending" Donation with no real checkout ever created for it.
    const fields = buildCheckoutFields({
      orderId,
      amountLKR: data.amount,
      itemDescription: `Donation to ${project.title}`,
      customer: data.customer satisfies CheckoutCustomer,
    });

    await DonationModel.create({
      donor,
      project: project._id,
      projectTitle: project.title,
      projectSlug: project.slug,
      amount: data.amount,
      message: data.message ?? "",
      anonymous: data.anonymous,
      payhereOrderId: orderId,
      status: "pending",
      date: new Date(),
    });

    return serialize({ checkoutUrl: PAYHERE_CHECKOUT_URL, fields });
  });

const submitMockPaymentInput = z.object({
  slug: z.string(),
  amount: z.number().positive(),
  donor: z.string().default("Anonymous"),
  message: z.string().optional(),
  anonymous: z.boolean().default(false),
});

// Stand-in for the real PayHere flow above while PAYHERE_NOTIFY_URL isn't
// reachable yet (needs a real domain registered with PayHere — see
// fabric/network notwithstanding, this is unrelated to Fabric). No card
// gateway is called and no card details ever reach the server — the
// "card form" in DonateDialog is decorative UI only, never submitted.
// Confirms the donation immediately, doing exactly what the real
// notify_url webhook (api.payhere.notify.ts) does on a genuine payment:
// credits project.raised/donors and records the contribution on the
// ledger. Swap the DonateDialog flow back to createPayhereCheckout once a
// real domain is registered — nothing else needs to change.
export const submitMockPayment = createServerFn({ method: "POST" })
  .validator(submitMockPaymentInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug });
    if (!project) throw new Error("Project not found.");

    const orderId = `mock_${randomUUID()}`;
    const donor = data.anonymous ? "Anonymous" : data.donor || "Anonymous";

    const donation = await DonationModel.create({
      donor,
      project: project._id,
      projectTitle: project.title,
      projectSlug: project.slug,
      amount: data.amount,
      message: data.message ?? "",
      anonymous: data.anonymous,
      payhereOrderId: orderId,
      status: "confirmed",
      date: new Date(),
    });

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { slug: data.slug },
      { $inc: { raised: data.amount, donors: 1 } },
      { new: true },
    );
    if (
      updatedProject &&
      updatedProject.raised >= updatedProject.goal &&
      updatedProject.status !== "funded"
    ) {
      updatedProject.status = "funded";
      await updatedProject.save();
    }

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
    const ledgerResult = await recordContribution(
      project.slug,
      String(donation._id),
      data.amount,
      orderId,
      undefined,
      new Date().toISOString(),
    );
    donation.ledgerTxId = ledgerResult.ledgerTxId;
    donation.ledgerAvailable = ledgerResult.available;
    await donation.save();

    return serialize({ orderId });
  });

// Pure read — the notify_url webhook is what actually confirms payment and
// updates this row. Polled by /donate/return while PayHere's notification
// hasn't landed yet.
export const getDonationStatus = createServerFn({ method: "GET" })
  .validator((orderId: string) => orderId)
  .handler(async ({ data: orderId }) => {
    await getDb();
    const donation = await DonationModel.findOne({ payhereOrderId: orderId }).lean();
    if (!donation) throw new Error("No donation found for this order.");

    const project = await ProjectModel.findOne({ slug: donation.projectSlug }).lean();
    return serialize({
      contributionId: String(donation._id),
      status: donation.status as "pending" | "confirmed" | "failed",
      amount: donation.amount,
      projectTitle: donation.projectTitle,
      projectSlug: donation.projectSlug,
      raised: project?.raised,
      donors: project?.donors,
      ledgerTxId: donation.ledgerTxId as string | undefined,
      ledgerAvailable: Boolean(donation.ledgerAvailable),
    });
  });

export type LedgerMilestone = {
  milestoneId: string;
  title: string;
  targetPercent: number;
  status: "PENDING" | "EVIDENCE_SUBMITTED" | "APPROVED" | "REJECTED" | "DISBURSED";
  evidenceHash: string | null;
  approvals: Partial<Record<"Org1" | "Org2", "approve" | "reject">>;
};

export type LedgerCampaign = {
  campaignId: string;
  title: string;
  targetAmountLKR: number;
  beneficiaryReference: string | null;
  milestones: LedgerMilestone[];
};

export type LedgerContribution = {
  campaignId: string;
  contributionId: string;
  amountLKR: number;
  payhereOrderId: string;
  payherePaymentId: string | null;
  timestamp: string;
  ledgerTxId: string;
};

// Donor-facing "View on Ledger" data — everything FundEd's chaincode has
// recorded for this project, straight from the Fabric network (not Mongo).
// `available: false` means the network wasn't reachable (e.g. it isn't
// running, or this is the deployed build which can't reach a network on
// your machine) — see server/ledger.ts.
export const getLedgerExplorer = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const [campaign, contributions] = await Promise.all([
      queryCampaign(slug),
      queryContributions(slug),
    ]);
    if (!campaign) return serialize({ available: false as const });
    return serialize({
      available: true as const,
      campaign: campaign as LedgerCampaign,
      contributions: contributions as LedgerContribution[],
    });
  });

// Raw on-chain proof for one transaction — the actual block number, block
// hash, and validation status from Fabric's own qscc, not FundEd's app
// formatting. `available: false` means the network wasn't reachable, same
// as getLedgerExplorer.
export const getLedgerTransactionDetails = createServerFn({ method: "GET" })
  .validator((txId: string) => txId)
  .handler(async ({ data: txId }) => {
    const result = await getTransactionDetails(txId);
    if (!result.available) return serialize({ available: false as const });
    return serialize({ available: true as const, ...(result.data as LedgerTransactionDetails) });
  });

export type PendingRelease = {
  slug: string;
  projectTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  amount: number;
};

// Milestones an admin has already marked "verified" but that haven't had
// their funds disbursed to the student yet.
export const getPendingReleases = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const projects = await ProjectModel.find({ "milestones.status": "verified" }).lean();
  const pending: PendingRelease[] = [];
  for (const project of projects) {
    for (const milestone of project.milestones as {
      id: string;
      title: string;
      status: string;
      percent: number;
    }[]) {
      if (milestone.status !== "verified") continue;
      pending.push({
        slug: project.slug,
        projectTitle: project.title,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amount: Math.round((project.raised * milestone.percent) / 100),
      });
    }
  }
  return serialize(pending);
});

const releaseMilestoneInput = z.object({
  slug: z.string(),
  milestoneId: z.string(),
});

// Marks a verified milestone released. Drives the ledger's real dual-org
// approval flow first (submitMilestoneEvidence, then approveMilestone as
// BOTH Org1 and Org2) before authoriseDisbursement — this backend holds
// both orgs' identities in this prototype (see fabric/network/README.md),
// so a single admin click here exercises the chaincode's genuine
// AND(Org1,Org2) endorsement policy rather than skipping it. A production
// deployment would instead have the university's own separate action call
// approveMilestone as Org2 (see dashboard.university.milestones.tsx),
// independently of the admin's click. Never throws on a ledger hiccup — see
// server/ledger.ts's graceful-degradation notes — so a milestone can still
// be marked released in Mongo even if the network isn't reachable.
export const releaseMilestoneFunds = createServerFn({ method: "POST" })
  .validator(releaseMilestoneInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug });
    if (!project) throw new Error("Project not found.");
    if (!project.student?.payoutAccount) {
      throw new Error(
        "This project's payout account hasn't been linked yet — link it before releasing funds.",
      );
    }

    const milestone = project.milestones.find((m: { id: string }) => m.id === data.milestoneId);
    if (!milestone) throw new Error("Milestone not found.");
    if (milestone.status !== "verified")
      throw new Error("Only a verified milestone can have its funds released.");

    await ensureCampaign(
      data.slug,
      project.title,
      project.goal,
      project.milestones.map((m: { id: string; title: string; percent: number }) => ({
        milestoneId: m.id,
        title: m.title,
        targetPercent: m.percent,
      })),
      project.student.payoutAccount,
    );
    // A hash of the identifying fields stands in for real uploaded evidence
    // (this app doesn't have a file-upload evidence flow yet) — enough to
    // exercise the chaincode's evidence-then-approve sequencing honestly.
    const evidenceHash = createHash("sha256")
      .update(`${data.slug}:${data.milestoneId}:${Date.now()}`)
      .digest("hex");
    await submitMilestoneEvidence(data.slug, data.milestoneId, evidenceHash);
    await approveMilestone(data.slug, data.milestoneId, "Org1", "approve");
    await approveMilestone(data.slug, data.milestoneId, "Org2", "approve");

    const { ledgerTxId, amountLKR } = await authoriseDisbursement(data.slug, data.milestoneId);

    milestone.status = "released";
    milestone.ledgerTxId = ledgerTxId;
    await project.save();

    const studentUser = await UserModel.findOne({ projectSlug: data.slug, role: "student" }).lean();
    const emailResult = await sendDisbursementInstructionEmail({
      projectTitle: project.title,
      projectSlug: project.slug,
      milestoneTitle: milestone.title,
      // Falls back to the milestone's share of what was actually raised (not
      // the goal) when the ledger has no on-chain contributions for this
      // campaign yet, so the disbursement email never shows Rs. 0.
      amountLKR: amountLKR || Math.round((project.raised * milestone.percent) / 100),
      studentName: project.student.name,
      studentBank: studentUser?.bankDetails ?? null,
      ledgerTxId,
    });

    return serialize({ ledgerTxId, emailSent: emailResult.sent });
  });

export type AdminMilestoneRow = {
  slug: string;
  projectTitle: string;
  payoutAccount: string;
  milestoneId: string;
  milestoneTitle: string;
  status: "locked" | "active" | "submitted" | "verified" | "released";
};

// Every project's milestones, for the admin milestone-management table —
// lets an admin mark a milestone verified (making it eligible for release)
// and link a payout account, without needing direct database access.
export const getAllMilestonesForAdmin = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const projects = await ProjectModel.find().lean();
  const rows: AdminMilestoneRow[] = [];
  for (const project of projects) {
    for (const milestone of project.milestones as {
      id: string;
      title: string;
      status: AdminMilestoneRow["status"];
    }[]) {
      rows.push({
        slug: project.slug,
        projectTitle: project.title,
        payoutAccount: project.student?.payoutAccount ?? "",
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        status: milestone.status,
      });
    }
  }
  return serialize(rows);
});

const setBeneficiaryAccountInput = z.object({
  slug: z.string(),
  payoutAccount: z.string().min(1),
});

export const setBeneficiaryAccount = createServerFn({ method: "POST" })
  .validator(setBeneficiaryAccountInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug });
    if (!project) throw new Error("Project not found.");
    project.student.payoutAccount = data.payoutAccount;
    await project.save();
    return serialize({ ok: true });
  });

const markMilestoneVerifiedInput = z.object({
  slug: z.string(),
  milestoneId: z.string(),
});

// Manual override for testing/admin use — normally a milestone would reach
// "verified" through a real review flow. Only allowed from "active" or
// "submitted" so an already-released milestone can't be reopened by mistake.
export const markMilestoneVerified = createServerFn({ method: "POST" })
  .validator(markMilestoneVerifiedInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug });
    if (!project) throw new Error("Project not found.");
    const milestone = project.milestones.find((m: { id: string }) => m.id === data.milestoneId);
    if (!milestone) throw new Error("Milestone not found.");
    if (milestone.status !== "active" && milestone.status !== "submitted") {
      throw new Error(`Cannot verify a milestone with status "${milestone.status}".`);
    }
    milestone.status = "verified";
    await project.save();
    return serialize({ ok: true });
  });
