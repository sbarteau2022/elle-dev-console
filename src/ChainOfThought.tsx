import { useEffect, useState } from 'react';

/**
 * ChainOfThought — shows Elle's reasoning trace, collapses when she answers.
 *
 * Wiring: the worker returns a `thinking` field on chat responses. While the
 * request is in flight pass `pending`; once the response lands, pass `thinking`
 * and flip `pending` to false. The panel reveals the trace, then auto-collapses.
 *
 *   <ChainOfThought thinking={msg.thinking} pending={msg.pending} />
 *
 * Note: `thinking` is only populated by reasoning-capable models. If it's empty
 * on /api/elle-conversation, call /api/elle-reasoning-engine instead.
 */
interface Props {
  thinking?: string;     // reasoning trace from the worker response
  pending?: boolean;     // true while the request is in flight (no answer yet)
  typewriter?: boolean;  // reveal the trace progressively when it arrives
  speedMs?: number;      // tick interval for the reveal
}

export default function ChainOfThought({
  thinking,
  pending = false,
  typewriter = true,
  speedMs = 14,
}: Props) {
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState('');

  const fullLen = thinking?.length ?? 0;
  const revealed = shown.length >= fullLen;
  const answered = !pending && !!thinking;

  // Progressive reveal of the reasoning text once it arrives.
  useEffect(() => {
    if (!thinking) { setShown(''); return; }
    if (!typewriter) { setShown(thinking); return; }
    let i = 0;
    setShown('');
    const step = Math.max(2, Math.round(thinking.length / 140)); // ~140 ticks total
    const id = setInterval(() => {
      i += step;
      setShown(thinking.slice(0, i));
      if (i >= thinking.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [thinking, typewriter, speedMs]);

  // Auto-collapse once the answer is decided and the trace has finished revealing.
  useEffect(() => {
    if (answered && revealed) {
      const t = setTimeout(() => setOpen(false), 500);
      return () => clearTimeout(t);
    }
  }, [answered, revealed]);

  if (!pending && !thinking) return null;

  return (
    <div style={s.wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={s.toggle}
      >
        {pending && !thinking
          ? '🧠 Thinking…'
          : open
          ? '▾ Reasoning'
          : '▸ Show reasoning'}
      </button>
      {open && (
        <pre style={s.body}>
          {shown || (pending ? '' : '')}
          {(pending || !revealed) && <span style={s.caret}>▌</span>}
        </pre>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    margin: '4px 0 8px',
    borderLeft: '2px solid rgba(168,137,58,0.5)', // EIP gold accent — restyle freely
    paddingLeft: 10,
  },
  toggle: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    font: '600 12px/1.4 ui-sans-serif, system-ui, sans-serif',
    color: 'rgba(120,120,130,0.95)',
    letterSpacing: '0.02em',
  },
  body: {
    margin: '6px 0 0',
    maxHeight: 280,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    font: '12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace',
    color: 'rgba(110,110,120,0.92)',
    opacity: 0.92,
  },
  caret: { opacity: 0.6 },
};
