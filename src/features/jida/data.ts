import type { JournalIssue, Manuscript, ReviewAssignment } from "./types";

export const manuscripts: Manuscript[] = [
  {
    id: "MS-2026-001",
    title: "Faith, Ethics, and AI in Higher Education",
    abstract: "A framework for ethical AI adoption in faith-based universities.",
    keywords: ["AI", "Ethics", "Higher Education"],
    references: ["Boissy & Koffel 2018", "UNESCO AI Ethics 2021"],
    authorName: "Nadine Uwimana",
    authorEmail: "nadine@auca.ac.rw",
    format: "PDF",
    status: "Under Review",
    submittedAt: "2026-03-10",
    submissionDeadline: "2026-05-01",
  },
  {
    id: "MS-2026-002",
    title: "Open Access Publishing in East Africa",
    abstract: "A comparative study of open-access strategies across institutions.",
    keywords: ["Open Access", "Publishing", "Africa"],
    references: ["SPARC OA roadmap", "Scopus 2025 report"],
    authorName: "Alice Umutoni",
    authorEmail: "alice@auca.ac.rw",
    format: "DOCX",
    status: "Revision Required",
    submittedAt: "2026-02-21",
    submissionDeadline: "2026-04-28",
  },
  {
    id: "MS-2026-003",
    title: "Digital Libraries for Emerging Universities",
    abstract: "Practical methods to digitize institutional knowledge archives.",
    keywords: ["Libraries", "Digitization", "Policy"],
    references: ["IFLA digital guidelines 2024"],
    authorName: "Jean Claude Habimana",
    authorEmail: "jean@auca.ac.rw",
    format: "PDF",
    status: "Published",
    issue: "Vol 12, Issue 1",
    submittedAt: "2026-01-08",
    submissionDeadline: "2026-03-31",
  },
];

export const reviewAssignments: ReviewAssignment[] = [
  {
    manuscriptId: "MS-2026-001",
    manuscriptTitle: "Faith, Ethics, and AI in Higher Education",
    reviewerName: "Dr. Bosco Niyonzima",
    reviewerEmail: "bosco@auca.ac.rw",
    deadline: "2026-04-15",
    progress: "In Progress",
  },
  {
    manuscriptId: "MS-2026-002",
    manuscriptTitle: "Open Access Publishing in East Africa",
    reviewerName: "Dr. Liliane Mukamana",
    reviewerEmail: "liliane@auca.ac.rw",
    deadline: "2026-04-09",
    progress: "Finished Review",
    recommendation: "Major Revision",
    commentsToAuthor: "Expand methodology details and include regional sample constraints.",
    commentsToEditor: "Promising work; needs one major revision cycle.",
  },
];

export const journalIssues: JournalIssue[] = [
  {
    id: "JIDA-12-1",
    volume: 12,
    issue: 1,
    year: 2026,
    publishedAt: "2026-02-15",
    articleCount: 14,
  },
  {
    id: "JIDA-11-4",
    volume: 11,
    issue: 4,
    year: 2025,
    publishedAt: "2025-11-30",
    articleCount: 12,
  },
];

export const notifications = [
  "Submission confirmation sent to Nadine Uwimana for MS-2026-001.",
  "Reviewer assignment email sent to Dr. Bosco Niyonzima.",
  "Revision request sent to Alice Umutoni for MS-2026-002.",
  "Google Scholar metadata export queued for Vol 12, Issue 1.",
];

