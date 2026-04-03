# Copilot Instructions for TestProject

These instructions are always-on for this workspace and apply to all tasks.

## Required Workflow

1. Read all markdown files in the repository before starting implementation work.
2. Update all markdown files if necessary before finishing work.
3. Keep code, tests, and documentation in sync in the same change.

## Testing Rules (Strict)

- NEVER TOUCH TESTS TO MAKE THEM GO THROUGH.
- Fix the code instead.
- Add new tests every time new code is introduced.
- For bug fixes, add or update tests that prevent regression.
- Do not remove, weaken, skip, or comment out tests to pass CI.

## Security and Quality Baseline

- Validate all untrusted input on backend and frontend.
- Do not expose sensitive data in logs, responses, or commits.
- Use parameterized queries and approved cryptographic/authentication flows.
- Run required build, type-check, and security audit steps before commit.

## Commit Discipline

- Keep commits focused and small.
- Use clear single-sentence commit messages in present tense.
- Do not add co-author trailers.
