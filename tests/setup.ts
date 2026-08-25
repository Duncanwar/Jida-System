import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Components render outside a Next.js app-router tree in tests (e.g.
// DashboardSidebar's logout button calls useRouter().push), which throws
// "invariant expected app router to be mounted" without this stand-in.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
