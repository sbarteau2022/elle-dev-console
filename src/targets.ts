// ============================================================
// DEV CONSOLE — TARGETS
// Single source of truth for every worker + face/page the
// console can do dev work against. Two independent axes:
//   WORKERS — the backend a request hits
//   FACES   — the frontend/face context (page) you're working on
// ============================================================

export interface WorkerTarget {
  key: string;
  label: string;
  url: string;
  health: string;     // health path
  kind: 'elle' | 'rapid' | 'eip';
}

export interface FaceTarget {
  key: string;
  label: string;
  page: string;       // live page URL (for "open" / preview)
  worker: string;     // default worker key this face talks to
  accent: string;
}

export const WORKERS: WorkerTarget[] = [
  { key: 'elle-worker',     label: 'elle-worker',      url: 'https://elle-worker.sbarteau2022.workers.dev',      health: '/health',  kind: 'elle'  },
  { key: 'rapid2ai-ai',     label: 'rapid2ai-ai',      url: 'https://rapid2ai-ai-worker.sbarteau2022.workers.dev', health: '/health', kind: 'rapid' },
  { key: 'rapid2ai-ingest', label: 'rapid2ai-ingest',  url: 'https://rapid2ai-ingestion.sbarteau2022.workers.dev', health: '/',      kind: 'rapid' },
];

export const FACES: FaceTarget[] = [
  { key: 'main',    label: 'main · core',   page: 'https://elle.pages.dev',       worker: 'elle-worker', accent: '#5FD6E8' },
  { key: 'law',     label: 'law · Anubis',  page: 'https://elle-law.pages.dev',   worker: 'elle-worker', accent: '#C9A84C' },
  { key: 'edu',     label: 'edu · Atlas',   page: 'https://elle.pages.dev',       worker: 'elle-worker', accent: '#4ADE80' },
  { key: 'rapid',   label: 'rapid · Atlas', page: 'https://rapidai.pages.dev/coo/', worker: 'rapid2ai-ai', accent: '#22D3EE' },
  { key: 'madmind', label: 'madmind',       page: 'https://elle.pages.dev',       worker: 'elle-worker', accent: '#A78BFA' },
];

export const getWorker = (key: string) => WORKERS.find(w => w.key === key) || WORKERS[0];
export const getFace   = (key: string) => FACES.find(f => f.key === key) || FACES[0];
