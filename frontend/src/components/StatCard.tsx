import type { ReactNode } from 'react';
import Panel, { type Tone } from './Panel';

export default function StatCard({
  label,
  value,
  icon,
  tone = 'cyan',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <Panel tone={tone} className="flex flex-col gap-2 !p-4">
      <div className="flex items-center gap-2 text-muted text-[0.62rem] sm:text-xs uppercase tracking-widest">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-arcade text-lg sm:text-2xl text-ink break-words">{value}</div>
    </Panel>
  );
}
