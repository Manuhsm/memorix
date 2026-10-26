import type { PadDef } from '../utils/gameConfig';

interface Props {
  pad: PadDef;
  lit: boolean;
  ready: boolean; // true somente quando o jogador pode clicar
  onPress: (id: number) => void;
}

export default function GamePad({ pad, lit, ready, onPress }: Props) {
  return (
    <button
      type="button"
      className="pad"
      style={{ ['--c' as string]: pad.color }}
      data-lit={lit}
      data-ready={ready}
      disabled={!ready}
      aria-label={`Botão ${pad.name} (tecla ${pad.key})`}
      onClick={() => onPress(pad.id)}
    >
      <span aria-hidden className="absolute left-3 top-2 opacity-70 text-xs">
        {pad.key}
      </span>
    </button>
  );
}
