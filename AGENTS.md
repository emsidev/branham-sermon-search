# .claude Agent/Skill/Command Bridge

Use this file to route work through the local `.claude` assets in this repo.

## Asset Locations

- Skills: `.claude/skills/<skill-name>/SKILL.md`
- Agents: `.claude/agents/*.md`
- Commands: `.claude/commands/*.md`

## Trigger Rules

- If the user explicitly names a skill, agent, or command, use it.
- If the request clearly matches an asset's purpose, proactively use it.
- Use the smallest set of assets needed for the task.
- Do not carry a skill/agent/command into the next turn unless re-requested or still clearly required.

## Skill Workflow

1. Open the target `SKILL.md`.
2. Read only what is needed to execute the current task.
3. If the skill references local `scripts/`, `references/`, `examples/`, or `data/`, load only relevant files.
4. Prefer running skill scripts over re-implementing the same logic manually.
5. If a skill is missing or unusable, state it briefly and continue with the best fallback.

## Agent Workflow

1. Open the target file in `.claude/agents/`.
2. Use the agent's scope and checklist as execution guidance for the current task.
3. If multiple agents match, pick one primary agent and use others only when necessary.

## Command Workflow

1. Open the target file in `.claude/commands/`.
2. Execute the command behavior described in that file using normal repo edits/tooling.
3. Respect command argument hints and allowed-tools intent.

## Available Skills

- `agent-development`: Build new Claude agents with proper frontmatter, triggers, and system prompts.  
  File: `.claude/skills/agent-development/SKILL.md`
- `azure-functions`: Azure Functions patterns (.NET/Python/Node), Durable Functions, production guidance.  
  File: `.claude/skills/azure-functions/SKILL.md`
- `brainstorming`: Upfront discovery/design flow before creative feature work.  
  File: `.claude/skills/brainstorming/SKILL.md`
- `code-reviewer`: Structured code review toolkit with scripts and checklists.  
  File: `.claude/skills/code-reviewer/SKILL.md`
- `frontend-design`: High-quality, distinctive frontend design/build guidance.  
  File: `.claude/skills/frontend-design/SKILL.md`
- `react-best-practices`: React/Next.js performance rules and optimization patterns.  
  File: `.claude/skills/react-best-practices/SKILL.md`
- `senior-architect`: Architecture design/tradeoff workflows and analysis scripts.  
  File: `.claude/skills/senior-architect/SKILL.md`
- `senior-backend`: Backend/API/database/security/performance implementation guidance.  
  File: `.claude/skills/senior-backend/SKILL.md`
- `senior-frontend`: Frontend architecture, scaffolding, optimization, and best practices.  
  File: `.claude/skills/senior-frontend/SKILL.md`
- `senior-prompt-engineer`: Prompt optimization, evaluation, RAG, and agentic system design.  
  File: `.claude/skills/senior-prompt-engineer/SKILL.md`
- `systematic-debugging`: Root-cause-first debugging process before proposing fixes.  
  File: `.claude/skills/systematic-debugging/SKILL.md`
- `todo-feature-executor`: Implement one feature from todos.md and auto-update its status to done after verification.  
  File: `.claude/skills/todo-feature-executor/SKILL.md`
- `ui-ux-pro-max`: UI/UX design intelligence with styles, palettes, typography, and stack guidance.  
  File: `.claude/skills/ui-ux-pro-max/SKILL.md`

## Available Agents

- `architect-reviewer`: Architectural consistency and SOLID-focused reviewer.  
  File: `.claude/agents/architect-review.md`
- `backend-architect`: API/system boundary and backend architecture specialist.  
  File: `.claude/agents/backend-architect.md`
- `business-analyst`: Requirements/process analysis and business-value recommendations.  
  File: `.claude/agents/business-analyst.md`
- `code-reviewer`: Comprehensive quality/security/performance code reviewer.  
  File: `.claude/agents/code-reviewer.md`
- `debugger`: Root-cause debugging for failures, crashes, and intermittent issues.  
  File: `.claude/agents/debugger.md`
- `frontend-developer`: Multi-framework frontend build/migration specialist.  
  File: `.claude/agents/frontend-developer.md`
- `prompt-engineer`: Prompt system design, optimization, and evaluation specialist.  
  File: `.claude/agents/prompt-engineer.md`
- `supabase-realtime-optimizer`: Supabase realtime performance and connection specialist.  
  File: `.claude/agents/supabase-realtime-optimizer.md`
- `supabase-schema-architect`: Supabase schema, migrations, and RLS specialist.  
  File: `.claude/agents/supabase-schema-architect.md`
- `task-decomposition-expert`: Complex-goal decomposition and workflow orchestration specialist.  
  File: `.claude/agents/task-decomposition-expert.md`
- `Thinking-Beast-Mode`: Deep autonomous problem-solving agent profile.  
  File: `.claude/agents/Thinking-Beast-Mode.md`
- `ui-ux-designer`: UI/UX critique and design-direction specialist.  
  File: `.claude/agents/ui-ux-designer.md`

## Available Commands

- `/todo`: Manage project tasks in `todos.md`.  
  File: `.claude/commands/todo.md`
- `/ultra-think`: Deep multi-perspective analysis mode for complex problems.  
  File: `.claude/commands/ultra-think.md`
- `/update-docs`: Systematic documentation sync/update workflow.  
  File: `.claude/commands/update-docs.md`
