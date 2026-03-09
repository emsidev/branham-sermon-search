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
      <td className="py-3 px-4"><div className="skeleton-shimmer h-4 w-3/4 rounded" /></td>
      <td className="py-3 px-4 hidden sm:table-cell"><div className="skeleton-shimmer h-4 w-24 rounded" /></td>
      <td className="py-3 px-4 hidden md:table-cell"><div className="skeleton-shimmer h-4 w-32 rounded" /></td>
      <td className="py-3 px-4 hidden lg:table-cell"><div className="skeleton-shimmer h-4 w-28 rounded" /></td>
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
      <div className="w-full max-w-[860px] mx-auto py-16 text-center">
        <p className="text-muted-foreground font-mono text-sm">No sermons found.</p>
        <p className="text-muted-foreground text-xs mt-2">Try broadening your search or clearing filters.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[860px] mx-auto overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4">
              <SortButton label="Title" field="title" current={sort} onSort={onSortChange} />
            </th>
            <th className="text-left py-3 px-4 hidden sm:table-cell">
              <SortButton label="Date" field="date" current={sort} onSort={onSortChange} />
            </th>
            <th className="text-left py-3 px-4 hidden md:table-cell">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Location</span>
            </th>
            <th className="text-left py-3 px-4 hidden lg:table-cell">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Scripture</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : sermons.map((sermon, i) => (
                <tr
                  key={sermon.id}
                  className={`border-b border-border sermon-row-hover cursor-pointer ${i === selectedIndex ? 'bg-[hsl(var(--hover-row))] ring-1 ring-inset ring-ring/20' : ''}`}
                  style={{ minHeight: '48px' }}
                >
                  <td className="py-3 px-4">
                    <Link
                      to={`/sermons/${sermon.id}`}
                      className="font-medium text-foreground hover:text-[hsl(var(--link))] transition-colors duration-200"
                    >
                      {sermon.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground text-xs font-mono whitespace-nowrap">
                    {formatDate(sermon.date)}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-muted-foreground text-xs">
                    {sermon.location}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-xs font-mono">
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
