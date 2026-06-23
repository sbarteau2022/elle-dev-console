import { useState, useRef, useEffect, useCallback } from 'react'
import { WORKERS, FACES, getWorker, getFace } from './targets'
import EllePanel from './EllePanel'
import OptimusPanel from './OptimusPanel'

// ============================================================
// ELLE ATLAS — DEV CONSOLE
// Superadmin surface anchored to elle-intel.
// Two independent toggles: WORKER (backend) + FACE (page).
// Tabs: Chat · Code · Diagnose · Health · Config
// ============================================================

// Auth: per-user JWT obtained at runtime via /api/elle-auth (Login screen below).
// No service key in the bundle. Token persists in localStorage (30-day expiry).
const ELLE_AUTH_URL = WORKERS.find(w => w.key === 'elle-worker')!.url + '/api/elle-auth'
let TOKEN = localStorage.getItem('elle_dev_jwt') || ''
let USER_EMAIL = localStorage.getItem('elle_dev_email') || ''
function setAuth(token: string, email: string) {
  TOKEN = token; USER_EMAIL = email
  localStorage.setItem('elle_dev_jwt', token)
  localStorage.setItem('elle_dev_email', email)
}
function clearAuth() {
  TOKEN = ''; USER_EMAIL = ''
  localStorage.removeItem('elle_dev_jwt')
  localStorage.removeItem('elle_dev_email')
}

type Tab = 'elle' | 'optimus' | 'code' | 'diagnose' | 'health' | 'config'

interface Msg { id: string; role: 'user' | 'elle'; content: string; thinking?: string; meta?: string; ts: number; err?: boolean }

// ── styles ────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--void:#07080C;--base:#0C0D14;--raised:#11121B;--float:#171824;--ov:#1E1F2E;
--t1:#DDE5EE;--t2:#8896A8;--t3:#52606E;--t4:#363F4A;--b1:rgba(255,255,255,.08);--b2:rgba(255,255,255,.04);
--mono:'JetBrains Mono',monospace;--ui:'Inter',system-ui,sans-serif}
html,body,#root{height:100%;overflow:hidden}
body{background:var(--void);color:var(--t1);font-family:var(--ui);font-size:13px}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.fade{animation:fade .15s ease both}
input,textarea,select,button{font-family:inherit}
`

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

// ── LOGIN — per-user JWT (replaces the old build-time service key) ──
function Login({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const submit = async () => {
    if (busy || !email.trim() || !pw) return
    setBusy(true); setErrMsg('')
    try {
      const r = await fetch(ELLE_AUTH_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email: email.trim().toLowerCase(), password: pw }),
      })
      const d = await r.json()
      if (!r.ok || !d.access_token) throw new Error(d.error || `HTTP ${r.status}`)
      setAuth(d.access_token as string, (d.user?.email as string) || email.trim())
      onAuth()
    } catch (e: any) { setErrMsg(String(e.message || e)) } finally { setBusy(false) }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--void)' }}>
      <div style={{ width: 320, padding: 24, background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--void)', border: '1px solid #5FD6E855', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: '#5FD6E8' }}>A</div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>elle atlas</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#5FD6E8' }}>dev</span>
        </div>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" autoComplete="username"
          style={{ width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '9px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none', marginBottom: 8 }} />
        <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          style={{ width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '9px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none', marginBottom: 12 }} />
        <button onClick={submit} disabled={busy || !email.trim() || !pw}
          style={{ width: '100%', padding: '9px 0', borderRadius: 6, border: '0.5px solid #5FD6E855', background: '#5FD6E822', color: '#5FD6E8', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 10 }}>
          {busy ? '…' : mode === 'login' ? 'sign in' : 'create account'}
        </button>
        {errMsg && <div style={{ color: '#e07070', fontFamily: 'var(--mono)', fontSize: 10.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{errMsg}</div>}
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrMsg('') }}
          style={{ width: '100%', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
          {mode === 'login' ? 'need an account? sign up' : 'have an account? sign in'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [accent, setAccent] = useState('#5FD6E8')
  const [workerKey, setWorkerKey] = useState('elle-worker')
  const [faceKey, setFaceKey] = useState('main')
  const [tab, setTab] = useState<Tab>('elle')
  const [health, setHealth] = useState<Record<string, any>>({})
  const [authed, setAuthed] = useState(!!TOKEN)

  const worker = getWorker(workerKey)
  const face = getFace(faceKey)

  useEffect(() => {
    const s = document.createElement('style'); s.textContent = CSS
    document.head.appendChild(s); return () => { document.head.removeChild(s) }
  }, [])

  // When face changes, default its worker + accent
  useEffect(() => { setWorkerKey(face.worker); setAccent(face.accent) }, [faceKey])

  // Poll health of all workers
  useEffect(() => {
    let alive = true
    const check = async () => {
      const out: Record<string, any> = {}
      await Promise.all(WORKERS.map(async w => {
        try {
          const r = await fetch(w.url + w.health, { signal: AbortSignal.timeout(8000) })
          out[w.key] = { ok: r.ok, status: r.status, data: r.ok ? await r.json().catch(() => null) : null }
        } catch { out[w.key] = { ok: false, status: 0 } }
      }))
      if (alive) setHealth(out)
    }
    check(); const iv = setInterval(check, 30000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  if (!authed) return <Login onAuth={() => setAuthed(true)} />

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--void)' }}>
      {/* ── Top bar: brand + toggles ── */}
      <div style={{ height: 46, flexShrink: 0, borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 14, background: 'var(--base)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--void)', border: `1px solid ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: accent }}>A</div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>elle atlas</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: accent }}>dev</span>
        </div>

        <div style={{ width: '0.5px', height: 18, background: 'var(--b1)' }} />

        {/* WORKER toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>worker</span>
          <select value={workerKey} onChange={e => setWorkerKey(e.target.value)}
            style={{ background: 'var(--raised)', color: 'var(--t1)', border: '0.5px solid var(--b1)', borderRadius: 5, padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: 11 }}>
            {WORKERS.map(w => {
              const h = health[w.key]
              const dot = h?.ok ? '🟢' : h?.status === 0 ? '⚫' : '🔴'
              return <option key={w.key} value={w.key}>{dot} {w.label}</option>
            })}
          </select>
        </div>

        {/* FACE toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>face</span>
          <div style={{ display: 'flex', gap: 2, background: 'var(--raised)', padding: 2, borderRadius: 6, border: '0.5px solid var(--b1)' }}>
            {FACES.map(f => (
              <button key={f.key} onClick={() => setFaceKey(f.key)}
                style={{ padding: '4px 9px', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11,
                  background: faceKey === f.key ? f.accent + '22' : 'transparent',
                  color: faceKey === f.key ? f.accent : 'var(--t3)' }}>
                {f.key}
              </button>
            ))}
          </div>
        </div>

        <a href={face.page} target="_blank" rel="noreferrer"
          style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', textDecoration: 'none', padding: '4px 8px', border: '0.5px solid var(--b1)', borderRadius: 5 }}>
          open page ↗
        </a>
      </div>

      {/* ── Tabs ── */}
      <div style={{ height: 36, flexShrink: 0, borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4, background: 'var(--base)' }}>
        {(['elle','optimus','code','diagnose','health','config'] as Tab[]).map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            style={{ padding: '5px 12px', borderRadius: 5, border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11,
              background: tab === tb ? accent + '1a' : 'transparent', color: tab === tb ? accent : 'var(--t3)',
              borderBottom: tab === tb ? `1.5px solid ${accent}` : '1.5px solid transparent' }}>
            {tb}
          </button>
        ))}
      </div>

      {/* ── Panel ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {tab === 'elle'     && <EllePanel worker={worker} accent={accent} />}
        {tab === 'optimus'  && <OptimusPanel worker={worker} accent={accent} />}
        {tab === 'code'     && <CodePanel worker={worker} accent={accent} />}
        {tab === 'diagnose' && <DiagnosePanel worker={worker} accent={accent} />}
        {tab === 'health'   && <HealthPanel health={health} accent={accent} />}
        {tab === 'config'   && <ConfigPanel worker={worker} face={face} accent={accent} />}
      </div>
    </div>
  )
}

// ── CHAT ──────────────────────────────────────────────────────
function ChatPanel({ worker, face, accent }: any) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [val, setVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => 'dev-' + uid())
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, loading])

  const send = useCallback(async () => {
    const q = val.trim(); if (!q || loading) return
    setVal(''); setLoading(true)
    const um: Msg = { id: uid(), role: 'user', content: q, ts: Date.now() }
    setMsgs(p => [...p, um])

    // rapid workers use {question} → /query; elle uses {query} → /api/elle-conversation
    const isRapid = worker.kind === 'rapid'
    const url = isRapid ? worker.url + '/query' : worker.url + '/api/elle-conversation'
    const body = isRapid ? { question: q } : { query: q, session_id: sessionId, source: 'dev-console', face: face.key }

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(isRapid ? {} : { Authorization: `Bearer ${TOKEN}` }) },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      const content = d.content || d.response || d.intro || (d.blocks ? JSON.stringify(d.blocks, null, 2) : '') || '(empty)'
      setMsgs(p => [...p, { id: uid(), role: 'elle', content, thinking: d.thinking, meta: `${d.provider || worker.kind}${d.model ? ' · ' + d.model.split('/').pop() : ''}${d.memory_recalled ? ' · memory✓' : ''}`, ts: Date.now() }])
    } catch (e: any) {
      setMsgs(p => [...p, { id: uid(), role: 'elle', content: String(e.message || e), ts: Date.now(), err: true }])
    } finally { setLoading(false) }
  }, [val, loading, worker, face, sessionId])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 12 }}>
            chatting with <span style={{ color: accent }}>{worker.label}</span> · face <span style={{ color: accent }}>{face.key}</span>
          </div>
        )}
        {msgs.map(m => (
          <div key={m.id} className="fade" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: m.role === 'user' ? 'var(--t2)' : accent }}>{m.role === 'user' ? 'you' : 'elle'}</span>
              {m.meta && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>{m.meta}</span>}
            </div>
            {m.thinking && (
              <details style={{ marginBottom: 6 }}>
                <summary style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent, cursor: 'pointer' }}>reasoning</summary>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)', whiteSpace: 'pre-wrap', padding: '6px 0', lineHeight: 1.6 }}>{m.thinking}</div>
              </details>
            )}
            <div style={{ fontSize: 13, color: m.err ? '#e07070' : 'var(--t1)', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: m.err ? 'var(--mono)' : 'inherit' }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}><div style={{ width: 10, height: 10, border: `1.5px solid ${accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />querying {worker.label}…</div>}
        <div ref={bottom} />
      </div>
      <div style={{ padding: 12, borderTop: '0.5px solid var(--b1)', display: 'flex', gap: 8 }}>
        <textarea value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`ask ${worker.label}…`} rows={1}
          style={{ flex: 1, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8, color: 'var(--t1)', padding: '10px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'var(--mono)' }} />
        <button onClick={send} disabled={loading || !val.trim()}
          style={{ width: 38, borderRadius: 8, border: `0.5px solid ${accent}55`, background: val.trim() ? accent + '22' : 'var(--ov)', color: accent, cursor: val.trim() ? 'pointer' : 'default', fontSize: 15 }}>↑</button>
      </div>
    </div>
  )
}

// ── CODE ENGINE ───────────────────────────────────────────────
function CodePanel({ worker, accent }: any) {
  const [action, setAction] = useState('analyze')
  const [code, setCode] = useState('')
  const [task, setTask] = useState('')
  const [out, setOut] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (loading) return; setLoading(true); setOut('')
    try {
      const r = await fetch(worker.url + '/api/elle-code-engine', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ action, code, task, use_corpus: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setOut((d.thinking ? '◢ reasoning\n' + d.thinking + '\n\n◣ output\n' : '') + (d.response || '(empty)'))
    } catch (e: any) { setOut('Error: ' + (e.message || e)) } finally { setLoading(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 14, gap: 10, overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={action} onChange={e => setAction(e.target.value)} style={{ background: 'var(--raised)', color: 'var(--t1)', border: '0.5px solid var(--b1)', borderRadius: 5, padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: 11 }}>
          {['analyze','generate','debug','refactor','explain','migrate'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={run} disabled={loading} style={{ padding: '6px 16px', borderRadius: 5, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>{loading ? 'running…' : 'run ▸'}</button>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', alignSelf: 'center' }}>{worker.label}</span>
      </div>
      <input value={task} onChange={e => setTask(e.target.value)} placeholder="task / instruction"
        style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '8px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none' }} />
      <textarea value={code} onChange={e => setCode(e.target.value)} placeholder="paste code (optional for generate)…" rows={8}
        style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', resize: 'vertical', outline: 'none' }} />
      <pre style={{ flex: 1, background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: 12, fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--t2)', whiteSpace: 'pre-wrap', overflow: 'auto', minHeight: 120, lineHeight: 1.6 }}>{out || '(output appears here)'}</pre>
    </div>
  )
}

// ── DIAGNOSE ──────────────────────────────────────────────────
// ── ASK (natural-language router over every capability) ───────
function AskPanel({ worker, accent }: any) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [trace, setTrace] = useState<any[]>([])
  const [openTrace, setOpenTrace] = useState(true)
  const [note, setNote] = useState('')

  const ask = async () => {
    if (loading || !q.trim()) return; setLoading(true); setAnswer(''); setTrace([]); setNote('')
    try {
      const r = await fetch(worker.url + '/api/elle-router', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ q }),
      })
      const d = await r.json()
      if (!r.ok || d.error) { setNote(d.error || `HTTP ${r.status}`); return }
      setAnswer(d.answer || '(no answer)'); setTrace(d.trace || [])
    } catch (e: any) { setNote('Error: ' + (e.message || e)) } finally { setLoading(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 14, gap: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder="ask anything — corpus, trades, the dream sweep, invoices, the live web… she picks the tools"
          style={{ flex: 1, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none' }} />
        <button onClick={ask} disabled={loading || !q.trim()}
          style={{ padding: '6px 16px', borderRadius: 5, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{loading ? 'thinking…' : 'ask ▸'}</button>
      </div>
      {note && <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>{note}</div>}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {answer && (
          <div style={{ background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: 14, fontSize: 12.5, color: 'var(--t1)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{answer}</div>
        )}
        {trace.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => setOpenTrace(!openTrace)}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 10.5, cursor: 'pointer', padding: 0 }}>
              {(openTrace ? '▾ ' : '▸ ') + trace.length + ' tool step' + (trace.length === 1 ? '' : 's')}
            </button>
            {openTrace && trace.map((t: any, i: number) => (
              <div key={i} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t2)' }}>
                <div style={{ color: accent, marginBottom: 3 }}>{(i + 1) + '. ' + t.tool}<span style={{ color: 'var(--t3)' }}>{'  ' + JSON.stringify(t.args)}</span></div>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--t3)', lineHeight: 1.5 }}>{String(t.result || '')}</div>
              </div>
            ))}
          </div>
        )}
        {!answer && trace.length === 0 && !note && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'center', padding: 20 }}>
            one question · she reaches the corpus, D1, the live web, the code engine, trading, and RAPID²AI — and cross-references across them
          </div>
        )}
      </div>
    </div>
  )
}

// ── CORPUS (natural-language paper retrieval) ─────────────────
function CorpusPanel({ worker, accent }: any) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [cands, setCands] = useState<any[]>([])
  const [paper, setPaper] = useState<any>(null)
  const [note, setNote] = useState('')

  const open = async (id: string) => {
    setLoading(true); setNote('')
    try {
      const r = await fetch(worker.url + '/api/corpus-paper', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ id }),
      })
      const d = await r.json()
      if (!r.ok || d.error) { setNote(d.error || `HTTP ${r.status}`); return }
      setPaper(d.paper); setCands([])
    } catch (e: any) { setNote('Error: ' + (e.message || e)) } finally { setLoading(false) }
  }

  const resolve = async () => {
    if (loading || !q.trim()) return; setLoading(true); setPaper(null); setCands([]); setNote('')
    try {
      const r = await fetch(worker.url + '/api/corpus-resolve', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ q }),
      })
      const d = await r.json()
      if (!r.ok || d.error) { setNote(d.error || `HTTP ${r.status}`); return }
      if (d.auto_opened && d.paper) setPaper(d.paper)
      else if (d.candidates?.length) { setCands(d.candidates); setNote('Several papers match — pick one:') }
      else setNote('No paper matched that. Try describing it differently.')
    } catch (e: any) { setNote('Error: ' + (e.message || e)) } finally { setLoading(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 14, gap: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') resolve() }}
          placeholder="describe the paper in plain English — e.g. the proof that the golden ratio is forced…"
          style={{ flex: 1, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none' }} />
        <button onClick={resolve} disabled={loading || !q.trim()}
          style={{ padding: '6px 16px', borderRadius: 5, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{loading ? 'finding…' : 'find ▸'}</button>
      </div>
      {note && <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>{note}</div>}
      {cands.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {cands.map(c => (
            <button key={c.id} onClick={() => open(c.id)}
              style={{ textAlign: 'left', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
              <span style={{ color: accent }}>{c.title || '(untitled)'}</span>
              <span style={{ color: 'var(--t3)' }}>{'  · ' + (c.series || '—') + ' · ' + c.score}</span>
            </button>
          ))}
        </div>
      )}
      {paper && (
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: 14 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: accent, marginBottom: 2 }}>{paper.title}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)', marginBottom: 12 }}>{(paper.series || '—') + (paper.word_count ? ' · ' + paper.word_count + ' words' : '')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--t2)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{paper.full_text || paper.abstract || '(no text)'}</div>
        </div>
      )}
      {!paper && cands.length === 0 && !note && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>ask for any paper in the corpus — no ids, no JSON</div>
      )}
    </div>
  )
}

function DiagnosePanel({ worker, accent }: any) {
  const [err, setErr] = useState('')
  const [out, setOut] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (loading || !err.trim()) return; setLoading(true); setOut('')
    try {
      const r = await fetch(worker.url + '/api/diagnose', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ error: err }),
      })
      const d = await r.json()
      setOut(typeof d === 'string' ? d : JSON.stringify(d, null, 2))
    } catch (e: any) { setOut('Error: ' + (e.message || e)) } finally { setLoading(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 14, gap: 10 }}>
      <textarea value={err} onChange={e => setErr(e.target.value)} placeholder="paste an error / stack trace…" rows={6}
        style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', resize: 'vertical', outline: 'none' }} />
      <button onClick={run} disabled={loading || !err.trim()} style={{ alignSelf: 'flex-start', padding: '6px 16px', borderRadius: 5, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>{loading ? 'diagnosing…' : 'diagnose ▸'}</button>
      <pre style={{ flex: 1, background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: 12, fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--t2)', whiteSpace: 'pre-wrap', overflow: 'auto', lineHeight: 1.6 }}>{out || '(diagnosis appears here)'}</pre>
    </div>
  )
}

// ── HEALTH ────────────────────────────────────────────────────
function HealthPanel({ health, accent }: any) {
  return (
    <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
      {WORKERS.map(w => {
        const h = health[w.key]
        return (
          <div key={w.key} style={{ marginBottom: 10, padding: 12, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11 }}>{h?.ok ? '🟢' : h?.status === 0 ? '⚫' : '🔴'}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{w.label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', marginLeft: 'auto' }}>{w.url.replace('https://','')}</span>
            </div>
            {h?.data && <pre style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--t3)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{JSON.stringify(h.data, null, 2)}</pre>}
            {!h?.ok && !h?.data && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t4)' }}>HTTP {h?.status ?? '—'}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── CONFIG ────────────────────────────────────────────────────
function ConfigPanel({ worker, face, accent }: any) {
  const row = (k: string, v: string) => (
    <div style={{ display: 'flex', padding: '6px 0', borderBottom: '0.5px solid var(--b2)' }}>
      <span style={{ width: 120, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>{k}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)' }}>{v}</span>
    </div>
  )
  return (
    <div style={{ flex: 1, padding: 18, overflow: 'auto' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: accent, marginBottom: 8 }}>ACTIVE TARGET</div>
      {row('worker', worker.label)}
      {row('worker url', worker.url)}
      {row('kind', worker.kind)}
      {row('face', face.label)}
      {row('face page', face.page)}
      {row('auth', USER_EMAIL ? 'JWT · ' + USER_EMAIL : 'not signed in')}
      <button onClick={() => { clearAuth(); location.reload() }}
        style={{ marginTop: 16, padding: '6px 14px', borderRadius: 5, border: '0.5px solid var(--b1)', background: 'var(--raised)', color: 'var(--t2)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>
        sign out
      </button>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', marginTop: 20, lineHeight: 1.7 }}>
        Auth is a per-user JWT from /api/elle-auth — no service key in this bundle. Calls to elle-worker (conversation, code engine) send your Bearer token; diagnose and health are public.
      </div>
    </div>
  )
}
