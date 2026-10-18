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
    // Hyperledger Fabric transaction ID for this milestone's release, once
    // recorded on the ledger (populated by the ledger integration).
    ledgerTxId: { type: String },
  },
  { _id: false },
);

const UpdateSchema = new Schema(
  {
    date: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false },
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
      // Free-text bank payout reference — required before any milestone can
      // be marked for disbursement (see releaseMilestoneFunds).
      payoutAccount: { type: String },
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
  { timestamps: true },
);

const DonationSchema = new Schema(
  {
    donor: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    projectTitle: { type: String, required: true },
    projectSlug: { type: String, required: true },
    amount: { type: Number, required: true },
    message: { type: String, default: "" },
    anonymous: { type: Boolean, default: false },
    // Our own order ID, sent to PayHere and echoed back on the notify_url
    // webhook — doubles as the idempotency key for that webhook.
    payhereOrderId: { type: String, required: true, unique: true, sparse: true },
    payherePaymentId: { type: String },
    status: { type: String, enum: ["pending", "confirmed", "failed"], default: "pending" },
    date: { type: Date, default: Date.now },
    // Hyperledger Fabric transaction ID for this contribution's ledger
    // record, once recordContribution succeeds — null if the ledger wasn't
    // reachable when this donation was confirmed (see server/ledger.ts).
    ledgerTxId: { type: String },
    ledgerAvailable: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const UniversitySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    short: { type: String, required: true },
    logo: { type: String, required: true },
  },
  { timestamps: true },
);

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["donor", "student", "university", "admin"], required: true },
    displayName: { type: String, required: true },
    // Which project this login belongs to (role: "student") — scopes the
    // student dashboard to that project instead of a hardcoded demo one.
    projectSlug: { type: String },
    // Which university this login belongs to, matches University.short
    // (role: "university") — scopes the university dashboard's project list.
    universityShort: { type: String },
    // Required at signup for donor/student accounts — where milestone
    // disbursement / auction reward payout emails send money to. Free-text,
    // fake/placeholder values are fine (see server/mailer.ts).
    bankDetails: {
      accountName: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      branch: { type: String },
    },
  },
  { timestamps: true },
);

const BidSchema = new Schema(
  {
    bidderUsername: { type: String, required: true },
    bidderName: { type: String, required: true },
    amount: { type: Number, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AuctionSchema = new Schema(
  {
    projectSlug: { type: String, required: true, unique: true },
    projectTitle: { type: String, required: true },
    // Snapshot of the project's funding goal at scheduling time — the
    // auction's opening/minimum bid.
    startingPrice: { type: Number, required: true },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "live", "ended", "unsold"],
      default: "scheduled",
    },
    currentBid: { type: Number },
    currentBidderUsername: { type: String },
    currentBidderName: { type: String },
    bids: { type: [BidSchema], default: [] },
    // Set to now+30s on every new bid; the auction closes once this passes
    // with no further bid (checked lazily whenever the auction is read).
    endsAt: { type: Date },
    winnerUsername: { type: String },
    winnerName: { type: String },
    winningAmount: { type: Number },
    wonAt: { type: Date },
    paymentCompleted: { type: Boolean, default: false },
    donationId: { type: Schema.Types.ObjectId, ref: "Donation" },
  },
  { timestamps: true },
);

// Vite's dev-server HMR reloads this module on every edit, but `mongoose`
// itself (a node_modules singleton) survives those reloads — so
// `mongoose.models.X` can go stale and keep serving an old schema shape
// after a field is added here, even though the file on disk is current.
// Recompiling whenever the cached schema doesn't match the current one
// (by object identity) keeps dev mode honest; in production the module
// only ever loads once, so this never fires there.
function model<T>(name: string, schema: mongoose.Schema<T>): mongoose.Model<T> {
  const existing = mongoose.models[name];
  if (existing && existing.schema !== schema) {
    mongoose.deleteModel(name);
    return mongoose.model<T>(name, schema);
  }
  return (existing as mongoose.Model<T>) ?? mongoose.model<T>(name, schema);
}

export const ProjectModel = model("Project", ProjectSchema);
export const AuctionModel = model("Auction", AuctionSchema);
export const DonationModel = model("Donation", DonationSchema);
export const UniversityModel = model("University", UniversitySchema);
export const UserModel = model("User", UserSchema);
