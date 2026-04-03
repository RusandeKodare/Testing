# TestProject - Auth, OAuth, and Profile Persistence

Full-stack TypeScript authentication project with layered backend architecture, frontend login/dashboard flows, Google OAuth support, and persistent profile pictures stored in the database.

## Security Status

The project is tracked against OWASP Top 10 in [SECURITY_AUDIT.md](SECURITY_AUDIT.md).

Current snapshot (April 3, 2026):
- No known npm dependency vulnerabilities in backend/frontend (`npm audit` clean).
- OAuth state validation is enforced server-side.
- Profile picture routes require authenticated user context from JWT.

## Main Features

- Local registration and login
- Google OAuth login flow
- JWT auth with 1-hour token lifetime
- httpOnly auth cookie support
- Account lockout after repeated failed logins
- Profile picture persistence in database (not browser-only)
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

Current counts:
- Backend: 76 tests
- Frontend: 27 tests
- Total: 103 tests

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
3. Run backend tests
4. Run frontend tests

Bypass (only when absolutely necessary):
```bash
git commit --no-verify
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
- The frontend currently stores the returned JWT in localStorage for bearer requests in dashboard flows. Keep CSP strict and consider full cookie-only auth for reducing XSS token exposure.

Detailed and current risk tracking is in [SECURITY_AUDIT.md](SECURITY_AUDIT.md).

## License

MIT
