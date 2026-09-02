import Link from "next/link";
import { AppHeader } from "@/features/jida/components";

export default function AboutPage() {
  return (
    <main className="jida-shell">
      <AppHeader />

      <section className="jida-about-hero">
        <p className="jida-section-kicker">About</p>
        <h1>About JIDA</h1>
        <p>
          Everything you need to know about the Journal of Inter-Discourse
          Academia — what it is, why to publish here, how to prepare a
          submission, and who reviews it.
        </p>
      </section>

      <section id="about-jida" className="jida-about-block">
        <p className="jida-section-kicker">About JIDA</p>
        <h2>What is the Journal of Inter-Discourse Academia?</h2>
        <div className="jida-about-card">
          <p>
            The Journal of Inter-Discourse Academia (JIDA) is a peer-reviewed
            academic journal published by the{" "}
            <strong>Adventist University of Central Africa (AUCA)</strong>.
            The journal started early in 2014 and is published biannually,
            with two issues appearing in June and December each year.
          </p>
          <p>
            JIDA&apos;s editorial board represents a diverse team from
            different academic fields — education, languages, marketing, and
            the human sciences — each member selected for their academic
            exposure, research, and publication experience.
          </p>
          <p>
            JIDA aims to provide interdisciplinary discussion, locally and
            internationally, on views and issues that affect our workplace and
            our society.
          </p>
        </div>
      </section>

      <section id="why-publish" className="jida-about-block jida-about-block-alt">
        <p className="jida-section-kicker">Why JIDA</p>
        <h2>Why publish with JIDA</h2>

        <div className="jida-why-grid">
          <article className="jida-why-card">
            <span className="jida-why-num">01</span>
            <h3>Interdisciplinary reach</h3>
            <p>
              JIDA publishes peer-reviewed research across education,
              business, science, and the humanities — interdisciplinary
              discussion on issues that affect our workplace and our society.
            </p>
          </article>
          <article className="jida-why-card">
            <span className="jida-why-num">02</span>
            <h3>An experienced editorial board</h3>
            <p>
              Every submission is guided by AUCA scholars from education,
              languages, marketing, and the human sciences, led by Chief
              Editor Prof. Kayigema Jacques and Associate Editor Mr. Nibishaka
              Enock.
            </p>
          </article>
          <article className="jida-why-card">
            <span className="jida-why-num">03</span>
            <h3>Accessible publishing fees</h3>
            <p>
              Free for AUCA faculty, and $50 for external authors — keeping
              rigorous, peer-reviewed publishing within reach.
            </p>
          </article>
          <article className="jida-why-card">
            <span className="jida-why-num">04</span>
            <h3>A predictable schedule</h3>
            <p>
              Two issues a year, published in June and December, so authors
              always know when their work will reach readers.
            </p>
          </article>
        </div>

        <div className="jida-why-cta">
          <Link href="/signup" className="jida-btn-primary">
            Start your submission
          </Link>
        </div>
      </section>

      <section id="guidelines" className="jida-about-block">
        <p className="jida-section-kicker">Guidelines</p>
        <h2>Guidelines to publish with JIDA</h2>

        <div className="jida-guidelines-grid">
          <article className="jida-about-card">
            <h3>Paper title and author&apos;s details</h3>
            <ul>
              <li>Full title of the paper</li>
              <li>Title, full surname and first name</li>
              <li>E-mail address (state the corresponding author if there are multiple)</li>
              <li>Institutional affiliation</li>
            </ul>
          </article>

          <article className="jida-about-card">
            <h3>Abstract &amp; length</h3>
            <ul>
              <li>250–300 words, including keywords</li>
              <li>Written in English, maximum 15 pages</li>
              <li>No references, tables, or graphics in the abstract</li>
              <li>Abbreviations spelled out in full at first mention</li>
              <li>Text free of typos and grammatical errors</li>
            </ul>
          </article>

          <article className="jida-about-card">
            <h3>Formatting</h3>
            <ul>
              <li>MS Word, Times New Roman 12, single spacing, left justification, no indent</li>
              <li>Margins: 25mm left/right, 20mm top/bottom</li>
              <li>Title: bold, centered, title case, Arial 14pt</li>
              <li>
                Author name(s), department, institution and email: Arial
                Narrow 11 — mark the main author with an asterisk when there
                are several
              </li>
            </ul>
          </article>

          <article className="jida-about-card">
            <h3>APA heading levels</h3>
            <ul>
              <li>Level 1: Centered, bolded, title case</li>
              <li>Level 2: Left-aligned, bolded, title case</li>
              <li>Level 3: Indented (0.5&quot;), bolded, title case</li>
              <li>Level 4: Indented (0.5&quot;), italicized, title case</li>
              <li>Level 5: Indented (0.5&quot;), italicized, title case</li>
            </ul>
          </article>
        </div>

        <div className="jida-about-card jida-about-note">
          <p>
            <strong>Publication fee:</strong> Free to AUCA faculty — $50 for
            other authors.
          </p>
          <p>
            <strong>Enquiries:</strong> Prof. Kayigema Jacques, Chief Editor —
            +250 788 866 769 ·{" "}
            <a href="mailto:jacques.kayigema@auca.ac.rw">jacques.kayigema@auca.ac.rw</a>
          </p>
        </div>
      </section>

      <section id="editorial-board" className="jida-about-block jida-about-block-alt">
        <p className="jida-section-kicker">Editorial board</p>
        <h2>Editorial Board</h2>

        <div className="jida-board-grid">
          <article className="jida-board-card">
            <h3>Prof. Kayigema Jacques</h3>
            <p className="jida-board-role">Chief Editor</p>
            <p>+250 788 866 769</p>
            <a href="mailto:jacques.kayigema@auca.ac.rw">jacques.kayigema@auca.ac.rw</a>
          </article>
          <article className="jida-board-card">
            <h3>Mr. Nibishaka Enock</h3>
            <p className="jida-board-role">Associate Editor</p>
            <p>+250 788 572 042</p>
            <a href="mailto:enock.nibishaka@auca.ac.rw">enock.nibishaka@auca.ac.rw</a>
          </article>
          <article className="jida-board-card">
            <h3>Mr. Nsabimana Aphrodise</h3>
            <p className="jida-board-role">Typesetting &amp; Marketing Advisor</p>
            <p>+250 788 668 260</p>
            <a href="mailto:aphrodice.nsabimana@auca.ac.rw">aphrodice.nsabimana@auca.ac.rw</a>
          </article>
        </div>
      </section>

      <div className="jida-about-back">
        <Link href="/">← Back to home</Link>
      </div>
    </main>
  );
}
