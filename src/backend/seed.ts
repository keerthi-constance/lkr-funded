import "dotenv/config";
import mongoose from "mongoose";
import { projects, universities, recentDonations } from "../lib/mock-data";
import { ProjectModel, DonationModel, UniversityModel, UserModel } from "./models";
import { hashPassword } from "./server/auth";

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

  // Demo: link the Solar Desalination project's payout account up front so its
  // verified milestone can be released (and the bank email triggered) from the
  // admin Fund Release Center without a manual "Save Account" step.
  const demoPayoutProject = projects[1];
  if (demoPayoutProject) {
    await ProjectModel.updateOne(
      { slug: demoPayoutProject.slug },
      { $set: { "student.payoutAccount": "Bank of Ceylon - Acct 8007100003, Colombo" } },
    );
    console.log(`Linked demo payout account for ${demoPayoutProject.title}`);
  }

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
      payhereOrderId: d.payhereOrderId,
      status: "confirmed",
      date: new Date(d.date),
    };
  });
  const insertedDonations = await DonationModel.insertMany(donationDocs);
  console.log(`Seeded ${insertedDonations.length} donations`);

  // Demo login accounts — every password is "1234". See README/chat history
  // for the full list; kept here as the single source of truth for it.
  await UserModel.deleteMany({});
  const demoPassword = "1234";
  const passwordHash = hashPassword(demoPassword);

  // Fake but well-formed bank details for demo donor/student accounts —
  // required so milestone disbursement / auction reward emails have
  // something real-looking to show (see server/mailer.ts).
  const fakeBank = (accountName: string, i: number) => ({
    accountName,
    bankName: ["Bank of Ceylon", "Commercial Bank", "Sampath Bank", "HNB"][i % 4],
    accountNumber: `8007${(1000000 + i).toString().slice(-7)}`,
    branch: ["Colombo", "Kandy", "Galle", "Kurunegala"][i % 4],
  });

  const studentSlugs = [projects[0]?.slug, projects[1]?.slug].filter(Boolean) as string[];
  const userDocs = [
    { username: "admin", role: "admin", displayName: "Platform Admin" },
    { username: "donr1", role: "donor", displayName: "Donor One", bankDetails: fakeBank("Donor One", 0) },
    { username: "donr2", role: "donor", displayName: "Donor Two", bankDetails: fakeBank("Donor Two", 1) },
    ...studentSlugs.map((slug, i) => {
      const project = projects.find((p) => p.slug === slug)!;
      return {
        username: `student${i + 1}`,
        role: "student",
        displayName: project.student.name,
        projectSlug: slug,
        bankDetails: fakeBank(project.student.name, i + 2),
      };
    }),
    ...universities.map((u) => ({
      username: u.short.toLowerCase(),
      role: "university",
      displayName: u.name,
      universityShort: u.short,
    })),
  ].map((u) => ({ ...u, passwordHash }));

  const insertedUsers = await UserModel.insertMany(userDocs);
  console.log(`Seeded ${insertedUsers.length} demo login accounts (password "${demoPassword}" for all)`);

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
