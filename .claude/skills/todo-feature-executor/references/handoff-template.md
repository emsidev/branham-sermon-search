# Feature Handoff Template

Use this exact payload shape:

FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Cross-cutting notes

Required details:

- FeatureID: Exact ID from backlog.
- Branch: `feat/<FeatureID>-<short-kebab-name>`.
- Changed files: Explicit list under allowed ownership boundaries.
- Behavior delivered: Concise implemented behavior summary.
- Tests run: Command plus pass/fail evidence.
- Known risks: Unresolved edge cases or technical debt.
- Cross-cutting notes: Exact shared-shell, routing, shortcut, or migration impacts needed for safe rollout.
