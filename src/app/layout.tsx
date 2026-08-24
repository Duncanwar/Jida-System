import type { Metadata } from "next";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";

export const metadata: Metadata = {
  title: {
    default: "JIDA System — Journal of Inter-Discourse Academia",
    template: "%s | JIDA System",
  },
  description:
    "A peer-reviewed digital platform for manuscript submission, structured editorial review, revision tracking, and publication — built for authors, reviewers, and editors.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
