# TestProject - Auth, OAuth, and Profile Persistence

Full-stack TypeScript authentication project with layered backend architecture, frontend login/dashboard/settings/diary flows, Google OAuth support, persistent profile pictures, profile settings (email + password updates), and a persisted personal diary.

## Security Status

The project is tracked against OWASP Top 10 in [SECURITY_AUDIT.md](SECURITY_AUDIT.md).

Current snapshot (April 3, 2026):
- No known npm dependency vulnerabilities in backend/frontend (`npm audit` clean).
- OAuth state validation is enforced server-side.
- Profile picture routes require authenticated user context from JWT.
- Frontend auth flow uses secure cookie-based session handling (`credentials: include`).

## Main Features

- Local registration and login
- Google OAuth login flow
- JWT auth with 1-hour token lifetime
- httpOnly auth cookie support
- Account lockout after repeated failed logins
- Profile picture persistence in database (not browser-only)
- Dedicated settings page (via profile menu) for updating account email and password
- Personal diary with persistent entries (title/content/date), mood tracking, tags, favorites, and filtering
- Structured security logging with redaction
- Unit tests and coverage gates in backend and frontend

## Project Structure

```text
TestProject/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      repositories/
      routes/
      services/
      utils/
      server.ts
    tests/unit/
  frontend/
    src/
      components/
      services/
      utils/
      dashboard.ts
      main.ts
    public/
    tests/unit/
  TestProject.Tests/
```

## Tech Stack

Backend:
- Node.js + Express
- TypeScript
- sql.js (SQLite)
- jsonwebtoken + cookie-parser
- bcryptjs
- googleapis
- pino logging

Frontend:
- TypeScript + HTML/CSS
- Fetch API
- Jest + jsdom

## Setup

Prerequisites:
- Node.js 18+
- npm

Install backend:
```bash
cd backend
npm install
npm run build
```

Install frontend:
```bash
cd frontend
npm install
npm run build
```

Install test orchestrator:
```bash
cd TestProject.Tests
npm install
```

## Run

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run serve
```

Open: http://localhost:3001

## Test

All:
```bash
cd TestProject.Tests
npm test
```

Backend:
```bash
cd backend
npm test
```

Frontend:
```bash
cd frontend
npm test
```

If backend tests report worker teardown/open-handle warnings:
```bash
cd backend
npm run test:detect-open-handles
```

Current counts:
- Backend and frontend test counts evolve as features are added.
- Run `npm test` in each project folder to view the latest totals.

## API Overview

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

OAuth:
- `GET /api/oauth/google/login`
- `GET /api/oauth/google/callback`

Profile picture:
- `POST /api/profile/picture` (authenticated)
- `GET /api/profile/picture/me` (authenticated)

Profile settings:
- `GET /api/profile/settings` (authenticated)
- `PUT /api/profile/settings/email` (authenticated)
- `POST /api/profile/settings/password` (authenticated)

Diary:
- `GET /api/diary/entries` (authenticated, supports search/filter/pagination)
- `POST /api/diary/entries` (authenticated)
- `GET /api/diary/entries/:id` (authenticated)
- `PUT /api/diary/entries/:id` (authenticated)
- `DELETE /api/diary/entries/:id` (authenticated)

## Git Hooks

Hook setup scripts install a `pre-commit` hook that validates quality before commit.

Install hooks:
```bash
# Windows
powershell -ExecutionPolicy Bypass -File .\setup-hooks.ps1

# Linux/macOS
./setup-hooks.sh
```

Pre-commit checks:
1. Build backend
2. Build frontend
3. Type-check backend (`npx tsc --noEmit`)
4. Type-check frontend (`npx tsc --noEmit`)
5. Audit backend dependencies (`npm audit --audit-level=high`)
6. Audit frontend dependencies (`npm audit --audit-level=high`)

Pre-push checks:
1. Run backend tests (`npm test`)
2. Run frontend tests (`npm test`)

Tests run at pre-push and in CI workflows.

Automated CI security checks in GitHub Actions:
1. CodeQL static analysis (JavaScript/TypeScript)
2. Semgrep OWASP SAST rules
3. Gitleaks secret scanning (full git history)
4. npm dependency audits (backend/frontend)
5. OWASP ZAP baseline DAST scan against the running app (passive baseline coverage)
6. Dependabot weekly dependency update PRs

CI safety guardrails:
1. Workflows use `pull_request` (not `pull_request_target`) for untrusted PR safety.
2. Workflows use least-privilege permissions and `persist-credentials: false`.
3. ZAP target is local CI app URL (`http://localhost:3001`), not production.
4. Dependabot creates PRs only; merges remain manual review.

Bypass (only when absolutely necessary):
```bash
# Skip pre-commit hook
git commit --no-verify

# Skip pre-push hook
git push --no-verify
```

## Environment Variables

Backend expects:
- `JWT_SECRET`
- `NODE_ENV`
- `ALLOWED_ORIGINS`

For Google OAuth:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## Security Notes

- Passwords are hashed with bcrypt.
- SQL queries are parameterized.
- Helmet and CORS restrictions are configured.
- Frontend authenticated requests use cookies (`credentials: 'include'`) and do not rely on localStorage token storage.

Detailed and current risk tracking is in [SECURITY_AUDIT.md](SECURITY_AUDIT.md).

OAuth implementation status and remaining hardening work are tracked in [OAuth_Status_and_Roadmap.md](OAuth_Status_and_Roadmap.md).

Automated security scanning workflow: [.github/workflows/security.yml](.github/workflows/security.yml).

## License

MIT
