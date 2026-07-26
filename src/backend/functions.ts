import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "./db";
import { ProjectModel, DonationModel, UniversityModel } from "./models";
import type { Project } from "@/lib/mock-data";

export type DonationRecord = {
  id: string;
  donor: string;
  projectTitle: string;
  projectSlug: string;
  amount: number;
  message: string;
  anonymous: boolean;
  txHash: string;
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
  const docs = await DonationModel.find().sort({ date: -1 }).limit(50).lean();
  return serialize(docs.map(withId)) as unknown as DonationRecord[];
});

const donateInput = z.object({
  slug: z.string(),
  amount: z.number().positive(),
  donor: z.string().default("Anonymous"),
  message: z.string().optional(),
  anonymous: z.boolean().default(false),
});

export const createDonation = createServerFn({ method: "POST" })
  .validator(donateInput)
  .handler(async ({ data }) => {
    await getDb();
    const project = await ProjectModel.findOne({ slug: data.slug });
    if (!project) throw new Error("Project not found");

    const txHash =
      "tx_" +
      Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

    const donor = data.anonymous ? "Anonymous" : data.donor || "Anonymous";

    const donation = await DonationModel.create({
      donor,
      project: project._id,
      projectTitle: project.title,
      projectSlug: project.slug,
      amount: data.amount,
      message: data.message ?? "",
      anonymous: data.anonymous,
      txHash,
      date: new Date(),
    });

    project.raised += data.amount;
    project.donors += 1;
    if (project.raised >= project.goal) project.status = "funded";
    await project.save();

    return serialize({
      txHash,
      donationId: String(donation._id),
      raised: project.raised,
      donors: project.donors,
      status: project.status,
    });
  });
