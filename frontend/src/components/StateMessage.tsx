import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ArcadeButton } from './ArcadeButton';

export function Loading({ text = 'CARREGANDO...' }: { text?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 font-arcade text-xs glow-cyan">
      <RefreshCw className="animate-spin" size={18} />
      {text}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-10 text-center">
      <AlertTriangle className="text-neon-red" size={36} />
      <p className="max-w-md text-sm text-ink">{message}</p>
      {onRetry && (
        <ArcadeButton tone="red" onClick={onRetry} icon={<RefreshCw size={16} />}>
          TENTAR NOVAMENTE
        </ArcadeButton>
      )}
    </div>
  );
}
