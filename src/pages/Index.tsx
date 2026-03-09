import React, { useState, useRef, useCallback } from 'react';
import { useSermons } from '@/hooks/useSermons';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import SermonTable from '@/components/SermonTable';
import SermonPagination from '@/components/SermonPagination';

const Index = () => {
  const { sermons, total, loading, filters, setFilter, clearFilters, years, locations, pageSize } = useSermons();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);

  useKeyboardNav({
    itemCount: sermons.length,
    selectedIndex,
    onSelectedIndexChange: setSelectedIndex,
    sermonIds: sermons.map(s => s.id),
    searchInputRef: searchRef,
  });

  const handleSearchChange = useCallback((value: string) => {
    setFilter('q', value);
    setSelectedIndex(-1);
  }, [setFilter]);

  const handleYearChange = useCallback((value: string) => {
    setFilter('year', value === 'all' ? '' : value);
  }, [setFilter]);

  const handleLocationChange = useCallback((value: string) => {
    setFilter('location', value === 'all' ? '' : value);
  }, [setFilter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full max-w-[860px] mx-auto px-6 lg:px-0 pt-8 pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold font-mono text-foreground">branham-sermons</h1>
          <span className="rounded-full bg-[hsl(var(--filter-badge))] text-[hsl(var(--filter-badge-foreground))] px-2 py-0.5 text-[10px] font-mono font-medium">
            alpha
          </span>
        </div>
      </header>

      {/* Hero search */}
      <div className="px-6 lg:px-0 pt-12 pb-6">
        <SearchBar
          ref={searchRef}
          value={filters.q}
          onChange={handleSearchChange}
          onClear={() => handleSearchChange('')}
        />
      </div>

      {/* Filters */}
      <div className="px-6 lg:px-0 pb-4">
        <FilterBar
          years={years}
          locations={locations}
          selectedYear={filters.year}
          selectedLocation={filters.location}
          onYearChange={handleYearChange}
          onLocationChange={handleLocationChange}
          onClearAll={clearFilters}
        />
      </div>

      {/* Table */}
      <div className="px-6 lg:px-0">
        <SermonTable
          sermons={sermons}
          loading={loading}
          selectedIndex={selectedIndex}
          sort={filters.sort}
          onSortChange={(sort) => setFilter('sort', sort)}
        />
      </div>

      {/* Pagination */}
      <div className="px-6 lg:px-0 pb-24">
        <SermonPagination
          currentPage={filters.page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={(page) => setFilter('page', page)}
        />
      </div>
    </div>
  );
};

export default Index;
