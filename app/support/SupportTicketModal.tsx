"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupportTicket } from "./actions";

export default function SupportTicketModal({
  defaultCategory = "",
}: {
  defaultCategory?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState(defaultCategory ? `Issue: ${defaultCategory}` : "");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleOpen(cat?: string) {
    if (cat) {
      setSubject(`Issue: ${cat}`);
    } else {
      setSubject("");
    }
    setMessage("");
    setError("");
    setSuccess(false);
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await createSupportTicket({
        subject,
        message,
        priority,
      });

      if (!res.success) {
        setError(res.error || "Failed to submit ticket.");
      } else {
        setSuccess(true);
        router.refresh();
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setSubject("");
          setMessage("");
        }, 1800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => handleOpen()}
        >
          Open Support Ticket
        </button>

        <button
          className="btn"
          type="button"
          onClick={() => handleOpen("Offer Tracking / Credit")}
        >
          Report Offer Issue
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setIsOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Create Support Ticket</h2>
              <button
                type="button"
                onClick={() => !submitting && setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {success ? (
              <div
                style={{
                  padding: "18px",
                  borderRadius: "10px",
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  color: "#86efac",
                  textAlign: "center",
                  fontSize: "14px",
                }}
              >
                ✓ Ticket submitted successfully! Our support team will review your message.
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {error && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#fca5a5",
                      fontSize: "13px",
                    }}
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
                    Subject
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Missing reward for Survey #104"
                    required
                    minLength={3}
                    maxLength={100}
                    style={{ width: "100%", padding: "10px 14px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
                    Priority
                  </label>
                  <select
                    className="input"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", background: "#1f2937", color: "inherit" }}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
                    Message Details
                  </label>
                  <textarea
                    className="input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please describe your issue, offer details, or question with as much detail as possible..."
                    required
                    minLength={10}
                    rows={5}
                    style={{ width: "100%", padding: "10px 14px", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setIsOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
