"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "./actions";
import { getCountryDisplayName } from "@/lib/geo-utils";

type ProfileFormProps = {
  initialDisplayName: string;
  email: string;
  initialCountryCode: string | null;
  initialTimezone: string | null;
};

export default function ProfileForm({
  initialDisplayName,
  email,
  initialCountryCode,
  initialTimezone,
}: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [timezone, setTimezone] = useState(
    initialTimezone ||
      (typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC")
  );
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const formattedCountry = initialCountryCode
    ? `${getCountryDisplayName(initialCountryCode)} (${initialCountryCode.toUpperCase()})`
    : "Detected automatically from IP";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await updateProfile({
        displayName,
        timezone,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update profile.");
      } else {
        setSuccessMessage("Profile updated successfully!");
        router.refresh();
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <label>
        <span>Display name</span>
        <input
          className="input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your display name"
          required
          minLength={2}
          maxLength={50}
        />
      </label>

      <label>
        <span>Email address</span>
        <input
          className="input"
          value={email}
          type="email"
          readOnly
          disabled
          style={{ opacity: 0.7, cursor: "not-allowed" }}
        />
      </label>

      <label>
        <span>Country (Determined by IP · Locked)</span>
        <input
          className="input"
          value={formattedCountry}
          readOnly
          disabled
          style={{ opacity: 0.75, cursor: "not-allowed", fontWeight: 500 }}
        />
      </label>

      <label>
        <span>Timezone</span>
        <input
          className="input"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="e.g. America/New_York or UTC"
        />
      </label>

      <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
        <p style={{ color: "var(--muted)", fontSize: "12px", margin: "0 0 12px" }}>
          🔒 Your country is locked to your verified IP location to ensure offer provider compliance and cannot be changed manually.
        </p>

        {errorMessage && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              marginBottom: 12,
              fontSize: "13px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              color: "#86efac",
              marginBottom: 12,
              fontSize: "13px",
            }}
          >
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? "Saving changes..." : "Save Profile Changes"}
        </button>
      </div>
    </form>
  );
}
