import Link from "next/link";
import Brand from "@/components/Brand";

export default function VerifyEmailPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell auth-shell-small">
        <div className="auth-brand"><Brand /></div>
        <section className="auth-card card auth-state">
          <div className="auth-state-icon">✉️</div>
          <span className="eyebrow">Almost there</span>
          <h1>Verify your email</h1>
          <p className="muted">
            We've sent a verification link to <strong>demo@example.com</strong>.
            Open the email and confirm your address to activate your account.
          </p>

          <div className="state-box">
            <span className="live-dot" />
            Waiting for verification
          </div>

          <button className="btn btn-primary btn-large" type="button">Resend Email</button>
          <p className="state-help">Didn't receive it? Check your spam folder or try again in a few minutes.</p>
          <Link className="back-auth" href="/login">Use a different email</Link>
        </section>
      </div>
    </main>
  );
}
