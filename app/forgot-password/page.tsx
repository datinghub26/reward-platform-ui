import Link from "next/link";
import Brand from "@/components/Brand";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell auth-shell-small">
        <div className="auth-brand"><Brand /></div>
        <section className="auth-card card">
          <div className="auth-state-icon">🔐</div>
          <div className="auth-heading">
            <span className="eyebrow">Account recovery</span>
            <h1>Forgot your password?</h1>
            <p className="muted">
              Enter the email address linked to your account and we'll send recovery instructions.
            </p>
          </div>

          <form className="auth-form">
            <label>
              <span>Email address</span>
              <input type="email" placeholder="you@example.com" autoComplete="email" />
            </label>
            <button className="btn btn-primary btn-large" type="button">Send Reset Link</button>
          </form>

          <Link className="back-auth" href="/login">← Back to sign in</Link>
        </section>
      </div>
    </main>
  );
}
