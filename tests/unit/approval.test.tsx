import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const getMe = vi.fn();
const getAccountApprovals = vi.fn();
const decideAccountApproval = vi.fn();

vi.mock("@/lib/api", async (o) => ({
  ...(await o<typeof import("@/lib/api")>()),
  getMe,
  getAccountApprovals,
  decideAccountApproval,
  getSubmissionSettings: vi.fn().mockResolvedValue({ submissionDeadline: null, openForSubmissions: true }),
  getManuscripts: vi.fn().mockResolvedValue([]),
  getEditorSubmissions: vi.fn().mockResolvedValue([]),
  getReviewers: vi.fn().mockResolvedValue([]),
  getPublicArticles: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/session", async (o) => ({
  ...(await o<typeof import("@/lib/session")>()),
  readRoles: () => ["EDITOR", "CHIEF_EDITOR"],
}));

const { AuthorWorkspace, EditorWorkspace } = await import("@/features/jida/components");

describe("author approval gate", () => {
  it("hides the submit button while the account is pending", async () => {
    getMe.mockResolvedValue({ id: "u", email: "a@b.c", role: "AUTHOR", accountStatus: "PENDING" });
    render(<AuthorWorkspace />);
    await screen.findByText(/waiting to be approved/i);
    expect(screen.queryByRole("button", { name: /Submit Manuscript/i })).toBeNull();
  });

  it("shows the submit button once approved", async () => {
    getMe.mockResolvedValue({ id: "u", email: "a@b.c", role: "AUTHOR", accountStatus: "APPROVED" });
    render(<AuthorWorkspace />);
    expect(await screen.findByRole("button", { name: /Submit Manuscript/i })).toBeTruthy();
  });

  it("shows the refusal reason when rejected", async () => {
    getMe.mockResolvedValue({
      id: "u", email: "a@b.c", role: "AUTHOR",
      accountStatus: "REJECTED", rejectionReason: "Not affiliated with an institution.",
    });
    render(<AuthorWorkspace />);
    await screen.findByText(/Not affiliated with an institution\./);
    expect(screen.queryByRole("button", { name: /Submit Manuscript/i })).toBeNull();
  });

  // An account with no status (an older session, or the field missing) must not
  // be treated as pending — that would lock existing authors out.
  it("treats a missing status as approved", async () => {
    getMe.mockResolvedValue({ id: "u", email: "a@b.c", role: "AUTHOR" });
    render(<AuthorWorkspace />);
    expect(await screen.findByRole("button", { name: /Submit Manuscript/i })).toBeTruthy();
  });
});

describe("approval queue", () => {
  it("refuses with a reason and sends it", async () => {
    getMe.mockResolvedValue({ id: "e", email: "e@b.c", role: "EDITOR", accountStatus: "APPROVED" });
    getAccountApprovals.mockResolvedValue([
      { id: "p1", email: "new@b.c", firstName: "New", lastName: "Author",
        affiliation: "AUCA", emailVerified: true, createdAt: "2026-09-01T00:00:00.000Z" },
    ]);
    decideAccountApproval.mockResolvedValue({ id: "p1", email: "new@b.c", accountStatus: "REJECTED" });

    render(<EditorWorkspace />);
    await userEvent.click(await screen.findByRole("button", { name: /Account Approvals/i }));
    await screen.findByText("new@b.c");

    await userEvent.click(screen.getByRole("button", { name: "Refuse" }));
    // The confirm button stays disabled until a reason is actually typed.
    const confirm = screen.getByRole("button", { name: /Confirm refusal/i });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    await userEvent.type(screen.getByLabelText(/Reason for refusing/i), "Out of scope");
    await userEvent.click(screen.getByRole("button", { name: /Confirm refusal/i }));

    expect(decideAccountApproval).toHaveBeenCalledWith("p1", false, "Out of scope");
  });
});
