import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import OfferCard from "@/components/OfferCard";

export default function Home() {
  return (
    <>
      <PublicNav />

      <main>
        <section className="hero container">
          <span className="eyebrow">✨ A smarter way to earn rewards</span>
          <h1>
            Turn your free time into{" "}
            <span className="gradient-text">real rewards.</span>
          </h1>
          <p>
            Complete eligible activities from one simple marketplace.
            Earn points, track your progress and discover new opportunities.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-large" href="/register">
              Start Earning →
            </Link>
            <Link className="btn btn-large" href="#how-it-works">
              How It Works
            </Link>
          </div>
        </section>

        <section id="ways-to-earn" className="section container">
          <div className="section-head">
            <h2>One simple way to earn</h2>
            <p>Browse the RewardNova marketplace and choose an eligible activity.</p>
          </div>

          <div className="cards">
            <article className="card">
              <div className="feature-icon">💰</div>
              <h3>Reward Marketplace</h3>
              <p>Browse eligible CPA, survey, app and other activities from one Earn section.</p>
              <Link className="btn btn-primary" href="/register">Start earning →</Link>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="section container">
          <div className="section-head">
            <h2>How it works</h2>
            <p>Three simple steps to get started.</p>
          </div>

          <div className="steps">
            <article className="card">
              <div className="step-number">01 — CREATE AN ACCOUNT</div>
              <h3>Join for free</h3>
              <p>Create your account and set up your basic profile.</p>
            </article>
            <article className="card">
              <div className="step-number">02 — COMPLETE ACTIVITIES</div>
              <h3>Pick an activity</h3>
              <p>Choose an eligible activity and follow the provider requirements.</p>
            </article>
            <article className="card">
              <div className="step-number">03 — EARN POINTS</div>
              <h3>Get credited</h3>
              <p>Once the provider verifies a qualifying conversion, your eligible reward is recorded.</p>
            </article>
          </div>
        </section>

        <section className="section container">
          <div className="section-head">
            <h2>Featured opportunities</h2>
            <p>UI placeholders for the provider-powered offer marketplace.</p>
          </div>

          <div className="offer-grid">
            <OfferCard
              icon="🎁"
              category="CPA"
              title="Complete a featured offer"
              description="Follow the provider's listed requirements to qualify."
              reward="Up to 25,000 pts"
            />
            <OfferCard
              icon="📋"
              category="SURVEY"
              title="Share your opinion"
              description="Complete a qualifying survey from an available provider."
              reward="Up to 4,000 pts"
            />

          </div>
        </section>

        <section id="faq" className="section container">
          <div className="section-head">
            <h2>Frequently asked questions</h2>
          </div>

          <div className="faq">
            <details>
              <summary>Is it free to join?</summary>
              <p>Yes. Creating an account is intended to be free. Individual offers may have their own eligibility requirements.</p>
            </details>
            <details>
              <summary>When do points appear?</summary>
              <p>Credit timing depends on the activity and the provider's verification process. Some rewards may initially appear as pending.</p>
            </details>
            <details>
              <summary>Are all offers available to everyone?</summary>
              <p>No. Availability can depend on country, device, eligibility and provider rules.</p>
            </details>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          RewardNova © 2026 · Earn responsibly and follow each offer&apos;s terms.
        </div>
      </footer>
    </>
  );
}