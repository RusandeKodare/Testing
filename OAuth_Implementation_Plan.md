# OAuth 2.0 Implementation Plan for TestProject

## Executive Summary

This document outlines the implementation plan for adding OAuth 2.0 authentication to TestProject alongside the existing username/password authentication system. The plan prioritizes security, user experience, and maintainability.

---

## 1. OAuth Provider Selection

### Recommended Providers (in priority order):

1. **Google OAuth 2.0** (Primary)
   - Largest user base
   - Well-documented
   - Free tier sufficient for most applications
   - Client ID/Secret via Google Cloud Console

2. **GitHub OAuth** (Secondary)
   - Popular among developers
   - Simple implementation
   - Good for developer-focused applications

3. **Microsoft OAuth** (Tertiary)
   - Enterprise-friendly
   - Azure AD integration

### Implementation Approach:
- Start with **Google OAuth** as proof of concept
- Design system to be provider-agnostic for easy addition of more providers

---

## 2. OAuth Flow Type

**Selected Flow: Authorization Code Flow with PKCE**

### Why this flow?
- ✅ Most secure for web applications
- ✅ Tokens never exposed to browser
- ✅ PKCE (Proof Key for Code Exchange) adds extra security layer
- ✅ Recommended by OAuth 2.0 best practices
- ✅ Supports refresh tokens

### Flow Diagram:
```
User → Frontend → Backend → OAuth Provider → Backend → Frontend
  1. Click "Sign in with Google"
  2. Redirect to Google auth page
  3. User authorizes
  4. Google redirects with auth code
  5. Backend exchanges code for tokens
  6. Backend creates/updates user
  7. Backend returns JWT token
  8. Frontend stores JWT
```

---

## 3. Database Schema Changes

### Add OAuth Support to Users Table

```sql
ALTER TABLE users ADD COLUMN oauth_provider TEXT NULL;
ALTER TABLE users ADD COLUMN oauth_id TEXT NULL;
ALTER TABLE users ADD COLUMN email TEXT NULL;
ALTER TABLE users ADD COLUMN profile_picture_url TEXT NULL;

-- Optional: Store refresh tokens (encrypted)
ALTER TABLE users ADD COLUMN oauth_refresh_token TEXT NULL;
ALTER TABLE users ADD COLUMN oauth_access_token TEXT NULL;
ALTER TABLE users ADD COLUMN oauth_token_expiry DATETIME NULL;

-- Modify username constraint to allow NULL for OAuth-only users
-- (or make username auto-generated from email for OAuth users)

-- Add unique constraint for OAuth users
CREATE UNIQUE INDEX idx_oauth_user ON users(oauth_provider, oauth_id);
```

### User Model Update:
```typescript
export interface User {
  id?: number;
  username: string | null;  // NULL for OAuth-only users
  passwordHash: string | null;  // NULL for OAuth users
  email?: string | null;
  oauthProvider?: 'google' | 'github' | 'microsoft' | null;
  oauthId?: string | null;
  profilePictureUrl?: string | null;
  createdAt?: string;
  loginAttempts?: number;
  lockedUntil?: string | null;
}
```

---

## 4. Backend Implementation

### 4.1 Environment Variables (.env)

```bash
# Existing
JWT_SECRET=<existing-secret>
PORT=3000
NODE_ENV=development

# New for OAuth
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Optional: For other providers
GITHUB_CLIENT_ID=<optional>
GITHUB_CLIENT_SECRET=<optional>
```

### 4.2 Dependencies to Install

```bash
cd backend
npm install googleapis@latest  # Google OAuth library
npm install axios@latest       # HTTP client for OAuth requests
npm install crypto-js@latest   # For PKCE challenge generation
```

### 4.3 New Backend Files

```
backend/src/
├── services/
│   ├── OAuthService.ts          # OAuth flow orchestration
│   ├── GoogleOAuthProvider.ts   # Google-specific implementation
│   └── OAuthProviderInterface.ts # Provider interface
├── controllers/
│   └── OAuthController.ts       # OAuth endpoints
├── repositories/
│   └── UserRepository.ts        # (extend existing)
└── routes/
    └── oauthRoutes.ts           # OAuth routes
```

### 4.4 New API Endpoints

```
GET  /api/auth/google/login
  → Generates OAuth URL with state & PKCE challenge
  → Returns: { authUrl: string, state: string }

GET  /api/auth/google/callback?code=XXX&state=YYY
  → Exchanges auth code for tokens
  → Creates or finds user by oauth_id
  → Returns JWT token + user info
  → Redirects to dashboard

GET  /api/auth/github/login      (future)
GET  /api/auth/github/callback   (future)
```

### 4.5 OAuthService Implementation (Pseudo-code)

```typescript
class OAuthService {
  async generateAuthUrl(provider: string, state: string, codeVerifier: string): Promise<string> {
    // Generate PKCE challenge
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    // Build OAuth URL with scopes
    const scopes = ['openid', 'email', 'profile'];
    const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${REDIRECT_URI}&` +
      `response_type=code&` +
      `scope=${scopes.join(' ')}&` +
      `state=${state}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`;
      
    return url;
  }
  
  async handleCallback(code: string, codeVerifier: string): Promise<OAuthUserInfo> {
    // Exchange code for access token
    const tokens = await this.exchangeCodeForTokens(code, codeVerifier);
    
    // Get user info from provider
    const userInfo = await this.getUserInfo(tokens.access_token);
    
    // Find or create user in database
    const user = await this.findOrCreateUser(userInfo);
    
    return { user, tokens };
  }
  
  async findOrCreateUser(oauthInfo: GoogleUserInfo): Promise<User> {
    let user = await userRepository.findByOAuth('google', oauthInfo.sub);
    
    if (!user) {
      // Create new user
      user = await userRepository.createOAuthUser({
        username: oauthInfo.email.split('@')[0], // or null
        email: oauthInfo.email,
        oauthProvider: 'google',
        oauthId: oauthInfo.sub,
        profilePictureUrl: oauthInfo.picture,
      });
    } else {
      // Update existing user profile picture
      await userRepository.updateProfilePicture(user.id, oauthInfo.picture);
    }
    
    return user;
  }
}
```

---

## 5. Frontend Implementation

### 5.1 New UI Components

**Login Page Updates (index.html):**
```html
<div class="social-login">
  <h3>Or sign in with:</h3>
  <button id="google-login-btn" class="oauth-btn google-btn">
    <img src="/assets/google-icon.svg" />
    Continue with Google
  </button>
  
  <!-- Future providers -->
  <button id="github-login-btn" class="oauth-btn github-btn" style="display:none">
    <img src="/assets/github-icon.svg" />
    Continue with GitHub
  </button>
</div>
```

### 5.2 Frontend OAuth Flow (LoginForm.ts)

```typescript
async handleGoogleLogin(): Promise<void> {
  try {
    // Generate PKCE verifier
    const codeVerifier = this.generateCodeVerifier();
    sessionStorage.setItem('pkce_verifier', codeVerifier);
    
    // Request OAuth URL from backend
    const response = await fetch('/api/auth/google/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeVerifier }),
    });
    
    const { authUrl, state } = await response.json();
    
    // Store state for CSRF protection
    sessionStorage.setItem('oauth_state', state);
    
    // Redirect to Google
    window.location.href = authUrl;
    
  } catch (error) {
    this.showError('OAuth login failed');
  }
}

// Handle callback (callback.html or main page)
async handleOAuthCallback(): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  
  const savedState = sessionStorage.getItem('oauth_state');
  const codeVerifier = sessionStorage.getItem('pkce_verifier');
  
  // Verify state for CSRF protection
  if (state !== savedState) {
    throw new Error('Invalid state parameter');
  }
  
  // Exchange code for JWT token via backend
  const response = await fetch(`/api/auth/google/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, codeVerifier }),
  });
  
  const { token, user } = await response.json();
  
  // Store JWT token
  localStorage.setItem('authToken', token);
  localStorage.setItem('username', user.username || user.email);
  
  // Redirect to dashboard
  window.location.href = 'dashboard.html';
}
```

---

## 6. Security Considerations

### 6.1 CSRF Protection
- ✅ Use `state` parameter (random UUID)
- ✅ Verify state on callback
- ✅ Store state in sessionStorage (not localStorage)

### 6.2 PKCE Implementation
- ✅ Generate code_verifier (random 43-128 char string)
- ✅ Generate code_challenge (SHA-256 hash of verifier)
- ✅ Send challenge in auth request
- ✅ Send verifier in token exchange
- ✅ Prevents auth code interception attacks

### 6.3 Token Storage
- ✅ Never store OAuth access tokens in localStorage
- ✅ OAuth tokens stay on backend only
- ✅ Frontend only gets JWT token (same as current system)
- ✅ Consider httpOnly cookies for JWT (already implemented)

### 6.4 Scope Minimization
- ✅ Only request necessary scopes: `openid`, `email`, `profile`
- ✅ Don't request calendar, drive, or other unnecessary permissions

### 6.5 User Privacy
- ✅ Clear privacy policy about OAuth data usage
- ✅ Allow users to disconnect OAuth accounts
- ✅ Don't store unnecessary user data

---

## 7. Migration Strategy

### 7.1 Coexistence with Existing Auth
- ✅ Keep username/password auth fully functional
- ✅ Allow users to link OAuth to existing account (optional feature)
- ✅ Support both auth methods simultaneously

### 7.2 Profile Picture Migration
- Users with OAuth: Use `profile_picture_url` from provider
- Users with password auth: Use uploaded `profile_picture` (blob/base64)
- Unified display logic in frontend

---

## 8. Testing Strategy

### 8.1 Unit Tests
```
backend/tests/unit/services/OAuthService.test.ts
- Test auth URL generation
- Test PKCE challenge generation
- Test user creation/update logic
- Mock OAuth provider responses
```

### 8.2 Integration Tests
- Test full OAuth flow with mock OAuth provider
- Test state parameter validation
- Test PKCE verification
- Test JWT token generation after OAuth

### 8.3 Manual Testing Checklist
- [ ] Google login flow completes successfully
- [ ] State parameter prevents CSRF
- [ ] PKCE prevents code interception
- [ ] User profile picture from Google displays correctly
- [ ] OAuth user can logout and login again
- [ ] Existing username/password users unaffected
- [ ] Multiple OAuth logins by same user handled correctly

---

## 9. Deployment Checklist

### 9.1 Google Cloud Console Setup
1. Create OAuth 2.0 Client ID
2. Configure authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
3. Enable Google+ API (for user info)
4. Copy Client ID and Client Secret to `.env`

### 9.2 Environment Variables
- [ ] GOOGLE_CLIENT_ID set in production
- [ ] GOOGLE_CLIENT_SECRET set in production (use secrets manager)
- [ ] GOOGLE_REDIRECT_URI updated for production domain

### 9.3 Database Migration
- [ ] Run ALTER TABLE commands on production database
- [ ] Backup database before migration
- [ ] Test on staging environment first

---

## 10. Future Enhancements

### Phase 2:
- Add GitHub OAuth
- Add Microsoft OAuth
- Allow account linking (connect OAuth to password account)

### Phase 3:
- Add "Sign in with Apple"
- Support multiple OAuth providers per user
- OAuth token refresh mechanism

### Phase 4:
- Two-factor authentication (2FA)
- Passkeys/WebAuthn support
- Social login analytics

---

## 11. Estimated Implementation Time

| Task | Estimated Time |
|------|----------------|
| Database schema changes | 1 hour |
| Backend OAuth service | 4-6 hours |
| Frontend integration | 3-4 hours |
| Testing & debugging | 3-4 hours |
| Documentation | 1-2 hours |
| **Total** | **12-17 hours** |

---

## 12. Resources & Documentation

### OAuth 2.0 Standards:
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

### Google OAuth Documentation:
- [Google OAuth 2.0 for Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Sign-In JavaScript Client Reference](https://developers.google.com/identity/sign-in/web/reference)

### Security References:
- [OWASP OAuth 2.0 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

---

## 13. Implementation Priority

**Immediate (This Session):**
1. ✅ Create this plan document
2. → Implement profile picture database storage first
3. → Then start OAuth implementation

**Next Steps:**
1. Database schema changes
2. Install OAuth dependencies
3. Implement OAuthService
4. Create OAuth endpoints
5. Frontend OAuth button integration
6. Testing
7. Documentation update

---

**Document Status**: Draft v1.0  
**Created**: April 3, 2026  
**Last Updated**: April 3, 2026
