"use client";

import Link from "next/link";
import { AppHeader } from "@/features/jida/components";

export default function NotFound() {
  return (
    <main className="jida-shell">
      <AppHeader />
      <section className="jida-not-found">
        <p className="jida-section-kicker">404</p>
        <h1>This page doesn&apos;t exist</h1>
        <p>
          The page you&apos;re looking for may have been moved or the link may be
          incorrect.
        </p>
        <div className="jida-not-found-actions">
          <Link href="/" className="jida-btn-primary">
            Go to homepage
          </Link>
          <Link href="/archive" className="jida-btn-secondary">
            Browse the archive
          </Link>
        </div>
      </section>
    </main>
  );
}
