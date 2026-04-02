# AI Assistant Instructions for TestProject

## Overview
This document provides guidelines for AI assistants working on the TestProject codebase. These instructions ensure consistency, quality, and security across all changes.

---

## Core Principles

### 1. Security-First Mindset 🔐
**ALWAYS** think about security implications when writing or modifying code:

- ✅ Validate ALL user inputs (frontend AND backend)
- ✅ Use parameterized SQL queries (NEVER string concatenation)
- ✅ Hash passwords with bcrypt (NEVER store plain text)
- ✅ Use httpOnly cookies for authentication tokens
- ✅ Implement rate limiting on authentication endpoints
- ✅ Log security events (failed logins, account lockouts)
- ✅ Follow principle of least privilege
- ❌ NEVER commit secrets, API keys, or passwords to git
- ❌ NEVER expose sensitive data in error messages
- ❌ NEVER trust client-side validation alone

**Before committing code, ask yourself:**
- "Could this be exploited by a malicious user?"
- "Am I exposing any sensitive information?"
- "Have I validated all inputs?"
- "Could this lead to injection attacks?"

---

### 2. Test-Driven Development 🧪
**ALWAYS** write tests for new features and code changes:

#### When Adding New Features:
1. Write tests FIRST (TDD approach preferred)
2. Implement the feature
3. Ensure all tests pass
4. Refactor if needed while keeping tests green

#### Test Coverage Requirements:
- **New functions**: Must have unit tests
- **New API endpoints**: Must test all HTTP methods and status codes
- **Edge cases**: Test error handling, boundary conditions, null/undefined
- **Security features**: Test unauthorized access, rate limiting, validation

#### Running Tests:
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# All tests
cd TestProject.Tests && npm test
```

**NEVER skip writing tests because "it's simple code"** - even simple code can break.

---

### 3. Commit Discipline 📝
Commit frequently with single-sentence messages that clearly describe what changed:

#### Commit Message Rules:
- ✅ **Use present tense**: "Add logout endpoint" not "Added logout endpoint"
- ✅ **Be specific**: "Fix SQL injection in login query" not "Fix bug"
- ✅ **One logical change per commit**: If you can't describe it in one sentence, it's too big
- ✅ **Start with a verb**: Add, Fix, Remove, Update, Refactor, etc.
- ❌ **NO co-author trailers**: Do not add "Co-authored-by: Copilot"

#### Good Examples:
```
Add logout endpoint with token revocation
Fix npm audit vulnerabilities in frontend
Update password validation to require special characters
Refactor UserRepository to use async/await
Remove deprecated validateUser function
```

#### Bad Examples:
```
Updated stuff
Fixed things
WIP
Changes
asdf
```

#### If One Sentence Feels Too Short:
**The commit is probably too large** - break it into smaller, logical commits:

Instead of:
```
Add user profile page with avatar upload, bio editing, and password change
```

Do this:
```
1. Add user profile page structure
2. Add avatar upload functionality
3. Add bio editing feature
4. Add password change endpoint
```

---

### 4. Build and Test Before Committing 🏗️
**MANDATORY** workflow before EVERY commit:

```bash
# 1. Run TypeScript compilation
cd backend && npm run build
cd ../frontend && npm run build

# 2. Run all tests
cd ../backend && npm test
cd ../frontend && npm test

# 3. Check for TypeScript errors
cd ../backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit

# 4. Run security audit
cd ../backend && npm audit
cd ../frontend && npm audit

# 5. If everything passes, commit
git add .
git commit -m "Your single-sentence message here"
```

**If ANY step fails:**
- ❌ **DO NOT commit**
- ✅ **Fix the errors immediately**
- ✅ **Re-run all checks**
- ✅ **Only commit when everything is green**

---

## Code Quality Standards

### TypeScript Standards

#### Type Safety:
```typescript
// ✅ GOOD: Explicit types
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// ❌ BAD: Using 'any'
function calculateTotal(price: any, quantity: any): any {
  return price * quantity;
}
```

#### Null Safety:
```typescript
// ✅ GOOD: Proper null checking
function getUsername(user: User | null): string {
  if (!user) {
    throw new Error('User is required');
  }
  return user.username;
}

// ❌ BAD: Assuming non-null
function getUsername(user: User | null): string {
  return user.username; // Could throw!
}
```

#### Interface Over Type (for objects):
```typescript
// ✅ GOOD: Using interfaces
export interface User {
  id?: number;
  username: string;
  passwordHash: string;
}

// ❌ BAD: Using 'type' for objects (use for unions/primitives)
export type User = {
  id?: number;
  username: string;
  passwordHash: string;
};
```

---

### Error Handling

#### Always Handle Errors:
```typescript
// ✅ GOOD: Proper error handling
async function loginUser(credentials: UserCredentials): Promise<AuthResult> {
  try {
    const user = await userRepository.findByUsername(credentials.username);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }
    // ... rest of logic
  } catch (error) {
    logger.error('Login error', { error, username: credentials.username });
    return { success: false, message: 'Internal server error' };
  }
}

// ❌ BAD: No error handling
async function loginUser(credentials: UserCredentials): Promise<AuthResult> {
  const user = await userRepository.findByUsername(credentials.username);
  // What if this throws?
  return { success: true, token: generateToken(user) };
}
```

#### Generic Error Messages to Users:
```typescript
// ✅ GOOD: Generic message, detailed logging
catch (error) {
  logger.error('Database error during login', { error, context });
  res.status(500).json({ success: false, message: 'Internal server error' });
}

// ❌ BAD: Exposing internal details
catch (error) {
  res.status(500).json({ 
    success: false, 
    message: error.message // Could expose database schema!
  });
}
```

---

### Security Patterns

#### SQL Injection Prevention:
```typescript
// ✅ GOOD: Parameterized queries
const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
const user = stmt.get([username]);

// ❌ BAD: String concatenation
const query = `SELECT * FROM users WHERE username = '${username}'`;
const user = db.exec(query); // SQL INJECTION!
```

#### Password Handling:
```typescript
// ✅ GOOD: Hash with bcrypt
const passwordHash = await bcrypt.hash(password, 10);
await userRepository.createUser(username, passwordHash);

// ❌ BAD: Storing plain text
await userRepository.createUser(username, password); // NEVER!
```

#### Authentication Cookies:
```typescript
// ✅ GOOD: Secure cookie settings
res.cookie('authToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000
});

// ❌ BAD: Insecure cookie
res.cookie('authToken', token); // Vulnerable to XSS!
```

---

### Code Organization

#### Single Responsibility Principle:
```typescript
// ✅ GOOD: Each class/function does ONE thing
class AuthService {
  async login(credentials: UserCredentials): Promise<AuthResult> { }
}

class TokenService {
  generateToken(payload: TokenPayload): string { }
  verifyToken(token: string): TokenPayload | null { }
}

// ❌ BAD: God class
class AuthService {
  async login() { }
  async register() { }
  generateToken() { }
  hashPassword() { }
  sendEmail() { }
  logActivity() { }
  // Too many responsibilities!
}
```

#### DRY (Don't Repeat Yourself):
```typescript
// ✅ GOOD: Reusable function
function validateRequired(value: string | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

// ❌ BAD: Duplicated validation logic
function validateUsername(username: string): ValidationResult {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }
  // ...
}

function validatePassword(password: string): ValidationResult {
  if (!password || password.trim().length === 0) {
    return { isValid: false, error: 'Password is required' };
  }
  // ...
}
```

---

## Testing Guidelines

### Test Structure (AAA Pattern):
```typescript
it('should lock account after 5 failed attempts', async () => {
  // ARRANGE: Set up test data and mocks
  const user = { username: 'test', loginAttempts: 4 };
  mockRepository.findByUsername.mockReturnValue(user);
  
  // ACT: Execute the code being tested
  const result = await authService.login({ 
    username: 'test', 
    password: 'wrong' 
  });
  
  // ASSERT: Verify the results
  expect(result.success).toBe(false);
  expect(mockRepository.lockAccount).toHaveBeenCalled();
});
```

### Test Coverage Goals:
- **Happy path**: Test successful scenarios
- **Edge cases**: Boundary conditions, empty inputs, null/undefined
- **Error cases**: What happens when things go wrong?
- **Security cases**: Unauthorized access, injection attempts, rate limiting

### What to Test:
- ✅ Public methods and functions
- ✅ API endpoints (all HTTP methods)
- ✅ Validation logic
- ✅ Error handling
- ✅ Business logic
- ❌ Private implementation details
- ❌ Third-party library internals
- ❌ TypeScript interfaces (type checking happens at compile time)

---

## Common Mistakes to Avoid

### 1. Skipping Tests
❌ **NEVER** commit code without tests, even for "quick fixes"

### 2. Committing Broken Code
❌ **NEVER** commit code that doesn't compile or has failing tests

### 3. Large Commits
❌ **NEVER** commit multiple unrelated changes together

### 4. Hardcoded Values
❌ **NEVER** hardcode sensitive data (use environment variables)

### 5. console.log in Production
❌ **NEVER** leave debug console.log statements in production code (use logger)

### 6. Ignoring Security
❌ **NEVER** skip input validation or security checks

---

## Project Structure

```
TestProject/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── config/          # Database and configuration
│   │   ├── controllers/     # Route handlers (thin, delegate to services)
│   │   ├── models/          # TypeScript interfaces/types
│   │   ├── repositories/    # Data access layer (SQL queries)
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic (thick, testable)
│   │   └── server.ts        # Application entry point
│   └── tests/unit/          # Unit tests mirroring src structure
│
├── frontend/                 # TypeScript frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── services/        # API client services
│   │   ├── utils/           # Utility functions (validators)
│   │   └── main.ts          # Application entry point
│   └── tests/unit/          # Unit tests mirroring src structure
│
├── TestProject.Tests/        # Consolidated test runner
├── .github/workflows/        # GitHub Actions CI/CD
└── SECURITY_AUDIT.md        # Living security documentation
```

---

## Architectural Patterns

### Layer Separation:
```
Request → Route → Controller → Service → Repository → Database
                                   ↓
                                Logger
```

- **Routes**: Define endpoints, minimal logic
- **Controllers**: Handle HTTP (req/res), validate inputs, call services
- **Services**: Business logic, orchestration, transaction management
- **Repositories**: Data access, SQL queries, database operations

### Dependency Injection:
```typescript
// ✅ GOOD: Dependencies injected
class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtSecret: string,
    private logger?: winston.Logger
  ) {}
}

// ❌ BAD: Hard dependencies
class AuthService {
  private userRepository = new UserRepository(); // Tight coupling!
  private jwtSecret = 'hardcoded'; // Magic value!
}
```

---

## Environment Variables

### Required Variables (backend/.env):
```bash
JWT_SECRET=<256-bit-random-hex>    # NEVER commit actual value!
PORT=3000
NODE_ENV=development               # or 'production'
```

### Generating Secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Using in Code:
```typescript
// ✅ GOOD: Validated environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and be at least 32 characters');
}

// ❌ BAD: No validation
const secret = process.env.JWT_SECRET; // Could be undefined!
```

---

## Git Workflow

### Before Making Changes:
1. Pull latest changes: `git pull origin master`
2. Create a mental plan of what you'll change
3. Estimate how many logical commits this will need

### Making Changes:
1. Make one logical change
2. Run tests: `npm test`
3. Run build: `npm run build`
4. Commit with clear message: `git commit -m "Add X"`
5. Repeat for next logical change

### Before Pushing:
1. Ensure all tests pass
2. Ensure no TypeScript errors
3. Ensure no security vulnerabilities (`npm audit`)
4. Push: `git push origin master`

**The pre-push hook will automatically run tests** - if they fail, fix them before pushing.

---

## Documentation

### When to Update Documentation:
- ✅ Adding new API endpoints
- ✅ Changing security features
- ✅ Modifying environment variables
- ✅ Adding new npm scripts
- ✅ Changing architecture

### Files to Update:
- `README.md` - General project information and setup
- `SECURITY_AUDIT.md` - Security changes and audit results
- `QUICK_START.md` - Quick setup instructions
- **This file** (`INSTRUCTIONS.md`) - When coding standards change

---

## Security Audit Process

### After Making Security-Related Changes:
1. Update `SECURITY_AUDIT.md` with:
   - What was changed
   - Why it was changed
   - What security issue it addresses
   - Update the "Last Updated" date
   - Update the score if applicable

2. Run security audit:
```bash
npm audit
```

3. Fix any new vulnerabilities immediately

---

## Quick Reference Checklist

Before committing, verify:
- [ ] All tests pass (`npm test`)
- [ ] Code compiles (`npm run build`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Tests added for new features
- [ ] Commit message is one clear sentence
- [ ] No secrets or sensitive data in code
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] Security implications considered
- [ ] Documentation updated if needed

---

## Getting Help

### When You're Unsure:
1. Check existing code for similar patterns
2. Review tests to understand expected behavior
3. Check `SECURITY_AUDIT.md` for security requirements
4. Ask for clarification rather than guessing

### Red Flags (Stop and Ask):
- 🚩 Security-related changes you're unsure about
- 🚩 Breaking changes to public APIs
- 🚩 Changes to authentication/authorization logic
- 🚩 Database schema changes
- 🚩 Changes to build/deployment process

---

## Summary

**Remember the Golden Rules:**
1. **Security ALWAYS comes first**
2. **Every feature needs tests**
3. **Commit early, commit often, with clear messages**
4. **Build and test before committing**
5. **When in doubt, ask**

**Your goal:** Leave the codebase better than you found it, more secure than before, and well-tested for the future.

---

**Document Version**: 1.0  
**Last Updated**: April 2, 2026  
**Maintained by**: Development Team
