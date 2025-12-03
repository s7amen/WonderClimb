# WonderClimb – Security Checklist

## 1. Auth & Sessions
- [ ] **JWT Architecture**: Access token (short-lived) + Refresh token (long-lived).
- [ ] **Storage**: HttpOnly, Secure cookies for tokens. No localStorage for sensitive tokens.
- [ ] **Refresh Mechanism**: `POST /api/v1/auth/refresh` with rotation/blacklist check.
- [ ] **Logout**: Invalidate refresh token (cookie/DB).
- [ ] **CSRF**: SameSite cookies (Lax/Strict). CSRF token for critical mutations if needed.

## 2. Roles & Permissions (RBAC)
- [ ] **Roles**: `admin`, `coach`, `instructor`, `climber`.
- [ ] **Hierarchy**: `climber` (1) < `instructor` (2) < `coach` (3) < `admin` (4).
- [ ] **Backend Guards**: `requireAuth`, `requireRole(role)`, `requireMinRole(role)`.
- [ ] **Frontend Guards**: `ProtectedRoute`, `RequireMinRole`. UI elements hidden based on role.

## 3. Validation & Sanitization
- [ ] **Input Validation**: Zod/Joi schemas for all inputs (body, query, params).
- [ ] **Sanitization**: Trim strings, validate formats (email, phone).
- [ ] **Mongo Injection**: No raw queries from client. Whitelist filter fields.

## 4. Data Access / Ownership Rules
- [ ] **Parent/Climber**: Access only own data (children, bookings, passes).
- [ ] **Coach**: Access only own sessions and related data.
- [ ] **Instructor**: Access gym-related data. No deep finance access.
- [ ] **Admin**: Full access, but via guarded endpoints.
- [ ] **Endpoint Security**: Always filter by `userId` from token, not just params.

## 5. OWASP Basics
- [ ] **XSS**: No `dangerouslySetInnerHTML` without sanitization. Escape output on backend.
- [ ] **CSRF**: See Section 1.
- [ ] **Rate Limiting**: On auth endpoints (`login`, `register`, `refresh`, `reset`).
- [ ] **Brute-force**: Exponential backoff or account lockout.

## 6. Passwords & Accounts
- [ ] **Hashing**: bcrypt (cost >= 10).
- [ ] **Policy**: Min length 10 chars.
- [ ] **Reset**: Short-lived, hashed tokens. Invalidate on use.

## 7. Secrets & Config
- [ ] **Env Vars**: `DB_URI`, `JWT_SECRET`, etc. in `.env`.
- [ ] **No Commit**: `.env` in `.gitignore`.

## 8. HTTP Security Headers
- [ ] **Helmet**: Configured in Express.
- [ ] **CSP**: Content-Security-Policy set.
- [ ] **Headers**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.

## 9. CORS & Origin
- [ ] **Config**: Whitelist specific origins (prod/dev). No `*` in production.

## 10. Logs & Audit Trail
- [ ] **Logger**: Pino (JSON).
- [ ] **Events**: Login/out, Pass changes, Finance entries, Sensitive updates.
- [ ] **Audit Collection**: Store critical changes in `auditLogs` (optional v2).

## 11. Backup & Recovery
- [ ] **Strategy**: Daily snapshots. Retention policy.
- [ ] **Test**: Verify restore procedure.

## 12. Environments
- [ ] **Separation**: Dev, Staging, Prod.
- [ ] **Data**: No real user data in Dev/Staging.

## 13. Frontend Practices
- [ ] **Auth Hook**: Centralized `useAuth`.
- [ ] **Error Handling**: Unified handling for 401/403. Auto-refresh on 401.
