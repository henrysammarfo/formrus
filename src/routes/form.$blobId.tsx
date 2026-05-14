import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { FieldRenderer } from '@/components/FieldRenderer';
import { getForm, submitResponse, truncateBlob } from '@/lib/walrus-mock';
import type { FormSchema } from '@/types';

export const Route = createFileRoute('/form/$blobId')({
  head: ({ params }) => ({
    meta: [
      { title: `Form ${params.blobId.slice(0, 6)} — FORMRUS` },
      { name: 'description', content: 'Respond to a form stored on Walrus Protocol.' },
    ],
  }),
  component: FormView,
});

function FormView() {
  const { blobId } = Route.useParams();
  const [form, setForm] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: string } | null>(null);

  useEffect(() => {
    getForm(blobId).then(f => { setForm(f); setLoading(false); });
  }, [blobId]);

  const totalFields = form?.fields.filter(f => f.type !== 'section').length || 0;
  const filled = Object.values(values).filter(v => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)).length;
  const progress = totalFields ? Math.round((filled / totalFields) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const missing = form.fields.find(f => f.required && f.type !== 'section' && (values[f.id] === undefined || values[f.id] === ''));
    if (missing) { alert(`"${missing.label}" is required`); return; }
    setSubmitting(true);
    const r = await submitResponse(form.blobId, values);
    setDone({ id: r.id });
    setSubmitting(false);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }
  if (!form) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h2 className="text-xl font-semibold">Blob not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">No form exists at <code className="font-mono">{truncateBlob(blobId)}</code></p>
        <Link to="/builder" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Build one</Link>
      </div>
    );
  }
  if (done) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary"><Check size={28} /></div>
        <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>Response saved to Walrus</h2>
        <p className="mt-2 text-sm text-muted-foreground">Blob ID</p>
        <code className="mt-1 block break-all font-mono text-xs">{done.id}</code>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>{form.title}</h1>
        {form.description && <p className="mt-2 text-sm text-muted-foreground">{form.description}</p>}
        {form.isPrivate && <span className="mt-3 inline-block rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase text-primary">🔒 Seal encrypted</span>}

        <div className="mt-8 space-y-6">
          {form.fields.map(f => (
            <FieldRenderer key={f.id} field={f} value={values[f.id]} onChange={v => setValues(prev => ({ ...prev, [f.id]: v }))} />
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Storing on Walrus…</> : 'Submit'}
        </button>
      </form>
    </div>
  );
}
