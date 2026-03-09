# Refresh Token Implementation Plan (DLP-Style)

## 1. Implemented Design

- **Access token (JWT)**: Signed with the **user’s** `jwt_secret` (stored in `users` table). Short-lived (e.g. 8 hours). Used as `Authorization: Bearer <accessToken>` on every API request.
- **Refresh token**: Opaque string stored **only in Redis** with TTL 7 days. Used only to get a new access token (and optionally rotated on each refresh). Not stored in the DB.
- **Per-user JWT secret**: Column `users.jwt_secret` is auto-generated on user creation (or backfilled on first login). Rotating this secret invalidates all access tokens for that user.

## 2. Token Strategy

| Token         | Lifetime   | Storage        | Purpose                    |
|---------------|------------|----------------|----------------------------|
| Access token  | 8h (configurable) | Client only    | Authorize API requests     |
| Refresh token | 7 days     | Client + Redis | Obtain new access tokens   |

- **Access token**: JWT, signed with `user.jwt_secret`, payload `{ userId, role }`, expiry from `JWT_ACCESS_EXPIRY` (seconds).
- **Refresh token**: Opaque 64-char hex, Redis key `refresh_token:<token>` → value `userId`, TTL from `JWT_REFRESH_EXPIRY_SECONDS`.

## 3. Environment Variables

```env
JWT_ACCESS_EXPIRY=28800
JWT_REFRESH_EXPIRY_SECONDS=604800
REDIS_URL=redis://localhost:6379
```

- `JWT_ACCESS_EXPIRY`: Access token lifetime in **seconds** (default 28800 = 8 hours).
- `JWT_REFRESH_EXPIRY_SECONDS`: Refresh token TTL in Redis in **seconds** (default 604800 = 7 days).
- `REDIS_URL`: Required for refresh tokens; server checks Redis on startup when set.

## 4. API

### 4.1 Login & Register Response

`{ accessToken, refreshToken, expiresIn, user }`

- `accessToken`: JWT signed with user’s `jwt_secret`.
- `refreshToken`: Opaque string; send only to `/api/auth/refreshtoken` or `/api/auth/signout`.
- `expiresIn`: Seconds until access token expires.
- `user`: Same user DTO as before.

### 4.2 Refresh

- **POST** `/api/auth/refreshtoken`
- **Body**: `{ "refreshToken": "<stored refresh token>" }`
- **Success (200)**: `{ accessToken, refreshToken, expiresIn }` (new refresh token = rotation).
- **Failure (401)**: Invalid or expired refresh token.

Flow: Load refresh token from Redis → get `userId` → load user → delete old refresh token → create new refresh token in Redis → sign new JWT with `user.jwt_secret` → return new access + refresh.

### 4.3 Logout (signout)

- **POST** `/api/auth/signout`
- **Body**: `{ "refreshToken": "..." }` or header `Authorization: Bearer <refreshToken>`.
- **Success (200)**: Refresh token removed from Redis; client clears tokens.

## 5. Redis Key Design

- **Key**: `refresh_token:<token>` (token = 64-char hex).
- **Value**: `userId` (string).
- **TTL**: `JWT_REFRESH_EXPIRY_SECONDS` (e.g. 7 days). Redis expires the key automatically.

Create on login/register and on refresh (after deleting old). Delete on refresh (rotation) and on signout.

## 6. Middleware

- **authenticateToken**: Decodes JWT to get `userId` (no verify yet) → loads user → verifies JWT with `user.jwtSecret` → sets `req.user`. No global JWT secret; each user has their own secret.
- **authorizeRoles**: Unchanged; checks `req.user.role`.

## 7. Database

- **Mongoose**: `User` has `jwtSecret` (String); set on register; backfilled on first login if missing.
- **Postgres** (migration `V7__users_jwt_secret.sql`): `users.jwt_secret` NOT NULL, default `encode(gen_random_bytes(32), 'hex')` for new rows; existing rows backfilled.

## 8. End-to-End Flow (Summary)

1. **Login** → Validate credentials → Ensure user has `jwt_secret` (generate + save if missing) → Create refresh token in Redis (TTL 7d) → Sign JWT with `user.jwt_secret` → Return `{ accessToken, refreshToken, expiresIn, user }`.
2. **Each API request** → `Authorization: Bearer <accessToken>` → Middleware loads user by `userId` from token, verifies with `user.jwtSecret` → If 401 (expired/invalid), client calls refresh.
3. **Refresh** → Look up refresh token in Redis → Get `userId` → Load user → Delete old refresh token → Create new refresh token in Redis → Sign new JWT → Return `{ accessToken, refreshToken, expiresIn }`.
4. **Logout** → Client sends refresh token to `/api/auth/signout` → Server deletes that key from Redis → Client clears cookies/storage.

## 9. Security Notes

- **Per-user secret**: Revoking all tokens for a user = update `user.jwt_secret` (e.g. new random value and save).
- **Refresh rotation**: Old refresh token is deleted when used; only the new one is valid.
- **Redis required**: When `REDIS_URL` is set, server startup checks Redis; refresh/signout depend on it.

## 10. Files Touched

| File | Purpose |
|------|---------|
| `db/migration/V7__users_jwt_secret.sql` | Add `users.jwt_secret` |
| `src/models/user.model.ts` | Add `jwtSecret` field |
| `src/config/jwt.ts` | Access expiry + refresh TTL from env |
| `src/services/RefreshTokenService.ts` | Create / get / delete / rotate in Redis |
| `src/services/AuthService.ts` | Login/register/refresh/logout with per-user JWT + refresh |
| `src/middleware/auth.middleware.ts` | Verify JWT with `user.jwtSecret` |
| `src/dto/auth.dto.ts` | LoginResponseDto, RefreshRequestDto, RefreshResponseDto |
| `src/controllers/auth.controller.ts` | refreshToken, logout handlers |
| `src/routes/auth.routes.ts` | POST `/refreshtoken`, POST `/signout` |
