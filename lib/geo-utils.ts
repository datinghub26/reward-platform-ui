// Convert 2-letter ISO code to unicode flag emoji (e.g. US -> 🇺🇸, BD -> 🇧🇩)
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "🌐";
  }
}

// Get user-friendly country name with flag (e.g. "🇧🇩 Bangladesh" or "🇺🇸 United States")
export function getCountryDisplayName(countryCode: string | null | undefined): string {
  if (!countryCode) return "Global / Worldwide";
  const code = countryCode.trim().toUpperCase();
  if (code === "ALL" || code === "GLOBAL") return "Global / Worldwide";

  const flag = getCountryFlag(code);
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const name = displayNames.of(code);
    return `${flag} ${name || code}`;
  } catch {
    return `${flag} ${code}`;
  }
}

// Determine if an offer matches the user's IP country
export function isOfferEligibleForCountry(
  offerCountries: string[] | null | undefined,
  userCountryCode: string | null | undefined
): boolean {
  // If offer has no country restriction or is global, it is available worldwide
  if (!offerCountries || offerCountries.length === 0) return true;

  const normalizedOfferCountries = offerCountries.map((c) =>
    c.trim().toUpperCase()
  );

  if (
    normalizedOfferCountries.includes("ALL") ||
    normalizedOfferCountries.includes("GLOBAL")
  ) {
    return true;
  }

  if (!userCountryCode) return false;

  return normalizedOfferCountries.includes(userCountryCode.trim().toUpperCase());
}
