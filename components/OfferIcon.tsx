"use client";

import { useState } from "react";

type OfferIconProps = {
  icon?: string | null;
  title?: string;
  className?: string;
  fallback?: string;
};

export default function OfferIcon({
  icon,
  title = "Offer",
  className = "offer-icon",
  fallback = "🎁",
}: OfferIconProps) {
  const [imgError, setImgError] = useState(false);

  const isImageUrl =
    Boolean(icon) &&
    !imgError &&
    (icon!.startsWith("http://") ||
      icon!.startsWith("https://") ||
      icon!.startsWith("/") ||
      icon!.startsWith("data:image/"));

  return (
    <div className={className}>
      {isImageUrl ? (
        <img
          src={icon!}
          alt={title}
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: "inherit",
          }}
        />
      ) : (
        <span>{imgError ? fallback : icon || fallback}</span>
      )}
    </div>
  );
}
