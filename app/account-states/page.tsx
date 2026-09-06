import Link from "next/link";
import Brand from "@/components/Brand";

const states = [
  ["account-suspended", "!", "Account restricted", "Access temporarily unavailable"],
];

export default function AccountStatesPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand"><Brand /></div>
        <section className="auth-card card">
          <div className="auth-heading">
            <span className="eyebrow">Development UI</span>
            <h1>Account states</h1>
            <p className="muted">Preview account access states before the real auth system is connected.</p>
          </div>

          <div className="state-preview-grid">
            {states.map(([href, icon, title, description]) => (
              <Link className="state-preview" href={`/${href}`} key={href}>
                <span>{icon}</span>
                <strong>{title}</strong>
                <small>{description}</small>
              </Link>
            ))}
          </div>

          <div className="auth-state-links">
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
            <Link href="/forgot-password">Forgot password</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
