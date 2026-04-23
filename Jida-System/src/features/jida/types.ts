export type UserRole = "author" | "reviewer" | "editor" | "reader";

export type ManuscriptStatus =
  | "Submitted"
  | "Under Review"
  | "Accepted"
  | "Rejected"
  | "Revision Required"
  | "Published";

export type ReviewProgress = "Not started" | "Begin review" | "In Progress" | "Finished Review";

export type ReviewRecommendation = "Accept" | "Minor Revision" | "Major Revision" | "Reject";

export type Manuscript = {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  references: string[];
  authorName: string;
  authorEmail: string;
  format: "PDF" | "DOCX";
  status: ManuscriptStatus;
  issue?: string;
  submittedAt: string;
  submissionDeadline: string;
};

export type ReviewAssignment = {
  manuscriptId: string;
  manuscriptTitle: string;
  reviewerName: string;
  reviewerEmail: string;
  deadline: string;
  progress: ReviewProgress;
  recommendation?: ReviewRecommendation;
  commentsToAuthor?: string;
  commentsToEditor?: string;
};

export type JournalIssue = {
  id: string;
  volume: number;
  issue: number;
  year: number;
  publishedAt: string;
  articleCount: number;
};

