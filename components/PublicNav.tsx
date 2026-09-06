import Link from "next/link";
import Brand from "./Brand";
import { getActiveNavbarButtons } from "@/lib/navbar-buttons";

export default function PublicNav() {
  const navButtons = getActiveNavbarButtons();

  return (
    <header className="topbar">
      <div className="container nav">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation">
          {navButtons.length > 0 ? (
            navButtons.map((btn) => (
              <Link
                key={btn.id}
                href={btn.url}
                target={btn.isExternal ? "_blank" : undefined}
                rel={btn.isExternal ? "noopener noreferrer" : undefined}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {btn.icon && <span style={{ fontSize: "14px" }}>{btn.icon}</span>}
                <span>{btn.label}</span>
                {btn.badge && (
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: "rgba(99, 102, 241, 0.25)",
                      color: "#818cf8",
                      border: "1px solid rgba(99, 102, 241, 0.4)",
                      fontWeight: 700,
                    }}
                  >
                    {btn.badge}
                  </span>
                )}
              </Link>
            ))
          ) : (
            <>
              <Link href="#how-it-works">How It Works</Link>
              <Link href="/earn">Earn</Link>
              <Link href="#faq">FAQ</Link>
            </>
          )}
        </nav>
        <div className="nav-actions">
          <Link className="btn" href="/login">Login</Link>
          <Link className="btn btn-primary" href="/register">Start Earning</Link>
        </div>
      </div>
    </header>
  );
}
