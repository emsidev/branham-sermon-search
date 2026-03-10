import * as React from 'react';
import { cn } from '@/lib/utils';

type CardPillVariant = 'neutral' | 'accent';

interface CardPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: CardPillVariant;
}

export function CardPill({ className, variant = 'neutral', ...props }: CardPillProps) {
  return (
    <span
      className={cn(variant === 'accent' ? 'pill-accent' : 'pill-neutral', className)}
      {...props}
    />
  );
}
