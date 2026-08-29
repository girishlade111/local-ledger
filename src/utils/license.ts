/**
 * Offline License Validation System for Local Ledger PRO
 *
 * Supported License Key Formats:
 * Standard Format: LLPRO-[TIER]-[CUSTOMER_TAG]-[CHECKSUM]
 * Example: LLPRO-LIFETIME-ACME-XXXXXX
 *
 * Validation runs 100% client-side with zero external network requests.
 */

const SECRET_SALT = "LOCAL_LEDGER_PRO_SECRET_SALT_2026";

/**
 * Deterministic checksum calculation over the payload with secret salt
 */
function calculateChecksum(payload: string): string {
  let hash = 5381;
  const combined = `${payload}:${SECRET_SALT}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 33) ^ combined.charCodeAt(i);
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
}

/**
 * Helper to generate valid license keys for sales / test scripts
 */
export function generateLicenseKey(
  customerTag: string = "PRO",
  tier: "LIFETIME" | "ANNUAL" = "LIFETIME",
): string {
  const cleanTag =
    customerTag
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8) || "CLIENT";
  const payload = `${tier}-${cleanTag}`;
  const checksum = calculateChecksum(payload);
  return `LLPRO-${payload}-${checksum}`;
}

export interface LicenseValidationResult {
  isValid: boolean;
  tier?: string;
  customerTag?: string;
  error?: string;
}

/**
 * Validates a license key client-side using deterministic offline verification
 */
export function validateLicenseKey(rawKey: string): LicenseValidationResult {
  if (!rawKey || typeof rawKey !== "string") {
    return { isValid: false, error: "Please enter a license key." };
  }

  const key = rawKey.trim().toUpperCase();

  // Built-in lifetime test keys for demonstration & sandbox
  if (
    key === "LLPRO-DEMO-2026-ACTIVE" ||
    key === "LLPRO-LIFETIME-PREMIUM" ||
    key === "LLPRO-LIFETIME-USER-9B7C1E"
  ) {
    return {
      isValid: true,
      tier: "LIFETIME",
      customerTag: "DEMO_USER",
    };
  }

  // Format: LLPRO-[TIER]-[CUSTOMER]-[CHECKSUM]
  const parts = key.split("-");
  if (parts.length !== 4 || parts[0] !== "LLPRO") {
    return {
      isValid: false,
      error: "Invalid license format. Expected format: LLPRO-LIFETIME-XXXX-XXXXXX",
    };
  }

  const tier = parts[1];
  const customerTag = parts[2];
  const providedChecksum = parts[3];

  if (!tier || !customerTag || !providedChecksum) {
    return { isValid: false, error: "Malformed license key components." };
  }

  const expectedChecksum = calculateChecksum(`${tier}-${customerTag}`);
  if (providedChecksum !== expectedChecksum) {
    return {
      isValid: false,
      error: "Invalid license signature or key. Please verify your purchase receipt.",
    };
  }

  return {
    isValid: true,
    tier,
    customerTag,
  };
}

/**
 * Pre-generated sample keys for testing & documentation
 */
export const SAMPLE_PRO_KEYS = [
  generateLicenseKey("STUDIO", "LIFETIME"),
  generateLicenseKey("ACME", "LIFETIME"),
  "LLPRO-DEMO-2026-ACTIVE",
];
