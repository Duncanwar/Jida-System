const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
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
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }

  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (text ? JSON.parse(text) : undefined) as T;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export type Role = "AUTHOR" | "REVIEWER" | "EDITOR" | "ADMIN";
export type UserRole = "AUTHOR" | "REVIEWER" | "EDITOR";

export async function login(email: string, password: string, role: Role) {
  return request<{
    accessToken: string;
    expiresInMinutes: number;
    user: { id: string; email: string; role: Role; firstName?: string | null; lastName?: string | null };
  }>("POST", "/api/auth/login", { email, password, role });
}

export async function register(data: {
  email: string;
  password: string;
  role: Role;
  name?: string;
  institution?: string;
}) {
  return request<{ accessToken: string }>("POST", "/api/auth/register", data);
}

export async function forgotPassword(email: string) {
  return request("POST", "/api/auth/forgot-password", { email });
}

export async function resetPassword(token_: string, newPassword: string) {
  return request("POST", "/api/auth/reset-password", { token: token_, newPassword });
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

// ─── Author — Manuscripts ──────────────────────────────────────────────────

export async function getManuscripts(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<ManuscriptSummary[]>("GET", `/api/manuscripts${qs}`);
}

export async function getManuscript(id: string) {
  return request<ManuscriptDetail>("GET", `/api/manuscripts/${id}`);
}

export async function submitManuscript(form: FormData) {
  return request<{ id: string }>("POST", "/api/manuscripts", form, true);
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

export async function submitReview(
  assignmentId: string,
  data: {
    commentsToAuthor: string;
    commentsToEditor: string;
    recommendation: ReviewRecommendation;
  },
) {
  return request("POST", `/api/reviewer/assignments/${assignmentId}/review`, data);
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
) {
  return request("POST", `/api/editor/manuscripts/${manuscriptId}/decision`, { decision });
}

export async function getReviewers() {
  return request<ReviewerOption[]>("GET", "/api/editor/reviewers");
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

export async function setScholarReady(publicationId: string, scholarReady: boolean) {
  return request("PATCH", `/api/editor/publications/${publicationId}/scholar`, { scholarReady });
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

export interface ManuscriptSummary {
  id: string;
  title: string;
  status: ManuscriptStatus;
  createdAt?: string;
  submittedAt?: string;
  submissionDeadline?: string;
  publication?: { slug: string; publishedAt: string } | null;
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
  files?: { id: string; name: string }[];
  assignments?: Assignment[];
}

export interface Assignment {
  id: string;
  manuscriptId: string;
  manuscriptTitle?: string;
  deadline: string;
  progress: ReviewProgress;
  recommendation?: ReviewRecommendation;
  commentsToAuthor?: string;
  commentsToEditor?: string;
  reviewer?: { id: string; name?: string; email: string };
}

export interface EditorSubmission {
  id: string;
  title: string;
  status: ManuscriptStatus;
  authorName?: string;
  assignments?: Assignment[];
}

export interface PublicIssue {
  id: string;
  volume: number;
  issue: number;
  year: number;
  publishedAt: string;
  articleCount: number;
}

export interface PublicArticle {
  id: string;
  slug: string;
  title: string;
  authorName?: string;
  keywords?: string[];
  issue?: string;
  publishedAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
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
  name?: string;
  institution?: string;
}) {
  return request<AdminUser>("POST", "/api/admin/users", data);
}

export async function adminDeleteUser(userId: string) {
  return request("DELETE", `/api/admin/users/${userId}`);
}
