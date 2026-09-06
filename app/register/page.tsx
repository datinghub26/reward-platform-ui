import { Suspense } from "react";
import Brand from "@/components/Brand";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell auth-shell-small">
        <div className="auth-brand"><Brand /></div>

        <section className="auth-card card">
          <div className="auth-heading">
            <span className="eyebrow">Start earning</span>
            <h1>Create your account</h1>
            <p className="muted">
              Create your RewardNova account and start exploring available offers.
            </p>
          </div>

          <Suspense fallback={<div className="muted" style={{ padding: 20 }}>Loading registration...</div>}>
            <RegisterForm />
          </Suspense>
        </section>

        <p className="auth-legal">
          You can sign in immediately after creating your account.
        </p>
      </div>
    </main>
  );
}
