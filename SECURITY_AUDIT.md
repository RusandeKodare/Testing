# Security Audit Report

Last Updated: April 3, 2026
Framework: OWASP Top 10 (2021)
Scope: Backend, frontend, auth, OAuth, profile management, CI/CD security automation

## Executive Summary

A fresh, evidence-based security re-audit was completed and this file was rewritten to reflect the current codebase state.

Current result:
1. No known npm vulnerabilities in backend/frontend at high severity or above.
2. Security CI automation is in place (CodeQL, Semgrep, Gitleaks history scan, npm audit, ZAP baseline, Dependabot).
3. Previously reported critical items (profile image validation and localStorage user data exposure) are now remediated.
4. Remaining risks are mostly architecture-level hardening items (token lifecycle, encryption at rest, centralized validation).

Current rating: A- (90/100) for dev/staging readiness
Production readiness: Not fully complete until remaining architecture hardening items are addressed.

## Verification Evidence (This Audit Pass)

Commands executed and outcomes:

1. Backend dependency audit
- Command: npm audit --audit-level=high
- Result: found 0 vulnerabilities

2. Frontend dependency audit
- Command: npm audit --audit-level=high
- Result: found 0 vulnerabilities

3. Backend quality gates
- Command: npm run build && npm test -- --runInBand
- Result: pass
- Tests: 118 passed
- Coverage: global branches 71.82% (threshold satisfied)

4. Frontend quality gates
- Command: npm run build && npm test -- --runInBand
- Result: pass
- Tests: 33 passed

5. CI/workflow hardening checks
- Verified least-privilege permissions and safe trigger posture in workflows.
- Verified Gitleaks full-history scan command is configured.
- Verified ZAP target is local CI runtime URL.

## Findings Closed Since Prior Audit

### CRITICAL-1: Profile picture upload validation
Status: Fixed

What was changed:
1. Strict allowed MIME types: jpeg/png/gif/webp only.
2. Base64 payload format validation.
3. Decoded size validation (5MB max).
4. File-signature (magic byte/header) verification.
5. Rejection of mismatched MIME/header payloads.

Implemented in:
- backend/src/routes/profileRoutes.ts

Validation:
- Route tests now include valid/invalid MIME, base64, oversized payload, header mismatch, and unauthorized cases.

### CRITICAL-2: localStorage user data exposure
Status: Fixed

What was changed:
1. Removed username/userId localStorage persistence from login/register flow.
2. Dashboard identity now comes from authenticated API (`GET /api/profile/me`).
3. Logout no longer relies on localStorage cleanup.

Implemented in:
- frontend/src/components/LoginForm.ts
- frontend/src/dashboard.ts
- backend/src/routes/profileRoutes.ts

Validation:
- No localStorage usage found in frontend source for user identity storage.

## High Severity Findings Status

### HIGH-1: Lockout message user enumeration
Status: Fixed

What was changed:
- Lockout response now uses generic invalid credentials messaging.

Implemented in:
- backend/src/services/AuthService.ts

### HIGH-2: OAuth state not session/request bound
Status: Mitigated (improved)

What was changed:
- Added request binding cookie (`oauth_state_binding`) and callback verification.

Implemented in:
- backend/src/routes/oauthRoutes.ts

Note:
- This is stronger than state-only validation, though not a full server-side state store.

### HIGH-3: Missing refresh-token lifecycle
Status: Open (architecture)

Current risk:
- Access token remains valid until expiry; no refresh/revocation lifecycle.

Needed:
- Refresh token issuance, rotation, revocation store, and logout revocation behavior.

### HIGH-4: Profile routes lacked rate limiting
Status: Fixed

What was changed:
- Added dedicated profile route limiter.

Implemented in:
- backend/src/server.ts

### HIGH-5: CSP unsafe-inline
Status: Fixed (backend responses)

What was changed:
- Removed unsafe-inline from backend Helmet styleSrc directive.
- Added explicit frameguard deny.

Implemented in:
- backend/src/server.ts

### HIGH-6: Verbose stack traces in production logs
Status: Fixed

What was changed:
- Auth controller/service now suppress stack details in production log context.

Implemented in:
- backend/src/controllers/AuthController.ts
- backend/src/services/AuthService.ts

### HIGH-7: Sensitive frontend console logging
Status: Mitigated

What was changed:
- Replaced raw error-object logging with generic messages in key user-facing flows.

Implemented in:
- frontend/src/main.ts
- frontend/src/dashboard.ts

### HIGH-8 and HIGH-9: Email validation/sanitization
Status: Fixed

What was changed:
1. Normalization (trim/lowercase).
2. Stricter email pattern than prior permissive regex.
3. Duplicate email checks and safe output flow.

Implemented in:
- backend/src/routes/profileRoutes.ts

## Medium/Low Findings Status

### MEDIUM-1: Timing side-channel on unknown user
Status: Mitigated

What was changed:
- Dummy bcrypt compare added for unknown-user login path.

Implemented in:
- backend/src/services/AuthService.ts

### MEDIUM-4: Production CORS fallback risk
Status: Fixed

What was changed:
- Production now requires explicit ALLOWED_ORIGINS.

Implemented in:
- backend/src/server.ts

### MEDIUM-6: Explicit clickjacking header
Status: Fixed

What was changed:
- Added explicit frameguard deny configuration.

Implemented in:
- backend/src/server.ts

### MEDIUM-7: OAuth route throttling
Status: Fixed

What was changed:
- Added OAuth route limiter.

Implemented in:
- backend/src/server.ts

### MEDIUM-8: Hardcoded bcrypt rounds
Status: Fixed

What was changed:
- Added configurable BCRYPT_SALT_ROUNDS env support with safe floor.

Implemented in:
- backend/src/services/AuthService.ts

### MEDIUM-11: Verbose OAuth logging
Status: Mitigated

What was changed:
- OAuth errors now log sanitized message payloads.

Implemented in:
- backend/src/routes/oauthRoutes.ts

### MEDIUM-12: unsafe innerHTML usage
Status: Fixed

What was changed:
- Replaced innerHTML popup assembly with safe DOM createElement/textContent construction.

Implemented in:
- frontend/src/main.ts

### MEDIUM-14: insecure .env example secret pattern
Status: Fixed

What was changed:
- Replaced previous default-like JWT secret sample with generated-secret guidance text.

Implemented in:
- .env.example

### LOW-1: hardcoded frontend backend URL
Status: Fixed

What was changed:
- Frontend now uses host-aware API base URL patterns.

Implemented in:
- frontend/src/services/AuthApiService.ts
- frontend/src/dashboard.ts
- frontend/src/utils/backendHealth.ts

## CI/CD Security Automation Posture

Implemented and verified:

1. Safe PR trigger choice
- Uses pull_request (not pull_request_target) for untrusted PR safety.

2. Least-privilege permissions
- Read-only default permissions.
- security-events write permission only where needed (CodeQL upload).

3. Checkout hardening
- persist-credentials: false in workflows.

4. Secret scanning scope
- Gitleaks configured to scan full git history:
- gitleaks detect --source=. --redact --verbose --log-opts="--all"

5. ZAP safety boundary
- ZAP baseline target pinned to localhost CI service URL.

6. Dependency hygiene
- npm ci used in CI.
- Lockfiles present and committed.
- Dependabot PR automation enabled with manual merge control.

## Remaining Open Risks (Current Priority)

Priority 1:
1. Implement refresh-token rotation and revocation lifecycle.
2. Add OAuth claim hardening (`email_verified`, issuer/audience checks as applicable).
3. Add centralized schema validation middleware (e.g., Zod/Joi) for route payloads.

Priority 2:
1. Encrypt data at rest for SQLite and sensitive blob fields.
2. Formal JWT key rotation policy and operational runbook.
3. Optional stronger image sanitization pipeline (re-encode/metadata strip) if image threat model requires it.

## OWASP Top 10 Snapshot

1. Broken Access Control: Good with auth middleware + route limiting; continue endpoint-level auth tests.
2. Cryptographic Failures: Improved; token lifecycle and key rotation remain.
3. Injection: Parameterized SQL remains in place; centralized validation still recommended.
4. Insecure Design: Improved; refresh-token architecture remains.
5. Security Misconfiguration: Improved materially in CSP, CORS, frameguard, CI permissions.
6. Vulnerable Components: No known high/critical npm findings currently.
7. Identification/Auth Failures: Improved; full token lifecycle remains.
8. Software/Data Integrity: Strong CI gating and scans now in place.
9. Logging/Monitoring: Improved sanitization; continue central log policy hardening.
10. SSRF: No material SSRF surface identified in current code paths.

## Conclusion

This re-audit confirms meaningful security progress and closure of the highest-risk code issues previously identified.

Current posture is strong for dev/staging. For production-grade maturity, complete the remaining token lifecycle and encryption-at-rest workstreams.
