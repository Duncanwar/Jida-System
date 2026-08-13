/**
 * The comment columns in both portals: authors see the editor's remarks and the
 * anonymized reviewer feedback the API releases to them; editors see every
 * reviewer's comments, including the confidential ones addressed to them.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorSubmission, ManuscriptSummary } from "@/lib/api";

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
  decisions: [
    {
      decision: "REQUEST_REVISION",
      notes: "Please address the reviewer before resubmitting.",
      createdAt: "2026-08-02T10:00:00.000Z",
    },
  ],
  reviews: [
    {
      reviewerLabel: "Reviewer 1",
      recommendation: "MINOR_REVISION",
      commentsToAuthor: "Tighten the methodology section.",
      submittedAt: "2026-08-01T10:00:00.000Z",
    },
  ],
};

const editorSubmission: EditorSubmission = {
  id: "m1",
  title: "On Inter-Discourse Methods",
  status: "UNDER_REVIEW",
  authorName: "Ada Lovelace",
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
  it("shows the editor's decision note and the reviewer's comments", async () => {
    vi.mocked(api.getManuscripts).mockResolvedValue([reviewedManuscript]);

    render(<AuthorWorkspace />);

    expect(
      await screen.findByText("Please address the reviewer before resubmitting."),
    ).toBeInTheDocument();
    expect(screen.getByText("Reviewer 1")).toBeInTheDocument();
    expect(screen.getByText("Tighten the methodology section.")).toBeInTheDocument();
  });

  it("explains the wait instead of showing an empty cell while a review is pending", async () => {
    vi.mocked(api.getManuscripts).mockResolvedValue([
      { id: "m2", title: "Pending Paper", status: "UNDER_REVIEW", decisions: [], reviews: [] },
    ]);

    render(<AuthorWorkspace />);

    expect(
      await screen.findByText("Released once the editor reaches a decision"),
    ).toBeInTheDocument();
  });
});

describe("EditorWorkspace comments", () => {
  it("shows both the confidential and the author-facing reviewer comments", async () => {
    vi.mocked(api.getEditorSubmissions).mockResolvedValue([editorSubmission]);

    render(<EditorWorkspace />);

    expect(await screen.findByText(/Borderline — the statistics are shaky\./)).toBeInTheDocument();
    expect(screen.getByText(/Tighten the methodology section\./)).toBeInTheDocument();
    expect(screen.getByText("To editor")).toBeInTheDocument();
    expect(screen.getByText("To author")).toBeInTheDocument();
  });

  it("attributes each editorial decision to the editor who recorded it", async () => {
    vi.mocked(api.getEditorSubmissions).mockResolvedValue([editorSubmission]);

    render(<EditorWorkspace />);

    expect(await screen.findByText(/Grace Hopper/)).toBeInTheDocument();
    expect(
      screen.getByText("Please address the reviewer before resubmitting."),
    ).toBeInTheDocument();
  });

  it("says so plainly when no review has come back yet", async () => {
    vi.mocked(api.getEditorSubmissions).mockResolvedValue([
      { ...editorSubmission, assignments: [], decisions: [] },
    ]);

    render(<EditorWorkspace />);

    expect(await screen.findByText("No reviews submitted")).toBeInTheDocument();
  });
});
