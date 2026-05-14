import type { FormSchema, FormResponse, AdminStats } from '@/types';

const FORMS_KEY = 'formrus.forms';
const RESP_KEY = 'formrus.responses';

const isBrowser = () => typeof window !== 'undefined';

function read<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function write<T>(key: string, value: T[]) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}
function delay(ms = 700) { return new Promise(r => setTimeout(r, ms + Math.random() * 500)); }

export function makeBlobId(): string {
  const bytes = new Uint8Array(16);
  if (isBrowser() && window.crypto) window.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function truncateBlob(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-6)}`;
}

export async function publishForm(schema: Omit<FormSchema, 'blobId' | 'createdAt'>): Promise<FormSchema> {
  await delay();
  const form: FormSchema = { ...schema, blobId: makeBlobId(), createdAt: new Date().toISOString() };
  const all = read<FormSchema>(FORMS_KEY);
  all.unshift(form);
  write(FORMS_KEY, all);
  return form;
}

export async function getForm(blobId: string): Promise<FormSchema | null> {
  await delay(400);
  return read<FormSchema>(FORMS_KEY).find(f => f.blobId === blobId) || null;
}

export async function listForms(): Promise<FormSchema[]> {
  await delay(300);
  return read<FormSchema>(FORMS_KEY);
}

export async function deleteForm(blobId: string): Promise<void> {
  await delay(200);
  write(FORMS_KEY, read<FormSchema>(FORMS_KEY).filter(f => f.blobId !== blobId));
  write(RESP_KEY, read<FormResponse>(RESP_KEY).filter(r => r.formBlobId !== blobId));
}

export async function submitResponse(formBlobId: string, data: Record<string, unknown>): Promise<FormResponse> {
  await delay(900);
  const resp: FormResponse = {
    id: makeBlobId(),
    formBlobId,
    submittedAt: new Date().toISOString(),
    data,
  };
  const all = read<FormResponse>(RESP_KEY);
  all.unshift(resp);
  write(RESP_KEY, all);
  return resp;
}

export async function getResponses(formBlobId: string): Promise<FormResponse[]> {
  await delay(300);
  return read<FormResponse>(RESP_KEY).filter(r => r.formBlobId === formBlobId);
}

export function updateResponse(id: string, patch: Partial<FormResponse>) {
  const all = read<FormResponse>(RESP_KEY);
  const idx = all.findIndex(r => r.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], ...patch }; write(RESP_KEY, all); }
}

export function deleteResponse(id: string) {
  write(RESP_KEY, read<FormResponse>(RESP_KEY).filter(r => r.id !== id));
}

export function bulkUpdate(ids: string[], patch: Partial<FormResponse>) {
  const all = read<FormResponse>(RESP_KEY);
  ids.forEach(id => { const i = all.findIndex(r => r.id === id); if (i >= 0) all[i] = { ...all[i], ...patch }; });
  write(RESP_KEY, all);
}

export function bulkDelete(ids: string[]) {
  write(RESP_KEY, read<FormResponse>(RESP_KEY).filter(r => !ids.includes(r.id)));
}

export function computeStats(form: FormSchema, responses: FormResponse[]): AdminStats {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayCount = responses.filter(r => new Date(r.submittedAt) >= today).length;
  const required = form.fields.filter(f => f.required && f.type !== 'section');
  const completionRate = responses.length === 0 || required.length === 0 ? 100 :
    Math.round(responses.reduce((acc, r) => {
      const filled = required.filter(f => r.data[f.id] !== undefined && r.data[f.id] !== '' && r.data[f.id] !== null).length;
      return acc + filled / required.length;
    }, 0) / responses.length * 100);
  const starField = form.fields.find(f => f.type === 'star');
  let avgStar: number | null = null;
  if (starField && responses.length) {
    const vals = responses.map(r => Number(r.data[starField.id]) || 0).filter(v => v > 0);
    avgStar = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }
  return { total: responses.length, today: todayCount, completionRate, avgStar };
}

export function exportCsv(form: FormSchema, responses: FormResponse[]): string {
  const cols = form.fields.filter(f => f.type !== 'section');
  const header = ['#', 'Submitted', ...cols.map(c => c.label)];
  const rows = responses.map((r, i) => [
    String(i + 1),
    new Date(r.submittedAt).toISOString(),
    ...cols.map(c => {
      const v = r.data[c.id];
      if (v === undefined || v === null) return '';
      if (Array.isArray(v)) return v.join('; ');
      return String(v);
    }),
  ]);
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return [header, ...rows].map(r => r.map(escape).join(',')).join('\n');
}

export function downloadCsv(filename: string, content: string) {
  if (!isBrowser()) return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
