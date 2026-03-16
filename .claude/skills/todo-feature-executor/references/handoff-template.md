# Feature Handoff Template

Use this exact payload shape:

FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

Required details:

- FeatureID: Exact ID from backlog.
- Branch: `feat/<FeatureID>-<short-kebab-name>`.
- Changed files: Explicit list under allowed ownership boundaries.
- Behavior delivered: Concise implemented behavior summary.
- Tests run: Command plus pass/fail evidence.
- Known risks: Unresolved edge cases or technical debt.
- Integrator notes: Exact shared-shell changes needed from integration-owner.
