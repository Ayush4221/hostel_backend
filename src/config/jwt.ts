/**
 * JWT and refresh token config (DLP-style).
 * Access token: signed with user's jwt_secret, short-lived.
 * Refresh token: opaque token in Redis, 7 days TTL.
 */

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function getAccessTokenExpirySeconds(): number {
  const env = process.env.JWT_ACCESS_EXPIRY;
  if (env) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 28800; // 8 hours default
}

export function getRefreshTokenTTLSeconds(): number {
  const env = process.env.JWT_REFRESH_EXPIRY_SECONDS;
  if (env) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return REFRESH_TTL_SECONDS;
}
