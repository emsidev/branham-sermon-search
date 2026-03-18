---
name: todo-feature-executor
description: Implement backlog features defined in todos.md and auto-update their status when work is complete. Use when the user asks to implement a specific FeatureID (for example S05, R04, X02), wants a generated builder prompt from a feature spec, or wants todos.md updated from TODO to DONE after tests pass.
---

# Todo Feature Executor

## Overview

Implement one feature at a time from `todos.md` using that feature's spec block and ownership boundaries. After successful verification, automatically update the feature status in both the backlog table and the spec block.

Completion is mandatory: do not finalize a feature handoff until `todos.md` reflects the completed status.

## Workflow

1. Generate the feature brief.
- Run `python .claude/skills/todo-feature-executor/scripts/feature_workflow.py brief <FeatureID>`.
- Use the output as the implementation prompt. It includes agent, hard constraints, and the exact feature spec block.

2. Implement inside boundaries.
- Follow `Allowed files` and `Forbidden files` from the selected feature block.
- Maintain TypeScript strict mode.
- Do not add dependencies without explicit approval.
- Keep edits scoped to the feature's acceptance criteria and ownership boundaries.

3. Verify behavior.
- Run required tests for the feature before status updates.
- Collect pass/fail evidence for handoff.

4. Mark the feature complete automatically (required).
- Run `python .claude/skills/todo-feature-executor/scripts/feature_workflow.py complete <FeatureID> --verify-command "npx vitest run"`.
- Default completion status is `DONE`.
- Use `--status DONE-LOCKED` only when you intentionally want a locked completion state.
- `done` is a supported alias for `complete`.

5. Produce handoff using the required schema.
- `FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Cross-cutting notes`
- Use [handoff-template.md](references/handoff-template.md).

## Commands

- Build brief:
`python .claude/skills/todo-feature-executor/scripts/feature_workflow.py brief S05`

- Dry-run status update:
`python .claude/skills/todo-feature-executor/scripts/feature_workflow.py complete S05 --dry-run`

- Complete with verification gate:
`python .claude/skills/todo-feature-executor/scripts/feature_workflow.py complete S05 --verify-command "npx vitest run"`

- Same action using alias:
`python .claude/skills/todo-feature-executor/scripts/feature_workflow.py done S05 --verify-command "npx vitest run"`

## Failure Handling

- If the `FeatureID` is missing from either backlog table or spec block, stop and fix `todos.md` consistency first.
- If `--verify-command` fails, do not update status.
- If requested edits conflict with ownership boundaries, keep forbidden edits out of the patch and list them under `Cross-cutting notes`.
- If status update cannot be applied, explicitly report that the feature remains `TODO` and include the blocking reason.
