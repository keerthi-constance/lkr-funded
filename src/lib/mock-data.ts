export const formatRs = (n: number) =>
  "Rs. " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const shortHash = (h: string) => h.slice(0, 10) + "..." + h.slice(-6);

export type MilestoneStatus = "locked" | "active" | "submitted" | "verified" | "released";

export type Milestone = {
  id: string;
  title: string;
  description: string;
  percent: number;
  status: MilestoneStatus;
  targetDate: string;
  evidenceType: "document" | "photo" | "video" | "demo";
  ledgerTxId?: string;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  abstract: string;
  category: string;
  tags: string[];
  student: { name: string; avatar: string; department: string };
  supervisor: string;
  university: { name: string; short: string; logo: string };
  cover: string;
  goal: number;
  raised: number;
  donors: number;
  daysLeft: number;
  status: "live" | "funded" | "review";
  milestones: Milestone[];
  updates: { date: string; title: string; body: string }[];
};

export const categories = [
  "Biotechnology",
  "Renewable Energy",
  "AI & Machine Learning",
  "Agriculture",
  "Medical Research",
  "Climate Science",
  "Robotics",
  "Social Impact",
];

export const universities = [
  { name: "University of Colombo", short: "UOC", logo: "UOC" },
  { name: "University of Moratuwa", short: "UOM", logo: "UOM" },
  { name: "University of Peradeniya", short: "UOP", logo: "UOP" },
  { name: "University of Kelaniya", short: "UOK", logo: "UOK" },
  { name: "Sri Jayewardenepura", short: "USJ", logo: "USJ" },
  { name: "Ruhuna University", short: "RUH", logo: "RUH" },
];

const covers = [
  "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
  "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=80",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80",
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80",
  "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=1200&q=80",
  "https://images.unsplash.com/photo-1560785496-3c9d27877182?w=1200&q=80",
  "https://images.unsplash.com/photo-1581093458791-9d15482442f6?w=1200&q=80",
];

const avatars = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Kavindu",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Dilan",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Nimali",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ravi",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sanduni",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Chamara",
];

export const studentNames = [
  "Aisha Fernando",
  "Kavindu Perera",
  "Priya Ratnayake",
  "Dilan Silva",
  "Nimali Wickramasinghe",
  "Ravi Jayawardena",
  "Sanduni Bandara",
  "Chamara Gunasekera",
];

const titles = [
  "Low-Cost Biosensor for Early Dengue Detection",
  "Solar Desalination for Coastal Villages",
  "AI-Driven Crop Disease Detection for Sri Lankan Paddy Farms",
  "Autonomous Underwater Robot for Coral Reef Mapping",
  "Biodegradable Packaging from Coconut Husk Fiber",
  "Smart Prosthetic Hand with EMG Control",
  "Climate-Resilient Rice Varieties via CRISPR",
  "Community Mesh Network for Rural Connectivity",
];

const taglines = [
  "A portable, sub-$20 biosensor that detects dengue antibodies in under 10 minutes.",
  "Off-grid solar-powered desalination units for fishing communities.",
  "Real-time smartphone diagnosis of paddy leaf diseases using deep learning.",
  "An autonomous AUV that maps and monitors coral bleaching at scale.",
  "Fully compostable food packaging from local agricultural waste.",
  "An affordable myoelectric prosthetic hand under Rs. 100,000.",
  "Drought-tolerant rice cultivars for a changing monsoon.",
  "LoRa-based mesh network bringing internet to underserved villages.",
];

function makeMilestones(goal: number, seed: number): Milestone[] {
  const specs = [
    { pct: 30, status: "released", title: "Research Setup & Materials", ev: "document" as const },
    { pct: 40, status: "active", title: "Prototype Development", ev: "video" as const },
    { pct: 30, status: "locked", title: "Field Testing & Publication", ev: "demo" as const },
  ];
  const statuses: MilestoneStatus[][] = [
    ["released", "active", "locked"],
    ["released", "released", "active"],
    ["active", "locked", "locked"],
    ["released", "submitted", "locked"],
  ];
  const chosen = statuses[seed % statuses.length];
  return specs.map((s, i) => ({
    id: `m${i}`,
    title: s.title,
    description: `Deliverables and evidence required to complete this ${s.pct}% funding milestone.`,
    percent: s.pct,
    status: chosen[i],
    targetDate: new Date(Date.now() + (i + 1) * 45 * 86400000).toISOString(),
    evidenceType: s.ev,
    ledgerTxId: chosen[i] === "released" ? `ledger_${seed}${i}a8f3c9b2e7d4a1f6c8b9e2d5a7f1c3b8` : undefined,
  }));
}

export const projects: Project[] = titles.map((title, i) => {
  const goal = [850000, 1200000, 650000, 2400000, 500000, 1800000, 3200000, 950000][i];
  const raised = Math.floor(goal * [0.72, 0.45, 0.91, 0.33, 1.0, 0.58, 0.22, 0.67][i]);
  return {
    id: `p${i + 1}`,
    slug: `project-${i + 1}`,
    title,
    tagline: taglines[i],
    abstract:
      taglines[i] +
      " This research addresses a critical need in the region. Using rigorous methodology and open science principles, the team aims to publish results in peer-reviewed venues and open-source all designs. Ledger-verified milestones ensure every rupee is spent as intended.",
    category: categories[i % categories.length],
    tags: ["open-science", "sri-lanka", "impact"].slice(0, 2 + (i % 2)),
    student: {
      name: studentNames[i],
      avatar: avatars[i],
      department: ["Biomedical Eng.", "Mech. Eng.", "Computer Science", "Marine Sci.", "Materials Sci.", "Biomedical Eng.", "Agri. Biotech", "Electronic Eng."][i],
    },
    supervisor: ["Dr. R. Wijesinghe", "Prof. N. Karunaratne", "Dr. S. Amarasekera", "Prof. L. Mendis", "Dr. T. Herath", "Dr. M. Ranasinghe", "Prof. K. Dissanayake", "Dr. A. Fernando"][i],
    university: universities[i % universities.length],
    cover: covers[i],
    goal,
    raised,
    donors: [142, 87, 234, 56, 312, 178, 41, 156][i],
    daysLeft: [24, 41, 8, 52, 0, 33, 61, 19][i],
    status: raised >= goal ? "funded" : "live",
    milestones: makeMilestones(goal, i),
    updates: [
      { date: "2 days ago", title: "Prototype v2 assembled", body: "We completed assembly of the second prototype and began initial calibration tests." },
      { date: "1 week ago", title: "Milestone 1 verified ✅", body: "The university has verified our first milestone. Funds have been released to our account." },
      { date: "3 weeks ago", title: "Project launched", body: "Thank you to our first donors! We are officially live and beginning procurement." },
    ],
  };
});

// Demo seed for student2's project — "Solar Desalination for Coastal Villages"
// (projects[1]). Shows 50% of the goal raised (above the 30% milestone
// threshold) with one milestone already submitted for university review and
// the next one active, so the full apply -> review -> release flow can be
// demonstrated end to end.
const solarDemo = projects[1];
if (solarDemo) {
  solarDemo.raised = Math.floor(solarDemo.goal * 0.5);
  solarDemo.status = "live";
  solarDemo.milestones[1].status = "submitted";
  solarDemo.milestones[2].status = "active";
  solarDemo.milestones[1].ledgerTxId = undefined;
  solarDemo.milestones[2].ledgerTxId = undefined;
}

export const platformStats = {
  totalRaised: 47_820_000,
  activeProjects: 128,
  universities: 12,
  milestonesCompleted: 384,
  donors: 3_247,
  commission: 956_400,
};

export const donorLeaderboard = [
  { name: "Nishan A.", amount: 250000, projects: 8, badges: ["Top Supporter", "Milestone Hero"] },
  { name: "Anonymous", amount: 180000, projects: 5, badges: ["Milestone Hero"] },
  { name: "Diaspora Trust", amount: 500000, projects: 12, badges: ["Founding Donor"] },
];

export type DonationRow = {
  id: string;
  donor: string;
  project: string;
  amount: number;
  date: string;
  payhereOrderId: string;
};

export const recentDonations: DonationRow[] = Array.from({ length: 24 }, (_, i) => ({
  id: `d${i}`,
  donor: i % 4 === 0 ? "Anonymous" : ["Nishan A.", "Kavya R.", "M. Perera", "Diaspora Trust", "S. Silva"][i % 5],
  project: titles[i % titles.length],
  amount: [500, 1000, 2500, 5000, 10000, 25000][i % 6],
  date: new Date(Date.now() - i * 3600000 * 7).toLocaleDateString(),
  payhereOrderId: `fundEd_${i}f9c3a8b2e7d4a1f6c8b9e2d5a7f1c3b8`,
}));
