import Link from "next/link";
import Brand from "@/components/Brand";

export default function AccountSuspendedPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell auth-shell-small">
        <div className="auth-brand"><Brand /></div>
        <section className="auth-card card auth-state">
          <div className="auth-state-icon danger">!</div>
          <span className="eyebrow">Account access</span>
          <h1>Account temporarily unavailable</h1>
          <p className="muted">
            Access to this account is currently restricted. If you believe this is a mistake,
            contact support and include your account email and relevant details.
          </p>

          <div className="state-box state-danger">
            Account status: Restricted
          </div>

          <Link className="btn btn-primary btn-large" href="/support">Contact Support</Link>
          <Link className="back-auth" href="/login">Return to sign in</Link>
        </section>
      </div>
    </main>
  );
}
