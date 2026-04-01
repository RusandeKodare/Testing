# 🚀 Quick Start Guide

## Prerequisites
- Node.js (v18 or higher)
- npm (comes with Node.js)

## First Time Setup

### 1. Install Dependencies

Open **TWO terminal windows** and run:

**Terminal 1 - Backend:**
```bash
cd C:\Git\TestProject\backend
npm install
```

**Terminal 2 - Frontend:**
```bash
cd C:\Git\TestProject\frontend
npm install
```

---

## Running the Application

### Backend Server (Port 3000)

**Terminal 1:**
```bash
cd C:\Git\TestProject\backend
npm run dev
```

You should see:
```
Server running on port 3000
```

### Frontend Server (Port 3001)

**Terminal 2:**
```bash
cd C:\Git\TestProject\frontend
npm run build
npm run serve
```

You should see:
```
Available on:
  http://127.0.0.1:3001
```

---

## Access the Application

Open your browser and go to:
```
http://localhost:3001
```

You should see the dark-themed login page!

---

## Testing the Application

### Try Registering a New User:
1. Click the "Register" tab
2. Enter username: `testuser` (min 3 characters, alphanumeric)
3. Enter password: `password123` (min 8 characters with at least 1 number)
4. Click "Register"
5. You should see "Registration successful" ✅

### Try Logging In:
1. Click the "Login" tab
2. Enter the same credentials
3. Click "Login"
4. You should see "Login successful" ✅

---

## Running Tests

**Test all components:**
```bash
cd C:\Git\TestProject\TestProject.Tests
npm test
```

**Or test individually:**

Backend only:
```bash
cd C:\Git\TestProject\backend
npm test
```

Frontend only:
```bash
cd C:\Git\TestProject\frontend
npm test
```

---

## Production Build

**Backend:**
```bash
cd C:\Git\TestProject\backend
npm run build
npm start
```

**Frontend:**
```bash
cd C:\Git\TestProject\frontend
npm run build
# Then serve the public/ folder with any static file server
```

---

## Troubleshooting

### Port Already in Use
If you see "EADDRINUSE" error:
- Backend: Change port in `backend/src/server.ts` (line 11)
- Frontend: Use `npm run serve -- -p 3002` (different port)

### Dependencies Not Installed
Run `npm install` in both backend and frontend directories

### Server Won't Start
Check that you're in the correct directory:
```bash
# Should show package.json
ls
```

---

## Quick Commands Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server (backend) |
| `npm run build` | Build TypeScript to JavaScript |
| `npm run serve` | Serve frontend files |
| `npm test` | Run all tests |
| `npm start` | Start production server (backend) |

---

## Default Credentials for Testing

The database starts empty. Create a new account on first use.

**Example test user:**
- Username: `admin123`
- Password: `SecurePass1`

---

## What's Running?

When both servers are running:

- **Backend API**: http://localhost:3000
  - POST /api/auth/register
  - POST /api/auth/login

- **Frontend UI**: http://localhost:3001
  - Login/Register page

---

## Next Steps

After starting:
1. ✅ Open http://localhost:3001
2. ✅ Register a new account
3. ✅ Login with your credentials
4. ✅ Check browser console for JWT token
5. ✅ Review `SECURITY_AUDIT.md` for security considerations

---

**Need help?** Check the README.md for detailed documentation.
