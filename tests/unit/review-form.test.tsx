/**
 * The reviewer portal now presents the JIDA Manuscript Review Form itself
 * rather than two free-text boxes. These cover the parts that matter: every
 * section of the form is present, the author-facing boundary is stated, and a
 * half-filled assessment is caught before it reaches the server.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assignment } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getAssignments: vi.fn().mockResolvedValue([]),
  getReviewHistory: vi.fn().mockResolvedValue([]),
  submitReview: vi.fn().mockResolvedValue({}),
  updateReviewProgress: vi.fn().mockResolvedValue({}),
}));

const api = await import("@/lib/api");
const { ReviewerWorkspace } = await import("@/features/jida/components");

const assignment: Assignment = {
  id: "a1",
  manuscriptId: "m1",
  manuscriptTitle: "On Inter-Discourse Methods",
  abstract: "An abstract.",
  keywords: ["discourse"],
  deadline: "2026-09-01T00:00:00.000Z",
  submittedAt: "2026-08-01T00:00:00.000Z",
  progress: "IN_PROGRESS",
};

beforeEach(() => {
  vi.mocked(api.getAssignments).mockResolvedValue([assignment]);
  vi.mocked(api.getReviewHistory).mockResolvedValue([]);
  vi.mocked(api.submitReview).mockClear();
});

/** Opens the review panel for the seeded assignment. */
async function openForm(user: ReturnType<typeof userEvent.setup>) {
  render(<ReviewerWorkspace />);
  const openers = await screen.findAllByRole("button", { name: "Review" });
  await user.click(openers[0]);
  return screen.findByText("Manuscript Review Form");
}

describe("Manuscript Review Form", () => {
  it("renders all four sections of the form", async () => {
    const user = userEvent.setup();
    await openForm(user);

    expect(screen.getByText("Assessment of the Article")).toBeInTheDocument();
    expect(screen.getByText("Overall Recommendation")).toBeInTheDocument();
    expect(screen.getByText("Comments and Suggestions to the Author(s)")).toBeInTheDocument();
    expect(screen.getByText("Confidential Comments")).toBeInTheDocument();
  });

  it("offers all seven assessment items on the five-point scale", async () => {
    const user = userEvent.setup();
    await openForm(user);

    for (const item of api.ASSESSMENT_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
      // Five radio buttons share the item's name — one per rating.
      expect(document.querySelectorAll(`input[name="${item.key}"]`)).toHaveLength(5);
    }
  });

  it("uses the form's own wording for the four recommendation levels", async () => {
    const user = userEvent.setup();
    await openForm(user);

    expect(screen.getByText("Accepted, no revision needed.")).toBeInTheDocument();
    expect(screen.getByText("Accepted, minor revisions needed.")).toBeInTheDocument();
    expect(screen.getByText("Return for major revision and resubmission")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("tells the reviewer which section the author will see, and which they will not", async () => {
    const user = userEvent.setup();
    await openForm(user);

    expect(
      screen.getByText("This section — and only this section — is shown to the author."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nothing in this section is shown to the authors."),
    ).toBeInTheDocument();
  });

  it("refuses to submit while any assessment item is unrated", async () => {
    const user = userEvent.setup();
    await openForm(user);

    await user.type(
      screen.getByRole("textbox", { name: /Overall evaluation/i }),
      "A solid contribution.",
    );
    await user.click(screen.getByRole("button", { name: "Submit Review" }));

    expect(await screen.findByText(/still unrated/)).toBeInTheDocument();
    expect(api.submitReview).not.toHaveBeenCalled();
  });

  it("sends every rating, the recommendation and both comment fields", async () => {
    const user = userEvent.setup();
    await openForm(user);

    for (const item of api.ASSESSMENT_ITEMS) {
      const radios = document.querySelectorAll<HTMLInputElement>(`input[name="${item.key}"]`);
      await user.click(radios[1]); // GOOD
    }
    await user.click(screen.getByRole("radio", { name: "Accepted, minor revisions needed." }));
    await user.type(
      screen.getByRole("textbox", { name: /Overall evaluation/i }),
      "A solid contribution.",
    );
    await user.type(
      screen.getByRole("textbox", { name: /Reasons for acceptance or rejection/i }),
      "Expand the literature review.",
    );
    await user.type(
      screen.getByRole("textbox", { name: /Confidential comments/i }),
      "The statistics are shaky.",
    );

    await user.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => expect(api.submitReview).toHaveBeenCalledOnce());
    const [assignmentId, payload] = vi.mocked(api.submitReview).mock.calls[0];
    expect(assignmentId).toBe("a1");
    expect(payload).toMatchObject({
      ratingTitle: "GOOD",
      ratingStructure: "GOOD",
      recommendation: "MINOR_REVISION",
      commentsToAuthor: "A solid contribution.",
      specificSuggestions: "Expand the literature review.",
      commentsToEditor: "The statistics are shaky.",
    });
  });
});
