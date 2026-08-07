import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "./db";
import { ProjectModel, DonationModel, UniversityModel, WalletModel, WalletTxModel } from "./models";
import type { Project } from "@/lib/mock-data";
import {
  buildUnsignedTreasuryPaymentTx,
  assembleAndSubmitTx,
  buildAndSubmitWithdrawalTx,
  buildUnsignedDonationLockTx,
  buildAndSubmitMilestoneReleaseTx,
  queryTxOnChain,
  queryEscrowLockOnChain,
  acquireTreasuryLock,
  releaseTreasuryLock,
  getTreasuryAddress,
} from "./server/cardano-treasury";
import { getContracts, getContractSummary, type ContractSummary } from "./server/contracts";

export type { ContractSummary };

const MIN_WITHDRAWAL_LOVELACE = 2_000_000;
const ADA_RATE = 172; // 1 ADA ≈ Rs. 172 — mirrors src/lib/mock-data.ts

export type DonationRecord = {
  id: string;
  donor: string;
  projectTitle: string;
  projectSlug: string;
  amount: number;
  message: string;
  anonymous: boolean;
  txHash: string;
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
    (s, p) => s + p.milestones.filter((m: { status: string }) => m.status === "released" || m.status === "verified").length,
    0
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
  const docs = await DonationModel.find({ status: "confirmed" }).sort({ date: -1 }).limit(50).lean();
  return serialize(docs.map(withId)) as unknown as DonationRecord[];
});

// Public identity of the escrow + EDUF contracts, for the "View Smart
// Contract" panel donors see before committing. No auth — everything here is
// already visible on-chain to anyone who looks at a donation transaction.
export const getContractInfo = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return serialize(await getContractSummary());
  } catch (err) {
    console.error("[getContractInfo] TEMP DEBUG — unexpected throw:", err);
    throw err;
  }
});

const buildDonationInput = z.object({
  slug: z.string(),
  changeAddress: z.string().min(1),
  utxosCbor: z.array(z.string()).min(1),
  amount: z.number().int().positive(),
  donor: z.string().default("Anonymous"),
  message: z.string().optional(),
  anonymous: z.boolean().default(false),
});

// Builds an unsigned tx that locks the donation into the escrow contract
// (not a plain wallet) and mints EDUF (10 per Rs) to the donor's own
// wallet, in one atomic transaction — both enforced on-chain by the
// validators in contracts/. The donor signs and submits it themselves;
// confirmDonation() re-derives the real locked amount from chain data
// before crediting anything.
export const buildDonationTx = createServerFn({ method: "POST" })
  .validator(buildDonationInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug }).lean();
    if (!project) throw new Error("Project not found.");
    if (!project.student?.walletAddress) {
      throw new Error("This project's student wallet hasn't been linked yet — donations can't be locked into escrow until it is.");
    }

    const amountLovelace = Math.round((data.amount / ADA_RATE) * 1_000_000);

    const { unsignedTxCbor, edufQty } = await buildUnsignedDonationLockTx({
      changeAddress: data.changeAddress,
      utxosCbor: data.utxosCbor,
      amountLovelace,
      rsAmount: data.amount,
      projectSlug: data.slug,
      studentWalletAddress: project.student.walletAddress,
    });

    return serialize({ unsignedTxCbor, amountLovelace, edufQty });
  });

const submitDonationInput = z.object({
  slug: z.string(),
  unsignedTxCbor: z.string().min(1),
  witnessCbor: z.string().min(1),
  amount: z.number().int().positive(),
  amountLovelace: z.number().int().positive(),
  donor: z.string().default("Anonymous"),
  message: z.string().optional(),
  anonymous: z.boolean().default(false),
});

// Assembles+submits the donor-signed tx, then records a *pending* Donation
// row keyed by the resulting on-chain txHash. Never credits project.raised
// here — confirmDonation() re-derives everything from chain data first.
export const submitDonationTx = createServerFn({ method: "POST" })
  .validator(submitDonationInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug });
    if (!project) throw new Error("Project not found.");

    const txHash = await assembleAndSubmitTx({ unsignedTxCbor: data.unsignedTxCbor, witnessCbor: data.witnessCbor });
    const donor = data.anonymous ? "Anonymous" : data.donor || "Anonymous";

    try {
      await DonationModel.create({
        donor,
        project: project._id,
        projectTitle: project.title,
        projectSlug: project.slug,
        amount: data.amount,
        amountLovelace: data.amountLovelace,
        message: data.message ?? "",
        anonymous: data.anonymous,
        txHash,
        status: "pending",
        date: new Date(),
      });
    } catch (err) {
      // Duplicate txHash (unique index) — already recorded, ignore.
      if (!(err instanceof Error && "code" in err && (err as { code?: number }).code === 11000)) throw err;
    }

    return serialize({ txHash });
  });

export const confirmDonation = createServerFn({ method: "POST" })
  .validator((txHash: string) => txHash)
  .handler(async ({ data: txHash }) => {
    await getDb();
    const donation = await DonationModel.findOne({ txHash });
    if (!donation) throw new Error("No pending donation found for this transaction.");
    if (donation.status === "confirmed") return serialize({ status: "confirmed" as const, raised: undefined, donors: undefined });

    const { escrowAddress } = await getContracts();
    const lock = await queryEscrowLockOnChain(txHash, escrowAddress);
    if (lock === "pending") return serialize({ status: "pending" as const });

    const projectIdHex = Buffer.from(donation.projectSlug, "utf8").toString("hex");
    if (!lock || lock.projectIdHex !== projectIdHex || lock.lovelace <= 0n) {
      donation.status = "failed";
      await donation.save();
      return serialize({ status: "failed" as const, reason: "Transaction did not lock funds into the escrow contract for this project." });
    }

    donation.status = "confirmed";
    await donation.save();

    const project = await ProjectModel.findOneAndUpdate(
      { slug: donation.projectSlug },
      { $inc: { raised: donation.amount, donors: 1 } },
      { new: true }
    );
    if (project && project.raised >= project.goal && project.status !== "funded") {
      project.status = "funded";
      await project.save();
    }

    return serialize({ status: "confirmed" as const, raised: project?.raised, donors: project?.donors });
  });

export type WalletTxRecord = {
  id: string;
  ownerKey: string;
  type: "deposit" | "withdrawal";
  amountLovelace: number;
  counterpartyAddress: string;
  txHash?: string;
  status: "pending" | "submitted" | "confirmed" | "failed";
  memo: string;
  createdAt: string;
};

export const getWallet = createServerFn({ method: "GET" })
  .validator((ownerKey: string) => ownerKey)
  .handler(async ({ data: ownerKey }) => {
    await getDb();
    const [wallet, treasuryAddress] = await Promise.all([
      WalletModel.findOne({ ownerKey }).lean(),
      getTreasuryAddress(),
    ]);
    return serialize({
      ownerKey,
      balanceLovelace: wallet?.balanceLovelace ?? 0,
      treasuryAddress,
    });
  });

export const getWalletTxHistory = createServerFn({ method: "GET" })
  .validator((ownerKey: string) => ownerKey)
  .handler(async ({ data: ownerKey }) => {
    await getDb();
    const docs = await WalletTxModel.find({ ownerKey }).sort({ createdAt: -1 }).limit(100).lean();
    return serialize(docs.map(withId)) as unknown as WalletTxRecord[];
  });

const buildDepositInput = z.object({
  ownerKey: z.string().min(1),
  changeAddress: z.string().min(1),
  utxosCbor: z.array(z.string()).min(1),
  amountLovelace: z.number().int().positive(),
});

export const buildDepositTx = createServerFn({ method: "POST" })
  .validator(buildDepositInput)
  .handler(async ({ data }) => {
    const unsignedTxCbor = await buildUnsignedTreasuryPaymentTx({
      changeAddress: data.changeAddress,
      utxosCbor: data.utxosCbor,
      amountLovelace: data.amountLovelace,
      metadata: { kind: "wallet-deposit", ownerKey: data.ownerKey },
    });
    return serialize({ unsignedTxCbor });
  });

const submitDepositInput = z.object({
  ownerKey: z.string().min(1),
  unsignedTxCbor: z.string().min(1),
  witnessCbor: z.string().min(1),
  amountLovelace: z.number().int().positive(),
});

// Assembles+submits the client-signed deposit tx, then records a *pending*
// row keyed by the resulting on-chain txHash. Never credits balance here —
// confirmDeposit() re-derives everything from chain data before crediting.
export const submitDepositTx = createServerFn({ method: "POST" })
  .validator(submitDepositInput)
  .handler(async ({ data }) => {
    await getDb();
    const txHash = await assembleAndSubmitTx({ unsignedTxCbor: data.unsignedTxCbor, witnessCbor: data.witnessCbor });
    const treasuryAddress = await getTreasuryAddress();
    try {
      await WalletTxModel.create({
        ownerKey: data.ownerKey,
        type: "deposit",
        amountLovelace: data.amountLovelace,
        counterpartyAddress: treasuryAddress,
        txHash,
        status: "pending",
      });
    } catch (err) {
      // Duplicate txHash (unique index) — already recorded, ignore.
      if (!(err instanceof Error && "code" in err && (err as { code?: number }).code === 11000)) throw err;
    }
    return serialize({ txHash });
  });

export const confirmDeposit = createServerFn({ method: "POST" })
  .validator((txHash: string) => txHash)
  .handler(async ({ data: txHash }) => {
    await getDb();
    const walletTx = await WalletTxModel.findOne({ txHash, type: "deposit" });
    if (!walletTx) throw new Error("No pending deposit found for this transaction.");
    if (walletTx.status === "confirmed") return serialize({ status: "confirmed" as const });

    const onChain = await queryTxOnChain(txHash);
    if (!onChain) return serialize({ status: "pending" as const });

    const treasuryAddress = await getTreasuryAddress();
    const paidLovelace = onChain.outputs
      .filter((o) => o.address === treasuryAddress)
      .reduce((sum, o) => sum + o.lovelace, 0n);

    const meta = onChain.metadata as { kind?: string; ownerKey?: unknown } | undefined;
    const ownerKey = meta?.kind === "wallet-deposit" && typeof meta.ownerKey === "string" ? meta.ownerKey : undefined;

    if (!ownerKey || paidLovelace <= 0n) {
      walletTx.status = "failed";
      await walletTx.save();
      return serialize({ status: "failed" as const, reason: "Transaction did not pay the treasury address with a valid owner tag." });
    }

    await WalletModel.findOneAndUpdate(
      { ownerKey },
      { $inc: { balanceLovelace: Number(paidLovelace) } },
      { upsert: true }
    );
    walletTx.ownerKey = ownerKey;
    walletTx.amountLovelace = Number(paidLovelace);
    walletTx.status = "confirmed";
    await walletTx.save();

    return serialize({ status: "confirmed" as const, amountLovelace: Number(paidLovelace) });
  });

const requestWithdrawalInput = z.object({
  ownerKey: z.string().min(1),
  amountLovelace: z.number().int().min(MIN_WITHDRAWAL_LOVELACE),
  toAddress: z.string().min(1),
});

export const requestWithdrawal = createServerFn({ method: "POST" })
  .validator(requestWithdrawalInput)
  .handler(async ({ data }) => {
    await getDb();

    const debited = await WalletModel.findOneAndUpdate(
      { ownerKey: data.ownerKey, balanceLovelace: { $gte: data.amountLovelace } },
      { $inc: { balanceLovelace: -data.amountLovelace } },
      { new: true }
    );
    if (!debited) throw new Error("Insufficient balance.");

    const walletTx = await WalletTxModel.create({
      ownerKey: data.ownerKey,
      type: "withdrawal",
      amountLovelace: data.amountLovelace,
      counterpartyAddress: data.toAddress,
      status: "submitted",
    });

    const gotLock = await acquireTreasuryLock();
    if (!gotLock) {
      await WalletModel.updateOne({ ownerKey: data.ownerKey }, { $inc: { balanceLovelace: data.amountLovelace } });
      walletTx.status = "failed";
      await walletTx.save();
      throw new Error("Treasury is busy processing another withdrawal. Please try again shortly.");
    }

    try {
      const txHash = await buildAndSubmitWithdrawalTx({ toAddress: data.toAddress, amountLovelace: data.amountLovelace });
      walletTx.txHash = txHash;
      walletTx.status = "confirmed";
      await walletTx.save();
      return serialize({ txHash, balanceLovelace: debited.balanceLovelace });
    } catch (err) {
      await WalletModel.updateOne({ ownerKey: data.ownerKey }, { $inc: { balanceLovelace: data.amountLovelace } });
      walletTx.status = "failed";
      await walletTx.save();
      throw new Error(err instanceof Error ? err.message : "Withdrawal failed.");
    } finally {
      await releaseTreasuryLock();
    }
  });

export type PendingRelease = {
  slug: string;
  projectTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  amount: number;
};

// Milestones an admin has already marked "verified" but that haven't had
// their escrow funds released to the student yet.
export const getPendingReleases = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const projects = await ProjectModel.find({ "milestones.status": "verified" }).lean();
  const pending: PendingRelease[] = [];
  for (const project of projects) {
    for (const milestone of project.milestones as { id: string; title: string; status: string; percent: number }[]) {
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

// Spends the project's entire currently-locked escrow balance to the
// student's wallet (see buildAndSubmitMilestoneReleaseTx for why this
// releases the whole balance rather than an exact per-milestone slice),
// signed by the treasury/admin key, then marks the milestone released with
// the real resulting txHash.
export const releaseMilestoneFunds = createServerFn({ method: "POST" })
  .validator(releaseMilestoneInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug });
    if (!project) throw new Error("Project not found.");
    if (!project.student?.walletAddress) {
      throw new Error("This project's student wallet hasn't been linked yet — link it before releasing funds.");
    }

    const milestone = project.milestones.find((m: { id: string }) => m.id === data.milestoneId);
    if (!milestone) throw new Error("Milestone not found.");
    if (milestone.status !== "verified") throw new Error("Only a verified milestone can have its funds released.");

    const { txHash, releasedLovelace } = await buildAndSubmitMilestoneReleaseTx({
      projectSlug: data.slug,
      studentWalletAddress: project.student.walletAddress,
    });

    milestone.status = "released";
    milestone.txHash = txHash;
    await project.save();

    return serialize({ txHash, releasedLovelace });
  });

export type AdminMilestoneRow = {
  slug: string;
  projectTitle: string;
  studentWalletAddress: string;
  milestoneId: string;
  milestoneTitle: string;
  status: "locked" | "active" | "submitted" | "verified" | "released";
};

// Every project's milestones, for the admin milestone-management table —
// lets an admin mark a milestone verified (making it eligible for release)
// and link a student wallet, without needing direct database access.
export const getAllMilestonesForAdmin = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const projects = await ProjectModel.find().lean();
  const rows: AdminMilestoneRow[] = [];
  for (const project of projects) {
    for (const milestone of project.milestones as { id: string; title: string; status: AdminMilestoneRow["status"] }[]) {
      rows.push({
        slug: project.slug,
        projectTitle: project.title,
        studentWalletAddress: project.student?.walletAddress ?? "",
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        status: milestone.status,
      });
    }
  }
  return serialize(rows);
});

const setStudentWalletInput = z.object({
  slug: z.string(),
  walletAddress: z.string().min(1),
});

export const setStudentWallet = createServerFn({ method: "POST" })
  .validator(setStudentWalletInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug });
    if (!project) throw new Error("Project not found.");
    project.student.walletAddress = data.walletAddress;
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
