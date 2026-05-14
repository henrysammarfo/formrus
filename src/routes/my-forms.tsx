import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Plus, Copy, Trash2, ExternalLink, BarChart3, Loader2 } from 'lucide-react';
import { listForms, deleteForm, truncateBlob } from '@/lib/walrus-mock';
import type { FormSchema } from '@/types';
import { toast } from 'sonner';

export const Route = createFileRoute('/my-forms')({
  head: () => ({
    meta: [
      { title: 'My Forms — FORMRUS' },
      { name: 'description', content: 'All your forms stored on Walrus, in one place.' },
      { property: 'og:title', content: 'My Forms — FORMRUS' },
    ],
  }),
  component: MyForms,
});

function MyForms() {
  const [forms, setForms] = useState<FormSchema[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = () => {
    listForms().then(fs => {
      setForms(fs);
      // count responses
      try {
        const all = JSON.parse(localStorage.getItem('formrus.responses') || '[]') as { formBlobId: string }[];
        const c: Record<string, number> = {};
        all.forEach(r => { c[r.formBlobId] = (c[r.formBlobId] || 0) + 1; });
        setCounts(c);
      } catch {}
    });
  };
  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this form and its responses?')) return;
    await deleteForm(id);
    load();
    toast.success('Deleted');
  };

  const copy = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/form/${id}`);
    toast.success('Link copied');
  };

  if (!forms) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>My Forms</h1>
        <p className="text-sm text-muted-foreground">Every form you've published to Walrus.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/builder" className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white p-6 text-center transition-all hover:-translate-y-1 hover:border-primary hover:bg-accent">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><Plus size={20} /></div>
          <span className="text-sm font-semibold text-foreground">Create New Form</span>
        </Link>

        {forms.map(f => (
          <div key={f.blobId} className="flex flex-col rounded-2xl border border-border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>{f.title}</h3>
              {f.isPrivate && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">🔒 Private</span>}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Created {new Date(f.createdAt).toLocaleDateString()}</div>
              <div>{counts[f.blobId] || 0} responses</div>
              <div className="font-mono">{truncateBlob(f.blobId)}</div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <Link to="/form/$blobId" params={{ blobId: f.blobId }} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-primary"><ExternalLink size={12} /> View</Link>
              <Link to="/admin/$blobId" params={{ blobId: f.blobId }} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"><BarChart3 size={12} /> Admin</Link>
              <button onClick={() => copy(f.blobId)} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-primary"><Copy size={12} /></button>
              <button onClick={() => handleDelete(f.blobId)} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
