

## Branham Sermon Browser — Implementation Plan

### Overview
A high-performance sermon browsing app modeled after npmx.dev's minimal aesthetic. Built with React + Tailwind + Lovable Cloud (Supabase) for data storage and full-text search. You'll import real sermon data into Supabase.

---

### Database Setup (Supabase)
- **`sermons` table**: id, title, date, year, location, city, state, scripture, duration, audio_url, source_url, transcript, tags (text[]), content_hash, scraped_at
- **Full-text search**: Postgres `tsvector` column with GIN index on title, scripture, location, transcript for instant search
- **RLS policies**: Public read access (no auth required for browsing)

---

### Pages

**1. Home / Browse Page (`/`)**
- Large centered search bar (npmx.dev hero style) with `/ search` keyboard hint
- Instant search toggle
- Filter bar: Year dropdown, Location multi-select, Tag chips
- Active filter badges with × to remove
- Sermon table: Title (bold, clickable), Date, Location, Scripture
- Pagination with "Showing X–Y of Z sermons"
- Empty state with suggestion to broaden search

**2. Sermon Detail Page (`/sermons/:id`)**
- Breadcrumb: `branham-sermons / 1965 / sermon-slug`
- Metadata card: date, location, scripture, duration, tags
- Audio player (if recording available)
- Full transcript with typographic hierarchy
- Previous / Next sermon navigation
- Share button (copies URL)

**3. 404 Page**
- Minimal message with link back to browse

---

### Key Components
- **SearchBar** — Full-width, debounced (300ms), auto-focus on `/` key, clear button
- **SermonTable** — Sortable columns (date, title), skeleton loading, keyboard nav (j/k/Enter)
- **FilterBar** — Year select, location multi-select, tag chips, "Clear all"
- **Pagination** — Page numbers, ellipsis, prev/next, result count
- **MetadataCard** — Icon+label rows for sermon details, copy scripture button
- **AudioPlayer** — Sticky bottom bar, play/pause, scrubber, speed control (0.75×–1.5×), persists across navigation
- **SermonBreadcrumb** — Monospace breadcrumb trail

---

### Design System
- **Background**: Pure white `#ffffff`
- **Primary text**: `#0f172a`, Secondary: `#64748b`
- **Links**: `#1e40af` (deep blue)
- **Hover rows**: `#f8fafc`
- **Filter badges**: `#dbeafe` bg, `#1e40af` text
- **Typography**: Monospace headings (IBM Plex Mono), system sans-serif body
- **Max-width**: 860px centered, 4px spacing grid
- **No shadows, no decorative chrome** — brutally minimal

---

### Interactions & UX
- Keyboard shortcuts: `/` focus search, `j`/`k` navigate list, `Enter` open, `Escape` clear
- Skeleton loading states on list and detail
- URL-encoded filter/search state (every view is shareable)
- Mobile responsive with ≥48px touch targets
- Row hover: instant background change, no transition

---

### Data & Search
- Supabase Postgres full-text search using `to_tsvector`/`to_tsquery` for sub-100ms results
- Filters (year, location, tags) applied server-side via Supabase query builder
- You'll import real sermon data into the Supabase database after the UI is built
- 50 realistic mock sermons seeded initially for development

