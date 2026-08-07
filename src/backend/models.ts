import mongoose, { Schema } from "mongoose";

const MilestoneSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    percent: { type: Number, required: true },
    status: {
      type: String,
      enum: ["locked", "active", "submitted", "verified", "released"],
      default: "locked",
    },
    targetDate: { type: String, required: true },
    evidenceType: { type: String, enum: ["document", "photo", "video", "demo"], required: true },
    txHash: { type: String },
  },
  { _id: false }
);

const UpdateSchema = new Schema(
  {
    date: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    tagline: { type: String, required: true },
    abstract: { type: String, required: true },
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    student: {
      name: { type: String, required: true },
      avatar: { type: String, required: true },
      department: { type: String, required: true },
      // Preprod payout address — required before any milestone can release
      // real escrow-locked funds on-chain (see releaseMilestoneFunds).
      walletAddress: { type: String },
    },
    supervisor: { type: String, required: true },
    university: {
      name: { type: String, required: true },
      short: { type: String, required: true },
      logo: { type: String, required: true },
    },
    cover: { type: String, required: true },
    goal: { type: Number, required: true },
    raised: { type: Number, default: 0 },
    donors: { type: Number, default: 0 },
    daysLeft: { type: Number, default: 30 },
    status: { type: String, enum: ["live", "funded", "review"], default: "live" },
    milestones: { type: [MilestoneSchema], default: [] },
    updates: { type: [UpdateSchema], default: [] },
  },
  { timestamps: true }
);

const DonationSchema = new Schema(
  {
    donor: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    projectTitle: { type: String, required: true },
    projectSlug: { type: String, required: true },
    amount: { type: Number, required: true },
    amountLovelace: { type: Number, required: true },
    message: { type: String, default: "" },
    anonymous: { type: Boolean, default: false },
    txHash: { type: String, required: true, unique: true, sparse: true },
    status: { type: String, enum: ["pending", "confirmed", "failed"], default: "pending" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const UniversitySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    short: { type: String, required: true },
    logo: { type: String, required: true },
  },
  { timestamps: true }
);

const WalletSchema = new Schema(
  {
    ownerKey: { type: String, required: true, unique: true, index: true },
    balanceLovelace: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const WalletTxSchema = new Schema(
  {
    ownerKey: { type: String, required: true, index: true },
    type: { type: String, enum: ["deposit", "withdrawal"], required: true },
    amountLovelace: { type: Number, required: true },
    counterpartyAddress: { type: String, required: true },
    txHash: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ["pending", "submitted", "confirmed", "failed"], default: "pending" },
    memo: { type: String, default: "" },
  },
  { timestamps: true }
);

const TreasuryLockSchema = new Schema(
  {
    _id: { type: String },
    locked: { type: Boolean, default: false },
    lockedAt: { type: Date },
  },
  { _id: false }
);

export const ProjectModel = mongoose.models.Project ?? mongoose.model("Project", ProjectSchema);
export const DonationModel = mongoose.models.Donation ?? mongoose.model("Donation", DonationSchema);
export const UniversityModel = mongoose.models.University ?? mongoose.model("University", UniversitySchema);
export const WalletModel = mongoose.models.Wallet ?? mongoose.model("Wallet", WalletSchema);
export const WalletTxModel = mongoose.models.WalletTx ?? mongoose.model("WalletTx", WalletTxSchema);
export const TreasuryLockModel = mongoose.models.TreasuryLock ?? mongoose.model("TreasuryLock", TreasuryLockSchema);
