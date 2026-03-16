interface SermonSearchFiltersProps {
  year: string;
  title: string;
  location: string;
  years: number[];
  titles: string[];
  locations: string[];
  onFilterChange: (key: 'year' | 'title' | 'location', value: string) => void;
  onClearFilters: () => void;
}

export default function SermonSearchFilters({
  year,
  title,
  location,
  years,
  titles,
  locations,
  onFilterChange,
  onClearFilters,
}: SermonSearchFiltersProps) {
  const hasStructuredFilters = year !== '' || title !== '' || location !== '';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Filters</h2>
        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasStructuredFilters}
          className="text-xs font-mono text-link underline underline-offset-2 hover:text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
          aria-label="Clear filters"
        >
          clear filters
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="font-mono text-xs text-muted-foreground">Year</span>
          <select
            value={year}
            onChange={(event) => onFilterChange('year', event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
            aria-label="Filter by year"
          >
            <option value="">All years</option>
            {years.map((optionYear) => (
              <option key={optionYear} value={String(optionYear)}>
                {optionYear}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-mono text-xs text-muted-foreground">Sermon title</span>
          <select
            value={title}
            onChange={(event) => onFilterChange('title', event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
            aria-label="Filter by sermon title"
          >
            <option value="">All titles</option>
            {titles.map((optionTitle) => (
              <option key={optionTitle} value={optionTitle}>
                {optionTitle}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-mono text-xs text-muted-foreground">Location</span>
          <select
            value={location}
            onChange={(event) => onFilterChange('location', event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
            aria-label="Filter by location"
          >
            <option value="">All locations</option>
            {locations.map((optionLocation) => (
              <option key={optionLocation} value={optionLocation}>
                {optionLocation}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
