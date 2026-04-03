# Security Audit Report

Last Updated: April 3, 2026 (Post-hardening deep pass)
Framework: OWASP Top 10 (2021) + source-level review + dependency and workflow checks
Scope: backend auth and profile flows, OAuth flow, CI/CD security workflows, secret scanning posture

## Executive Summary

This pass focused on closing high-risk authentication and CI findings while keeping the existing architecture intact.

Current posture:
- Rating: B+ (84/100)
- Production readiness: Conditional
- Main blockers left: token lifecycle architecture (refresh/revocation), email verification lifecycle, and optional at-rest encryption strategy

Major outcomes in this pass:
1. OAuth username collision takeover risk reduced with deterministic unique username generation.
2. OAuth-only password setting now blocked by policy.
3. JWT verification is now explicitly algorithm-constrained (HS256).
4. OAuth callback state protection strengthened with server-side one-time state store and expiry.
5. Rate-limit posture improved with explicit client key strategy and explicit proxy trust config.
6. Security workflow hardened further (dynamic JWT for ZAP startup, better readiness diagnostics, gitleaks false-positive control).

## Backup File Check

Files reviewed:
- SECURITY_AUDIT.md
- SECURITY_AUDIT.md.backup

Result:
1. They were not identical.
2. SECURITY_AUDIT.md.backup was older/stale content and not necessary for runtime or CI.
3. Backup file removed to avoid drift and confusion.

## Verification Evidence (This Pass)

Commands and outcomes:

1. Backend build and tests
- Command: npm --prefix backend run build --silent
- Command: npm --prefix backend test -- --runInBand --silent
- Result: PASS
- Suites: 11 passed
- Tests: 126 passed

2. Existing CI pre-commit gates
- Build, type-check, and npm audit gates passed on backend and frontend during commits.

3. Historical secret scan handling
- Gitleaks historical false positives were constrained via exact fingerprint ignore entries and workflow hardening.

## Findings Closed in This Pass

### 1) OAuth username collision risk
Status: Fixed

What changed:
1. Added username sanitization and uniqueness generation for OAuth-created accounts.
2. Added bounded collision handling with numeric suffixes and random fallback.

Implemented in:
- backend/src/services/OAuthService.ts

Validation:
- backend/tests/unit/services/OAuthService.test.ts

### 2) OAuth-only password set without verification
Status: Fixed by policy hardening

What changed:
1. Password update endpoint now rejects password-setting for OAuth-only accounts (no password hash).

Implemented in:
- backend/src/routes/profileRoutes.ts

Validation:
- backend/tests/unit/routes/profileRoutes.test.ts

### 3) JWT verification algorithm ambiguity
Status: Fixed

What changed:
1. Added explicit algorithms: ['HS256'] to JWT verification paths.
2. Added stricter userId validation in auth middleware (must be positive integer).

Implemented in:
- backend/src/middleware/authMiddleware.ts
- backend/src/services/AuthService.ts

Validation:
- backend/tests/unit/middleware/authMiddleware.test.ts
- backend/tests/unit/services/AuthService.test.ts

### 4) OAuth callback state/CSRF hardening gap
Status: Improved materially

What changed:
1. Added server-side OAuth state store with TTL and one-time consumption.
2. Kept request-binding cookie checks and added state-store validation.
3. Added state pruning for expired entries.

Implemented in:
- backend/src/routes/oauthRoutes.ts

Residual note:
- Current store is in-memory and not shared across instances. For multi-instance deployments, migrate state storage to a shared store.

### 5) Rate-limit bypass posture concerns
Status: Improved

What changed:
1. Added explicit trust-proxy configuration toggle (`TRUST_PROXY`).
2. Added explicit key generator for auth/profile/oauth limiters.

Implemented in:
- backend/src/server.ts
- .env.example

Residual note:
- In proxied production environments, TRUST_PROXY must be set correctly based on real network topology.

### 6) Profile endpoint ownership/existence revalidation
Status: Improved

What changed:
1. Added user existence checks before profile picture updates and reads.
2. Email and password routes already re-validated user existence in prior pass.

Implemented in:
- backend/src/routes/profileRoutes.ts

Validation:
- backend/tests/unit/routes/profileRoutes.test.ts

### 7) CI secret-handling hardening
Status: Fixed

What changed:
1. ZAP backend startup now uses runtime-generated JWT secret (not hardcoded literal in workflow).
2. Workflow readiness diagnostics improved (prints backend/frontend logs on startup failure).
3. Added precise gitleaks ignore fingerprints for confirmed placeholder-only historical findings.

Implemented in:
- .github/workflows/security.yml
- .gitleaksignore
- .gitleaks.toml

## Remaining Open Risks

Priority 1:
1. Refresh-token rotation and server-side revocation lifecycle are still not implemented.
2. Registration/email verification lifecycle is not enforced before account maturity.

Priority 2:
1. Multi-instance-safe OAuth state store (shared cache/db) for horizontally scaled deployments.
2. At-rest encryption strategy for sensitive persistence depending on deployment threat model.

## OWASP Top 10 Snapshot (Current)

1. Broken Access Control: Improved (middleware + ownership existence checks + limiter hardening).
2. Cryptographic Failures: Improved (explicit JWT verify algorithm), lifecycle work remains.
3. Injection: No regression observed; parameterized SQL remains.
4. Insecure Design: Improved in auth paths; token lifecycle remains architectural gap.
5. Security Misconfiguration: Improved materially in CI/workflow and trust-proxy controls.
6. Vulnerable Components: No high/critical npm findings observed in current audits.
7. Identification and Authentication Failures: Improved strongly in OAuth/password handling.
8. Software and Data Integrity Failures: Improved secret scanning and CI posture.
9. Security Logging and Monitoring Failures: Operational logging exists; continue centralized policy hardening.
10. SSRF: No material SSRF path identified in this code pass.

## Conclusion

This hardening pass closed or materially reduced the most actionable auth and CI issues identified in active development.

Recommended next phase:
1. Implement refresh-token lifecycle and revocation model.
2. Implement email verification flow for account trust elevation.
3. Add multi-instance OAuth state backing store for production clustering.
