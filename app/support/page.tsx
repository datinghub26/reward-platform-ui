import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import SupportTicketModal from "./SupportTicketModal";

const faqs = [
  ["When will my points arrive?", "Provider offers may require verification before points become available in your balance."],
  ["Why is an offer missing?", "Availability depends strictly on your verified IP country, device, eligibility and provider rules."],
  ["Who handles offer verification?", "The connected offer network verifies conversions before RewardNova processes the final points reward."],
  ["How do withdrawals work?", "Once you reach the 1,000 pts ($1.00) minimum, submit a request on the Withdraw page. Requests are reviewed and processed within 24-48 hours."],
];

function formatDate(val: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(val));
  } catch {
    return val;
  }
}

export default async function SupportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let tickets: any[] = [];
  if (user) {
    const { data } = await supabase
      .from("support_tickets")
      .select("id, subject, message, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    tickets = data ?? [];
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar active="support" />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">🆘 Help center</span>
            <h1>Support</h1>
            <p className="muted">Find answers or contact our team about your account and earning activity.</p>
          </div>
          <Link className="btn btn-primary" href="/earn">Back to Earn →</Link>
        </div>

        <section className="support-grid" style={{ marginBottom: 24 }}>
          <div className="card support-contact">
            <div className="support-icon">💬</div>
            <h2>Contact support</h2>
            <p className="muted">Need help with an account issue or points inquiry? Send us a message.</p>
            <SupportTicketModal />
            <span className="support-response">Typical response: within 24–48 hours</span>
          </div>

          <div className="card support-contact">
            <div className="support-icon">📋</div>
            <h2>Offer issue</h2>
            <p className="muted">Have a question about a specific offer, tracking, or delayed credit?</p>
            <SupportTicketModal defaultCategory="Offer Tracking" />
            <span className="support-response">Keep your offer name and click timestamp ready.</span>
          </div>
        </section>

        {tickets.length > 0 && (
          <section className="dashboard-section">
            <div className="section-head">
              <div>
                <h2>Your support tickets</h2>
                <p>Track the status of your recent inquiries.</p>
              </div>
            </div>

            <div className="card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {tickets.map((t) => {
                  const isResolved = t.status === "resolved" || t.status === "closed";
                  return (
                    <div
                      key={t.id}
                      style={{
                        padding: "16px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <strong style={{ fontSize: "15px" }}>{t.subject}</strong>
                        <span
                          className="badge"
                          style={{
                            fontSize: "11px",
                            background: isResolved ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                            color: isResolved ? "#86efac" : "#fde047",
                            border: `1px solid ${isResolved ? "rgba(34, 197, 94, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
                          }}
                        >
                          {(t.status || "open").toUpperCase()}
                        </span>
                      </div>

                      <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--muted)" }}>
                        {t.message}
                      </p>

                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        Submitted on {formatDate(t.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="dashboard-section">
          <div className="section-head">
            <div><h2>Frequently asked questions</h2><p>Quick answers to common questions.</p></div>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details className="card faq-item" key={question}>
                <summary>{question}<span>+</span></summary>
                <p className="muted">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="card support-warning">
          <strong>Important:</strong> Never share your password, authentication
          codes or other sensitive account credentials with anyone claiming to
          be support.
        </section>
      </main>
    </div>
  );
}
