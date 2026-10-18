import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { AuctionModel, ProjectModel, DonationModel, UserModel } from "./models";
import { getSessionUser } from "./server/auth";
import { ensureCampaign, recordContribution } from "./server/ledger";
import { sendAuctionRewardEmail } from "./server/mailer";

const STUDENT_REWARD_SHARE = 0.2;
const DONOR_REWARD_SHARE = 0.8;

const BID_WINDOW_MS = 30_000;

function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}

type AuctionDoc = Awaited<ReturnType<typeof AuctionModel.findOne>>;

// Auctions have no background worker — instead every read/write "ticks" the
// auction against the current time first: scheduled -> live once
// scheduledAt passes, live -> ended once endsAt passes with no further bid.
// Lazy but sufficient for a prototype (the tool description already flags
// this environment's Docker/background-process instability, so a
// long-running scheduler would be one more thing to keep alive).
async function tickAuction(auction: NonNullable<AuctionDoc>) {
  const now = Date.now();
  if (auction.status === "scheduled" && now >= new Date(auction.scheduledAt).getTime()) {
    auction.status = "live";
  }
  if (auction.status === "live" && auction.endsAt && now > new Date(auction.endsAt).getTime()) {
    if (auction.currentBidderUsername) {
      auction.status = "ended";
      auction.winnerUsername = auction.currentBidderUsername;
      auction.winnerName = auction.currentBidderName;
      auction.winningAmount = auction.currentBid;
      auction.wonAt = new Date();
    } else {
      auction.status = "unsold";
    }
  }
  if (auction.isModified()) await auction.save();
  return auction;
}

// Projects whose 3 milestones are all "released" (fully funded and
// disbursed) and that don't already have an auction — what the admin
// scheduling screen offers to pick from.
export const getEligibleProjectsForAuction = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") throw new Error("Admin access required.");
    await getDb();

    const completed = await ProjectModel.find({
      milestones: { $not: { $elemMatch: { status: { $ne: "released" } } } },
      "milestones.0": { $exists: true },
    }).lean();

    const existingAuctionSlugs = new Set(
      (await AuctionModel.find().distinct("projectSlug")) as string[],
    );

    return serialize(
      completed
        .filter((p) => !existingAuctionSlugs.has(p.slug))
        .map((p) => ({ slug: p.slug, title: p.title, goal: p.goal })),
    );
  },
);

const scheduleAuctionInput = z.object({
  projectSlug: z.string().min(1),
  scheduledAt: z.string().min(1), // ISO datetime
});

export const scheduleAuction = createServerFn({ method: "POST" })
  .validator(scheduleAuctionInput)
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") throw new Error("Admin access required.");
    await getDb();

    const project = await ProjectModel.findOne({ slug: data.projectSlug }).lean();
    if (!project) throw new Error("Project not found.");
    const allReleased =
      project.milestones.length > 0 &&
      project.milestones.every((m: { status: string }) => m.status === "released");
    if (!allReleased) throw new Error("All milestones must be released before auctioning this project.");

    const existing = await AuctionModel.findOne({ projectSlug: data.projectSlug });
    if (existing) throw new Error("This project already has an auction.");

    const scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now()) {
      throw new Error("Pick a valid future date and time.");
    }

    await AuctionModel.create({
      projectSlug: project.slug,
      projectTitle: project.title,
      startingPrice: project.goal,
      scheduledAt,
      status: "scheduled",
    });
  });

export type UpcomingAuction = {
  projectSlug: string;
  projectTitle: string;
  startingPrice: number;
  scheduledAt: string;
  status: "scheduled" | "live" | "ended" | "unsold";
  currentBid: number | null;
  cover?: string;
};

// Landing-page section: every auction that hasn't ended yet, soonest first.
export const getUpcomingAuctions = createServerFn({ method: "GET" }).handler(async () => {
  await getDb();
  const auctions = await AuctionModel.find({ status: { $in: ["scheduled", "live"] } }).sort({
    scheduledAt: 1,
  });
  const ticked = await Promise.all(auctions.map((a) => tickAuction(a)));
  const stillOpen = ticked.filter((a) => a.status === "scheduled" || a.status === "live");

  const covers = new Map(
    (
      await ProjectModel.find({ slug: { $in: stillOpen.map((a) => a.projectSlug) } })
        .select("slug cover")
        .lean()
    ).map((p) => [p.slug, p.cover]),
  );

  return serialize(
    stillOpen.map((a) => ({
      projectSlug: a.projectSlug,
      projectTitle: a.projectTitle,
      startingPrice: a.startingPrice,
      scheduledAt: a.scheduledAt,
      status: a.status,
      currentBid: a.currentBid ?? null,
      cover: covers.get(a.projectSlug),
    })) satisfies UpcomingAuction[],
  );
});

export type AuctionDetail = {
  projectSlug: string;
  projectTitle: string;
  startingPrice: number;
  scheduledAt: string;
  status: "scheduled" | "live" | "ended" | "unsold";
  currentBid: number | null;
  currentBidderName: string | null;
  endsAt: string | null;
  bids: { bidderName: string; amount: number; at: string }[];
  winnerUsername: string | null;
  winnerName: string | null;
  winningAmount: number | null;
  paymentCompleted: boolean;
};

export const getAuction = createServerFn({ method: "GET" })
  .validator((projectSlug: string) => projectSlug)
  .handler(async ({ data: projectSlug }): Promise<AuctionDetail | null> => {
    await getDb();
    const auction = await AuctionModel.findOne({ projectSlug });
    if (!auction) return null;
    await tickAuction(auction);

    return serialize({
      projectSlug: auction.projectSlug,
      projectTitle: auction.projectTitle,
      startingPrice: auction.startingPrice,
      scheduledAt: auction.scheduledAt,
      status: auction.status,
      currentBid: auction.currentBid ?? null,
      currentBidderName: auction.currentBidderName ?? null,
      endsAt: auction.endsAt ?? null,
      bids: auction.bids
        .slice()
        .reverse()
        .map((b: { bidderName: string; amount: number; at: Date }) => ({
          bidderName: b.bidderName,
          amount: b.amount,
          at: b.at,
        })),
      winnerUsername: auction.winnerUsername ?? null,
      winnerName: auction.winnerName ?? null,
      winningAmount: auction.winningAmount ?? null,
      paymentCompleted: auction.paymentCompleted,
    });
  });

const placeBidInput = z.object({
  projectSlug: z.string().min(1),
  amount: z.number().positive(),
});

export const placeBid = createServerFn({ method: "POST" })
  .validator(placeBidInput)
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in to place a bid.");
    await getDb();

    const auction = await AuctionModel.findOne({ projectSlug: data.projectSlug });
    if (!auction) throw new Error("Auction not found.");
    await tickAuction(auction);

    if (auction.status !== "live") throw new Error("This auction isn't open for bidding right now.");

    const minNext = auction.currentBid ?? auction.startingPrice;
    if (data.amount <= minNext) {
      throw new Error(`Your bid must be higher than Rs. ${minNext.toLocaleString()}.`);
    }
    if (auction.currentBidderUsername === user.username) {
      throw new Error("You already have the highest bid.");
    }

    auction.currentBid = data.amount;
    auction.currentBidderUsername = user.username;
    auction.currentBidderName = user.displayName;
    auction.bids.push({
      bidderUsername: user.username,
      bidderName: user.displayName,
      amount: data.amount,
      at: new Date(),
    });
    auction.endsAt = new Date(Date.now() + BID_WINDOW_MS);
    await auction.save();

    return serialize({ ok: true, endsAt: auction.endsAt });
  });

// Mirrors submitMockPayment in functions.ts exactly (same "test mode, no
// real card gateway" contract) — the winner's payment is recorded as a
// normal donation to the auctioned project, going through the same real
// Fabric ledger write as every other payment in this app.
export const payForWonAuction = createServerFn({ method: "POST" })
  .validator((projectSlug: string) => projectSlug)
  .handler(async ({ data: projectSlug }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in first.");
    await getDb();

    const auction = await AuctionModel.findOne({ projectSlug });
    if (!auction) throw new Error("Auction not found.");
    await tickAuction(auction);

    if (auction.status !== "ended") throw new Error("This auction hasn't ended yet.");
    if (auction.winnerUsername !== user.username) throw new Error("You didn't win this auction.");
    if (auction.paymentCompleted) throw new Error("This auction has already been paid for.");

    const project = await ProjectModel.findOne({ slug: projectSlug });
    if (!project) throw new Error("Project not found.");

    const orderId = `auction_${randomUUID()}`;
    const amount = auction.winningAmount!;

    // The original donors, before this auction-sale "donation" is recorded
    // — what the 80% donor reward pool is split across, proportional to
    // each donor's share of everything raised for this project so far.
    const priorDonations = await DonationModel.find({
      projectSlug,
      status: "confirmed",
      anonymous: false,
    }).lean();
    const contributionByDonor = new Map<string, number>();
    for (const d of priorDonations) {
      contributionByDonor.set(d.donor, (contributionByDonor.get(d.donor) ?? 0) + d.amount);
    }
    const totalPriorContributed = [...contributionByDonor.values()].reduce((s, v) => s + v, 0);

    const donation = await DonationModel.create({
      donor: user.displayName,
      project: project._id,
      projectTitle: project.title,
      projectSlug: project.slug,
      amount,
      message: "Winning auction bid",
      anonymous: false,
      payhereOrderId: orderId,
      status: "confirmed",
      date: new Date(),
    });

    await ProjectModel.updateOne(
      { slug: projectSlug },
      { $inc: { raised: amount, donors: 1 } },
    );

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
      amount,
      orderId,
      undefined,
      new Date().toISOString(),
    );
    donation.ledgerTxId = ledgerResult.ledgerTxId;
    donation.ledgerAvailable = ledgerResult.available;
    await donation.save();

    auction.paymentCompleted = true;
    auction.donationId = donation._id;
    await auction.save();

    // 20% of the sale goes to the student, 80% is shared among the
    // project's original donors proportional to their contribution share.
    const studentUser = await UserModel.findOne({ projectSlug, role: "student" }).lean();
    const studentAmount = Math.round(amount * STUDENT_REWARD_SHARE);
    const donorPool = amount * DONOR_REWARD_SHARE;

    const donorNames = [...contributionByDonor.keys()];
    const donorUsers = await UserModel.find({
      displayName: { $in: donorNames },
      role: "donor",
    }).lean();
    const bankByDonorName = new Map(donorUsers.map((u) => [u.displayName, u.bankDetails ?? null]));

    const donorRewards = donorNames.map((name) => {
      const contributed = contributionByDonor.get(name)!;
      const rewardLKR =
        totalPriorContributed > 0 ? Math.round((contributed / totalPriorContributed) * donorPool) : 0;
      return {
        name,
        contributedLKR: contributed,
        rewardLKR,
        bank: bankByDonorName.get(name) ?? null,
      };
    });

    await sendAuctionRewardEmail({
      projectTitle: project.title,
      projectSlug: project.slug,
      totalAmountLKR: amount,
      student: {
        name: project.student.name,
        amountLKR: studentAmount,
        bank: studentUser?.bankDetails ?? null,
      },
      donors: donorRewards,
    });

    return serialize({ orderId, amount });
  });
