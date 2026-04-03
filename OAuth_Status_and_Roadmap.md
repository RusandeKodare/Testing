# OAuth Status and Roadmap

Last Updated: April 3, 2026

## Purpose

This document replaces the original implementation-only plan with a live status plus prioritized OAuth backlog.

## Current OAuth Implementation (What We Have)

Implemented:
1. Google OAuth provider integration in backend.
2. Authorization code callback handling and token exchange on server.
3. Server-side OAuth state generation and validation.
4. Local user creation/lookup by `(oauth_provider, oauth_id)`.
5. JWT session issuance after successful OAuth callback.
6. Cookie-based app auth flow (`authToken` cookie).

Key files:
1. `backend/src/services/OAuthService.ts`
2. `backend/src/routes/oauthRoutes.ts`
3. `backend/src/repositories/UserRepository.ts`
4. `backend/src/server.ts`

## Current Gaps (What We Still Need)

These are the next improvements to complete OAuth hardening and reliability:

1. Add PKCE to OAuth flow for defense in depth.
2. Handle username collisions when creating OAuth users (email local-part can clash).
3. Enforce `email_verified` from Google before creating/signing in.
4. Add explicit OAuth route tests for invalid or replayed state.
5. Decide whether you truly need offline access; if not, remove offline request mode.

## Recommended OAuth Path

For this project architecture, keep using:
1. Authorization Code flow on backend.
2. State validation on callback.
3. Cookie-based app session after callback.

And add:
1. PKCE support.
2. Minimal Google scopes (`openid email profile`).
3. Strict callback and claim validation (`email_verified`, issuer, audience as applicable).

## Action Plan

### Phase 1: Security Hardening (Immediate)
1. PKCE support end-to-end.
2. `email_verified` enforcement.
3. Remove `offline` mode if refresh token persistence is not needed.

### Phase 2: Reliability and Data Integrity
1. Collision-safe username generation strategy.
2. Add OAuth-specific route tests and replay-state tests.

### Phase 3: Optional Expansion
1. Add GitHub provider.
2. Add account linking for existing password-based users.

## Detailed Implementation Notes

### 1) PKCE

Current:
1. State exists.
2. PKCE is not yet implemented.

Needed:
1. Generate code verifier and code challenge.
2. Bind challenge to login request.
3. Validate verifier in callback token exchange.

### 2) Username Collision Handling

Current:
1. Username creation uses email local-part, which can collide.

Needed:
1. Deterministic collision-safe generator (e.g. suffix or hash-based).
2. Retry-safe repository logic for uniqueness conflicts.

### 3) `email_verified` Enforcement

Current:
1. Email is consumed from Google profile.

Needed:
1. Require `email_verified === true` before account create/sign-in.
2. Return 403/400 when claim is missing or false.

### 4) OAuth State Tests

Add tests for:
1. Missing `state`.
2. Invalid `state`.
3. Replayed/expired `state`.
4. Successful callback with valid `state`.

### 5) Offline Access Decision

Current:
1. OAuth auth URL requests offline access.

Decision:
1. If no refresh token storage/usage is needed, disable offline access.
2. If needed later, re-enable with encrypted token storage and rotation policy.

## Success Criteria

OAuth hardening is complete when:
1. PKCE is active and tested.
2. Email verification is enforced.
3. Username collision handling is safe and tested.
4. State validation tests cover invalid and replay scenarios.
5. Offline mode policy is explicitly decided and implemented.

## Notes

Security tracking remains in `SECURITY_AUDIT.md`.
General project documentation remains in `README.md` and `QUICK_START.md`.
