# Project Todos - Parallel Feature Backlog

## Standard Contract
- Entry schema: `Status | FeatureID | Feature name | Primary agent | Owned surface | Integrator`
- Feature ID namespace:
  - `S` = Search and Navigation
  - `R` = Reading Mode
  - `P` = Presentation Mode
  - `E` = E-Book and Reading Features
  - `L` = Organization and Library
  - `X` = Sharing and Reference
- Ownership contract:
  - Builder-owned surfaces: `src/{components,hooks,lib}/** (feature-scoped)` and colocated tests only.
  - Integration-owned shared files only: `src/App.tsx`, `src/pages/*`, global nav/shortcut wiring, route registration.
  - DB-only owner: `supabase/migrations/**` and generated type updates.
- PR/branch naming: `feat/<FeatureID>-<short-kebab-name>` (example: `feat/S06-fuzzy-search`)

## Integrator Track
- Integrator ID: `integration-owner`
- Allowed shared-file touches:
  - `src/App.tsx`
  - `src/pages/*`
  - global shortcut wiring
  - route registration
- Rule: Feature builders do not modify shared shell files directly.

## Backlog
| Status | FeatureID | Feature name | Primary agent | Owned surface | Integrator |
|---|---|---|---|---|---|
| DONE-LOCKED | S01 | Full-text search + keyword highlighting across all sermons | frontend-developer(search) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| DONE-LOCKED | S02 | Next/Prev hit navigation (N / Shift+N) | frontend-developer(search) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| DONE-LOCKED | S03 | Only active hit highlighted; all others dimmed | frontend-developer(search) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| DONE-LOCKED | S04 | Search pop-up with result count ("3 of 47") via toolbar button or custom shortcut | frontend-developer(search) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | S05 | Search filters by year, sermon title, location | backend-architect | src/{components,hooks,lib}/** (feature-scoped); supabase/migrations/*_s05_*.sql | integration-owner |
| TODO | S06 | Fuzzy search (typo-tolerant) | backend-architect | src/{components,hooks,lib}/** (feature-scoped); supabase/migrations/*_s06_*.sql | integration-owner |
| TODO | S07 | Search history saved locally | frontend-developer(search) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | S08 | Jump to hit number | frontend-developer(search) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | S09 | Search filters extended by scripture reference | backend-architect | src/{components,hooks,lib}/** (feature-scoped); supabase/migrations/*_s09_*.sql | integration-owner |
| TODO | S10 | AI-assisted semantic search | prompt-engineer | src/{components,hooks,lib}/** (feature-scoped); scripts/s10/** | integration-owner |
| TODO | R01 | Enter/Exit reading mode (R) | frontend-developer(reader) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | R02 | Sticky bottom progress bar for sermon progress | frontend-developer(reader) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| DONE-LOCKED | R03 | Resume position per sermon | frontend-developer(reader) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | R04 | Word-by-word highlighting with Space or Right, and Left to go back | frontend-developer(reader) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | R05 | Highlight mode toggle: word, sentence, paragraph | frontend-developer(reader) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | R06 | Auto-scroll with adjustable speed | frontend-developer(reader) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | R07 | Read-aloud sync: word/sentence highlight follows sermon audio playback | frontend-developer(reader) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | P01 | Slide view of highlighted/selected text (P) | frontend-developer(presentation) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | P02 | Fullscreen presentation (F) | frontend-developer(presentation) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | P03 | Next/Prev slide (Right / Left) | frontend-developer(presentation) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | P04 | Sermon code + title + author auto-shown as slide subtitle | frontend-developer(presentation) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | P05 | Multi-selection passage queue for slides | frontend-developer(presentation) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | P06 | Slide themes (background, font, color scheme) | ui-ux-designer | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | P07 | Scripture watermark option | frontend-developer(presentation) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | P08 | Export slides as PDF/images | frontend-developer(presentation) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E01 | Font size control and font family selection in settings | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E02 | Dark/Sepia/Light mode with D shortcut | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E03 | Word count and estimated reading time in sermon header | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E04 | Page view vs scroll view toggle | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E05 | Bookmarks (B) | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E06 | Highlights and colors (H then 1-4) | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E07 | Table of contents jump to paragraphs | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E08 | Line spacing and margin controls | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E09 | Scripture cross-reference preview inline | backend-architect | src/{components,hooks,lib}/** (feature-scoped); supabase/migrations/*_e09_*.sql | integration-owner |
| TODO | E10 | Personal notes/annotations (M) | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E11 | Margin notes rendering | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E12 | Dictionary/definition on hover for uncommon words | backend-architect | src/{components,hooks,lib}/** (feature-scoped); supabase/migrations/*_e12_*.sql | integration-owner |
| TODO | E13 | Print-friendly view via toolbar button | frontend-developer(reading-tools) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | E14 | Built-in audio player integration synced to transcript | frontend-developer(reader) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | L01 | Year page: browse sermons by year | frontend-developer(library) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | L02 | Sermon index: alphabetical and chronological listing | frontend-developer(library) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | L03 | Continue reading: home shows recently opened sermons | frontend-developer(library) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | L04 | Favorites: star sermons for quick access | frontend-developer(library) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | L05 | Collections/Reading lists | frontend-developer(library) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | L06 | User-defined tags per sermon | frontend-developer(library) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | L07 | Reading stats: sermons read, time spent, words read | frontend-developer(library) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | L08 | User accounts and cloud sync | backend-architect | src/{components,hooks,lib}/** (feature-scoped); supabase/migrations/*_l08_*.sql | integration-owner |
| TODO | L09 | Community highlights | backend-architect | src/{components,hooks,lib}/** (feature-scoped); supabase/migrations/*_l09_*.sql | integration-owner |
| TODO | L10 | Multi-language support for translated sermon display | backend-architect | src/{components,hooks,lib}/** (feature-scoped); supabase/migrations/*_l10_*.sql | integration-owner |
| TODO | L11 | Mobile app (PWA or native) with offline reading support | frontend-developer(library) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | X01 | Canonical reference format in sermon header | frontend-developer(sharing) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | X02 | Copy with citation: text + sermon code/title/author + paragraph number | frontend-developer(sharing) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | X03 | Shareable deep link to specific paragraph | frontend-developer(sharing) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | X04 | Export passage as .txt or .pdf | frontend-developer(sharing) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | X05 | Social share styled quote card image | ui-ux-designer | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |
| TODO | X06 | Export passage as .docx | frontend-developer(sharing) | src/{components,hooks,lib}/** (feature-scoped) | integration-owner |

## Backlog Validation Checklist
- [ ] Confirm 56 features are listed exactly once by FeatureID.
- [ ] Confirm exactly 5 features are marked `DONE-LOCKED` (S01, S02, S03, S04, R03).
- [ ] Confirm every feature has one primary agent.
- [ ] Confirm every feature has clear feature-scoped ownership boundaries in src/{components,hooks,lib}/**.
- [ ] Confirm only `integration-owner` touches shared shell files.

## Per-Feature Acceptance Template
- Keyboard shortcuts (if applicable) behave correctly and do not conflict with existing shortcuts.
- URL/state persistence is defined and tested for refresh/back-forward scenarios.
- Visual behavior is covered by component/page tests and verified for regressions.
- New logic paths include `vitest` coverage.

## Assumptions and Defaults
- Scope includes phases 1-4.
- Granularity is one todo item per feature.
- Completed items remain visible as `DONE-LOCKED`.
- Personal data features are local-first until L08 introduces cloud sync.
- Existing `.claude` agents are reused; no new agent definitions are required.

## Global Pattern Contract
- Follow the current page/layout system and tokenized styling patterns from [Search.tsx](src/pages/Search.tsx).
- Follow existing data flow and query conventions from [useSermons.ts](src/hooks/useSermons.ts); avoid introducing parallel data-access abstractions.
- Follow settings, shortcut, and preference conventions from [Settings.tsx](src/pages/Settings.tsx) and existing keyboard shortcut utilities.
- Keep feature implementation isolated in src/{components,hooks,lib}/** (feature-scoped); shared shell wiring remains integrator-only.
- Do not add dependencies without explicit approval in the feature handoff.
- Maintain TypeScript strictness and existing test stack (vitest + @testing-library/react).

## Handoff Contract (Required)
Use this exact payload shape in every feature handoff:
FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

Required details:
- FeatureID: exact ID from backlog.
- Branch: feat/<FeatureID>-<short-kebab-name>.
- Changed files: explicit list under allowed ownership.
- Behavior delivered: concise implemented behavior summary.
- Tests run: command and pass/fail evidence.
- Known risks: unresolved edge cases or technical debt.
- Integrator notes: exact shared-shell changes needed from integration-owner.

## Definition of Done (Per Feature)
- Acceptance criteria in that feature block are satisfied.
- Required tests for that feature are implemented and passing.
- No forbidden file edits by non-integrator agents.
- Handoff payload is complete and uses the exact required schema.
## Feature Specs (All IDs)

### S01 - Full-text search + keyword highlighting across all sermons
Status: DONE-LOCKED
Primary agent: frontend-developer(search)
Goal: Deliver and verify the S01 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Confirm current behavior remains intact for S01 and capture regression evidence only.
- Limit updates to bug-fix-level adjustments if objective regressions are proven by tests.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
- Large refactors or redesigns of already-complete behavior.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for S01 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Existing S01 capability remains functionally unchanged unless fixing a proven regression.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### S02 - Next/Prev hit navigation (N / Shift+N)
Status: TODO
Primary agent: frontend-developer(search)
Goal: Deliver and verify the S02 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Next/Prev hit navigation (N / Shift+N) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for S02 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Next/Prev hit navigation (N / Shift+N) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### S03 - Only active hit highlighted; all others dimmed
Status: TODO
Primary agent: frontend-developer(search)
Goal: Deliver and verify the S03 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Only active hit highlighted; all others dimmed in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for S03 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Only active hit highlighted; all others dimmed works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### S04 - Search pop-up with result count ("3 of 47") via toolbar button or custom shortcut
Status: TODO
Primary agent: frontend-developer(search)
Goal: Deliver and verify the S04 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Search pop-up with result count ("3 of 47") via toolbar button or custom shortcut in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for S04 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Search pop-up with result count ("3 of 47") via toolbar button or custom shortcut works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### S05 - Search filters by year, sermon title, location
Status: TODO
Primary agent: backend-architect
Goal: Deliver and verify the S05 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Search filters by year, sermon title, location in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
- supabase/migrations/*_*.sql
- src/integrations/supabase/types.ts (only when regenerated for this feature)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: supabase-migration
Required tests:
- Add or extend vitest coverage for S05 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add Supabase query/mutation tests with mocked responses and error-path assertions.
- Include migration smoke validation notes in handoff (apply/rollback intent).
Acceptance criteria:
- Search filters by year, sermon title, location works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### S06 - Fuzzy search (typo-tolerant)
Status: TODO
Primary agent: backend-architect
Goal: Deliver and verify the S06 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Fuzzy search (typo-tolerant) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
- supabase/migrations/*_*.sql
- src/integrations/supabase/types.ts (only when regenerated for this feature)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: supabase-migration
Required tests:
- Add or extend vitest coverage for S06 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add Supabase query/mutation tests with mocked responses and error-path assertions.
- Include migration smoke validation notes in handoff (apply/rollback intent).
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Fuzzy search (typo-tolerant) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### S07 - Search history saved locally
Status: TODO
Primary agent: frontend-developer(search)
Goal: Deliver and verify the S07 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Search history saved locally in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for S07 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Search history saved locally works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### S08 - Jump to hit number
Status: TODO
Primary agent: frontend-developer(search)
Goal: Deliver and verify the S08 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Jump to hit number in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for S08 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Jump to hit number works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### S09 - Search filters extended by scripture reference
Status: TODO
Primary agent: backend-architect
Goal: Deliver and verify the S09 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Search filters extended by scripture reference in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
- supabase/migrations/*_*.sql
- src/integrations/supabase/types.ts (only when regenerated for this feature)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: supabase-migration
Required tests:
- Add or extend vitest coverage for S09 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add Supabase query/mutation tests with mocked responses and error-path assertions.
- Include migration smoke validation notes in handoff (apply/rollback intent).
Acceptance criteria:
- Search filters extended by scripture reference works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### S10 - AI-assisted semantic search
Status: TODO
Primary agent: prompt-engineer
Goal: Deliver and verify the S10 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement AI-assisted semantic search in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
- scripts/s10/** (only for AI-service plumbing tied to this feature)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: ai-service
Required tests:
- Add or extend vitest coverage for S10 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add AI-service contract test for request/response shaping and fallback behavior on provider failure.
Acceptance criteria:
- AI-assisted semantic search works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### R01 - Enter/Exit reading mode (R)
Status: TODO
Primary agent: frontend-developer(reader)
Goal: Deliver and verify the R01 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Enter/Exit reading mode (R) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for R01 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Enter/Exit reading mode (R) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### R02 - Sticky bottom progress bar for sermon progress
Status: TODO
Primary agent: frontend-developer(reader)
Goal: Deliver and verify the R02 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Sticky bottom progress bar for sermon progress in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for R02 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Sticky bottom progress bar for sermon progress works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### R03 - Resume position per sermon
Status: DONE-LOCKED
Primary agent: frontend-developer(reader)
Goal: Deliver and verify the R03 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Confirm current behavior remains intact for R03 and capture regression evidence only.
- Limit updates to bug-fix-level adjustments if objective regressions are proven by tests.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
- Large refactors or redesigns of already-complete behavior.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for R03 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Existing R03 capability remains functionally unchanged unless fixing a proven regression.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### R04 - Word-by-word highlighting with Space or Right, and Left to go back
Status: TODO
Primary agent: frontend-developer(reader)
Goal: Deliver and verify the R04 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Word-by-word highlighting with Space or Right, and Left to go back in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for R04 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Word-by-word highlighting with Space or Right, and Left to go back works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### R05 - Highlight mode toggle: word, sentence, paragraph
Status: TODO
Primary agent: frontend-developer(reader)
Goal: Deliver and verify the R05 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Highlight mode toggle: word, sentence, paragraph in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for R05 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Highlight mode toggle: word, sentence, paragraph works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### R06 - Auto-scroll with adjustable speed
Status: TODO
Primary agent: frontend-developer(reader)
Goal: Deliver and verify the R06 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Auto-scroll with adjustable speed in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for R06 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Auto-scroll with adjustable speed works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### R07 - Read-aloud sync: word/sentence highlight follows sermon audio playback
Status: TODO
Primary agent: frontend-developer(reader)
Goal: Deliver and verify the R07 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Read-aloud sync: word/sentence highlight follows sermon audio playback in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for R07 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Read-aloud sync: word/sentence highlight follows sermon audio playback works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### P01 - Slide view of highlighted/selected text (P)
Status: TODO
Primary agent: frontend-developer(presentation)
Goal: Deliver and verify the P01 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Slide view of highlighted/selected text (P) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for P01 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Slide view of highlighted/selected text (P) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### P02 - Fullscreen presentation (F)
Status: TODO
Primary agent: frontend-developer(presentation)
Goal: Deliver and verify the P02 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Fullscreen presentation (F) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for P02 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Fullscreen presentation (F) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### P03 - Next/Prev slide (Right / Left)
Status: TODO
Primary agent: frontend-developer(presentation)
Goal: Deliver and verify the P03 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Next/Prev slide (Right / Left) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for P03 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Next/Prev slide (Right / Left) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### P04 - Sermon code + title + author auto-shown as slide subtitle
Status: TODO
Primary agent: frontend-developer(presentation)
Goal: Deliver and verify the P04 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Sermon code + title + author auto-shown as slide subtitle in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for P04 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Sermon code + title + author auto-shown as slide subtitle works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### P05 - Multi-selection passage queue for slides
Status: TODO
Primary agent: frontend-developer(presentation)
Goal: Deliver and verify the P05 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Multi-selection passage queue for slides in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for P05 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Multi-selection passage queue for slides works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### P06 - Slide themes (background, font, color scheme)
Status: TODO
Primary agent: ui-ux-designer
Goal: Deliver and verify the P06 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Slide themes (background, font, color scheme) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for P06 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Slide themes (background, font, color scheme) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### P07 - Scripture watermark option
Status: TODO
Primary agent: frontend-developer(presentation)
Goal: Deliver and verify the P07 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Scripture watermark option in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for P07 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Scripture watermark option works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### P08 - Export slides as PDF/images
Status: TODO
Primary agent: frontend-developer(presentation)
Goal: Deliver and verify the P08 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Export slides as PDF/images in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for P08 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Export slides as PDF/images works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E01 - Font size control and font family selection in settings
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E01 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Font size control and font family selection in settings in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E01 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Font size control and font family selection in settings works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E02 - Dark/Sepia/Light mode with D shortcut
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E02 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Dark/Sepia/Light mode with D shortcut in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E02 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Dark/Sepia/Light mode with D shortcut works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E03 - Word count and estimated reading time in sermon header
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E03 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Word count and estimated reading time in sermon header in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for E03 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Word count and estimated reading time in sermon header works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E04 - Page view vs scroll view toggle
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E04 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Page view vs scroll view toggle in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E04 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Page view vs scroll view toggle works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E05 - Bookmarks (B)
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E05 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Bookmarks (B) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E05 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Bookmarks (B) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E06 - Highlights and colors (H then 1-4)
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E06 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Highlights and colors (H then 1-4) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E06 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Highlights and colors (H then 1-4) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E07 - Table of contents jump to paragraphs
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E07 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Table of contents jump to paragraphs in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E07 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Table of contents jump to paragraphs works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E08 - Line spacing and margin controls
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E08 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Line spacing and margin controls in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E08 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Line spacing and margin controls works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E09 - Scripture cross-reference preview inline
Status: TODO
Primary agent: backend-architect
Goal: Deliver and verify the E09 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Scripture cross-reference preview inline in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
- supabase/migrations/*_*.sql
- src/integrations/supabase/types.ts (only when regenerated for this feature)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: supabase-migration
Required tests:
- Add or extend vitest coverage for E09 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add Supabase query/mutation tests with mocked responses and error-path assertions.
- Include migration smoke validation notes in handoff (apply/rollback intent).
Acceptance criteria:
- Scripture cross-reference preview inline works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E10 - Personal notes/annotations (M)
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E10 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Personal notes/annotations (M) in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E10 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Personal notes/annotations (M) works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E11 - Margin notes rendering
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E11 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Margin notes rendering in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E11 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Margin notes rendering works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E12 - Dictionary/definition on hover for uncommon words
Status: TODO
Primary agent: backend-architect
Goal: Deliver and verify the E12 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Dictionary/definition on hover for uncommon words in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
- supabase/migrations/*_*.sql
- src/integrations/supabase/types.ts (only when regenerated for this feature)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: supabase-migration
Required tests:
- Add or extend vitest coverage for E12 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add Supabase query/mutation tests with mocked responses and error-path assertions.
- Include migration smoke validation notes in handoff (apply/rollback intent).
Acceptance criteria:
- Dictionary/definition on hover for uncommon words works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E13 - Print-friendly view via toolbar button
Status: TODO
Primary agent: frontend-developer(reading-tools)
Goal: Deliver and verify the E13 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Print-friendly view via toolbar button in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for E13 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Print-friendly view via toolbar button works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### E14 - Built-in audio player integration synced to transcript
Status: TODO
Primary agent: frontend-developer(reader)
Goal: Deliver and verify the E14 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Built-in audio player integration synced to transcript in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for E14 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Built-in audio player integration synced to transcript works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L01 - Year page: browse sermons by year
Status: TODO
Primary agent: frontend-developer(library)
Goal: Deliver and verify the L01 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Year page: browse sermons by year in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for L01 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Year page: browse sermons by year works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L02 - Sermon index: alphabetical and chronological listing
Status: TODO
Primary agent: frontend-developer(library)
Goal: Deliver and verify the L02 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Sermon index: alphabetical and chronological listing in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for L02 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Sermon index: alphabetical and chronological listing works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L03 - Continue reading: home shows recently opened sermons
Status: TODO
Primary agent: frontend-developer(library)
Goal: Deliver and verify the L03 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Continue reading: home shows recently opened sermons in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for L03 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Continue reading: home shows recently opened sermons works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L04 - Favorites: star sermons for quick access
Status: TODO
Primary agent: frontend-developer(library)
Goal: Deliver and verify the L04 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Favorites: star sermons for quick access in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for L04 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Favorites: star sermons for quick access works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L05 - Collections/Reading lists
Status: TODO
Primary agent: frontend-developer(library)
Goal: Deliver and verify the L05 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Collections/Reading lists in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for L05 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Collections/Reading lists works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L06 - User-defined tags per sermon
Status: TODO
Primary agent: frontend-developer(library)
Goal: Deliver and verify the L06 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement User-defined tags per sermon in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for L06 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- User-defined tags per sermon works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L07 - Reading stats: sermons read, time spent, words read
Status: TODO
Primary agent: frontend-developer(library)
Goal: Deliver and verify the L07 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Reading stats: sermons read, time spent, words read in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for L07 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Reading stats: sermons read, time spent, words read works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L08 - User accounts and cloud sync
Status: TODO
Primary agent: backend-architect
Goal: Deliver and verify the L08 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement User accounts and cloud sync in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
- supabase/migrations/*_*.sql
- src/integrations/supabase/types.ts (only when regenerated for this feature)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: supabase-migration
Required tests:
- Add or extend vitest coverage for L08 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add Supabase query/mutation tests with mocked responses and error-path assertions.
- Include migration smoke validation notes in handoff (apply/rollback intent).
Acceptance criteria:
- User accounts and cloud sync works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L09 - Community highlights
Status: TODO
Primary agent: backend-architect
Goal: Deliver and verify the L09 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Community highlights in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
- supabase/migrations/*_*.sql
- src/integrations/supabase/types.ts (only when regenerated for this feature)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: supabase-migration
Required tests:
- Add or extend vitest coverage for L09 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add Supabase query/mutation tests with mocked responses and error-path assertions.
- Include migration smoke validation notes in handoff (apply/rollback intent).
Acceptance criteria:
- Community highlights works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L10 - Multi-language support for translated sermon display
Status: TODO
Primary agent: backend-architect
Goal: Deliver and verify the L10 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Multi-language support for translated sermon display in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
- supabase/migrations/*_*.sql
- src/integrations/supabase/types.ts (only when regenerated for this feature)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: supabase-migration
Required tests:
- Add or extend vitest coverage for L10 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add Supabase query/mutation tests with mocked responses and error-path assertions.
- Include migration smoke validation notes in handoff (apply/rollback intent).
Acceptance criteria:
- Multi-language support for translated sermon display works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### L11 - Mobile app (PWA or native) with offline reading support
Status: TODO
Primary agent: frontend-developer(library)
Goal: Deliver and verify the L11 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Mobile app (PWA or native) with offline reading support in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for L11 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
- Add keyboard-shortcut behavior and conflict-avoidance tests aligned with shortcut definitions.
Acceptance criteria:
- Mobile app (PWA or native) with offline reading support works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### X01 - Canonical reference format in sermon header
Status: TODO
Primary agent: frontend-developer(sharing)
Goal: Deliver and verify the X01 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Canonical reference format in sermon header in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for X01 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Canonical reference format in sermon header works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### X02 - Copy with citation: text + sermon code/title/author + paragraph number
Status: TODO
Primary agent: frontend-developer(sharing)
Goal: Deliver and verify the X02 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Copy with citation: text + sermon code/title/author + paragraph number in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: local-storage
Required tests:
- Add or extend vitest coverage for X02 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add storage resilience tests for read/write and blocked-storage fallback behavior.
Acceptance criteria:
- Copy with citation: text + sermon code/title/author + paragraph number works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### X03 - Shareable deep link to specific paragraph
Status: TODO
Primary agent: frontend-developer(sharing)
Goal: Deliver and verify the X03 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Shareable deep link to specific paragraph in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for X03 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Shareable deep link to specific paragraph works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### X04 - Export passage as .txt or .pdf
Status: TODO
Primary agent: frontend-developer(sharing)
Goal: Deliver and verify the X04 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Export passage as .txt or .pdf in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for X04 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Export passage as .txt or .pdf works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### X05 - Social share styled quote card image
Status: TODO
Primary agent: ui-ux-designer
Goal: Deliver and verify the X05 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Social share styled quote card image in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for X05 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Social share styled quote card image works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

### X06 - Export passage as .docx
Status: TODO
Primary agent: frontend-developer(sharing)
Goal: Deliver and verify the X06 capability exactly as defined in backlog language while preserving existing app behavior and style conventions.
In scope:
- Implement Export passage as .docx in src/{components,hooks,lib}/** (feature-scoped) with reusable module boundaries for integrator wiring.
- Keep state, event handling, and UX consistent with existing search/reading/settings patterns.
- Provide deterministic handoff notes for integration-owner to wire shared shell files.
Out of scope:
- Any behavior from other FeatureIDs.
- Direct route/header/global-shortcut shell edits by builder agents.
Allowed files:
- src/{components,hooks,lib}/** (feature-scoped)
Forbidden files:
- src/App.tsx
- src/pages/*
- src/components/GlobalKeyboardShortcuts.tsx
- Global route registration, nav wiring, and shared shell composition files (integrator-only).
Pattern anchors:
- [Search.tsx](src/pages/Search.tsx)
- [useSermons.ts](src/hooks/useSermons.ts)
- [Settings.tsx](src/pages/Settings.tsx)
Data profile: UI-only
Required tests:
- Add or extend vitest coverage for X06 behavior in src/{components,hooks,lib}/** (feature-scoped) test files.
- Add interaction and state-transition tests that validate user-visible behavior.
Acceptance criteria:
- Export passage as .docx works end-to-end within feature-owned module boundaries.
- No edits outside allowed ownership boundaries for builder work.
- Required tests pass and evidence is included in handoff.
- Integrator notes are actionable without follow-up decisions.
Handoff required: FeatureID | Branch | Changed files | Behavior delivered | Tests run | Known risks | Integrator notes

## Governance Validation Checklist
- [ ] Confirm backlog table still has exactly 56 feature rows.
- [ ] Confirm exactly 5 rows are DONE-LOCKED (S01, S02, S03, S04, R03).
- [ ] Confirm feature spec block count is exactly 56.
- [ ] Confirm table FeatureIDs and spec-block FeatureIDs are a 1:1 exact match.
- [ ] Confirm each feature block has non-empty In scope and Out of scope.
- [ ] Confirm each feature block includes Required tests, Acceptance criteria, and Handoff required.
- [ ] Confirm each feature block includes all three pattern anchors.
- [ ] Confirm forbidden shared-shell edits are explicit for builder agents.
- [ ] Dry-run handoff format for one search, one reading, and one backend feature before assignment.

