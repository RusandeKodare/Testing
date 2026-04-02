#!/bin/bash
# Setup script to install Git hooks
# Run this script after cloning the repository

echo "Installing Git hooks..."

# Create the pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/sh
# Pre-push hook to run tests before pushing to remote
# This ensures that all tests pass before code is pushed to the repository

echo "Running pre-push tests..."
echo "========================"

# Test backend
echo ""
echo "Testing backend..."
cd backend || exit 1
npm test --silent
BACKEND_EXIT_CODE=$?

if [ $BACKEND_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Backend tests failed!"
  echo "Push aborted. Please fix the failing tests before pushing."
  exit 1
fi

echo "✅ Backend tests passed"

# Test frontend
echo ""
echo "Testing frontend..."
cd ../frontend || exit 1
npm test --silent
FRONTEND_EXIT_CODE=$?

if [ $FRONTEND_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Frontend tests failed!"
  echo "Push aborted. Please fix the failing tests before pushing."
  exit 1
fi

echo "✅ Frontend tests passed"
echo ""
echo "========================"
echo "✅ All tests passed! Proceeding with push..."
echo ""

exit 0
EOF

# Make the hook executable
chmod +x .git/hooks/pre-push

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-push hook will now run all tests before each push."
echo "To bypass the hook temporarily, use: git push --no-verify"
