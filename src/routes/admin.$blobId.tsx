import { createFileRoute, Link } from '@tanstack/react-router';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Loader2, Copy, Download, Star, Check, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { getForm, getResponses, computeStats, exportCsv, downloadCsv, updateResponse, deleteResponse, bulkUpdate, bulkDelete, truncateBlob } from '@/lib/walrus-mock';
import type { FormSchema, FormResponse, AdminStats } from '@/types';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/$blobId')({
  head: ({ params }) => ({
    meta: [
      { title: `Admin · ${params.blobId.slice(0, 6)} — FORMRUS` },
      { name: 'description', content: 'Manage responses for your Walrus form.' },
    ],
  }),
  component: Admin,
});

type Status = 'all' | 'new' | 'reviewed' | 'starred';
type Sort = 'newest' | 'oldest' | 'star';

function Admin() {
  const { blobId } = Route.useParams();
  const [form, setForm] = useState<FormSchema | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = () => getResponses(blobId).then(setResponses);
  useEffect(() => {
    Promise.all([getForm(blobId), getResponses(blobId)]).then(([f, r]) => {
      setForm(f); setResponses(r); setLoading(false);
    });
  }, [blobId]);

  const stats: AdminStats | null = useMemo(() => form ? computeStats(form, responses) : null, [form, responses]);
  const cols = useMemo(() => form?.fields.filter(f => f.type !== 'section') || [], [form]);

  const filtered = useMemo(() => {
    let r = [...responses];
    if (status === 'starred') r = r.filter(x => x.starred);
    if (status === 'reviewed') r = r.filter(x => x.reviewed);
    if (status === 'new') r = r.filter(x => !x.reviewed);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(x => Object.values(x.data).some(v => String(v).toLowerCase().includes(s)));
    }
    if (sort === 'newest') r.sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
    if (sort === 'oldest') r.sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt));
    if (sort === 'star') {
      const starField = form?.fields.find(f => f.type === 'star');
      if (starField) r.sort((a, b) => (Number(b.data[starField.id]) || 0) - (Number(a.data[starField.id]) || 0));
    }
    return r;
  }, [responses, status, search, sort, form]);

  const copyLink = () => {
    const url = `${window.location.origin}/form/${blobId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const exportAll = () => {
    if (!form) return;
    downloadCsv(`${form.title.replace(/\s+/g, '_')}.csv`, exportCsv(form, responses));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!form) return <div className="py-20 text-center">Form not found.</div>;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>{form.title}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">Form ID: {truncateBlob(blobId)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary"><Copy size={14} /> Copy link</button>
          <button onClick={exportAll} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><Download size={14} /> Export CSV</button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Responses', val: stats?.total ?? 0 },
          { label: "Today's Responses", val: stats?.today ?? 0 },
          { label: 'Completion Rate', val: `${stats?.completionRate ?? 0}%` },
          { label: 'Avg Star Rating', val: stats?.avgStar ?? '—' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-border bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="mt-2 text-3xl font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white p-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search responses…" className="min-w-[200px] flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
        <select value={status} onChange={e => setStatus(e.target.value as Status)} className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary">
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="starred">Starred</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="star">Star Rating</option>
        </select>
      </div>

      {/* Bulk */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-accent p-3 text-sm">
          <span className="font-semibold text-primary">{selected.size} selected</span>
          <button onClick={() => { bulkUpdate([...selected], { reviewed: true }); reload(); setSelected(new Set()); }} className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold hover:border-primary">Mark reviewed</button>
          <button onClick={() => { downloadCsv('selected.csv', exportCsv(form, responses.filter(r => selected.has(r.id)))); }} className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold hover:border-primary">Export selected</button>
          <button onClick={() => { bulkDelete([...selected]); reload(); setSelected(new Set()); }} className="rounded-full border border-destructive bg-white px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground">Delete</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3 text-left"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={e => setSelected(e.target.checked ? new Set(filtered.map(r => r.id)) : new Set())} className="accent-primary" /></th>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Submitted</th>
              {cols.map(c => <th key={c.id} className="p-3 text-left">{c.label}</th>)}
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={cols.length + 4} className="p-10 text-center text-muted-foreground">No responses yet. <Link to="/form/$blobId" params={{ blobId }} className="text-primary hover:underline">Open form</Link></td></tr>
            )}
            {filtered.map((r, i) => (
              <Fragment key={r.id}>
                <tr className={`border-b border-border transition-colors ${r.starred ? 'bg-accent/40' : 'hover:bg-secondary/50'}`}>
                  <td className="p-3"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="accent-primary" /></td>
                  <td className="p-3 font-mono text-xs">{i + 1}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.submittedAt).toLocaleString()}</td>
                  {cols.map(c => {
                    const v = r.data[c.id];
                    return <td key={c.id} className="max-w-[200px] truncate p-3">{Array.isArray(v) ? v.join(', ') : (v as string) || <span className="text-muted-foreground">—</span>}</td>;
                  })}
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="View">{expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                      <button onClick={() => { updateResponse(r.id, { starred: !r.starred }); reload(); }} className={`rounded p-1.5 hover:bg-secondary ${r.starred ? 'text-primary' : 'text-muted-foreground'}`} title="Star"><Star size={14} className={r.starred ? 'fill-primary' : ''} /></button>
                      <button onClick={() => { updateResponse(r.id, { reviewed: !r.reviewed }); reload(); }} className={`rounded p-1.5 hover:bg-secondary ${r.reviewed ? 'text-primary' : 'text-muted-foreground'}`} title="Reviewed"><Check size={14} /></button>
                      <button onClick={() => { deleteResponse(r.id); reload(); }} className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr className="bg-secondary/30">
                    <td colSpan={cols.length + 4} className="p-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {cols.map(c => (
                          <div key={c.id}>
                            <div className="text-xs font-semibold uppercase text-muted-foreground">{c.label}</div>
                            <div className="text-sm text-foreground">{Array.isArray(r.data[c.id]) ? (r.data[c.id] as string[]).join(', ') : (r.data[c.id] as string) || '—'}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 font-mono text-[10px] text-muted-foreground">Response blob: {r.id}</div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
