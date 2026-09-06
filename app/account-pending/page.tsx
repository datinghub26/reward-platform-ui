import Link from "next/link";
import Brand from "@/components/Brand";

export default function AccountPendingPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell auth-shell-small">
        <div className="auth-brand"><Brand /></div>
        <section className="auth-card card auth-state">
          <div className="auth-state-icon">⏳</div>
          <span className="eyebrow">Account review</span>
          <h1>Your account is being reviewed</h1>
          <p className="muted">
            Some account actions may remain unavailable while required checks are completed.
            We'll show the next step here when the review changes.
          </p>

          <div className="state-list">
            <div><span>✓</span><strong>Account created</strong></div>
            <div><span>✓</span><strong>Email confirmed</strong></div>
            <div><span>•</span><strong>Account review pending</strong></div>
          </div>

          <Link className="btn btn-primary btn-large" href="/dashboard">Go to Dashboard</Link>
          <Link className="back-auth" href="/support">Need help? Contact support</Link>
        </section>
      </div>
    </main>
  );
}
