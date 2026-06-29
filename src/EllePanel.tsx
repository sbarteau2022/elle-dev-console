// ============================================================
// ELLE — unified conversation surface
// Collapses the old chat / ask / corpus tabs into one window. Every turn goes
// to /api/elle-router (the 16-tool ReAct loop): she picks the tools, executes,
// cross-references, and answers. Corpus retrieval, D1 SQL, the live web, the
// code engine, trading, RAPID²AI, and the Optimus journal are all reachable
// from here — the user just talks; the router decides. Per-turn tool trace is
// collapsible so you can watch which sources she hit.
// ============================================================
import { useState, useRef, useEffect } from 'react'

const tok = () => localStorage.getItem('elle_dev_jwt') || ''

// Inventory mirrors the router's system-prompt tool set (worker/src/router.ts).
const TOOLS: [string, string][] = [
  ['search_corpus', '70+ papers · semantic'],
  ['read_sql', 'SELECT over every D1 table'],
  ['web_search', 'live web'],
  ['fetch_url', 'read a page'],
  ['fetch_document', 'R2 documents'],
  ['recall_memory', 'prior sessions'],
  ['code_engine', 'run code'],
  ['diagnose', 'root-cause this stack'],
  ['query_rapid2ai', 'restaurant intel bridge'],
  ['ingest_paper', 'add to corpus'],
  ['trigger_dream', 'libre sweep'],
  ['trade_execute', 'Alpaca · paper'],
  ['journal_write', 'Optimus entry'],
  ['journal_read', 'journal semantic'],
  ['journal_thread', 'manuscript + phase'],
  ['journal_annotate', 'marginalia'],
]

type Turn = { q: string; answer: string; trace: any[]; open: boolean; pending: boolean }

// RAPID²AI workers answer through the tool-using /query endpoint, which returns
// a structured { intro, blocks, provenance } payload instead of elle-router's
// { answer, trace }. Flatten the blocks to readable text so the same chat
// surface renders both backends, and map provenance → the tool-trace shape.
function rapidAnswer(d: any): string {
  const parts: string[] = []
  if (d.intro) parts.push(String(d.intro))
  for (const b of d.blocks || []) {
    if (!b || typeof b !== 'object') continue
    if (b.type === 'prose' && typeof b.body === 'string') parts.push(b.body)
    else if (b.type === 'kpi') parts.push((b.items || []).map((it: any) => `${it.label}: ${it.value}${it.delta ? ` (${it.delta.text})` : ''}`).join('   ·   '))
    else if (b.type === 'table') {
      const cols = b.columns || []
      const head = cols.map((c: any) => c.label).join(' | ')
      const rows = (b.rows || []).map((r: any) => cols.map((c: any) => {
        let v = r[c.key]
        if (v == null) v = '—'
        else if (c.format === 'currency' && typeof v === 'number') v = '$' + v.toFixed(2)
        return v
      }).join(' | '))
      parts.push([b.title, head, ...rows].filter(Boolean).join('\n'))
    } else if (b.type === 'alerts') {
      parts.push([b.title, ...(b.items || []).map((it: any) => `• ${it.text}`)].filter(Boolean).join('\n'))
    }
  }
  return parts.join('\n\n') || d.content || d.response || '(no answer)'
}
function rapidTrace(d: any): any[] {
  return (d.provenance || []).map((p: any) => ({
    tool: p.tool,
    args: p.args || {},
    result: (p.sql ? p.sql + '\n' : '') + `${p.row_count ?? 0} row(s)` + (p.note ? `\n${p.note}` : ''),
  }))
}

export default function EllePanel({ worker, accent }: any) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [showTools, setShowTools] = useState(false)
  const [note, setNote] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const isRapid = worker.kind === 'rapid'

  // Stable chat session so the router remembers the conversation across turns
  // (it loads prior turns + persists each exchange keyed on session_id). Without
  // it every message is standalone and follow-ups like "tell me more" lose context.
  const [sessionId, setSessionId] = useState(() => {
    let s = localStorage.getItem('elle_dev_chat_session')
    if (!s) { s = (crypto.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`); localStorage.setItem('elle_dev_chat_session', s) }
    return s
  })
  const newConversation = () => {
    const s = crypto.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem('elle_dev_chat_session', s)
    setSessionId(s); setTurns([]); setNote('')
  }

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [turns])

  const ask = async () => {
    const question = q.trim()
    if (loading || !question) return
    setLoading(true); setNote(''); setQ('')
    const idx = turns.length
    setTurns(t => [...t, { q: question, answer: '', trace: [], open: false, pending: true }])
    try {
      // RAPID worker → tool-using /query (no auth); elle worker → /api/elle-router (Bearer JWT).
      const url = isRapid ? worker.url + '/query' : worker.url + '/api/elle-router'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (!isRapid) headers.Authorization = `Bearer ${tok()}`
      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(isRapid ? { question } : { q: question, session_id: sessionId }),
      })
      const d = await r.json()
      if (!r.ok || d.error) setNote(d.error || `HTTP ${r.status}`)
      const answer = isRapid ? rapidAnswer(d) : (d.answer || '(no answer)')
      const trace = isRapid ? rapidTrace(d) : (d.trace || [])
      setTurns(t => t.map((x, i) => i === idx
        ? { ...x, answer, trace, pending: false } : x))
    } catch (e: any) {
      setNote('Error: ' + (e.message || e))
      setTurns(t => t.map((x, i) => i === idx ? { ...x, answer: '(request failed)', pending: false } : x))
    } finally { setLoading(false) }
  }
  const toggle = (i: number) => setTurns(t => t.map((x, j) => j === i ? { ...x, open: !x.open } : x))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 14, gap: 10, overflow: 'hidden' }}>
      {/* tool inventory — elle-router only; the RAPID worker runs its own SQL tool set */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowTools(s => !s)}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 10.5, cursor: 'pointer', padding: 0 }}>
            {isRapid
              ? '▸ RAPID²AI · tool-using cost/POS intelligence'
              : (showTools ? '▾ ' : '▸ ') + '16 tools she can reach'}
          </button>
          {!isRapid && turns.length > 0 && (
            <button onClick={newConversation} title="Start a fresh conversation (clears her memory of this thread)"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 10.5, cursor: 'pointer', padding: 0 }}>
              ↺ new conversation
            </button>
          )}
        </div>
        {showTools && !isRapid && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {TOOLS.map(([name, desc]) => (
              <span key={name} title={desc}
                style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 4, padding: '3px 7px' }}>
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {note && <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>{note}</div>}

      {/* conversation */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {turns.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'center', padding: 20, lineHeight: 1.6 }}>
            {isRapid
              ? 'RAPID²AI · ask about food cost, sales, invoice variance, purveyor price moves, vendors, menu items, pars — it runs the SQL tools and shows the provenance'
              : 'one window · chat, the corpus, D1, the live web, the code engine, trading, RAPID²AI, and the Optimus journal — she picks the tools and cross-references across them'}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--float)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.6 }}>{t.q}</div>
            <div style={{ background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: 14, fontSize: 12.5, color: 'var(--t1)', whiteSpace: 'pre-wrap', lineHeight: 1.7, opacity: t.pending ? 0.5 : 1 }}>
              {t.pending ? 'thinking…' : t.answer}
            </div>
            {t.trace.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => toggle(i)}
                  style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 10.5, cursor: 'pointer', padding: 0 }}>
                  {(t.open ? '▾ ' : '▸ ') + t.trace.length + ' tool step' + (t.trace.length === 1 ? '' : 's')}
                </button>
                {t.open && t.trace.map((s: any, j: number) => (
                  <div key={j} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t2)' }}>
                    <div style={{ color: accent, marginBottom: 3 }}>{(j + 1) + '. ' + s.tool}<span style={{ color: 'var(--t3)' }}>{'  ' + JSON.stringify(s.args)}</span></div>
                    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--t3)', lineHeight: 1.5 }}>{String(s.result || '')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder={isRapid ? 'ask RAPID²AI — food cost, sales, variance, vendors, pars…' : 'ask Elle anything — she reaches the corpus, D1, the web, code, trading, the journal…'}
          style={{ flex: 1, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none' }} />
        <button onClick={ask} disabled={loading || !q.trim()}
          style={{ padding: '6px 16px', borderRadius: 5, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
          {loading ? 'thinking…' : 'ask ▸'}
        </button>
      </div>
    </div>
  )
}
