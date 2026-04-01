# TestProject - Login System

A secure, full-stack login system built with TypeScript, featuring clean architecture, JWT authentication, and comprehensive testing. **Created in collaboration with GitHub Copilot AI.**

## ⚠️ Security Notice

This application has been audited against the **OWASP Top 10** security framework. Critical security fixes have been implemented. **Security Score: A- (92/100)**

**See `SECURITY_AUDIT.md` for a comprehensive, living security audit document.**

## Features

- **User Registration & Login** with JWT tokens
- **Password Security**: bcrypt hashing with salt rounds
- **Input Validation**: Both frontend and backend validation
- **Account Lockout**: Brute force protection (5 failed attempts = 30-min lock)
- **Security Event Logging**: Winston-based audit trail
- **Strong Password Policy**: 8+ chars with uppercase, lowercase, numbers, special chars
- **Password Confirmation**: Prevents user typos
- **httpOnly Cookies**: XSS-resistant token storage
- **Dark Mode UI**: Clean, animated interface
- **SQLite Database**: Lightweight, file-based storage
- **Comprehensive Tests**: 65 tests with >90% coverage
- **Clean Architecture**: Single Responsibility Principle throughout

## Project Structure

```
TestProject/
├── backend/                    # Backend API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/            # Database configuration
│   │   ├── models/            # Data models and interfaces
│   │   ├── repositories/      # Data access layer
│   │   ├── services/          # Business logic
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Error handling
│   │   └── server.ts          # Application entry point
│   └── tests/unit/            # Backend unit tests
│
├── frontend/                   # Frontend (TypeScript + HTML/CSS)
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── services/          # API services
│   │   ├── utils/             # Validation utilities
│   │   └── main.ts            # Application entry point
│   ├── public/
│   │   ├── index.html         # Login page
│   │   └── styles.css         # Dark mode styling
│   └── tests/unit/            # Frontend unit tests
│
└── TestProject.Tests/          # Test orchestration
    ├── backend/unit/          # Backend test copies
    └── frontend/unit/         # Frontend test copies
```

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript (strict mode)
- **Database**: SQLite (sql.js)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Testing**: Jest + ts-jest

### Frontend
- **Language**: TypeScript
- **UI**: HTML5 + CSS3 (Dark Mode)
- **HTTP Client**: Fetch API
- **Testing**: Jest + jsdom

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm

### Backend Setup
```bash
cd backend
npm install
npm run build
```

### Frontend Setup
```bash
cd frontend
npm install
npm run build
```

### Test Project Setup
```bash
cd TestProject.Tests
npm install
```

## Running the Application

### Start Backend Server (Port 3000)
```bash
cd backend
npm run dev
```

### Start Frontend Server (Port 3001)
```bash
cd frontend
npm run serve
```

### Access the Application
Open your browser and navigate to: `http://localhost:3001`

## Running Tests

### All Tests
```bash
cd TestProject.Tests
npm test
```

### Backend Tests Only
```bash
cd backend
npm test
```

### Frontend Tests Only
```bash
cd frontend
npm test
```

## API Endpoints

### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "testuser"
  }
}
```

### POST /api/auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "testuser"
  }
}
```

## Validation Rules

### Username
- Minimum 3 characters
- Alphanumeric only (a-z, A-Z, 0-9)
- Required

### Password
- Minimum 8 characters
- Must contain at least 1 number
- Required

## Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: 24-hour expiration
- **SQL Injection Prevention**: Parameterized queries
- **Input Validation**: Frontend and backend validation
- **CORS Enabled**: For local development

## Test Coverage

### Backend (96.07% coverage)
- **DatabaseConfig**: 8 tests - Database initialization, save, close
- **User Model**: 3 tests - Interface validation
- **UserRepository**: 8 tests - CRUD operations
- **AuthService**: 9 tests - Registration, login, token verification
- **AuthController**: 10 tests - HTTP request handling

**Total: 38 tests, 100% passing**

### Frontend (91.30% coverage)
- **Validator**: 15 tests - Username and password validation
- **AuthApiService**: 5 tests - API communication
- **LoginForm**: 7 tests - Form logic, validation, submission

**Total: 27 tests, 100% passing**

### Overall
**65 tests, 100% passing**

## Architecture Principles

### Single Responsibility Principle
Each module has exactly one reason to change:
- **Models**: Data structure definitions only
- **Repositories**: Data access only
- **Services**: Business logic only
- **Controllers**: Request/response handling only
- **Routes**: Route definitions only
- **Middleware**: Cross-cutting concerns only

### Clean Architecture Layers
```
Presentation → Controllers → Services → Repositories → Database
```

No layer depends on inner implementation details. Dependencies point inward.

## Development Scripts

### Backend
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run development server with ts-node
- `npm start` - Run production server
- `npm test` - Run unit tests with coverage

### Frontend
- `npm run build` - Compile TypeScript
- `npm run dev` - Watch mode for development
- `npm run serve` - Serve built files
- `npm test` - Run unit tests with coverage

## Database

SQLite database file: `backend/database/auth.db`

### Schema
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## License

MIT

## Security

⚠️ **Production Deployment Requirements**:

Before deploying to production, you **MUST**:

1. **Set JWT_SECRET environment variable**:
```bash
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env file
JWT_SECRET=your-generated-secret-here
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
```

2. **Enable HTTPS** (use reverse proxy or platform with SSL)

3. **Review security documentation**: See `SECURITY_AUDIT.md` (living audit document)

### Security Improvements Implemented

✅ Environment-based JWT secrets (no hardcoded values)  
✅ Rate limiting (5 attempts per 15 minutes)  
✅ CORS whitelist configuration  
✅ Helmet.js security headers (CSP, HSTS)  
✅ Reduced JWT lifetime (1 hour)  
✅ Fixed username enumeration  
✅ Request size limits  
✅ **Account lockout mechanism (NEW)** — 5 failed attempts = 30-minute lock  
✅ **Security event logging (NEW)** — Full audit trail with Winston  
✅ **Enhanced password policy (NEW)** — Uppercase, lowercase, numbers, special chars  
✅ **Password confirmation field (NEW)** — Prevents user typos  
✅ **httpOnly cookies (NEW)** — XSS-resistant token storage  

### Recommended Additional Improvements

- Token revocation mechanism
- Security event alerting
- Advanced rate limiting (per username vs per IP)
- 2FA/MFA support
- Session management

Full audit report: **`SECURITY_AUDIT.md`** (Living document - updated regularly)

## Development

This application was created in collaboration with **GitHub Copilot AI** to demonstrate:
- Clean code architecture principles
- Comprehensive test-driven development
- Security best practices
- Modern TypeScript development

The AI assistant helped with:
- Architectural design following Single Responsibility Principle
- Implementation of all backend and frontend components
- Writing 65+ comprehensive unit tests
- Security considerations and validation
- Documentation and code organization

## License

MIT
