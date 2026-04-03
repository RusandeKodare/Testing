#!/bin/bash
# Setup script to install Git hooks
# Run this script after cloning the repository

echo "Installing Git hooks..."

# Create the pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# Pre-commit hook to validate build + tests before commit

echo "Running pre-commit checks..."
echo "========================"

# Build backend
echo ""
echo "Building backend..."
cd backend || exit 1
npm run build --silent
BACKEND_BUILD_EXIT_CODE=$?

if [ $BACKEND_BUILD_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "[ERROR] Backend build failed!"
  echo "Commit aborted. Please fix build errors before committing."
  exit 1
fi

echo "[OK] Backend build passed"

# Build frontend
echo ""
echo "Building frontend..."
cd ../frontend || exit 1
npm run build --silent
FRONTEND_BUILD_EXIT_CODE=$?

if [ $FRONTEND_BUILD_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "[ERROR] Frontend build failed!"
  echo "Commit aborted. Please fix build errors before committing."
  exit 1
fi

echo "[OK] Frontend build passed"

# Test backend
echo ""
echo "Testing backend..."
cd ../backend || exit 1
npm test --silent
BACKEND_EXIT_CODE=$?

if [ $BACKEND_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "[ERROR] Backend tests failed!"
  echo "Commit aborted. Please fix failing tests before committing."
  exit 1
fi

echo "[OK] Backend tests passed"

# Test frontend
echo ""
echo "Testing frontend..."
cd ../frontend || exit 1
npm test --silent
FRONTEND_EXIT_CODE=$?

if [ $FRONTEND_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "[ERROR] Frontend tests failed!"
  echo "Commit aborted. Please fix failing tests before committing."
  exit 1
fi

echo "[OK] Frontend tests passed"
echo ""
echo "========================"
echo "[OK] All pre-commit checks passed. Proceeding with commit..."
echo ""

exit 0
EOF

# Make the hook executable
chmod +x .git/hooks/pre-commit

echo "[OK] Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will now build and test backend + frontend before each commit."
echo "To bypass the hook temporarily, use: git commit --no-verify"
