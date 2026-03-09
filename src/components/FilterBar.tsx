import React from 'react';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterBarProps {
  years: number[];
  locations: string[];
  selectedYear: string;
  selectedLocation: string;
  onYearChange: (year: string) => void;
  onLocationChange: (location: string) => void;
  onClearAll: () => void;
}

export default function FilterBar({
  years,
  locations,
  selectedYear,
  selectedLocation,
  onYearChange,
  onLocationChange,
  onClearAll,
}: FilterBarProps) {
  const hasFilters = selectedYear || selectedLocation;

  return (
    <div className="w-full max-w-[860px] mx-auto space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="w-[140px] h-9 font-mono text-sm">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="w-[200px] h-9 font-mono text-sm">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map(loc => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={onClearAll}
            className="text-xs font-mono text-[hsl(var(--link))] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedYear && selectedYear !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--filter-badge))] text-[hsl(var(--filter-badge-foreground))] px-3 py-1 text-xs font-mono">
              {selectedYear}
              <button onClick={() => onYearChange('')} aria-label="Remove year filter">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedLocation && selectedLocation !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--filter-badge))] text-[hsl(var(--filter-badge-foreground))] px-3 py-1 text-xs font-mono">
              {selectedLocation}
              <button onClick={() => onLocationChange('')} aria-label="Remove location filter">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
