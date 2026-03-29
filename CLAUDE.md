# Arena SaaS - Working Rules

## Product context
This repository is a multi-tenant SaaS for futvolei / beach sports arenas in Brazil.
The source of truth for product and architecture is `PROJECT.md`.
The source of truth for implementation order is `SCREENS.md`.

## Build strategy
This product must be implemented in small vertical slices, screen by screen.
Each delivery should include only the minimum backend, database, and UI required for that screen to work.

## Core rules
- Read `PROJECT.md` before changing architecture or business rules.
- Read `SCREENS.md` before planning implementation.
- Do not build multiple screens at once unless explicitly asked.
- Work in very small increments.
- Prefer the minimum viable implementation that preserves future extensibility.
- Do not add dependencies unless clearly justified.
- Do not create features outside the requested screen scope.

## Task workflow
For every task:
1. Restate the requested screen/task briefly.
2. Read only the files strictly needed.
3. Propose a short plan.
4. Implement the smallest useful slice.
5. Run only the relevant validation commands.
6. Report changed files, what was done, and remaining risks.

## Output style
- Be concise.
- Avoid long explanations.
- Prefer checklists, file lists, and direct next actions.
- State assumptions clearly when needed.

## Documentation files
- `PROJECT.md` = master product + architecture document
- `SCREENS.md` = implementation order by screen
- `TASKS.md` = active backlog
- `DECISIONS.md` = decision log

## Guardrails
- Use English for code, schema, and technical identifiers.
- Keep labels and copy easy to localize later.
- Avoid broad repo scans when the task is narrow.
- Never change tenancy, auth, or role rules silently.