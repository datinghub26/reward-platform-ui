import Link from "next/link";

type OfferCardProps = {
  icon: string;
  category: string;
  title: string;
  description: string;
  reward: string;
};

export default function OfferCard({
  icon,
  category,
  title,
  description,
  reward,
}: OfferCardProps) {
  return (
    <article className="card offer-card">
      <div className="offer-top">
        <span
          className="feature-icon"
          style={{ margin: 0 }}
        >
          {icon}
        </span>

        <span className="badge">
          {category}
        </span>
      </div>

      <h3 style={{ marginTop: 20 }}>
        {title}
      </h3>

      <p>
        {description}
      </p>

      <div className="reward">
        {reward}
      </div>

      <Link
        className="btn btn-primary"
        href="/register"
        style={{ display: "block", marginTop: 16, textAlign: "center" }}
      >
        Start earning →
      </Link>
    </article>
  );
}
