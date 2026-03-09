import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, onClear }, ref) => {
    return (
      <div className="relative w-full max-w-[860px] mx-auto">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search sermons…"
            className="w-full h-14 pl-12 pr-20 bg-background border border-border rounded-md text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
          />
          {value ? (
            <button
              onClick={onClear}
              className="absolute right-4 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="absolute right-4 flex items-center gap-1">
              <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-xs text-muted-foreground">
                /
              </kbd>
              <span className="hidden sm:inline text-xs text-muted-foreground font-mono">search</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
export default SearchBar;
