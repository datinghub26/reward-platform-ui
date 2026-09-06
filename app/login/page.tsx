import { Suspense } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand"><Brand /></div>
        <section className="auth-card card">
          <div className="auth-heading">
            <span className="eyebrow">Welcome back</span>
            <h1>Sign in to RewardNova</h1>
            <p className="muted">Access your balance, offers and earning history.</p>
          </div>

          <Suspense fallback={<div className="muted" style={{ padding: 20 }}>Loading sign in...</div>}>
            <LoginForm />
          </Suspense>
        </section>

        <p className="auth-legal">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
