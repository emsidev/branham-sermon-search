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
  - Builder-owned surfaces: `src/features/<feature-id>/**` and colocated tests only.
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
| DONE-LOCKED | S01 | Full-text search + keyword highlighting across all sermons | frontend-developer(search) | src/features/S01/** | integration-owner |
| TODO | S02 | Next/Prev hit navigation (N / Shift+N) | frontend-developer(search) | src/features/S02/** | integration-owner |
| TODO | S03 | Only active hit highlighted; all others dimmed | frontend-developer(search) | src/features/S03/** | integration-owner |
| TODO | S04 | Search pop-up with result count ("3 of 47") via toolbar button or custom shortcut | frontend-developer(search) | src/features/S04/** | integration-owner |
| TODO | S05 | Search filters by year, sermon title, location | backend-architect | src/features/S05/**; supabase/migrations/*_s05_*.sql | integration-owner |
| TODO | S06 | Fuzzy search (typo-tolerant) | backend-architect | src/features/S06/**; supabase/migrations/*_s06_*.sql | integration-owner |
| TODO | S07 | Search history saved locally | frontend-developer(search) | src/features/S07/** | integration-owner |
| TODO | S08 | Jump to hit number | frontend-developer(search) | src/features/S08/** | integration-owner |
| TODO | S09 | Search filters extended by scripture reference | backend-architect | src/features/S09/**; supabase/migrations/*_s09_*.sql | integration-owner |
| TODO | S10 | AI-assisted semantic search | prompt-engineer | src/features/S10/**; scripts/s10/** | integration-owner |
| TODO | R01 | Enter/Exit reading mode (R) | frontend-developer(reader) | src/features/R01/** | integration-owner |
| TODO | R02 | Sticky bottom progress bar for sermon progress | frontend-developer(reader) | src/features/R02/** | integration-owner |
| DONE-LOCKED | R03 | Resume position per sermon | frontend-developer(reader) | src/features/R03/** | integration-owner |
| TODO | R04 | Word-by-word highlighting with Space or Right, and Left to go back | frontend-developer(reader) | src/features/R04/** | integration-owner |
| TODO | R05 | Highlight mode toggle: word, sentence, paragraph | frontend-developer(reader) | src/features/R05/** | integration-owner |
| TODO | R06 | Auto-scroll with adjustable speed | frontend-developer(reader) | src/features/R06/** | integration-owner |
| TODO | R07 | Read-aloud sync: word/sentence highlight follows sermon audio playback | frontend-developer(reader) | src/features/R07/** | integration-owner |
| TODO | P01 | Slide view of highlighted/selected text (P) | frontend-developer(presentation) | src/features/P01/** | integration-owner |
| TODO | P02 | Fullscreen presentation (F) | frontend-developer(presentation) | src/features/P02/** | integration-owner |
| TODO | P03 | Next/Prev slide (Right / Left) | frontend-developer(presentation) | src/features/P03/** | integration-owner |
| TODO | P04 | Sermon code + title + author auto-shown as slide subtitle | frontend-developer(presentation) | src/features/P04/** | integration-owner |
| TODO | P05 | Multi-selection passage queue for slides | frontend-developer(presentation) | src/features/P05/** | integration-owner |
| TODO | P06 | Slide themes (background, font, color scheme) | ui-ux-designer | src/features/P06/** | integration-owner |
| TODO | P07 | Scripture watermark option | frontend-developer(presentation) | src/features/P07/** | integration-owner |
| TODO | P08 | Export slides as PDF/images | frontend-developer(presentation) | src/features/P08/** | integration-owner |
| TODO | E01 | Font size control and font family selection in settings | frontend-developer(reading-tools) | src/features/E01/** | integration-owner |
| TODO | E02 | Dark/Sepia/Light mode with D shortcut | frontend-developer(reading-tools) | src/features/E02/** | integration-owner |
| TODO | E03 | Word count and estimated reading time in sermon header | frontend-developer(reading-tools) | src/features/E03/** | integration-owner |
| TODO | E04 | Page view vs scroll view toggle | frontend-developer(reading-tools) | src/features/E04/** | integration-owner |
| TODO | E05 | Bookmarks (B) | frontend-developer(reading-tools) | src/features/E05/** | integration-owner |
| TODO | E06 | Highlights and colors (H then 1-4) | frontend-developer(reading-tools) | src/features/E06/** | integration-owner |
| TODO | E07 | Table of contents jump to paragraphs | frontend-developer(reading-tools) | src/features/E07/** | integration-owner |
| TODO | E08 | Line spacing and margin controls | frontend-developer(reading-tools) | src/features/E08/** | integration-owner |
| TODO | E09 | Scripture cross-reference preview inline | backend-architect | src/features/E09/**; supabase/migrations/*_e09_*.sql | integration-owner |
| TODO | E10 | Personal notes/annotations (M) | frontend-developer(reading-tools) | src/features/E10/** | integration-owner |
| TODO | E11 | Margin notes rendering | frontend-developer(reading-tools) | src/features/E11/** | integration-owner |
| TODO | E12 | Dictionary/definition on hover for uncommon words | backend-architect | src/features/E12/**; supabase/migrations/*_e12_*.sql | integration-owner |
| TODO | E13 | Print-friendly view via toolbar button | frontend-developer(reading-tools) | src/features/E13/** | integration-owner |
| TODO | E14 | Built-in audio player integration synced to transcript | frontend-developer(reader) | src/features/E14/** | integration-owner |
| TODO | L01 | Year page: browse sermons by year | frontend-developer(library) | src/features/L01/** | integration-owner |
| TODO | L02 | Sermon index: alphabetical and chronological listing | frontend-developer(library) | src/features/L02/** | integration-owner |
| TODO | L03 | Continue reading: home shows recently opened sermons | frontend-developer(library) | src/features/L03/** | integration-owner |
| TODO | L04 | Favorites: star sermons for quick access | frontend-developer(library) | src/features/L04/** | integration-owner |
| TODO | L05 | Collections/Reading lists | frontend-developer(library) | src/features/L05/** | integration-owner |
| TODO | L06 | User-defined tags per sermon | frontend-developer(library) | src/features/L06/** | integration-owner |
| TODO | L07 | Reading stats: sermons read, time spent, words read | frontend-developer(library) | src/features/L07/** | integration-owner |
| TODO | L08 | User accounts and cloud sync | backend-architect | src/features/L08/**; supabase/migrations/*_l08_*.sql | integration-owner |
| TODO | L09 | Community highlights | backend-architect | src/features/L09/**; supabase/migrations/*_l09_*.sql | integration-owner |
| TODO | L10 | Multi-language support for translated sermon display | backend-architect | src/features/L10/**; supabase/migrations/*_l10_*.sql | integration-owner |
| TODO | L11 | Mobile app (PWA or native) with offline reading support | frontend-developer(library) | src/features/L11/** | integration-owner |
| TODO | X01 | Canonical reference format in sermon header | frontend-developer(sharing) | src/features/X01/** | integration-owner |
| TODO | X02 | Copy with citation: text + sermon code/title/author + paragraph number | frontend-developer(sharing) | src/features/X02/** | integration-owner |
| TODO | X03 | Shareable deep link to specific paragraph | frontend-developer(sharing) | src/features/X03/** | integration-owner |
| TODO | X04 | Export passage as .txt or .pdf | frontend-developer(sharing) | src/features/X04/** | integration-owner |
| TODO | X05 | Social share styled quote card image | ui-ux-designer | src/features/X05/** | integration-owner |
| TODO | X06 | Export passage as .docx | frontend-developer(sharing) | src/features/X06/** | integration-owner |

## Backlog Validation Checklist
- [ ] Confirm 56 features are listed exactly once by FeatureID.
- [ ] Confirm exactly 2 features are marked `DONE-LOCKED` (S01, R03).
- [ ] Confirm every feature has one primary agent.
- [ ] Confirm every feature has a non-overlapping owned surface.
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
