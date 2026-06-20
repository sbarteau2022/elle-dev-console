import { useEffect, useState } from 'react';

/**
 * ChainOfThought — animated brain + Elle's reasoning trace.
 *
 * The brain breathes, drifts, and fires its synapse nodes while she's thinking,
 * then goes still once she answers. The reasoning trace reveals progressively and
 * auto-collapses when the answer lands (toggle to reopen).
 *
 *   <ChainOfThought thinking={msg.thinking} pending={msg.pending} />
 *
 * `thinking` is only populated by reasoning-capable models. If it's empty on
 * /api/elle-conversation, call /api/elle-reasoning-engine instead.
 */
interface Props {
  thinking?: string;
  pending?: boolean;
  typewriter?: boolean;
  speedMs?: number;
  accent?: string; // brand accent for the brain + rule (EIP gold by default)
}

const STYLE_ID = 'elle-cot-styles';
const CSS = `
@keyframes elleBrainBreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.09)} }
@keyframes elleBrainDrift   { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
@keyframes elleNodePulse    { 0%,100%{opacity:.3; transform:scale(.8)} 50%{opacity:1; transform:scale(1.35)} }
.elle-brain        { transform-box:fill-box; transform-origin:center; }
.elle-brain-inner  { transform-box:fill-box; transform-origin:center; }
.elle-node         { transform-box:fill-box; transform-origin:center; opacity:.4; }
.elle-brain.is-active                   { animation: elleBrainBreathe 1.7s ease-in-out infinite; }
.elle-brain.is-active .elle-brain-inner { animation: elleBrainDrift 3.4s ease-in-out infinite; }
.elle-brain.is-active .elle-node        { animation: elleNodePulse 1.3s ease-in-out infinite; }
`;

function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

function Brain({ active, size = 22, color }: { active: boolean; size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block', flex: '0 0 auto' }}>
      <g className={`elle-brain${active ? ' is-active' : ''}`}>
        <g
          className="elle-brain-inner"
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* silhouette */}
          <path
            d="M32 8 C20 8 12 16 14 24 C8 26 8 36 14 40 C14 48 22 54 32 52 C42 54 50 48 50 40 C56 36 56 26 50 24 C52 16 44 8 32 8 Z"
            opacity={active ? 0.95 : 0.6}
          />
          {/* central seam */}
          <path d="M32 9 C30 20 34 30 32 51" opacity={0.8} />
          {/* gyri / folds */}
          <path d="M22 20 C26 22 24 26 28 27" opacity={0.7} />
          <path d="M18 33 C23 32 22 37 27 37" opacity={0.7} />
          <path d="M42 20 C38 22 40 26 36 27" opacity={0.7} />
          <path d="M46 33 C41 32 42 37 37 37" opacity={0.7} />
          <path d="M24 44 C28 43 30 46 32 45" opacity={0.7} />
        </g>
        {/* synapse nodes — staggered pulse */}
        <g fill={color}>
          <circle className="elle-node" cx="24" cy="24" r="1.7" style={{ animationDelay: '0ms' }} />
          <circle className="elle-node" cx="40" cy="22" r="1.7" style={{ animationDelay: '220ms' }} />
          <circle className="elle-node" cx="20" cy="36" r="1.7" style={{ animationDelay: '440ms' }} />
          <circle className="elle-node" cx="43" cy="36" r="1.7" style={{ animationDelay: '660ms' }} />
          <circle className="elle-node" cx="32" cy="44" r="1.7" style={{ animationDelay: '880ms' }} />
        </g>
      </g>
    </svg>
  );
}

export default function ChainOfThought({
  thinking,
  pending = false,
  typewriter = true,
  speedMs = 14,
  accent = '#A8893A',
}: Props) {
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState('');

  useEffect(() => { injectStyles(); }, []);

  const fullLen = thinking?.length ?? 0;
  const revealed = shown.length >= fullLen;
  const answered = !pending && !!thinking;
  const active = pending || (!!thinking && !revealed); // brain moves while in flight or still revealing

  // Progressive reveal once the trace arrives.
  useEffect(() => {
    if (!thinking) { setShown(''); return; }
    if (!typewriter) { setShown(thinking); return; }
    let i = 0;
    setShown('');
    const step = Math.max(2, Math.round(thinking.length / 140));
    const id = setInterval(() => {
      i += step;
      setShown(thinking.slice(0, i));
      if (i >= thinking.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [thinking, typewriter, speedMs]);

  // Auto-collapse once answered and fully revealed.
  useEffect(() => {
    if (answered && revealed) {
      const t = setTimeout(() => setOpen(false), 500);
      return () => clearTimeout(t);
    }
  }, [answered, revealed]);

  if (!pending && !thinking) return null;

  return (
    <div style={{ margin: '4px 0 8px', borderLeft: `2px solid ${accent}55`, paddingLeft: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          font: '600 12px/1.4 ui-sans-serif, system-ui, sans-serif',
          color: 'rgba(120,120,130,0.95)', letterSpacing: '0.02em',
        }}
      >
        <Brain active={active} color={accent} />
        <span>{pending && !thinking ? 'Thinking…' : open ? 'Reasoning' : 'Show reasoning'}</span>
      </button>
      {open && (
        <pre
          style={{
            margin: '6px 0 0', maxHeight: 280, overflow: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            font: '12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace',
            color: 'rgba(110,110,120,0.92)',
          }}
        >
          {shown}
          {active && <span style={{ opacity: 0.6 }}>▌</span>}
        </pre>
      )}
    </div>
  );
}
