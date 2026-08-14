/**
 * The comment sections in both portals: authors see the editor's remarks and
 * the anonymized, author-facing part of the review form; editors see every
 * completed form in full, including the ratings and the confidential comments.
 */
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EditorSubmission,
  ManuscriptSummary,
  ReviewFormResult,
} from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getSubmissionSettings: vi.fn().mockResolvedValue({
    submissionDeadline: null,
    openForSubmissions: true,
  }),
  getManuscripts: vi.fn().mockResolvedValue([]),
  getReviewers: vi.fn().mockResolvedValue([]),
  getEditorSubmissions: vi.fn().mockResolvedValue([]),
}));

const api = await import("@/lib/api");
const { AuthorWorkspace, EditorWorkspace } = await import("@/features/jida/components");

const reviewedManuscript: ManuscriptSummary = {
  id: "m1",
  title: "On Inter-Discourse Methods",
  status: "REVISION_REQUIRED",
  createdAt: "2026-07-20T10:00:00.000Z",
  coAuthors: [
    { fullName: "Charles Babbage", email: "cb@example.com", isCorresponding: true },
  ],
  decisions: [
    {
      decision: "REQUEST_REVISION",
      notes: "Please address the reviewer before resubmitting.",
      createdAt: "2026-08-02T10:00:00.000Z",
    },
  ],
  reviews: [
    {
      reviewId: "r1",
      reviewerLabel: "Reviewer 1",
      recommendation: "MINOR_REVISION",
      commentsToAuthor: "Tighten the methodology section.",
      specificSuggestions: "Add at least 15 references, alphabetically ordered.",
      submittedAt: "2026-08-01T10:00:00.000Z",
      feedback: null,
    },
  ],
};

const completedForm: ReviewFormResult = {
  id: "r1",
  recommendation: "MINOR_REVISION",
  recommendationLabel: "Accepted, minor revisions needed.",
  assessment: [
    {
      key: "ratingTitle",
      label: "The title is specific and reflects the main ideas of the article.",
      rating: "GOOD",
    },
    {
      key: "ratingMethods",
      label: "The research study methods are sound and appropriate.",
      rating: "POOR",
    },
  ],
  commentsToAuthor: "Tighten the methodology section.",
  specificSuggestions: "Add at least 15 references, alphabetically ordered.",
  commentsToEditor: "Borderline — the statistics are shaky.",
  hasAttachment: false,
  attachmentName: null,
  createdAt: "2026-08-01T10:00:00.000Z",
};

const editorSubmission: EditorSubmission = {
  id: "m1",
  title: "On Inter-Discourse Methods",
  status: "UNDER_REVIEW",
  authorName: "Ada Lovelace",
  submittedAt: "2026-07-20T10:00:00.000Z",
  assignments: [
    {
      id: "a1",
      manuscriptId: "m1",
      deadline: "2026-09-01T00:00:00.000Z",
      progress: "FINISHED_REVIEW",
      recommendation: "MINOR_REVISION",
      commentsToAuthor: "Tighten the methodology section.",
      commentsToEditor: "Borderline — the statistics are shaky.",
      reviewedAt: "2026-08-01T10:00:00.000Z",
      review: completedForm,
      authorFeedback: { rating: 4, comment: "Helpful and specific." },
      reviewer: { id: "r1", name: "Alan Turing", email: "alan@example.com" },
    },
  ],
  decisions: [
    {
      decision: "REQUEST_REVISION",
      notes: "Please address the reviewer before resubmitting.",
      createdAt: "2026-08-02T10:00:00.000Z",
      editorName: "Grace Hopper",
    },
  ],
};

beforeEach(() => {
  vi.mocked(api.getManuscripts).mockResolvedValue([]);
  vi.mocked(api.getEditorSubmissions).mockResolvedValue([]);
  vi.mocked(api.getReviewers).mockResolvedValue([]);
});

describe("AuthorWorkspace comments", () => {
  it("shows the editor's decision note and the author-facing review comments", async () => {
    vi.mocked(api.getManuscripts).mockResolvedValue([reviewedManuscript]);

    render(<AuthorWorkspace />);

    expect(
      await screen.findByText("Please address the reviewer before resubmitting."),
    ).toBeInTheDocument();
    expect(screen.getByText("Reviewer 1")).toBeInTheDocument();
    expect(screen.getByText("Tighten the methodology section.")).toBeInTheDocument();
    expect(
      screen.getByText("Add at least 15 references, alphabetically ordered."),
    ).toBeInTheDocument();
  });

  it("lists co-authors on the submission card, with contact details on hover", async () => {
    vi.mocked(api.getManuscripts).mockResolvedValue([reviewedManuscript]);

    render(<AuthorWorkspace />);

    // The name shows twice by design: as the visible label, and again as the
    // heading of the hover card that carries the contact details.
    expect(await screen.findAllByText("Charles Babbage")).toHaveLength(2);

    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("cb@example.com")).toBeInTheDocument();
    expect(within(card).getByText("Corresponding author")).toBeInTheDocument();
    expect(within(card).getByRole("link")).toHaveAttribute("href", "mailto:cb@example.com");
  });

  it("says so rather than showing a blank when a co-author has no institution", async () => {
    vi.mocked(api.getManuscripts).mockResolvedValue([reviewedManuscript]);

    render(<AuthorWorkspace />);

    expect(await screen.findByText("No institution on file")).toBeInTheDocument();
  });

  it("offers the reviewer-feedback form once a review has been released", async () => {
    vi.mocked(api.getManuscripts).mockResolvedValue([reviewedManuscript]);

    render(<AuthorWorkspace />);

    expect(await screen.findByText("Rate this reviewer's work")).toBeInTheDocument();
  });

  it("explains the wait instead of showing an empty cell while a review is pending", async () => {
    vi.mocked(api.getManuscripts).mockResolvedValue([
      { id: "m2", title: "Pending Paper", status: "UNDER_REVIEW", decisions: [], reviews: [] },
    ]);

    render(<AuthorWorkspace />);

    expect(
      await screen.findByText("Released once the editor reaches a decision."),
    ).toBeInTheDocument();
  });
});

describe("EditorWorkspace comments", () => {
  it("shows the whole review form, confidential comments included", async () => {
    vi.mocked(api.getEditorSubmissions).mockResolvedValue([editorSubmission]);

    render(<EditorWorkspace />);

    expect(await screen.findByText(/Borderline — the statistics are shaky\./)).toBeInTheDocument();
    expect(screen.getByText(/Tighten the methodology section\./)).toBeInTheDocument();
    expect(screen.getByText("Accepted, minor revisions needed.")).toBeInTheDocument();
    expect(screen.getByText("Not shown to authors")).toBeInTheDocument();
  });

  it("shows the reviewer's ratings for each assessed item", async () => {
    vi.mocked(api.getEditorSubmissions).mockResolvedValue([editorSubmission]);

    render(<EditorWorkspace />);

    expect(
      await screen.findByText("The research study methods are sound and appropriate."),
    ).toBeInTheDocument();
    expect(screen.getByText("Poor")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("surfaces the author's rating of the reviewer's work", async () => {
    vi.mocked(api.getEditorSubmissions).mockResolvedValue([editorSubmission]);

    render(<EditorWorkspace />);

    expect(await screen.findByText(/author rated 4\/5/)).toBeInTheDocument();
    expect(screen.getByText(/Helpful and specific\./)).toBeInTheDocument();
  });

  it("attributes each editorial decision to the editor who recorded it", async () => {
    vi.mocked(api.getEditorSubmissions).mockResolvedValue([editorSubmission]);

    render(<EditorWorkspace />);

    expect(await screen.findByText(/Grace Hopper/)).toBeInTheDocument();
    expect(
      screen.getByText("Please address the reviewer before resubmitting."),
    ).toBeInTheDocument();
  });

  it("says so plainly when nothing has been assigned or decided yet", async () => {
    vi.mocked(api.getEditorSubmissions).mockResolvedValue([
      { ...editorSubmission, assignments: [], decisions: [] },
    ]);

    render(<EditorWorkspace />);

    expect(await screen.findByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("No decision recorded yet.")).toBeInTheDocument();
  });
});
