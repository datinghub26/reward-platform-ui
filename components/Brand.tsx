import Link from "next/link";

export default function Brand() {
  return (
    <Link href="/" className="brand" aria-label="RewardNova home">
      <span className="brand-mark">R</span>
      <span>RewardNova</span>
    </Link>
  );
}