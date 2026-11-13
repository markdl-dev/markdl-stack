# Code Review Workflow Reference

Detailed reference for the code review processing workflow. This file is loaded on-demand when deeper guidance is needed during review processing.

## Table of Contents

1. [Circular Fix Detection Patterns](#circular-fix-detection-patterns)
2. [Agent Coordination Protocol](#agent-coordination-protocol)
3. [Language-Specific Validation](#language-specific-validation)
4. [Common Review Anti-Patterns](#common-review-anti-patterns)
5. [Tool Integration Guide](#tool-integration-guide)

---

## Circular Fix Detection Patterns

Circular fixes happen when a fix to address one review comment creates a new issue that would itself be flagged in review. These are the most common patterns to watch for:

### Pattern 1: Complexity Shuffle

**Symptom**: Moving complex logic from one function to another without actually simplifying it.

```
Reviewer says: "Function X is too complex, break it down"
Bad fix: Move half the logic to a new helper function that's equally complex
Result: Reviewer flags the new helper for the same reason
```

**Prevention**: When breaking down complex functions, ensure each resulting function has a single clear responsibility. If you can't describe what the new function does in one sentence, the decomposition isn't right.

### Pattern 2: Abstraction Ping-Pong

**Symptom**: Adding an abstraction to fix a "too concrete" review, then getting flagged for over-engineering.

```
Reviewer says: "This is too tightly coupled to the external API"
Bad fix: Add a generic interface with only one implementation
Result: Reviewer flags unnecessary abstraction
```

**Prevention**: Only add abstractions when there are (or will imminently be) multiple implementations. Check the codebase for existing patterns before introducing new abstractions.

### Pattern 3: Error Handling Oscillation

**Symptom**: Adding error handling that obscures the original logic, or removing error handling that the reviewer wanted added.

```
Reviewer says: "Add error handling for the API call"
Bad fix: Wrap in 3 layers of error checks that make the happy path unreadable
Result: Reviewer flags poor readability
```

**Prevention**: Follow the language's idiomatic error handling patterns. Add the minimum error handling needed — check the error, add context, propagate. Don't add retry logic, fallback behavior, or complex recovery unless specifically asked for.

### Pattern 4: Test Coverage Regression

**Symptom**: Fixing implementation code in a way that breaks existing tests, then needing to fix tests, which reveals more issues.

```
Reviewer says: "Fix the nil pointer in processItems"
Bad fix: Change the function signature to require non-nil, breaking 15 test cases
Result: Reviewer flags all the broken tests
```

**Prevention**: Before changing any function signature, count the callers and test cases. If the change has wide impact, prefer a defensive fix (nil/null check + early return) over a contract change.

### Pattern 5: Style Drift

**Symptom**: Fixing style in the reviewed code while introducing a different style inconsistency.

```
Reviewer says: "Use consistent variable naming"
Bad fix: Change to a naming convention not used elsewhere in the codebase
Result: Reviewer flags style inconsistency with the rest of the codebase
```

**Prevention**: Before making style changes, grep the codebase for the dominant pattern. Follow whatever convention has the most occurrences.

## Agent Coordination Protocol

### Sequential Dependencies

When multiple agents need to collaborate on a single review item:

1. **Architect-first items**: Architect designs the approach, implementation agent builds it
   - Architect agent outputs: approved approach document
   - Implementation agent receives: the approach document as input
   - Testing agent receives: both approach and implementation for test design

2. **Implementation-first items**: Implementation agent identifies the fix, testing validates
   - Implementation agent outputs: the implementation
   - Testing agent receives: the implementation to write regression tests

### Parallel Execution Rules

Items can run in parallel ONLY if:
- They touch different files
- They don't share any modified functions or types
- One fix doesn't depend on the other's output

If in doubt, run sequentially. The cost of serialization is small; the cost of merge conflicts is large.

### Inter-Agent Communication

When routing to agents, ensure each agent receives:

1. **Full branch context**: The complete diff, not just the relevant file
2. **Other pending fixes**: What other review items are being fixed simultaneously, to avoid conflicting changes
3. **Codebase conventions**: Pointer to CLAUDE.md and any relevant existing patterns
4. **Test requirements**: Whether a regression test is expected for this fix

### Conflict Resolution

If two agents propose conflicting changes:
1. Stop both agents
2. Present the conflict to the user
3. Let the user decide, or invoke the architect agent to arbitrate
4. Re-run the losing agent with the updated constraint

## Language-Specific Validation

Detect the project language from build files and file extensions, then apply the appropriate checks.

### Build & Test Commands by Language

| Language | Build | Test | Lint |
|----------|-------|------|------|
| Go | `go build ./...` | `go test ./...` | `go vet ./...`, `golangci-lint run` |
| TypeScript/JS | `npm run build` / `yarn build` | `npm test` / `yarn test` | `npm run lint` / `eslint .` |
| Python | - | `pytest` / `python -m pytest` | `ruff check .` / `mypy .` |
| Rust | `cargo build` | `cargo test` | `cargo clippy` |
| Java | `mvn compile` / `gradle build` | `mvn test` / `gradle test` | `mvn checkstyle:check` |

If a `Makefile` exists, prefer `make build`, `make test`, `make lint` as they often wrap the correct commands with project-specific flags.

### Language-Specific Validation Checks

**Go**: Check `go vet`, verify error wrapping with `fmt.Errorf("context: %w", err)`, check interface implementations.

**TypeScript/JS**: Check type errors with `tsc --noEmit`, verify `import`/`export` consistency, check for unused variables.

**Python**: Check type hints with `mypy`, verify import ordering, check for common issues with `ruff` or `flake8`.

**Rust**: Check with `cargo clippy`, verify borrow checker compliance, check for `unwrap()` in non-test code.

### Project-Specific Checks

Always look for project-specific validation by reading:
- `CLAUDE.md` for documented conventions and structure
- `Makefile` / `package.json` scripts for available commands
- CI configuration (`.github/workflows/`, `.gitlab-ci.yml`, etc.) for what the CI pipeline checks

## Common Review Anti-Patterns

These are review feedback patterns that often lead to circular fixes if taken at face value:

### "Make it more testable"

This is valid feedback, but the fix must be scoped carefully. Common traps:
- Don't introduce interfaces/abstractions for every dependency (over-abstraction)
- Don't add dependency injection if there's only one implementation
- DO extract pure functions where possible
- DO use existing test utility patterns in the project

### "Add more error context"

Valid in most languages, but watch for:
- Don't double-wrap errors (check if the callee already wraps)
- Don't expose internal details in error messages that go to users
- DO follow the project's existing error handling patterns

### "This function is too long"

Valid, but:
- Don't extract functions that are called exactly once and make the flow harder to follow
- Don't create a separate file for a single helper function
- DO extract when there's a clear sub-responsibility with a good name
- DO extract when the same logic appears in multiple places

### "Add validation"

Valid at system boundaries, but:
- Don't validate internal function parameters that are always called correctly
- Don't add validation that duplicates what an external API will check anyway
- DO validate user/config inputs at entry points
- DO validate CLI/API request inputs

## Tool Integration Guide

### When to Use Browser/Playwright MCP

Use the Playwright browser tools when the review involves:
- Verifying UI behavior
- Testing endpoints with actual browser interaction
- Validating HTML/UI output

### When to Use Web Tools

- **WebSearch**: For looking up API documentation when the review claims API usage is wrong
- **WebFetch**: For reading documentation to validate review claims about API contracts or library behavior

### When to Use Project-Specific MCP Servers

Check what MCP servers are configured for the session. Use them when:
- The review references external service behavior that can be verified via MCP
- Need to check actual configurations or schemas from connected services
- Validating that code behavior matches external system expectations
