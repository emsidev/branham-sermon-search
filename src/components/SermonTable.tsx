import React from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import type { Sermon } from '@/hooks/useSermons';

interface SermonTableProps {
  sermons: Sermon[];
  loading: boolean;
  selectedIndex: number;
  sort: string;
  onSortChange: (sort: string) => void;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3"><div className="skeleton-shimmer h-4 w-3/4 rounded" /></td>
      <td className="hidden px-4 py-3 sm:table-cell"><div className="skeleton-shimmer h-4 w-24 rounded" /></td>
      <td className="hidden px-4 py-3 md:table-cell"><div className="skeleton-shimmer h-4 w-32 rounded" /></td>
      <td className="hidden px-4 py-3 lg:table-cell"><div className="skeleton-shimmer h-4 w-28 rounded" /></td>
    </tr>
  );
}

function SortButton({ label, field, current, onSort }: { label: string; field: string; current: string; onSort: (s: string) => void }) {
  const isActive = current.startsWith(field);
  const dir = current === `${field}-asc` ? '↑' : current === `${field}-desc` ? '↓' : '';

  return (
    <button
      onClick={() => {
        if (current === `${field}-desc`) onSort(`${field}-asc`);
        else onSort(`${field}-desc`);
      }}
      className={`text-xs font-mono uppercase tracking-wider ${isActive ? 'text-foreground' : 'text-muted-foreground'} hover:text-foreground`}
    >
      {label} {dir}
    </button>
  );
}

export default function SermonTable({ sermons, loading, selectedIndex, sort, onSortChange }: SermonTableProps) {
  if (!loading && sermons.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[860px] py-16 text-center">
        <p className="font-mono text-sm text-muted-foreground">No sermons found.</p>
        <p className="mt-2 text-xs text-muted-foreground">Try broadening your search or clearing filters.</p>
      </div>
    );
  }

  return (
    <div className="surface-card mx-auto w-full max-w-[860px] overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left">
              <SortButton label="Title" field="title" current={sort} onSort={onSortChange} />
            </th>
            <th className="hidden px-4 py-3 text-left sm:table-cell">
              <SortButton label="Date" field="date" current={sort} onSort={onSortChange} />
            </th>
            <th className="hidden px-4 py-3 text-left md:table-cell">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Location</span>
            </th>
            <th className="hidden px-4 py-3 text-left lg:table-cell">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Scripture</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={index} />)
            : sermons.map((sermon, index) => (
                <tr
                  key={sermon.id}
                  className={`sermon-row-hover cursor-pointer border-b border-border ${index === selectedIndex ? 'bg-hover-row ring-1 ring-inset ring-ring/20' : ''}`}
                  style={{ minHeight: '48px' }}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/sermons/${sermon.id}`}
                      className="font-medium text-foreground transition-colors duration-200 hover:text-link"
                    >
                      {sermon.title}
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">
                    {formatDate(sermon.date)}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {sermon.location}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground lg:table-cell">
                    {sermon.scripture}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}
