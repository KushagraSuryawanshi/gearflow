# Contributing

## Workflow

Create a feature branch from `main` and open a pull request back into `main`. Each pull request needs one peer review before it is merged. Keep changes focused and explain any setup or design decision that a reviewer needs to know.

Use Conventional Commits. Examples:

```text
feat(api): enforce booking overlap rules
feat(web): add equipment catalogue
test(api): cover booking status transitions
ci: publish commit-tagged images to GHCR
fix(api): prevent staff from approving own booking
```

## Code quality

Keep TypeScript strict and run the repository checks before opening a pull request. Use the existing ESLint, Prettier and EditorConfig settings. Comments should explain non-obvious decisions; do not add comments that only narrate what the code already says.

Business-rule changes must include tests at the appropriate level. New API behavior should have backend tests, and user-facing flows should have end-to-end coverage when the feature is implemented.
