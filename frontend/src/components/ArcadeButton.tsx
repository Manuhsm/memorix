import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Tone } from './Panel';

interface Common {
  tone?: Tone;
  size?: 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ArcadeButton({
  tone = 'cyan',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button data-tone={tone} data-size={size} className={`arcade-btn ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ArcadeLink({
  to,
  tone = 'cyan',
  size = 'md',
  icon,
  className = '',
  children,
}: Common & { to: string }) {
  return (
    <Link to={to} data-tone={tone} data-size={size} className={`arcade-btn ${className}`}>
      {icon}
      {children}
    </Link>
  );
}
