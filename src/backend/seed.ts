import "dotenv/config";
import mongoose from "mongoose";
import { projects, universities, recentDonations } from "../lib/mock-data";
import { ProjectModel, DonationModel, UniversityModel } from "./models";

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set. Add it to .env first.");

  await mongoose.connect(uri, { dbName: "funded" });
  console.log("Connected to MongoDB (db: funded)");

  await UniversityModel.deleteMany({});
  await UniversityModel.insertMany(universities);
  console.log(`Seeded ${universities.length} universities`);

  await ProjectModel.deleteMany({});
  const inserted = await ProjectModel.insertMany(
    projects.map(({ id, ...rest }) => rest)
  );
  console.log(`Seeded ${inserted.length} projects`);

  const slugToId = new Map(inserted.map((p) => [p.slug, p._id]));

  await DonationModel.deleteMany({});
  const donationDocs = recentDonations.map((d) => {
    const project = projects[projects.findIndex((p) => p.title === d.project)] ?? projects[0];
    return {
      donor: d.donor,
      project: slugToId.get(project.slug),
      projectTitle: project.title,
      projectSlug: project.slug,
      amount: d.amount,
      txHash: d.txHash,
      date: new Date(d.date),
    };
  });
  const insertedDonations = await DonationModel.insertMany(donationDocs);
  console.log(`Seeded ${insertedDonations.length} donations`);

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
