import React from 'react';
import { Calendar, MapPin, BookOpen, Clock, Tag, Copy, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

interface MetadataCardProps {
  date: string;
  location?: string | null;
  scripture?: string | null;
  duration?: string | null;
  tags?: string[] | null;
}

function MetaRow({ icon: Icon, label, value, mono, copyable }: { icon: React.ElementType; label: string; value: string; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
      {copyable && (
        <button onClick={handleCopy} className="ml-1 text-muted-foreground hover:text-foreground" aria-label="Copy">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}

export default function MetadataCard({ date, location, scripture, duration, tags }: MetadataCardProps) {
  let formattedDate = date;
  try {
    formattedDate = format(parseISO(date), 'MMMM d, yyyy');
  } catch {
    formattedDate = date;
  }

  return (
    <div className="surface-card rounded-lg p-4 space-y-0">
      <MetaRow icon={Calendar} label="Date" value={formattedDate} />
      {location && <MetaRow icon={MapPin} label="Location" value={location} />}
      {scripture && <MetaRow icon={BookOpen} label="Scripture" value={scripture} mono copyable />}
      {duration && <MetaRow icon={Clock} label="Duration" value={duration} />}
      {tags && tags.length > 0 && (
        <div className="flex items-center gap-3 py-2">
          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground w-20 shrink-0">Tags</span>
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <span key={tag} className="rounded-full bg-filter-badge px-2 py-0.5 text-xs font-mono text-filter-badge-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
