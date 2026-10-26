/** mm:ss.cc a partir de milissegundos. */
export function formatTime(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const cents = Math.floor((safe % 1000) / 10);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(minutes)}:${p(seconds)}.${p(cents)}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function validateNickname(raw: string): string | null {
  const v = raw.trim();
  if (v.length === 0) return 'Informe um apelido.';
  if (v.length < 3) return 'O apelido deve ter no mínimo 3 caracteres.';
  if (v.length > 16) return 'O apelido deve ter no máximo 16 caracteres.';
  if (!/^[\p{L}\p{N} _.-]+$/u.test(v)) return 'Use apenas letras, números, espaço, _ , . ou -.';
  return null;
}
