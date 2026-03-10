import * as React from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CardLinkSurfaceProps extends LinkProps {
  className?: string;
  selected?: boolean;
}

export function CardLinkSurface({ className, selected = false, ...props }: CardLinkSurfaceProps) {
  return (
    <Link
      className={cn(
        'surface-card-interactive block',
        selected && 'border-border-hover bg-muted',
        className
      )}
      {...props}
    />
  );
}

interface CardSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
}

export function CardSurface({ as: Component = 'article', className, ...props }: CardSurfaceProps) {
  return <Component className={cn('surface-card', className)} {...props} />;
}
