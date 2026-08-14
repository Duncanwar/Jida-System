const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function token() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("token") ?? "";
  } catch {
    // Safari (Private Browsing, cross-site tracking prevention) throws
    // SecurityError instead of returning null — treat it as signed out.
    return "";
  }
}

/**
 * Error thrown for any non-2xx response.
 *
 * Carries the backend's machine-readable `code` so callers can branch on the
 * specific failure (e.g. EMAIL_NOT_VERIFIED) instead of matching on prose.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  code?: string;
  [key: string]: unknown;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  const t = token();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // The API returns `{ error }`; older handlers used `{ message }`. Read both,
    // otherwise every failure surfaces as the useless "Request failed".
    const err: ApiErrorBody = await res
      .json()
      .catch(() => ({ error: res.statusText }) as ApiErrorBody);

    // A 401 on a request that actually carried a bearer token means that
    // token was rejected (invalid/expired) — not a login-form bad-password
    // 401, which never sends a token. Bounce to /login instead of leaving
    // the user stuck on a page whose data calls are silently failing.
    if (res.status === 401 && t && typeof window !== "undefined") {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
      } catch {
        // ignore — see token() above
      }
      window.location.assign("/login");
    }

    throw new ApiError(
      err.error ?? err.message ?? "Request failed",
      res.status,
      err.code,
      err,
    );
  }

  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (text ? JSON.parse(text) : undefined) as T;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export type Role =
  | "AUTHOR"
  | "REVIEWER"
  | "EDITOR"
  | "ADMIN"
  | "CHIEF_EDITOR"
  | "ASSOCIATE_EDITOR";
export type UserRole = Role;

/** Roles that reach the editor portal. Chief and associate editors share it. */
export const EDITOR_ROLES: Role[] = ["EDITOR", "CHIEF_EDITOR", "ASSOCIATE_EDITOR"];

export const ROLE_LABELS: Record<Role, string> = {
  AUTHOR: "Author",
  REVIEWER: "Reviewer",
  EDITOR: "Editor",
  ADMIN: "Admin",
  CHIEF_EDITOR: "Chief Editor",
  ASSOCIATE_EDITOR: "Associate Editor",
};

export interface AuthUser {
  id: string;
  /** Primary role — where the user lands after signing in. */
  role: Role;
  /**
   * Every role the account holds, already expanded by the server: a chief
   * editor arrives with EDITOR, REVIEWER and AUTHOR included.
   */
  roles?: Role[];
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: boolean;
  avatarUrl?: string | null;
}

export interface AuthSession {
  accessToken: string;
  expiresInMinutes: number;
  user: AuthUser;
  message?: string;
}

export async function login(email: string, password: string, role: Role) {
  return request<AuthSession>("POST", "/api/auth/login", { email, password, role });
}

/**
 * Registration no longer returns an access token — the account is inactive
 * until the emailed verification link is followed (FR-AUTH-1).
 */
export async function register(data: {
  email: string;
  password: string;
  role: Role;
  name?: string;
  institution?: string;
}) {
  return request<{
    user: AuthUser;
    requiresEmailVerification: boolean;
    message: string;
  }>("POST", "/api/auth/register", data);
}

// ─── Email verification (FR-AUTH-1) ────────────────────────────────────────

/** Exchanges the token from the emailed link for an active session. */
export async function verifyEmail(verificationToken: string) {
  return request<AuthSession & { alreadyVerified: boolean }>("POST", "/api/auth/verify-email", {
    token: verificationToken,
  });
}

export async function resendVerification(email: string) {
  return request<{ message: string }>("POST", "/api/auth/resend-verification", { email });
}

export async function getVerificationStatus(email: string) {
  return request<{ emailVerified: boolean }>(
    "GET",
    `/api/auth/verification-status?email=${encodeURIComponent(email)}`,
  );
}

// ─── Google sign-in (FR-AUTH-2) ────────────────────────────────────────────

export async function getGoogleConfig() {
  return request<{ enabled: boolean; clientId: string | null }>("GET", "/api/auth/google/config");
}

/** Exchanges a Google Identity Services credential for a JIDA session. */
export async function googleSignIn(credential: string, role?: Role, institution?: string) {
  return request<AuthSession & { created: boolean }>("POST", "/api/auth/google", {
    credential,
    ...(role && role !== "ADMIN" ? { role } : {}),
    ...(institution ? { institution } : {}),
  });
}

export async function forgotPassword(email: string) {
  return request<{ message: string }>("POST", "/api/auth/forgot-password", { email });
}

export async function resetPassword(token_: string, newPassword: string) {
  return request<{ message: string }>("POST", "/api/auth/reset-password", {
    token: token_,
    newPassword,
  });
}

// ─── Profile ───────────────────────────────────────────────────────────────

export async function getMe() {
  return request<{ id: string; email: string; role: Role; name?: string; institution?: string }>(
    "GET",
    "/api/me",
  );
}

export async function patchMe(data: { name?: string; institution?: string }) {
  // Backend stores firstName / lastName / affiliation — map the friendly fields.
  const parts = (data.name ?? "").trim().split(/\s+/).filter(Boolean);
  const [firstName, ...rest] = parts;
  return request("PATCH", "/api/me", {
    ...(firstName ? { firstName } : {}),
    ...(rest.length ? { lastName: rest.join(" ") } : {}),
    ...(data.institution ? { affiliation: data.institution } : {}),
  });
}

// ─── Journal settings (FR-A12) ─────────────────────────────────────────────

export async function getSubmissionSettings() {
  return request<{ submissionDeadline: string | null; openForSubmissions: boolean }>(
    "GET",
    "/api/settings/submission",
  );
}

// ─── Authenticated file download helper (FR-A8, FR-R3) ─────────────────────

export async function downloadFile(path: string, filename: string) {
  const headers: Record<string, string> = {};
  const t = token();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Opens a file inline for review rather than forcing a save-to-disk prompt.
 * Fetching it as a blob strips whatever Content-Disposition the server sent,
 * so the browser's own viewer decides how to show it — the reader can still
 * download from there if they want to.
 */
export async function viewFile(path: string): Promise<void> {
  const win = window.open("", "_blank");
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || "Failed to open file");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (win) {
      win.location.href = url;
    } else {
      window.open(url, "_blank");
    }
  } catch (e) {
    win?.close();
    throw e;
  }
}

// ─── Author — Manuscripts ──────────────────────────────────────────────────

export async function getManuscripts(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<ManuscriptSummary[]>("GET", `/api/manuscripts${qs}`);
}

export async function getManuscript(id: string) {
  return request<ManuscriptDetail>("GET", `/api/manuscripts/${id}`);
}

/**
 * `form` carries the file and the text fields. Co-authors go along as a JSON
 * array in a single field, since the request is already multipart.
 */
export async function submitManuscript(form: FormData, coAuthors: CoAuthor[] = []) {
  const filled = coAuthors.filter((c) => c.fullName.trim() && c.email.trim());
  if (filled.length) form.set("coAuthors", JSON.stringify(filled));
  return request<{ id: string }>("POST", "/api/manuscripts", form, true);
}

/**
 * "Authors' Feedback of Reviewer's Work to JIDA". Idempotent — an author can
 * revise a rating they already gave.
 */
export async function saveReviewerFeedback(
  reviewId: string,
  data: { rating: number; comment?: string },
) {
  return request<ReviewerFeedback>("PUT", `/api/manuscripts/reviews/${reviewId}/feedback`, data);
}

export async function submitRevision(manuscriptId: string, form: FormData) {
  return request("POST", `/api/manuscripts/${manuscriptId}/revisions`, form, true);
}

// ─── Reviewer ──────────────────────────────────────────────────────────────

export async function getAssignments() {
  return request<Assignment[]>("GET", "/api/reviewer/assignments");
}

export async function updateReviewProgress(assignmentId: string, progress: ReviewProgress) {
  return request("PATCH", `/api/reviewer/assignments/${assignmentId}/progress`, { progress });
}

/** Submits the completed JIDA Manuscript Review Form. */
export async function submitReview(assignmentId: string, data: ReviewFormSubmission) {
  const form = new FormData();
  for (const item of ASSESSMENT_ITEMS) form.set(item.key, data[item.key]);
  form.set("recommendation", data.recommendation);
  form.set("commentsToAuthor", data.commentsToAuthor);
  if (data.specificSuggestions) form.set("specificSuggestions", data.specificSuggestions);
  if (data.commentsToEditor) form.set("commentsToEditor", data.commentsToEditor);
  if (data.file) form.set("file", data.file);
  return request<ReviewFormResult>(
    "POST",
    `/api/reviewer/assignments/${assignmentId}/review`,
    form,
    true,
  );
}

export async function getReviewHistory() {
  return request<Assignment[]>("GET", "/api/reviewer/history");
}

// ─── Editor ────────────────────────────────────────────────────────────────

export async function getEditorSubmissions(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<EditorSubmission[]>("GET", `/api/editor/submissions${qs}`);
}

export async function getEditorManuscript(id: string) {
  return request<ManuscriptDetail>("GET", `/api/editor/manuscripts/${id}`);
}

export async function assignReviewers(
  manuscriptId: string,
  assignments: { reviewerId: string; deadline: string }[],
) {
  return request("POST", `/api/editor/manuscripts/${manuscriptId}/assign-reviewers`, { assignments });
}

export async function makeDecision(
  manuscriptId: string,
  decision: "ACCEPT" | "REJECT" | "REQUEST_REVISION",
  notes?: string,
) {
  return request("POST", `/api/editor/manuscripts/${manuscriptId}/decision`, {
    decision,
    ...(notes ? { notes } : {}),
  });
}

export async function getReviewers() {
  return request<ReviewerOption[]>("GET", "/api/editor/reviewers");
}

export async function unassignReviewer(manuscriptId: string, reviewerId: string) {
  return request("DELETE", `/api/editor/manuscripts/${manuscriptId}/assignments/${reviewerId}`);
}

export async function uploadEditedFile(manuscriptId: string, form: FormData) {
  return request("POST", `/api/editor/manuscripts/${manuscriptId}/edited-file`, form, true);
}

export async function createIssue(data: { volume: number; issue: number; year: number }) {
  // Backend field is `issueNumber`.
  return request<{ id: string }>("POST", "/api/editor/issues", {
    volume: data.volume,
    issueNumber: data.issue,
    year: data.year,
  });
}

export async function publishToIssue(issueId: string, manuscriptId: string) {
  return request<{ id: string; slug: string }>(
    "POST",
    `/api/editor/issues/${issueId}/publish`,
    { manuscriptId },
  );
}

/** One thing standing between an article and Google Scholar. */
export interface ScholarCheck {
  id: string;
  message: string;
  severity: "blocker" | "warning";
}

export interface ScholarReadiness {
  ready: boolean;
  blockers: ScholarCheck[];
  warnings: ScholarCheck[];
}

/**
 * Marks an article for Google Scholar indexing. The server refuses when the
 * article cannot actually be indexed and returns what is missing, so callers
 * should be ready for a rejection carrying a `ScholarReadiness` body.
 */
export async function setScholarReady(publicationId: string, scholarReady: boolean) {
  return request<ScholarReadiness & { id: string; scholarReady: boolean }>(
    "PATCH",
    `/api/editor/publications/${publicationId}/scholar`,
    { scholarReady },
  );
}

/** Checks an article against Scholar's requirements without changing anything. */
export async function checkScholarReadiness(publicationId: string) {
  return request<ScholarReadiness>(
    "GET",
    `/api/editor/publications/${publicationId}/scholar-check`,
  );
}

export async function patchSettings(data: {
  submissionDeadline?: string;
  openForSubmissions?: boolean;
}) {
  return request("PATCH", "/api/editor/settings", data);
}

// ─── Public ────────────────────────────────────────────────────────────────

export async function getPublicIssues() {
  return request<PublicIssue[]>("GET", "/api/public/issues");
}

export async function getPublicArticles(q?: string, keyword?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (keyword) params.set("keyword", keyword);
  const qs = params.toString() ? `?${params}` : "";
  return request<PublicArticle[]>("GET", `/api/public/articles${qs}`);
}

export async function getPublicArticle(slug: string) {
  return request<PublicArticle>("GET", `/api/public/articles/${slug}`);
}


// ─── Types ─────────────────────────────────────────────────────────────────

export type ManuscriptStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "REVISION_REQUIRED"
  | "PUBLISHED";

export type ReviewProgress =
  | "NOT_STARTED"
  | "BEGIN_REVIEW"
  | "IN_PROGRESS"
  | "FINISHED_REVIEW";

export type ReviewRecommendation =
  | "ACCEPT"
  | "MINOR_REVISION"
  | "MAJOR_REVISION"
  | "REJECT";

// ─── Manuscript Review Form ────────────────────────────────────────────────

export type ReviewRating = "EXCELLENT" | "GOOD" | "MODERATE" | "POOR" | "BAD";

export const REVIEW_RATINGS: ReviewRating[] = ["EXCELLENT", "GOOD", "MODERATE", "POOR", "BAD"];

/** The seven rated items of "Assessment of the article", in form order. */
export const ASSESSMENT_ITEMS = [
  { key: "ratingTitle", label: "The title is specific and reflects the main ideas of the article." },
  { key: "ratingAbstract", label: "The abstract clearly presents objects, methods and results." },
  {
    key: "ratingLiterature",
    label: "The literature review and significance of the article are explained clearly.",
  },
  { key: "ratingMethods", label: "The research study methods are sound and appropriate." },
  {
    key: "ratingConclusions",
    label: "The conclusions or summary are accurate and supported by the content.",
  },
  { key: "ratingReferences", label: "References are up-dated, adequate and correctly cited." },
  { key: "ratingStructure", label: "The structure is compact, sequential and logical." },
] as const;

export type AssessmentKey = (typeof ASSESSMENT_ITEMS)[number]["key"];

/** The form's four "Overall Recommendation" levels, in its own wording. */
export const RECOMMENDATION_LABELS: Record<ReviewRecommendation, string> = {
  ACCEPT: "Accepted, no revision needed.",
  MINOR_REVISION: "Accepted, minor revisions needed.",
  MAJOR_REVISION: "Return for major revision and resubmission",
  REJECT: "Reject",
};

/** A completed review form, as the reviewer who wrote it and editors see it. */
export interface ReviewFormResult {
  id: string;
  recommendation: ReviewRecommendation;
  recommendationLabel: string;
  assessment: { key: AssessmentKey; label: string; rating: ReviewRating | null }[];
  commentsToAuthor: string;
  specificSuggestions?: string | null;
  commentsToEditor?: string | null;
  hasAttachment: boolean;
  attachmentName?: string | null;
  createdAt: string;
}

/** What the reviewer submits. Ratings are required; the rest follows the form. */
export interface ReviewFormSubmission extends Record<AssessmentKey, ReviewRating> {
  recommendation: ReviewRecommendation;
  commentsToAuthor: string;
  specificSuggestions?: string;
  commentsToEditor?: string;
  file?: File | null;
}

/** The author's "Feedback of Reviewer's Work to JIDA". */
export interface ReviewerFeedback {
  rating: number;
  comment?: string | null;
}

export interface ManuscriptFileInfo {
  id: string;
  originalName: string;
  source: "AUTHOR" | "EDITOR";
  remarks?: string | null;
  versionLabel: number;
  isLatest: boolean;
  createdAt: string;
}

export interface EditorialDecisionInfo {
  decision: "ACCEPT" | "REJECT" | "REQUEST_REVISION";
  notes?: string | null;
  createdAt: string;
  /** Only present on the editor-side response — which editor left the remark. */
  editorName?: string;
}

/**
 * A review as the author is shown it. The API withholds the reviewer's identity
 * and their confidential comments to the editor, and sends nothing at all until
 * an editorial decision has been recorded.
 */
export interface AuthorVisibleReview {
  /** Identifies the review when the author rates the reviewer's work. */
  reviewId: string;
  /** "Reviewer 1", "Reviewer 2" — peer review is blind, so no name is sent. */
  reviewerLabel: string;
  recommendation: ReviewRecommendation;
  /** "Comments and Suggestions to the Author(s)" — the overall evaluation. */
  commentsToAuthor: string;
  /** The same section's reasons-and-suggestions prompt. */
  specificSuggestions?: string | null;
  submittedAt: string;
  /** The author's own rating of this review, once given. */
  feedback?: ReviewerFeedback | null;
}

export interface CoAuthor {
  fullName: string;
  email: string;
  affiliation?: string | null;
  isCorresponding?: boolean;
}

export interface ManuscriptSummary {
  id: string;
  title: string;
  status: ManuscriptStatus;
  createdAt?: string;
  submittedAt?: string;
  submissionDeadline?: string;
  publication?: { slug: string; publishedAt: string } | null;
  files?: ManuscriptFileInfo[];
  decisions?: EditorialDecisionInfo[];
  reviews?: AuthorVisibleReview[];
  coAuthors?: CoAuthor[];
}

export interface ReviewerOption {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  affiliation?: string | null;
}

export interface ManuscriptDetail extends ManuscriptSummary {
  abstract: string;
  keywords: string[];
  authorName?: string;
  issue?: string;
  assignments?: Assignment[];
}

export interface Assignment {
  id: string;
  manuscriptId: string;
  manuscriptTitle?: string;
  abstract?: string;
  keywords?: string[];
  deadline: string;
  progress: ReviewProgress;
  recommendation?: ReviewRecommendation;
  commentsToAuthor?: string;
  commentsToEditor?: string;
  /** Set only in editor-side responses — id of the reviewer's `Review` row, for downloading their attachment. */
  reviewId?: string;
  /** When the reviewer submitted their comments; absent while the review is outstanding. */
  reviewedAt?: string;
  hasAttachment?: boolean;
  reviewer?: { id: string; name?: string; email: string };
  /** When the manuscript was submitted — the review queue sorts on this. */
  submittedAt?: string;
  /** The completed review form. Present for the reviewer and for editors. */
  review?: ReviewFormResult | null;
  /** Editor-side only: the author's rating of this reviewer's work. */
  authorFeedback?: ReviewerFeedback | null;
}

export interface EditorSubmission {
  id: string;
  title: string;
  status: ManuscriptStatus;
  authorName?: string;
  /** Full contact details, for the author hover card. */
  author?: { id: string; name?: string | null; email: string; affiliation?: string | null };
  submittedAt?: string;
  coAuthors?: CoAuthor[];
  assignments?: Assignment[];
  decisions?: EditorialDecisionInfo[];
}

/**
 * A published article's author. The email is present because on published work
 * the submitting author is the corresponding author.
 */
export interface PublicAuthor {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  affiliation?: string | null;
}

export interface PublicCoAuthor {
  fullName: string;
  email?: string | null;
  affiliation?: string | null;
  isCorresponding?: boolean;
}

/** One article as it appears inside its issue in the archive. */
export interface IssuePublication {
  id: string;
  slug: string;
  publishedAt: string;
  manuscript: {
    title: string;
    abstract?: string;
    keywords?: string[];
    author?: PublicAuthor | null;
    coAuthors?: PublicCoAuthor[];
  };
}

/**
 * Mirrors the `Issue` row the API actually returns. The issue number is
 * `issueNumber` and the article count arrives under Prisma's `_count`; naming
 * them anything else here renders a blank in the archive.
 */
export interface PublicIssue {
  id: string;
  volume: number;
  issueNumber: number;
  year: number;
  title?: string | null;
  createdAt: string;
  _count?: { publications: number };
  publications?: IssuePublication[];
}

/** Article count for an issue, whichever shape the response carries. */
export function issueArticleCount(issue: PublicIssue): number {
  return issue._count?.publications ?? issue.publications?.length ?? 0;
}

/** "Volume 7, Issue 1, 2026" — the archive's canonical issue heading. */
export function formatIssueTitle(issue: {
  volume: number;
  issueNumber: number;
  year: number;
}): string {
  return `Volume ${issue.volume}, Issue ${issue.issueNumber}, ${issue.year}`;
}

export interface PublicArticle {
  id: string;
  slug: string;
  publishedAt: string;
  scholarReady?: boolean;
  issue?: { volume: number; issueNumber: number; year: number; title?: string | null } | null;
  manuscript: {
    title: string;
    abstract?: string;
    keywords?: string[];
    references?: string | null;
    author?: PublicAuthor | null;
    coAuthors?: PublicCoAuthor[];
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  name?: string;
  institution?: string;
  createdAt?: string;
}

// ─── Admin ─────────────────────────────────────────────────────────────────

export async function adminGetUsers() {
  return request<AdminUser[]>("GET", "/api/admin/users");
}

export async function adminCreateUser(data: {
  email: string;
  password: string;
  role: UserRole;
  /** Every role to grant. Defaults to just the primary role server-side. */
  roles?: UserRole[];
  name?: string;
  institution?: string;
}) {
  return request<AdminUser>("POST", "/api/admin/users", data);
}

/** Changes the roles an existing account holds. */
export async function adminUpdateUserRoles(
  userId: string,
  data: { role: UserRole; roles: UserRole[] },
) {
  return request<AdminUser>("PATCH", `/api/admin/users/${userId}/roles`, data);
}

export async function adminDeleteUser(userId: string) {
  return request("DELETE", `/api/admin/users/${userId}`);
}
