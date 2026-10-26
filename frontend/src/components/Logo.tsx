const COLORS = [
  'glow-cyan',
  'glow-green',
  'glow-yellow',
  'glow-magenta',
  'glow-red',
  'glow-cyan',
  'glow-green',
];

export default function Logo({ size = 'xl' }: { size?: 'md' | 'xl' }) {
  const cls = size === 'xl' ? 'text-[clamp(1.6rem,8.5vw,4.2rem)]' : 'text-base sm:text-lg';
  return (
    <h1 aria-label="MEMORIX" className={`font-arcade logo-flicker leading-none ${cls}`}>
      {'MEMORIX'.split('').map((ch, i) => (
        <span key={i} aria-hidden className={COLORS[i]}>
          {ch}
        </span>
      ))}
    </h1>
  );
}
