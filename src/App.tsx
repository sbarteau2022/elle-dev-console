import { useState, useEffect } from 'react'
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
const ELLE_WORKER_URL = WORKERS.find(w => w.key === 'elle-worker')!.url
const ELLE_AUTH_URL = ELLE_WORKER_URL + '/api/elle-auth'
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

// ── CODE SANDBOX ─────────────────────────────────────────────
// Extract the first fenced code block from Elle's response.
function extractCode(text: string): string | null {
  const m = text.match(/```(?:\w+)?\n([\s\S]*?)```/)
  return m ? m[1].trimEnd() : null
}

function CodePanel({ worker, accent }: any) {
  const [lang, setLang]       = useState('typescript')
  const [action, setAction]   = useState('debug')
  const [code, setCode]       = useState('')
  const [context, setContext] = useState('')
  const [out, setOut]         = useState('')
  const [fixed, setFixed]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<{ action: string; snapshot: string }[]>([])

  const run = async (overrideAction?: string) => {
    const act = overrideAction || action
    if (loading) return; setLoading(true); setOut(''); setFixed(null)
    try {
      // Code engine is an elle-worker capability — pin to it so the tab stays
      // actionable even when a RAPID face is the active target.
      const r = await fetch(ELLE_WORKER_URL + '/api/elle-code-engine', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ action: act, code, language: lang, task: context, use_corpus: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      const raw = (d.thinking ? '◢ reasoning\n' + d.thinking + '\n\n◣ output\n' : '') + (d.response || '(empty)')
      setOut(raw)
      const extracted = extractCode(d.response || '')
      if (extracted) setFixed(extracted)
    } catch (e: any) { setOut('Error: ' + (e.message || e)) } finally { setLoading(false) }
  }

  const applyFix = () => {
    if (!fixed) return
    setHistory(h => [...h, { action, snapshot: code }])
    setCode(fixed)
    setFixed(null)
    setOut('')
  }

  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    setCode(last.snapshot)
    setHistory(h => h.slice(0, -1))
  }

  const BTN = (label: string, act: string, col?: string) => (
    <button key={act} onClick={() => run(act)} disabled={loading || (!code.trim() && act !== 'generate')}
      style={{ padding: '5px 11px', borderRadius: 5, border: `0.5px solid ${(col || accent)}55`, background: (col || accent) + '18',
        color: col || accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5, whiteSpace: 'nowrap' }}>
      {loading && action === act ? '…' : label}
    </button>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 0 }}>
      {/* toolbar */}
      <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--b1)', background: 'var(--base)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <select value={lang} onChange={e => setLang(e.target.value)}
          style={{ background: 'var(--raised)', color: 'var(--t2)', border: '0.5px solid var(--b1)', borderRadius: 5, padding: '5px 8px', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
          {['typescript','javascript','python','sql','bash','json','css','html'].map(l => <option key={l}>{l}</option>)}
        </select>
        {BTN('analyze', 'analyze')}
        {BTN('debug', 'debug', '#F59E0B')}
        {BTN('refactor', 'refactor', '#8B5CF6')}
        {BTN('explain', 'explain', '#10B981')}
        {BTN('generate', 'generate', '#3B82F6')}
        {BTN('migrate → D1', 'migrate', '#EC4899')}
        {history.length > 0 && (
          <button onClick={undo} style={{ padding: '5px 9px', borderRadius: 5, border: '0.5px solid var(--b1)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5 }}>↩ undo</button>
        )}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)' }}>elle-worker · code engine</span>
      </div>

      {/* main: editor + output side by side */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* editor pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '0.5px solid var(--b1)', minWidth: 0 }}>
          <div style={{ padding: '6px 10px', borderBottom: '0.5px solid var(--b1)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', background: 'var(--base)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>editor · {lang}</span>
            {code && <button onClick={() => setCode('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>clear</button>}
          </div>
          <textarea value={code} onChange={e => { setCode(e.target.value); setAction('debug') }}
            placeholder={'// paste or write code here\n// Elle will debug, refactor, explain, or generate\n// use the buttons above to run'}
            spellCheck={false}
            style={{ flex: 1, background: 'var(--void)', border: 'none', color: '#C8D3E0', padding: '12px 14px', fontSize: 12.5, fontFamily: 'var(--mono)', resize: 'none', outline: 'none', lineHeight: 1.6, tabSize: 2 }}
            onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); const s = e.currentTarget; const v = s.value; const i = s.selectionStart; s.value = v.slice(0, i) + '  ' + v.slice(s.selectionEnd); s.selectionStart = s.selectionEnd = i + 2; setCode(s.value) } }}
          />
          <div style={{ padding: '6px 10px', borderTop: '0.5px solid var(--b1)', background: 'var(--base)' }}>
            <input value={context} onChange={e => setContext(e.target.value)}
              placeholder="context · error message, goal, or constraint (optional)"
              style={{ width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 5, color: 'var(--t1)', padding: '6px 10px', fontSize: 11.5, fontFamily: 'var(--mono)', outline: 'none' }} />
          </div>
        </div>

        {/* output pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '6px 10px', borderBottom: '0.5px solid var(--b1)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', background: 'var(--base)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>elle · output</span>
            {fixed && (
              <button onClick={applyFix}
                style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 4, border: `0.5px solid ${accent}88`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600 }}>
                ← apply fix
              </button>
            )}
          </div>
          <pre style={{ flex: 1, background: 'var(--base)', border: 'none', padding: '12px 14px', fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--t2)', whiteSpace: 'pre-wrap', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>
            {loading ? 'elle is thinking…' : (out || '(run an action to see output)')}
          </pre>
          {fixed && !loading && (
            <div style={{ padding: '6px 10px', borderTop: '0.5px solid var(--b1)', background: 'var(--raised)', fontFamily: 'var(--mono)', fontSize: 10, color: accent }}>
              ✓ fixed code detected — click "← apply fix" to load it into the editor
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ── DIAGNOSE ──────────────────────────────────────────────────
function DiagnosePanel({ worker, accent }: any) {
  const [err, setErr] = useState('')
  const [out, setOut] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (loading || !err.trim()) return; setLoading(true); setOut('')
    try {
      // Diagnose lives on the elle-worker — pin to it regardless of active face.
      const r = await fetch(ELLE_WORKER_URL + '/api/diagnose', {
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
