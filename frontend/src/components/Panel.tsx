import type { HTMLAttributes } from 'react';

export type Tone = 'cyan' | 'magenta' | 'green' | 'yellow' | 'purple' | 'red';

interface Props extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

/** Painel estilo HUD de videogame. */
export default function Panel({ tone = 'cyan', className = '', children, ...rest }: Props) {
  return (
    <div data-tone={tone} className={`neon-panel p-4 sm:p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}
