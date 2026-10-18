// Static platform-FAQ corpus for the investor RAG assistant's "how does
// FundEd work" style questions. Small enough (a dozen-ish entries) that a
// vector DB would be overkill — matched by keyword overlap in ai.ts. Every
// fact here must mirror what the code actually does elsewhere in the app
// (see the file path noted on each entry) so the assistant never states a
// platform rule that isn't true.

export type FaqEntry = {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
};

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "how-it-works",
    keywords: ["how", "fundEd", "work", "works", "platform", "process"],
    question: "How does FundEd work?",
    answer:
      "A student submits a research project with milestones. The project's university, then the platform admin, reviews and approves it before it goes live for funding. Investors browse live projects and donate. As milestones are verified and funds released, the project's progress updates — all donations and fund releases are recorded, with transaction details available when the Hyperledger Fabric ledger is reachable.",
  },
  {
    id: "approval",
    keywords: ["approve", "approved", "approval", "review", "verified", "university"],
    question: "How are projects approved?",
    answer:
      "A submitted project starts with status \"review\". It's approved by the university and platform admin before becoming \"live\" and visible to investors for funding.",
  },
  {
    id: "milestones",
    keywords: ["milestone", "milestones", "evidence", "verification", "verify"],
    question: "How does milestone verification work?",
    answer:
      "Each project has milestones with a percentage of the funding goal attached. A milestone moves through locked, active, submitted, verified, and released as evidence is submitted and reviewed. Funds for a milestone are only released once it's marked verified.",
  },
  {
    id: "after-donate",
    keywords: ["after", "donate", "donation", "happens"],
    question: "What happens after I donate?",
    answer:
      "Once your payment is confirmed, the project's raised amount and donor count update immediately, and the contribution is recorded on the ledger when the Hyperledger Fabric network is reachable. You can track the project's milestone progress from your dashboard afterward.",
  },
  {
    id: "fees",
    keywords: ["fee", "fees", "platform fee", "commission", "percent", "2%"],
    question: "How are platform fees calculated?",
    answer:
      "FundEd applies a 2% platform fee, computed directly from each confirmed donation amount (amount × 2%). The remainder funds the project.",
  },
  {
    id: "track-progress",
    keywords: ["track", "progress", "status", "funded project"],
    question: "How can I track the progress of my funded project?",
    answer:
      "Your donor dashboard lists every project you've funded along with each donation's status. A project's own page shows its milestones and their current status.",
  },
];

export function matchFaq(question: string, max = 2): FaqEntry[] {
  const q = question.toLowerCase();
  const scored = FAQ_ENTRIES.map((entry) => {
    const hits = entry.keywords.filter((k) => q.includes(k.toLowerCase())).length;
    return { entry, hits };
  }).filter((s) => s.hits > 0);
  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, max).map((s) => s.entry);
}
