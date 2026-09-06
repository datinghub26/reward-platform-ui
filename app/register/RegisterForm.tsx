"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerReferralAction, validateRegistrationEmailAction } from "./actions";

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !confirmPassword) {
      setError("Complete all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Validate email domain protection policy
    const domainValidation = await validateRegistrationEmailAction(normalizedEmail);
    if (!domainValidation.valid) {
      setError(domainValidation.error || "This email domain is not authorized for registration.");
      setLoading(false);
      return;
    }

    const signUpOptions: { data?: { referred_by?: string } } = {};
    if (refCode && refCode.trim()) {
      signUpOptions.data = { referred_by: refCode.trim() };
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: signUpOptions,
    });

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "An account with this email already exists."
          : signUpError.message
      );
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError(
        "The account was created, but Supabase is still requiring email confirmation. Disable Confirm email in Supabase Auth settings."
      );
      setLoading(false);
      return;
    }

    if (data.user?.id && refCode && refCode.trim()) {
      try {
        await registerReferralAction(
          data.user.id,
          refCode.trim(),
          normalizedEmail
        );
      } catch (refErr) {
        console.error("Failed to link referral:", refErr);
      }
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {refCode && (
        <div
          style={{
            background: "rgba(99, 102, 241, 0.12)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#c7d2fe",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <span>🎁</span>
          <span>
            Invited by <strong>{refCode.trim()}</strong> (Bonus active)
          </span>
        </div>
      )}

      <label>
        <span>Email address</span>
        <input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </label>

      <label>
        <span>Password</span>
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} disabled={loading}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <label>
        <span>Confirm password</span>
        <div className="password-field">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm your password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
          <button type="button" onClick={() => setShowConfirm((value) => !value)} disabled={loading}>
            {showConfirm ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {error && <div className="auth-error" role="alert">{error}</div>}

      <button className="btn btn-primary btn-large" type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
